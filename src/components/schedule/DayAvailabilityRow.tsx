import React, { memo } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TimeSlotPill from "./TimeSlotPill";
import type { DayKey, TimeSlot } from "../../screens/doctor/scheduleTypes";

export type DayAvailabilityRowProps = {
  dayKey: DayKey;
  dayLabel: string;
  isActive: boolean;
  slots: TimeSlot[];
  errorMessage?: string | null;
  onToggleDay: (day: DayKey, value: boolean) => void;
  onAddSlot: (day: DayKey) => void;
  onEditSlot: (day: DayKey, slot: TimeSlot) => void;
  onDeleteSlot: (day: DayKey, slotId: string) => void;
};

function DayAvailabilityRowComponent({
  dayKey,
  dayLabel,
  isActive,
  slots,
  errorMessage,
  onToggleDay,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
}: DayAvailabilityRowProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.dayLabel}>{dayLabel}</Text>

        <Switch
          value={isActive}
          onValueChange={(value) => onToggleDay(dayKey, value)}
          trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
          thumbColor="#FFFFFF"
        />
      </View>

      {isActive ? (
        <>
          {slots.length > 0 ? (
            <View style={styles.slotList}>
              {slots.map((slot) => (
                <TimeSlotPill
                  key={slot.id}
                  start={slot.start}
                  end={slot.end}
                  onEdit={() => onEditSlot(dayKey, slot)}
                  onDelete={() => onDeleteSlot(dayKey, slot.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No shifts yet</Text>
            </View>
          )}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={15} color="#B45309" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.addButton} activeOpacity={0.86} onPress={() => onAddSlot(dayKey)}>
            <Text style={styles.addButtonLabel}>+ Add Shift</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.inactiveWrap}>
          <Text style={styles.inactiveText}>Unavailable</Text>
        </View>
      )}
    </View>
  );
}

export default memo(DayAvailabilityRowComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  slotList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  emptyState: {
    marginTop: 8,
    paddingVertical: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
  },
  inactiveWrap: {
    marginTop: 8,
    paddingVertical: 6,
  },
  inactiveText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  addButton: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
});
