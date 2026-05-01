import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  color: string;
};

export default function StatCard({ label, value, icon, tint, color }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "900",
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
});
