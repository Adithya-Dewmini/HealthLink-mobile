import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { patientTheme } from "../../constants/patientTheme";
import type { PatientLocation } from "../../types/location";

type Props = {
  loading?: boolean;
  label: string;
  location?: PatientLocation | null;
  onPress: () => void;
};

export default function PatientLocationButton({ loading = false, label, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.9}>
      <Ionicons name="location-sharp" size={15} color="#FFFFFF" />
      <View style={styles.copy}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
            {label}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.92)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    maxWidth: 160,
    borderRadius: 22,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
