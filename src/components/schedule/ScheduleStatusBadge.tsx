import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { doctorColors, getDoctorStatusPalette, type DoctorStatusTone } from "../../constants/doctorTheme";

type ScheduleStatusBadgeProps = {
  label: string;
  tone?: DoctorStatusTone;
};

export default function ScheduleStatusBadge({
  label,
  tone = "upcoming",
}: ScheduleStatusBadgeProps) {
  const palette = getDoctorStatusPalette(tone);

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.text, { color: palette.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
