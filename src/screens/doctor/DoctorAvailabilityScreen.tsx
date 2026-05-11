import React, { useCallback, useState, type ReactElement } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DayAvailabilityRow from "../../components/schedule/DayAvailabilityRow";
import type { AvailabilityMap, DayKey, TimeSlot } from "./scheduleTypes";
import { doctorColors } from "../../constants/doctorTheme";

const DAY_ORDER: Array<{ key: DayKey; label: string }> = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

type SlotEditorState = {
  day: DayKey;
  slotId?: string;
  start: string;
  end: string;
};

type DoctorAvailabilityScreenProps = {
  availability: AvailabilityMap;
  enabledDays: Record<DayKey, boolean>;
  isSaving: boolean;
  headerComponent?: ReactElement | null;
  onAvailabilityChange: (next: AvailabilityMap) => void;
  onEnabledDaysChange: (next: Record<DayKey, boolean>) => void;
  onSave: () => void;
};

const MAX_SLOTS_PER_DAY = 4;

function isValidTimeFormat(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function compareTimes(left: string, right: string) {
  return left.localeCompare(right);
}

function hasOverlap(slots: TimeSlot[], candidate: TimeSlot, ignoreId?: string) {
  return slots.some((slot) => {
    if (slot.id === ignoreId) return false;
    return candidate.start < slot.end && candidate.end > slot.start;
  });
}

export default function DoctorAvailabilityScreen({
  availability,
  enabledDays,
  isSaving,
  headerComponent,
  onAvailabilityChange,
  onEnabledDaysChange,
  onSave,
}: DoctorAvailabilityScreenProps) {
  const [editor, setEditor] = useState<SlotEditorState | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [dayErrors, setDayErrors] = useState<Partial<Record<DayKey, string>>>({});

  const handleToggleDay = useCallback(
    (day: DayKey, value: boolean) => {
      setDayErrors((current) => ({ ...current, [day]: undefined }));
      onEnabledDaysChange({
        ...enabledDays,
        [day]: value,
      });
      if (!value) {
        onAvailabilityChange({
          ...availability,
          [day]: [],
        });
        return;
      }
    },
    [availability, enabledDays, onAvailabilityChange, onEnabledDaysChange]
  );

  const handleAddSlot = useCallback((day: DayKey) => {
    if (availability[day].length >= MAX_SLOTS_PER_DAY) {
      setDayErrors((current) => ({
        ...current,
        [day]: `You can add up to ${MAX_SLOTS_PER_DAY} slots for a day.`,
      }));
      return;
    }

    setDayErrors((current) => ({ ...current, [day]: undefined }));
    setValidationMessage(null);
    setEditor({
      day,
      start: "09:00",
      end: "13:00",
    });
  }, []);

  const handleEditSlot = useCallback((day: DayKey, slot: TimeSlot) => {
    setDayErrors((current) => ({ ...current, [day]: undefined }));
    setValidationMessage(null);
    setEditor({
      day,
      slotId: slot.id,
      start: slot.start,
      end: slot.end,
    });
  }, []);

  const handleDeleteSlot = useCallback(
    (day: DayKey, slotId: string) => {
      onAvailabilityChange({
        ...availability,
        [day]: availability[day].filter((slot) => slot.id !== slotId),
      });
      setDayErrors((current) => ({ ...current, [day]: undefined }));
      setValidationMessage(null);
    },
    [availability, onAvailabilityChange]
  );

  const handleSaveSlot = useCallback(() => {
    if (!editor) return;

    const normalizedStart = editor.start.trim();
    const normalizedEnd = editor.end.trim();

    if (!isValidTimeFormat(normalizedStart) || !isValidTimeFormat(normalizedEnd)) {
      setValidationMessage("Use a valid 24-hour time like 09:00.");
      return;
    }

    if (compareTimes(normalizedStart, normalizedEnd) >= 0) {
      setValidationMessage("End time must be after start time.");
      setDayErrors((current) => ({
        ...current,
        [editor.day]: "One or more slots have an invalid time range.",
      }));
      return;
    }

    const candidate: TimeSlot = {
      id: editor.slotId ?? `slot-${Date.now()}`,
      start: normalizedStart,
      end: normalizedEnd,
    };

    if (hasOverlap(availability[editor.day], candidate, editor.slotId)) {
      setValidationMessage("This time range overlaps with another slot on the same day.");
      setDayErrors((current) => ({
        ...current,
        [editor.day]: "Time slots cannot overlap within the same day.",
      }));
      return;
    }

    const nextDaySlots = editor.slotId
      ? availability[editor.day].map((slot) => (slot.id === editor.slotId ? candidate : slot))
      : [...availability[editor.day], candidate];

    nextDaySlots.sort((left, right) => compareTimes(left.start, right.start));

    onAvailabilityChange({
      ...availability,
      [editor.day]: nextDaySlots,
    });
    setDayErrors((current) => ({ ...current, [editor.day]: undefined }));
    setEditor(null);
    setValidationMessage(null);
  }, [availability, editor, onAvailabilityChange]);

  const handlePressSave = useCallback(() => {
    const invalidDay = DAY_ORDER.find(({ key }) => hasInternalConflict(availability[key]));
    if (invalidDay) {
      setDayErrors((current) => ({
        ...current,
        [invalidDay.key]: "Resolve overlapping slots before saving.",
      }));
      Alert.alert("Schedule Conflict", `${invalidDay.label} has overlapping time slots.`);
      return;
    }

    onSave();
  }, [availability, onSave]);

  const renderDay = useCallback(
    ({ item }: { item: (typeof DAY_ORDER)[number] }) => (
      <DayAvailabilityRow
        dayKey={item.key}
        dayLabel={item.label}
        isActive={enabledDays[item.key]}
        slots={availability[item.key]}
        errorMessage={dayErrors[item.key]}
        onToggleDay={handleToggleDay}
        onAddSlot={handleAddSlot}
        onEditSlot={handleEditSlot}
        onDeleteSlot={handleDeleteSlot}
      />
    ),
    [availability, dayErrors, enabledDays, handleAddSlot, handleDeleteSlot, handleEditSlot, handleToggleDay]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={DAY_ORDER}
        keyExtractor={(item) => item.key}
        renderItem={renderDay}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.scrollContent}
        ItemSeparatorComponent={() => <View style={styles.daySpacer} />}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          activeOpacity={0.88}
          disabled={isSaving}
          onPress={handlePressSave}
        >
          <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Availability"}</Text>
        </TouchableOpacity>
        }
      />

      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditor(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editor?.slotId ? "Edit Time Slot" : "Add Time Slot"}</Text>
            <Text style={styles.modalSubtitle}>Use 24-hour format like 09:00.</Text>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Start</Text>
                <TextInput
                  value={editor?.start ?? ""}
                  onChangeText={(value) => setEditor((current) => (current ? { ...current, start: value } : current))}
                  style={styles.input}
                  placeholder="09:00"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End</Text>
                <TextInput
                  value={editor?.end ?? ""}
                  onChangeText={(value) => setEditor((current) => (current ? { ...current, end: value } : current))}
                  style={styles.input}
                  placeholder="13:00"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {validationMessage ? <Text style={styles.validationText}>{validationMessage}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => setEditor(null)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={handleSaveSlot}>
                <Text style={styles.primaryButtonText}>Save Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function hasInternalConflict(slots: TimeSlot[]) {
  const sorted = [...slots].sort((left, right) => compareTimes(left.start, right.start));
  for (let index = 0; index < sorted.length - 1; index += 1) {
    if (sorted[index].end > sorted[index + 1].start) {
      return true;
    }
  }
  return false;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  daySpacer: {
    height: 12,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: doctorColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: doctorColors.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: doctorColors.textSecondary,
    marginTop: 6,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: doctorColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: doctorColors.textPrimary,
  },
  validationText: {
    marginTop: 12,
    fontSize: 13,
    color: doctorColors.dangerText,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: doctorColors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: doctorColors.primary,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: doctorColors.surface,
  },
});
