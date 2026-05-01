import React, { memo } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TimeSlotPill from "./TimeSlotPill";
import type { DayKey, TimeSlot } from "../../screens/doctor/scheduleTypes";

type DayAvailabilityRowProps = {
  dayKey: DayKey;
  dayLabel: string;
  isActive: boolean;
  slots: TimeSlot[];
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
  onToggleDay,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
}: DayAvailabilityRowProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dayLabel}>{dayLabel}</Text>
          <Text style={styles.dayStatus}>{isActive ? "Available" : "Not Available"}</Text>
        </View>

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
              <Ionicons name="alert-circle-outline" size={16} color="#94A3B8" />
              <Text style={styles.emptyStateText}>No time slots yet</Text>
            </View>
          )}

          <TouchableOpacity style={styles.addButton} activeOpacity={0.86} onPress={() => onAddSlot(dayKey)}>
            <Ionicons name="add" size={16} color="#2563EB" />
            <Text style={styles.addButtonLabel}>Add Time Slot</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.inactiveWrap}>
          <Text style={styles.inactiveText}>Not Available</Text>
        </View>
      )}
    </View>
  );
}

export default memo(DayAvailabilityRowComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  dayStatus: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  slotList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  inactiveWrap: {
    marginTop: 14,
  },
  inactiveText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginTop: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
});
