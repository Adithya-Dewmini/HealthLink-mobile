import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  createDoctorExternalSession,
  deleteDoctorExternalSession,
  fetchDoctorExternalSessions,
  fetchDoctorSessionsRange,
} from "../../services/doctorScheduleService";
import { getSocket } from "../../services/socket";
import type { DoctorExternalSession, ScheduleSession } from "./scheduleTypes";
import {
  doctorColors,
  getDoctorStatusPalette,
  type DoctorStatusTone,
} from "../../constants/doctorTheme";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";

type RoutineTabProps = {
  onPreview?: () => void;
};

type WeeklyPatternItem = {
  id: string;
  day: string;
  dayOrder: number;
  startTime: string;
  endTime: string;
  clinicName: string;
  note?: string | null;
  source: "internal" | "external";
  hasConflict?: boolean;
  conflictReason?: string | null;
  bookingCount?: number | null;
  sessionStatus?: string | null;
};

const WEEKDAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const SHORT_DAY_OPTIONS = [
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
  { key: 0, label: "Sun" },
] as const;

const formatLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const parseTimeToDate = (value: string) => {
  const base = new Date();
  const [hours = "09", minutes = "00"] = String(value || "").split(":");
  base.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return base;
};

const formatPickerTime = (value: Date) =>
  `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;

const formatClock = (value: string) => {
  const [hourRaw = "00", minuteRaw = "00"] = String(value || "").split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const getWeekdayLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString("en-US", { weekday: "long" });
};

const normalizeStatusTone = (status?: string | null, hasConflict?: boolean): DoctorStatusTone => {
  if (hasConflict) {
    return "conflict";
  }
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active" || normalized === "live") {
    return "live";
  }
  if (normalized === "completed") {
    return "completed";
  }
  if (normalized === "cancelled" || normalized === "missed") {
    return "cancelled";
  }
  return "upcoming";
};

const normalizeSessionLabel = (status?: string | null, hasConflict?: boolean) => {
  if (hasConflict) {
    return "Conflict";
  }
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active" || normalized === "live") {
    return "Live";
  }
  if (normalized === "completed") {
    return "Completed";
  }
  if (normalized === "cancelled" || normalized === "missed") {
    return "Cancelled";
  }
  return "Upcoming";
};

const groupSessions = (sessions: ScheduleSession[]): WeeklyPatternItem[] => {
  const grouped = new Map<string, WeeklyPatternItem>();

  sessions.forEach((session) => {
    const day = getWeekdayLabel(session.date);
    const clinicKey = String(session.clinicId || session.clinicName || "").trim().toLowerCase();
    const key = `${day}_${session.startTime}_${session.endTime}_${clinicKey}`;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        id: key,
        day,
        dayOrder: WEEKDAY_ORDER[day] ?? 99,
        startTime: session.startTime,
        endTime: session.endTime,
        clinicName: session.clinicName,
        note: session.note ?? null,
        source: "internal",
        hasConflict: false,
        bookingCount: session.patientCount ?? 0,
        sessionStatus: session.status,
      });
      return;
    }

    grouped.set(key, {
      ...existing,
      bookingCount: (existing.bookingCount ?? 0) + (session.patientCount ?? 0),
      sessionStatus:
        normalizeStatusTone(session.status) === "live"
          ? session.status
          : existing.sessionStatus ?? session.status,
    });
  });

  return [...grouped.values()].sort((left, right) => {
    if (left.dayOrder !== right.dayOrder) return left.dayOrder - right.dayOrder;
    if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
    if (left.endTime !== right.endTime) return left.endTime.localeCompare(right.endTime);
    return left.clinicName.localeCompare(right.clinicName);
  });
};

const groupExternalSessions = (sessions: DoctorExternalSession[]): WeeklyPatternItem[] =>
  [...sessions]
    .map((session) => ({
      id: session.id,
      day: session.day,
      dayOrder: WEEKDAY_ORDER[session.day] ?? 99,
      startTime: session.startTime,
      endTime: session.endTime,
      clinicName: session.clinicName,
      note: session.note ?? null,
      source: "external" as const,
      hasConflict: Boolean(session.hasConflict),
      conflictReason: session.conflictReason ?? null,
      bookingCount: null,
      sessionStatus: session.hasConflict ? "Conflict" : "Upcoming",
    }))
    .sort((left, right) => {
      if (left.dayOrder !== right.dayOrder) return left.dayOrder - right.dayOrder;
      if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
      if (left.endTime !== right.endTime) return left.endTime.localeCompare(right.endTime);
      return left.clinicName.localeCompare(right.clinicName);
    });

const DayPill = ({
  day,
  isSelected,
  onPress,
}: {
  day: string;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.sheetDayPill, isSelected && styles.sheetDayPillSelected]}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={`Select ${day}`}
  >
    <Text style={[styles.sheetDayPillText, isSelected && styles.sheetDayPillTextSelected]}>{day}</Text>
  </TouchableOpacity>
);

const TimeInput = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.sheetTimeInputContainer} onPress={onPress} activeOpacity={0.88}>
    <Text style={styles.sheetInputLabel}>{label}</Text>
    <View style={styles.sheetInputBox}>
      <Text style={styles.sheetInputText}>{value}</Text>
      <Ionicons name="time-outline" size={18} color={doctorColors.textSecondary} />
    </View>
  </TouchableOpacity>
);

export default function RoutineTab(_: RoutineTabProps) {
  const externalSheetRef = useRef<BottomSheetModal>(null);
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [externalSessions, setExternalSessions] = useState<DoctorExternalSession[]>([]);
  const [supportsExternalSessions, setSupportsExternalSessions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [savingExternal, setSavingExternal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<"startTime" | "endTime" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [externalForm, setExternalForm] = useState({
    dayOfWeek: 1,
    startTime: "",
    endTime: "",
    clinicName: "",
    note: "",
  });
  const externalSheetSnapPoints = useMemo(() => ["78%"], []);

  const resetExternalForm = useCallback(() => {
    setExternalForm({
      dayOfWeek: 1,
      startTime: "",
      endTime: "",
      clinicName: "",
      note: "",
    });
    setFormError(null);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const start = formatLocalDateKey(new Date());
      const end = formatLocalDateKey(addDays(new Date(), 90));
      const data = await fetchDoctorSessionsRange(start, end);

      let external: DoctorExternalSession[] = [];
      try {
        external = await fetchDoctorExternalSessions();
        setSupportsExternalSessions(true);
      } catch {
        setSupportsExternalSessions(false);
      }

      const sorted = [...data].sort((left, right) =>
        `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`)
      );

      setSessions(sorted);
      setExternalSessions(external);
    } catch (err) {
      setSessions([]);
      setExternalSessions([]);
      setSupportsExternalSessions(false);
      setError(err instanceof Error ? err.message : "Could not load your routine.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = () => {
      void loadSessions();
    };

    socket.on("schedule:update", handleScheduleUpdate);
    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
    };
  }, [loadSessions]);

  useEffect(() => {
    if (showExternalModal) {
      externalSheetRef.current?.present();
    } else {
      externalSheetRef.current?.dismiss();
    }
  }, [showExternalModal]);

  const groupedSessions = useMemo(() => {
    const internal = groupSessions(sessions);
    const external = groupExternalSessions(externalSessions);
    return [...internal, ...external].sort((left, right) => {
      if (left.dayOrder !== right.dayOrder) return left.dayOrder - right.dayOrder;
      if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
      if (left.endTime !== right.endTime) return left.endTime.localeCompare(right.endTime);
      if (left.clinicName !== right.clinicName) return left.clinicName.localeCompare(right.clinicName);
      return left.source.localeCompare(right.source);
    });
  }, [externalSessions, sessions]);

  const internalItems = useMemo(
    () => groupedSessions.filter((item) => item.source === "internal"),
    [groupedSessions]
  );
  const externalItems = useMemo(
    () => groupedSessions.filter((item) => item.source === "external"),
    [groupedSessions]
  );

  const closeExternalSheet = useCallback(() => {
    setShowExternalModal(false);
  }, []);

  const renderExternalSheetBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    []
  );

  const validateExternalForm = useCallback(() => {
    const location = externalForm.clinicName.trim();
    const startTime = externalForm.startTime.trim();
    const endTime = externalForm.endTime.trim();
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!location) {
      return "Add an external location or clinic name.";
    }
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return "Select a valid start and end time.";
    }
    if (startTime >= endTime) {
      return "End time must be later than the start time.";
    }
    return null;
  }, [externalForm]);

  const handleSaveExternalSession = useCallback(async () => {
    const validationError = validateExternalForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSavingExternal(true);
      setFormError(null);
      setSaveSuccess(null);
      const result = await createDoctorExternalSession({
        dayOfWeek: externalForm.dayOfWeek,
        startTime: externalForm.startTime.trim(),
        endTime: externalForm.endTime.trim(),
        clinicName: externalForm.clinicName.trim(),
        note: externalForm.note.trim(),
      });
      setExternalSessions(result.sessions);
      setSaveSuccess("External session added.");
      resetExternalForm();

      if (result.hasConflict && result.conflictReason) {
        setFormError(result.conflictReason);
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save your external session right now."
      );
    } finally {
      setSavingExternal(false);
    }
  }, [externalForm, resetExternalForm, validateExternalForm]);

  const renderExternalSheetFooter = useCallback(
    (props: React.ComponentProps<typeof BottomSheetFooter>) => {
      const isDisabled = savingExternal || Boolean(validateExternalForm());
      return (
        <BottomSheetFooter {...props}>
          <View style={styles.sheetFooterContainer}>
            <TouchableOpacity style={styles.sheetCancelButton} onPress={closeExternalSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetSaveButton, isDisabled && styles.sheetSaveButtonDisabled]}
              disabled={isDisabled}
              onPress={() => void handleSaveExternalSession()}
            >
              <Text style={styles.sheetSaveText}>
                {savingExternal ? "Saving..." : "Save External Session"}
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetFooter>
      );
    },
    [closeExternalSheet, handleSaveExternalSession, savingExternal, validateExternalForm]
  );

  const handleDeleteExternal = useCallback((item: WeeklyPatternItem) => {
    Alert.alert("Delete External Session", "Remove this outside commitment from your routine?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(item.id);
            const next = await deleteDoctorExternalSession(item.id);
            setExternalSessions(next);
          } catch (err) {
            Alert.alert(
              "Delete Failed",
              err instanceof Error ? err.message : "Could not delete this external session."
            );
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }, []);

  const renderRoutineCard = useCallback(
    ({ item }: { item: WeeklyPatternItem }) => {
      const statusLabel = normalizeSessionLabel(item.sessionStatus, item.hasConflict);
      const statusTone = normalizeStatusTone(item.sessionStatus, item.hasConflict);
      const statusPalette = getDoctorStatusPalette(statusTone);
      const isExternal = item.source === "external";

      return (
        <View style={[styles.card, isExternal ? styles.externalCard : styles.internalCard]}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardDayBlock}>
              <Text style={styles.cardDay}>{item.day}</Text>
              <Text style={styles.cardTime}>
                {formatClock(item.startTime)} - {formatClock(item.endTime)}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <ScheduleStatusBadge label={statusLabel} tone={statusTone} />
              {isExternal ? (
                <TouchableOpacity
                  style={styles.deleteExternalButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete external session at ${item.clinicName}`}
                  activeOpacity={0.88}
                  disabled={deletingId === item.id}
                  onPress={() => handleDeleteExternal(item)}
                >
                  <Ionicons name="trash-outline" size={16} color={doctorColors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.locationRow}>
            <Ionicons
              name={isExternal ? "navigate-outline" : "business-outline"}
              size={16}
              color={doctorColors.primary}
            />
            <Text style={styles.locationName} numberOfLines={2}>
              {item.clinicName}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.sourcePill, isExternal ? styles.externalPill : styles.internalPill]}>
              <Text style={[styles.sourcePillText, isExternal ? styles.externalPillText : styles.internalPillText]}>
                {isExternal ? "External Session" : "Clinic Routine"}
              </Text>
            </View>
            {!isExternal && typeof item.bookingCount === "number" ? (
              <View style={styles.bookingPill}>
                <Ionicons name="people-outline" size={14} color={doctorColors.primary} />
                <Text style={styles.bookingPillText}>
                  {item.bookingCount} booking{item.bookingCount === 1 ? "" : "s"}
                </Text>
              </View>
            ) : null}
          </View>

          {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}

          {item.hasConflict ? (
            <View style={[styles.conflictBox, { backgroundColor: statusPalette.backgroundColor }]}>
              <View style={styles.conflictHeader}>
                <Ionicons name="warning-outline" size={16} color={statusPalette.textColor} />
                <Text style={[styles.conflictTitle, { color: statusPalette.textColor }]}>
                  Schedule conflict
                </Text>
              </View>
              <Text style={styles.conflictText}>
                {item.conflictReason || "This overlaps with another session in your routine."}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [deletingId, handleDeleteExternal]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={doctorColors.primary} />
          <Text style={styles.centerStateText}>Loading your routine...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerEmptyState}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={38} color={doctorColors.warningText} />
          </View>
          <Text style={styles.emptyTitle}>Could not load your routine</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.88} onPress={() => void loadSessions()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={[{ key: "content" }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <View style={styles.content}>
            <View style={styles.helperBanner}>
              <Ionicons name="information-circle-outline" size={18} color={doctorColors.deep} />
              <Text style={styles.helperBannerText}>
                Clinic routines are assigned by medical centers. External sessions are your outside commitments and help prevent booking conflicts.
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Clinic Routines</Text>
                  <Text style={styles.sectionSubtitle}>
                    Your medical centers will appear here once they assign your schedule.
                  </Text>
                </View>
              </View>
              {internalItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardTitle}>No clinic sessions assigned for this day.</Text>
                  <Text style={styles.emptyCardText}>
                    Your medical centers will appear here once they assign your schedule.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={internalItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRoutineCard}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.cardGap} />}
                />
              )}
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>External Sessions</Text>
                  <Text style={styles.sectionSubtitle}>
                    Add outside clinic hours to avoid booking conflicts.
                  </Text>
                </View>
                {supportsExternalSessions ? (
                  <TouchableOpacity
                    style={styles.addExternalButton}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel="Add external session"
                    onPress={() => {
                      resetExternalForm();
                      setSaveSuccess(null);
                      setShowExternalModal(true);
                    }}
                  >
                    <Ionicons name="add" size={16} color={doctorColors.surface} />
                    <Text style={styles.addExternalButtonText}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {!supportsExternalSessions ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardTitle}>External sessions are unavailable right now.</Text>
                  <Text style={styles.emptyCardText}>
                    Try again shortly. Your clinic routines will continue to work normally.
                  </Text>
                </View>
              ) : externalItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardTitle}>No external commitments added.</Text>
                  <Text style={styles.emptyCardText}>
                    Add outside clinic hours to avoid booking conflicts.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={externalItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRoutineCard}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.cardGap} />}
                />
              )}
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      {supportsExternalSessions ? (
        <>
          <BottomSheetModal
            ref={externalSheetRef}
            snapPoints={externalSheetSnapPoints}
            backdropComponent={renderExternalSheetBackdrop}
            footerComponent={renderExternalSheetFooter}
            handleIndicatorStyle={styles.sheetHandle}
            backgroundStyle={styles.sheetBackground}
            onDismiss={() => {
              setShowExternalModal(false);
              setSavingExternal(false);
              setTimePickerTarget(null);
            }}
          >
            <BottomSheetView style={styles.sheetContentContainer}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderCopy}>
                  <Text style={styles.sheetTitle}>Add External Session</Text>
                  <Text style={styles.sheetSubtitle}>
                    Add sessions outside your medical-center routine.
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close external session form"
                  onPress={closeExternalSheet}
                >
                  <Ionicons name="close" size={24} color={doctorColors.textPrimary} />
                </TouchableOpacity>
              </View>

              {saveSuccess ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={doctorColors.successText} />
                  <Text style={styles.successBannerText}>{saveSuccess}</Text>
                </View>
              ) : null}

              <View style={styles.sheetHelperCard}>
                <Text style={styles.sheetHelperTitle}>Avoid conflicts</Text>
                <Text style={styles.sheetHelperText}>
                  External sessions block off time when you are working outside your assigned medical centers.
                </Text>
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>Day</Text>
                <View style={styles.sheetDaysRow}>
                  {SHORT_DAY_OPTIONS.map((option) => (
                    <DayPill
                      key={option.key}
                      day={option.label}
                      isSelected={externalForm.dayOfWeek === option.key}
                      onPress={() => setExternalForm((prev) => ({ ...prev, dayOfWeek: option.key }))}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>Time Range</Text>
                <View style={styles.sheetTimeRow}>
                  <TimeInput
                    label="Start"
                    value={externalForm.startTime ? formatClock(externalForm.startTime) : "Select time"}
                    onPress={() => setTimePickerTarget("startTime")}
                  />
                  <TimeInput
                    label="End"
                    value={externalForm.endTime ? formatClock(externalForm.endTime) : "Select time"}
                    onPress={() => setTimePickerTarget("endTime")}
                  />
                </View>
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>External Location</Text>
                <TextInput
                  value={externalForm.clinicName}
                  onChangeText={(value) => {
                    setFormError(null);
                    setExternalForm((prev) => ({ ...prev, clinicName: value }));
                  }}
                  placeholder="Enter external clinic or location"
                  style={styles.sheetTextInput}
                  placeholderTextColor={doctorColors.textMuted}
                />
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>Notes</Text>
                <TextInput
                  value={externalForm.note}
                  onChangeText={(value) => {
                    setFormError(null);
                    setExternalForm((prev) => ({ ...prev, note: value }));
                  }}
                  placeholder="Optional details for this external session"
                  style={[styles.sheetTextInput, styles.sheetMultilineInput]}
                  placeholderTextColor={doctorColors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {formError ? (
                <View style={styles.formErrorBox}>
                  <Ionicons name="warning-outline" size={16} color={doctorColors.warningText} />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}
            </BottomSheetView>
          </BottomSheetModal>

          <DateTimePickerModal
            isVisible={timePickerTarget !== null}
            mode="time"
            date={parseTimeToDate(
              timePickerTarget === "startTime" ? externalForm.startTime : externalForm.endTime
            )}
            onConfirm={(date) => {
              const nextValue = formatPickerTime(date);
              setFormError(null);
              setExternalForm((prev) => ({
                ...prev,
                [timePickerTarget || "startTime"]: nextValue,
              }));
              setTimePickerTarget(null);
            }}
            onCancel={() => setTimePickerTarget(null)}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: doctorColors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 18,
  },
  helperBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E8F6F6",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: doctorColors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  helperBannerText: {
    flex: 1,
    color: doctorColors.deep,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: doctorColors.textSecondary,
  },
  addExternalButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: doctorColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addExternalButtonText: {
    color: doctorColors.surface,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: doctorColors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: doctorColors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  emptyCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  emptyCardText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  cardGap: {
    height: 12,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    shadowColor: doctorColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  internalCard: {
    backgroundColor: doctorColors.card,
    borderWidth: 1,
    borderColor: doctorColors.border,
  },
  externalCard: {
    backgroundColor: "#FCFFFF",
    borderWidth: 1.5,
    borderColor: "#BDDCDD",
    borderStyle: "dashed",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardDayBlock: {
    flex: 1,
    gap: 4,
  },
  cardDay: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  cardTime: {
    fontSize: 14,
    lineHeight: 19,
    color: doctorColors.textSecondary,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteExternalButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#EFF8F8",
    borderWidth: 1,
    borderColor: doctorColors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  locationRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: doctorColors.textPrimary,
    fontWeight: "600",
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  sourcePill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  internalPill: {
    backgroundColor: "#E8F6F6",
  },
  externalPill: {
    backgroundColor: "#F1FAFB",
    borderWidth: 1,
    borderColor: "#B8DBDE",
  },
  sourcePillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  internalPillText: {
    color: doctorColors.deep,
  },
  externalPillText: {
    color: doctorColors.primary,
  },
  bookingPill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F2FBFB",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookingPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: doctorColors.primary,
  },
  noteText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: doctorColors.textSecondary,
  },
  conflictBox: {
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  conflictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  conflictTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  conflictText: {
    marginTop: 6,
    color: doctorColors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerStateText: {
    fontSize: 14,
    color: doctorColors.textSecondary,
  },
  centerEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  errorIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: doctorColors.warningBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  emptyDescription: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  retryButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: doctorColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    color: doctorColors.surface,
    fontWeight: "700",
    fontSize: 14,
  },
  sheetHandle: {
    backgroundColor: "#B7CFD1",
  },
  sheetBackground: {
    backgroundColor: doctorColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sheetHeaderCopy: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  sheetHelperCard: {
    borderRadius: 20,
    backgroundColor: "#ECF8F7",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetHelperTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: doctorColors.deep,
  },
  sheetHelperText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: doctorColors.textSecondary,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: doctorColors.successBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successBannerText: {
    flex: 1,
    color: doctorColors.successText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  sheetSection: {
    gap: 10,
  },
  sheetSectionLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  sheetDaysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetDayPill: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: doctorColors.border,
    backgroundColor: doctorColors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetDayPillSelected: {
    backgroundColor: doctorColors.deep,
    borderColor: doctorColors.deep,
  },
  sheetDayPillText: {
    color: doctorColors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  sheetDayPillTextSelected: {
    color: doctorColors.surface,
  },
  sheetTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  sheetTimeInputContainer: {
    flex: 1,
    gap: 8,
  },
  sheetInputLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: doctorColors.textSecondary,
    fontWeight: "600",
  },
  sheetInputBox: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: doctorColors.border,
    backgroundColor: doctorColors.card,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sheetInputText: {
    color: doctorColors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  sheetTextInput: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: doctorColors.border,
    backgroundColor: doctorColors.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: doctorColors.textPrimary,
    fontSize: 14,
  },
  sheetMultilineInput: {
    minHeight: 108,
    textAlignVertical: "top",
  },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 18,
    backgroundColor: doctorColors.warningBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formErrorText: {
    flex: 1,
    color: doctorColors.warningText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  sheetFooterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: doctorColors.surface,
    borderTopWidth: 1,
    borderTopColor: doctorColors.border,
    flexDirection: "row",
    gap: 12,
  },
  sheetCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: doctorColors.border,
    backgroundColor: doctorColors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetCancelText: {
    color: doctorColors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  sheetSaveButton: {
    flex: 1.3,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: doctorColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetSaveButtonDisabled: {
    opacity: 0.45,
  },
  sheetSaveText: {
    color: doctorColors.surface,
    fontSize: 14,
    fontWeight: "700",
  },
});
