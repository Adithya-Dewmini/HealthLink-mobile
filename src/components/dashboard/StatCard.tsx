import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type StatIconName = React.ComponentProps<typeof Ionicons>["name"];

export interface StatCardProps {
  icon: StatIconName;
  value: string;
  label: string;
  color: string;
  iconColor: string;
}

function StatCardComponent({ icon, value, label, color, iconColor }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBg, { backgroundColor: color }]}>
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
    width: "47.5%",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});
