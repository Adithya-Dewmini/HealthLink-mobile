import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type StatCardProps = {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  tintColor: string;
  iconColor: string;
};

const COLORS = {
  white: "#FFFFFF",
  textDark: "#1E293B",
  textGray: "#64748B",
  shadow: "#000000",
};

function StatCardComponent({
  label,
  value,
  icon,
  tintColor,
  iconColor,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tintColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default memo(StatCardComponent);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  value: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: "600",
  },
});
