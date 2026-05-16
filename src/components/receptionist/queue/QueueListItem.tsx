import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { QueuePatient } from "../../../types/receptionistQueue";

const THEME = {
  primary: "#2196F3",
  secondary: "#2BB673",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  danger: "#EF4444",
  success: "#10B981",
  softBlue: "#E3F2FD",
  softSuccess: "#E8F8EF",
  softDanger: "#FEF2F2",
};

type Props = {
  item: QueuePatient;
  isActive: boolean;
};

function QueueListItemComponent({ item, isActive }: Props) {
  const statusStyle = getStatusStyle(item.status);
  const isWalkIn = item.isWalkIn === true || item.type === "Walk-in";

  return (
    <View style={[styles.itemCard, isActive && styles.activeItemCard]}>
      <View style={styles.itemLeft}>
        <Text style={styles.queueNo}>#{item.queueNo}</Text>
        <View style={styles.itemText}>
          <Text style={styles.patientName}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.subLabel, isActive && styles.activeLabel]}>
              {isActive ? "Currently in room" : item.status}
            </Text>
            <View style={[styles.sourcePill, isWalkIn ? styles.sourcePillWalkIn : styles.sourcePillBooked]}>
              <Text style={[styles.sourcePillText, isWalkIn ? styles.sourcePillWalkInText : styles.sourcePillBookedText]}>
                {isWalkIn ? "Walk-in" : "Booked"}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusLabel, { color: statusStyle.text }]} numberOfLines={1}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

function getStatusStyle(status: QueuePatient["status"]) {
  switch (status) {
    case "With Doctor":
      return { bg: THEME.softSuccess, text: THEME.secondary };
    case "Waiting":
      return { bg: THEME.softBlue, text: THEME.primary };
    case "Completed":
      return { bg: "#DCFCE7", text: THEME.success };
    case "Missed":
      return { bg: THEME.softDanger, text: THEME.danger };
    default:
      return { bg: "#F1F5F9", text: THEME.textSecondary };
  }
}

export default memo(QueueListItemComponent);

const styles = StyleSheet.create({
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 12,
  },
  activeItemCard: {
    borderColor: THEME.primary,
    borderWidth: 1.5,
    backgroundColor: "#F8FBFF",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  queueNo: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.textPrimary,
    width: 52,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  subLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontWeight: "600",
    marginTop: 3,
  },
  activeLabel: {
    color: THEME.primary,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sourcePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  sourcePillBooked: {
    backgroundColor: THEME.softBlue,
    borderColor: "#BFDBFE",
  },
  sourcePillWalkIn: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  sourcePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  sourcePillBookedText: {
    color: THEME.primary,
  },
  sourcePillWalkInText: {
    color: "#B45309",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "800",
  },
});
