import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ScheduleCardItem = {
  clinic: string;
  start: string;
  end: string;
  label: string;
  patients: number;
};

type Props = {
  item: ScheduleCardItem;
  onPress: () => void;
};

const THEME = {
  white: "#FFFFFF",
  textDark: "#182033",
  textGray: "#6B7280",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  accentBlue: "#2F6FED",
  accentBlueSoft: "#EAF1FF",
  accentGreen: "#18B67A",
  accentGreenSoft: "#E8FBF3",
};

export default function ScheduleCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={18} color={THEME.accentBlue} />
        </View>
        <View style={styles.labelBadge}>
          <Text style={styles.labelBadgeText}>{item.label}</Text>
        </View>
      </View>

      <Text style={styles.clinicName} numberOfLines={2}>
        {item.clinic}
      </Text>
      <Text style={styles.timeRange}>
        {item.start} - {item.end}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.patientPill}>
          <Ionicons name="people-outline" size={14} color={THEME.accentGreen} />
          <Text style={styles.patientPillText}>{item.patients} patients</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={THEME.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.accentBlueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
  },
  labelBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.textGray,
    textTransform: "uppercase",
  },
  clinicName: {
    marginTop: 16,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: THEME.textDark,
  },
  timeRange: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textGray,
  },
  footerRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: THEME.accentGreenSoft,
  },
  patientPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.accentGreen,
  },
});
