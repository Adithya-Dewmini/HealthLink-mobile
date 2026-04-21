import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface AppointmentItemProps {
  patient: string;
  time: string;
  status: "Completed" | "Pending" | "Missed";
}

const STATUS_COLORS = {
  Completed: "#10B981",
  Pending: "#F59E0B",
  Missed: "#EF4444",
} as const;

function AppointmentItemComponent({ patient, time, status }: AppointmentItemProps) {
  const statusColor = STATUS_COLORS[status];

  return (
    <View style={styles.item}>
      <Text style={styles.time}>{time}</Text>
      <Text style={styles.patient}>{patient}</Text>
      <View style={[styles.status, { backgroundColor: `${statusColor}20` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  );
}

export default memo(AppointmentItemComponent);

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  time: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    width: 84,
  },
  patient: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingRight: 8,
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
