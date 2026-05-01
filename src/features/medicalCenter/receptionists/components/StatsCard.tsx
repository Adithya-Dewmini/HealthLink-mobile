import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles";

export function StatsCard({
  icon,
  label,
  value,
  tint,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
  color: string;
}) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
}
