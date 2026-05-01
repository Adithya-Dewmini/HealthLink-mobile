import React, { memo } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ScheduleCardProps = {
  clinicName: string;
  startTime: string;
  endTime: string;
  dayLabel: string;
  patientsCount: number;
  status?: string;
  onPress: () => void;
};

const { width } = Dimensions.get("window");
export const SCHEDULE_CARD_WIDTH = width * 0.8;
export const SCHEDULE_CARD_SPACING = 12;

const COLORS = {
  white: "#FFFFFF",
  textDark: "#1E293B",
  textGray: "#64748B",
  textMuted: "#94A3B8",
  badgeBg: "#F1F5F9",
  badgeText: "#475569",
  accentBlue: "#3B82F6",
  accentBlueSoft: "#EAF1FF",
  accentGreen: "#16A34A",
  accentGreenSoft: "#ECFDF3",
  shadow: "#000000",
};

function ScheduleCardComponent({
  clinicName,
  startTime,
  endTime,
  dayLabel,
  patientsCount,
  status = "Upcoming",
  onPress,
}: ScheduleCardProps) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{dayLabel}</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.statusText}>{status}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </View>

      <Text style={styles.clinicName} numberOfLines={2}>
        {clinicName}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.timeWrap}>
          <Ionicons name="time-outline" size={16} color={COLORS.textGray} />
          <Text style={styles.time}>
            {startTime} - {endTime}
          </Text>
        </View>

        <View style={styles.patientBadge}>
          <Text style={styles.patientCount}>{patientsCount} Patients</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(ScheduleCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    width: SCHEDULE_CARD_WIDTH,
    padding: 16,
    borderRadius: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    marginRight: SCHEDULE_CARD_SPACING,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.badgeText,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textGray,
  },
  clinicName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  time: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.textGray,
    fontWeight: "500",
  },
  patientBadge: {
    backgroundColor: COLORS.accentBlueSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  patientCount: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accentBlue,
  },
});
