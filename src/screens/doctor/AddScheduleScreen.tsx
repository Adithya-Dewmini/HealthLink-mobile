import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../../config/api";
import DoctorSchedulePreview from "./DoctorSchedulePreview";

const { width } = Dimensions.get("window");

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E1EEF9",
  accentAmber: "#FF9800",
  border: "#E0E6ED",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AddScheduleScreen() {
  const navigation = useNavigation();
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [savingDays, setSavingDays] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [maxPatients, setMaxPatients] = useState("20");
  const [publishing, setPublishing] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<"start" | "end" | null>(
    null
  );
  const [draftShifts, setDraftShifts] = useState<
    {
      id?: number;
      sourceId?: number;
      draftId?: string;
      day: string;
      start_time: string;
      end_time: string;
      max_patients?: number | null;
    }[]
  >([]);
  const [publishedShifts, setPublishedShifts] = useState<
    {
      id?: number;
      day: string;
      start_time: string;
      end_time: string;
      max_patients?: number | null;
    }[]
  >([]);
  const [editingShift, setEditingShift] = useState<{
    id?: number;
    sourceId?: number;
    draftId?: string;
    day: string;
    start_time: string;
    end_time: string;
    max_patients?: number | null;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const addShift = () => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    if (workingDays.length > 0 && !workingDays.includes(selectedDay)) {
      Alert.alert("Unavailable Day", "This day is marked as unavailable.");
      return;
    }
    const dayValue = selectedDay.length === 3 ? expandDay(selectedDay) : selectedDay;
    const candidateStart = String(startTime).slice(0, 5);
    const candidateEnd = String(endTime).slice(0, 5);
    if (hasOverlap(dayValue, candidateStart, candidateEnd)) {
      Alert.alert("Time Overlap", "This time overlaps with an existing shift.");
      return;
    }
    const newShift = {
      draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      day: dayValue,
      start_time: startTime,
      end_time: endTime,
      max_patients: maxPatients ? Number(maxPatients) : null,
    };
    setDraftShifts((prev) => [...prev, newShift]);
  };

  const removeDraftShift = (index: number) => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    setDraftShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const removePublishedShift = async (shift: { id?: number }, index: number) => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    if (!shift.id) return;
    try {
      const res = await apiFetch(`/api/doctor/availability/${shift.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to delete shift");
      }
      setPublishedShifts((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Delete shift error:", err);
      Alert.alert("Delete Failed", err instanceof Error ? err.message : "Failed to delete shift");
    }
  };

  const loadShifts = async () => {
    try {
      const res = await apiFetch("/api/doctor/availability");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to load shifts");
      }
      const data = await res.json();
      setPublishedShifts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load shifts error:", err);
    }
  };

  const loadWorkingDays = async () => {
    try {
      const res = await apiFetch("/api/doctor/working-days");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to load working days");
      }
      const data = await res.json();
      const days = Array.isArray(data) ? data.map((d) => shortenDay(String(d))) : [];
      setWorkingDays(days);
    } catch (err) {
      console.error("Load working days error:", err);
    }
  };

  const loadQueueStatus = async () => {
    try {
      const res = await apiFetch("/api/doctor/queue/dashboard");
      if (!res.ok) return;
      const data = await res.json();
      const status = data?.queue?.status ?? "NOT_STARTED";
      setQueueStatus(status);
    } catch (err) {
      console.error("Load queue status error:", err);
    }
  };

  useEffect(() => {
    void loadShifts();
    void loadWorkingDays();
    void loadQueueStatus();
  }, []);

  useEffect(() => {
    if (workingDays.length === 0) return;
    if (!workingDays.includes(selectedDay)) {
      setSelectedDay(workingDays[0]);
    }
  }, [workingDays, selectedDay]);

  const toggleDay = (day: string) => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveWorkingDays = async () => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    if (savingDays) return;
    try {
      setSavingDays(true);
      const payload = workingDays.map((day) => expandDay(day));
      const res = await apiFetch("/api/doctor/working-days", {
        method: "POST",
        body: JSON.stringify({ days: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to save working days");
      }
      Alert.alert("Saved", "Working days updated.");
    } catch (err) {
      Alert.alert("Save Failed", err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingDays(false);
    }
  };

  const handleEdit = (shift: {
    id?: number;
    sourceId?: number;
    draftId?: string;
    day: string;
    start_time: string;
    end_time: string;
    max_patients?: number | null;
  }) => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    const isPublished = !!shift.id && shift.sourceId === undefined;
    setEditingShift({
      ...shift,
      sourceId: isPublished ? shift.id : shift.sourceId,
    });
    setSelectedDay(shortenDay(shift.day));
    setStartTime(shift.start_time);
    setEndTime(shift.end_time);
    setMaxPatients(
      shift.max_patients === null || shift.max_patients === undefined
        ? ""
        : String(shift.max_patients)
    );
    setShowEditModal(true);
  };

  const handleOpenPreview = () => {
    const previewShifts = [...publishedShifts, ...draftShifts];
    if (previewShifts.length === 0) {
      Alert.alert("No Schedule", "No schedule to preview.");
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmPublish = async () => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    if (publishing) return;
    try {
      setPublishing(true);
      for (const shift of draftShifts) {
        const isEdit = !!shift.sourceId;
        const url = isEdit
          ? `/api/doctor/availability/${shift.sourceId}`
          : "/api/doctor/availability";
        const method = isEdit ? "PUT" : "POST";
        const response = await apiFetch(url, {
          method,
          body: JSON.stringify({
            day: shift.day,
            start_time: shift.start_time,
            end_time: shift.end_time,
            max_patients: shift.max_patients ?? null,
          }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || err.error || "Failed to publish schedule");
        }
      }
      setDraftShifts([]);
      await loadShifts();
      Alert.alert("Schedule Published", "Your schedule has been published.");
      setShowPreview(false);
    } catch (err) {
      console.error("Publish schedule error:", err);
      Alert.alert("Publish Failed", err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setEditingShift(null);
    setSelectedDay("Mon");
    setStartTime("09:00");
    setEndTime("12:00");
    setMaxPatients("20");
    setShowEditModal(false);
  };

  const handleSaveEditDraft = () => {
    if (queueStatus === "LIVE" || queueStatus === "PAUSED") {
      Alert.alert("Queue Live", "Schedule edits are disabled while the queue is live.");
      return;
    }
    if (!editingShift) return;
    const dayValue = selectedDay.length === 3 ? expandDay(selectedDay) : selectedDay;
    const updated = {
      ...editingShift,
      draftId: editingShift.draftId,
      day: dayValue,
      start_time: startTime,
      end_time: endTime,
      max_patients: maxPatients ? Number(maxPatients) : null,
    };
    const candidateStart = String(updated.start_time).slice(0, 5);
    const candidateEnd = String(updated.end_time).slice(0, 5);
    if (hasOverlap(dayValue, candidateStart, candidateEnd, updated)) {
      Alert.alert("Time Overlap", "This time overlaps with an existing shift.");
      return;
    }
    setDraftShifts((prev) => {
      const index = prev.findIndex((s) =>
        updated.draftId
          ? s.draftId === updated.draftId
          : updated.sourceId
            ? s.sourceId === updated.sourceId
            : false
      );
      if (index === -1) return [...prev, updated];
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    resetForm();
  };

  const adjustMaxPatients = (delta: number) => {
    const current = Number(maxPatients || 0);
    const next = Math.max(0, current + delta);
    setMaxPatients(String(next));
  };

  const times = Array.from({ length: 24 * 2 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  const formatTime = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return { time: `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`, period };
  };

  const hasOverlap = (
    day: string,
    start: string,
    end: string,
    self?: { id?: number; sourceId?: number; draftId?: string }
  ) => {
    const allShifts = [...publishedShifts, ...draftShifts].filter((shift) => {
      if (!self) return true;
      if (self.draftId && "draftId" in shift && shift.draftId === self.draftId) return false;
      if (self.sourceId && shift.id === self.sourceId) return false;
      if (self.id && shift.id === self.id) return false;
      return true;
    });

    const toMinutes = (value: string) => {
      const [h, m] = value.split(":").map(Number);
      return h * 60 + m;
    };

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    if (Number.isNaN(startMin) || Number.isNaN(endMin) || startMin >= endMin) return true;

    return allShifts.some((shift) => {
      if (shift.day !== day) return false;
      const s = toMinutes(String(shift.start_time).slice(0, 5));
      const e = toMinutes(String(shift.end_time).slice(0, 5));
      return startMin < e && endMin > s;
    });
  };

  const handleSelectTime = (value: string) => {
    if (activeTimeField === "start") {
      setStartTime(value);
    } else if (activeTimeField === "end") {
      setEndTime(value);
    }
    setActiveTimeField(null);
  };

  const scheduleLocked = queueStatus === "LIVE" || queueStatus === "PAUSED";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Schedule</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (!publishedShifts.length || publishing) && styles.saveBtnDisabled]}
          onPress={handleOpenPreview}
          disabled={publishing || publishedShifts.length === 0}
        >
          <Text style={[styles.saveBtnText, (!publishedShifts.length || publishing) && styles.saveBtnTextDisabled]}>
            {publishing ? "Publishing..." : "Preview"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {scheduleLocked && (
          <View style={styles.lockedBanner}>
            <Ionicons name="lock-closed" size={16} color={THEME.accentAmber} />
            <Text style={styles.lockedBannerText}>
              Queue is live. Schedule edits are disabled until the clinic ends.
            </Text>
          </View>
        )}
        <View style={styles.daySelectionContainer}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Working Days</Text>
            <TouchableOpacity
              style={[styles.saveDaysBtn, scheduleLocked && styles.disabledAction]}
              onPress={handleSaveWorkingDays}
              disabled={savingDays || scheduleLocked}
            >
              <Text style={styles.saveDaysText}>{savingDays ? "Saving..." : "Save Days"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dayGrid}>
            {DAYS.map((day) => {
              const isSelected = workingDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(day)}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillActive,
                    scheduleLocked && styles.dayPillDisabled,
                  ]}
                  disabled={scheduleLocked}
                >
                  <Text style={[styles.dayPillText, isSelected && styles.textWhite]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helperText}>Selected = Working days. Unselected = Off days.</Text>
        </View>

        <View style={styles.daySelectionContainer}>
          <Text style={styles.sectionTitle}>Shift Day</Text>
          <View style={styles.dayGrid}>
            {workingDays.length === 0 ? (
              <Text style={styles.emptyText}>Select working days above.</Text>
            ) : (
              workingDays.map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <TouchableOpacity
                    key={`shift-${day}`}
                    onPress={() => setSelectedDay(day)}
                    style={[
                      styles.dayPill,
                      isSelected && styles.dayPillActive,
                      scheduleLocked && styles.dayPillDisabled,
                    ]}
                    disabled={scheduleLocked}
                  >
                    <Text style={[styles.dayPillText, isSelected && styles.textWhite]}>{day}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.elevatedCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="time" size={22} color={THEME.accentBlue} />
            </View>
            <View>
              <Text style={styles.cardMainTitle}>Clinic Hours</Text>
              <Text style={styles.cardSubTitle}>Choose your shift timing</Text>
            </View>
          </View>

          <View style={styles.timePickerContainer}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>FROM</Text>
              <TouchableOpacity
                style={[styles.timeButton, scheduleLocked && styles.disabledAction]}
                onPress={() => setActiveTimeField("start")}
                disabled={scheduleLocked}
              >
                <Text style={styles.timeValue}>{formatTime(startTime).time}</Text>
                <Text style={styles.timeAmPm}>{formatTime(startTime).period}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.connector}>
              <View style={styles.connectorLine} />
              <Ionicons name="chevron-forward" size={16} color={THEME.border} />
              <View style={styles.connectorLine} />
            </View>

            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>UNTIL</Text>
              <TouchableOpacity
                style={[styles.timeButton, scheduleLocked && styles.disabledAction]}
                onPress={() => setActiveTimeField("end")}
                disabled={scheduleLocked}
              >
                <Text style={styles.timeValue}>{formatTime(endTime).time}</Text>
                <Text style={styles.timeAmPm}>{formatTime(endTime).period}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.capacityCard}>
          <View style={styles.capacityInfo}>
            <Text style={styles.cardMainTitle}>Max Patients</Text>
            <Text style={styles.cardSubTitle}>Per session limit</Text>
          </View>
          <View style={styles.capacityActions}>
            <TouchableOpacity
              style={[styles.circleBtn, scheduleLocked && styles.disabledAction]}
              onPress={() => adjustMaxPatients(-1)}
              disabled={scheduleLocked}
            >
              <Ionicons name="remove" size={20} color={THEME.textDark} />
            </TouchableOpacity>
            <TextInput
              style={styles.capacityInput}
              keyboardType="numeric"
              value={maxPatients}
              onChangeText={setMaxPatients}
              editable={!scheduleLocked}
            />
            <TouchableOpacity
              style={[styles.circleBtn, { backgroundColor: THEME.accentBlue }]}
              onPress={() => adjustMaxPatients(1)}
              disabled={scheduleLocked}
            >
              <Ionicons name="add" size={20} color={THEME.white} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, scheduleLocked && styles.disabledAction]}
          onPress={addShift}
          disabled={scheduleLocked}
        >
          <Text style={styles.addBtnText}>Add Shift to Schedule</Text>
          <View style={styles.addBtnCircle}>
            <Ionicons name="arrow-forward" size={20} color={THEME.accentBlue} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Active Shifts</Text>
        <View style={styles.shiftList}>
          {publishedShifts.length === 0 ? (
            <Text style={styles.emptyText}>No shifts added yet.</Text>
          ) : (
            publishedShifts.map((shift, index) => (
              <View key={`${shift.day}-${index}`} style={styles.shiftItem}>
                <View style={styles.shiftColorIndicator} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftDay}>{shift.day}</Text>
                  <Text style={styles.shiftTime}>
                    {formatTime(shift.start_time).time} {formatTime(shift.start_time).period} -{" "}
                    {formatTime(shift.end_time).time} {formatTime(shift.end_time).period}
                  </Text>
                </View>
                <View style={styles.shiftActions}>
                  <TouchableOpacity
                    style={[styles.editBtn, scheduleLocked && styles.disabledAction]}
                    onPress={() => handleEdit(shift)}
                    disabled={scheduleLocked}
                  >
                    <Ionicons name="create-outline" size={18} color={THEME.accentBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.trashBtn, scheduleLocked && styles.disabledAction]}
                    onPress={() => removePublishedShift(shift, index)}
                    disabled={scheduleLocked}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF5252" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {draftShifts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Draft Shifts</Text>
            <View style={styles.shiftList}>
              {draftShifts.map((shift, index) => (
                <View key={`${shift.day}-${index}-draft`} style={styles.shiftItem}>
                  <View style={styles.shiftColorIndicator} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shiftDay}>{shift.day}</Text>
                    <Text style={styles.shiftTime}>
                      {formatTime(shift.start_time).time} {formatTime(shift.start_time).period} -{" "}
                      {formatTime(shift.end_time).time} {formatTime(shift.end_time).period}
                    </Text>
                    <Text style={styles.draftBadge}>Draft</Text>
                  </View>
                  <View style={styles.shiftActions}>
                    <TouchableOpacity
                      style={[styles.editBtn, scheduleLocked && styles.disabledAction]}
                      onPress={() => handleEdit(shift)}
                      disabled={scheduleLocked}
                    >
                      <Ionicons name="create-outline" size={18} color={THEME.accentBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.trashBtn, scheduleLocked && styles.disabledAction]}
                      onPress={() => removeDraftShift(index)}
                      disabled={scheduleLocked}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF5252" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.publishBtn, scheduleLocked && styles.disabledAction]}
          onPress={handleConfirmPublish}
          disabled={publishing || draftShifts.length === 0 || scheduleLocked}
        >
          <Text style={styles.publishText}>
            {publishing ? "Publishing..." : "Publish Schedule"}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal visible={showPreview} animationType="slide">
        <DoctorSchedulePreview
          shifts={[...publishedShifts, ...draftShifts]}
          onConfirm={handleConfirmPublish}
          onClose={() => setShowPreview(false)}
        />
      </Modal>

      <Modal
        transparent
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => {
          setActiveTimeField(null);
          setShowEditModal(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setActiveTimeField(null);
            setShowEditModal(false);
          }}
        >
          <View style={styles.editModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Shifts</Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.glassCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="time-outline" size={20} color={THEME.accentBlue} />
                </View>
                <Text style={styles.cardTitle}>Shift Timing</Text>
              </View>

              <View style={styles.timePickerRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>START</Text>
                  <TouchableOpacity
                    style={styles.timeTrigger}
                    onPress={() => setActiveTimeField("start")}
                  >
                    <Text style={styles.timeValue}>{formatTime(startTime).time}</Text>
                    <Text style={styles.timeAmPm}>{formatTime(startTime).period}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeDivider}>
                  <View style={styles.line} />
                  <Ionicons name="arrow-forward-circle" size={22} color={THEME.border} />
                  <View style={styles.line} />
                </View>

                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>END</Text>
                  <TouchableOpacity
                    style={styles.timeTrigger}
                    onPress={() => setActiveTimeField("end")}
                  >
                    <Text style={styles.timeValue}>{formatTime(endTime).time}</Text>
                    <Text style={styles.timeAmPm}>{formatTime(endTime).period}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.capacityRow}>
              <View style={styles.capacityTextContent}>
                <Text style={styles.cardTitle}>Patient Capacity</Text>
                <Text style={styles.cardSubTitle}>Maximum sessions per shift</Text>
              </View>
              <View style={styles.capacityActions}>
                <TouchableOpacity style={styles.circleBtn} onPress={() => adjustMaxPatients(-1)}>
                  <Ionicons name="remove" size={20} color={THEME.textDark} />
                </TouchableOpacity>
                <TextInput
                  style={styles.capacityInput}
                  keyboardType="numeric"
                  value={maxPatients}
                  onChangeText={setMaxPatients}
                />
                <TouchableOpacity
                  style={[styles.circleBtn, { backgroundColor: THEME.accentBlue }]}
                  onPress={() => adjustMaxPatients(1)}
                >
                  <Ionicons name="add" size={20} color={THEME.white} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.mainBtn} onPress={handleSaveEditDraft}>
              <Text style={styles.mainBtnText}>Update Schedule</Text>
              <Ionicons name="checkmark-circle" size={20} color={THEME.white} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={activeTimeField !== null}
        animationType="slide"
        onRequestClose={() => setActiveTimeField(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveTimeField(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {activeTimeField === "start" ? "Start" : "End"} Time
              </Text>
              <TouchableOpacity onPress={() => setActiveTimeField(null)}>
                <Ionicons name="close" size={20} color={THEME.textGray} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={times}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected =
                  (activeTimeField === "start" && item === startTime) ||
                  (activeTimeField === "end" && item === endTime);
                const formatted = formatTime(item);
                return (
                  <TouchableOpacity
                    style={[styles.timeOption, isSelected && styles.timeOptionActive]}
                    onPress={() => handleSelectTime(item)}
                  >
                    <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextActive]}>
                      {formatted.time} {formatted.period}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const expandDay = (abbr: string) => {
  switch (abbr) {
    case "Mon":
      return "Monday";
    case "Tue":
      return "Tuesday";
    case "Wed":
      return "Wednesday";
    case "Thu":
      return "Thursday";
    case "Fri":
      return "Friday";
    case "Sat":
      return "Saturday";
    case "Sun":
      return "Sunday";
    default:
      return abbr;
  }
};

const shortenDay = (day: string) => {
  switch (day) {
    case "Monday":
      return "Mon";
    case "Tuesday":
      return "Tue";
    case "Wednesday":
      return "Wed";
    case "Thursday":
      return "Thu";
    case "Friday":
      return "Fri";
    case "Saturday":
      return "Sat";
    case "Sunday":
      return "Sun";
    default:
      return day;
  }
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  iconBtn: { width: 40, height: 40, justifyContent: "center" },
  saveBtn: {
    backgroundColor: THEME.softBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: { color: THEME.accentBlue, fontWeight: "700" },
  saveBtnDisabled: { backgroundColor: "#E8EEF5" },
  saveBtnTextDisabled: { color: "#94A3B8" },
  body: { flex: 1, backgroundColor: THEME.background },
  container: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: THEME.textDark, marginBottom: 15 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  disabledAction: { opacity: 0.5 },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF4E5",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#FFD9A8",
  },
  lockedBannerText: { flex: 1, fontSize: 12, fontWeight: "700", color: THEME.accentAmber },
  saveDaysBtn: {
    backgroundColor: THEME.softBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  saveDaysText: { color: THEME.accentBlue, fontWeight: "700", fontSize: 12 },
  helperText: {
    color: THEME.accentBlue,
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#EAF3FF",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: -6,
    marginBottom: 16,
  },

  dayGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  dayPill: {
    width: (width - 80) / 7,
    height: 50,
    borderRadius: 15,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  dayPillDisabled: { opacity: 0.5 },
  dayPillActive: { backgroundColor: THEME.textDark },
  dayPillText: { fontSize: 13, fontWeight: "700", color: THEME.textGray },
  textWhite: { color: THEME.white },

  elevatedCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 25 },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  cardMainTitle: { fontSize: 17, fontWeight: "800", color: THEME.textDark },
  cardSubTitle: { fontSize: 13, color: THEME.textGray, marginTop: 2 },

  timePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeBlock: { flex: 1 },
  timeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.textGray,
    letterSpacing: 1,
    marginBottom: 10,
  },
  timeButton: {
    backgroundColor: THEME.background,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  timeValue: { fontSize: 20, fontWeight: "800", color: THEME.textDark },
  timeAmPm: { fontSize: 12, fontWeight: "700", color: THEME.accentBlue, marginTop: 4 },
  connector: { width: 50, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  connectorLine: { flex: 1, height: 1, backgroundColor: THEME.border, marginHorizontal: 4 },

  capacityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 20,
    borderRadius: 24,
    marginBottom: 30,
  },
  capacityInfo: { flex: 1 },
  capacityActions: { flexDirection: "row", alignItems: "center", gap: 15 },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  capacityInput: { fontSize: 18, fontWeight: "800", color: THEME.textDark, width: 40, textAlign: "center" },

  shiftList: { marginBottom: 30 },
  shiftItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  shiftColorIndicator: {
    width: 4,
    height: 30,
    backgroundColor: THEME.accentBlue,
    borderRadius: 2,
    marginRight: 15,
  },
  shiftDay: { fontSize: 15, fontWeight: "700", color: THEME.textDark },
  shiftTime: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  draftBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#FFF7E6",
    color: "#FA8C16",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  shiftActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  editBtn: { padding: 8 },
  trashBtn: { padding: 8 },
  emptyText: { color: THEME.textGray, fontSize: 13 },

  addBtn: {
    backgroundColor: THEME.textDark,
    height: 64,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  addBtnText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  addBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  publishBtn: {
    backgroundColor: THEME.accentBlue,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  publishText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  editModalCard: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  doneText: { color: "#3B82F6", fontWeight: "700" },
  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  daySelector: { marginBottom: 20 },
  glassCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  timePickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeBox: { flex: 1 },
  timeDivider: { width: 60, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  line: { flex: 1, height: 1, backgroundColor: THEME.border, marginHorizontal: 4 },
  timeTrigger: {
    backgroundColor: "#F8FAFC",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  capacityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  capacityTextContent: { flex: 1 },
  inputContainer: {
    width: 60,
    height: 48,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mainBtn: {
    backgroundColor: THEME.textDark,
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: THEME.textDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  mainBtnText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  timeOption: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  timeOptionActive: {
    backgroundColor: THEME.softBlue,
    borderRadius: 10,
    borderBottomWidth: 0,
    marginVertical: 4,
  },
  timeOptionText: { fontSize: 16, color: THEME.textDark, fontWeight: "700" },
  timeOptionTextActive: { color: THEME.accentBlue },
});
