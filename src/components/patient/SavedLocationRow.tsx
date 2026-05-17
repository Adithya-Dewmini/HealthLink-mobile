import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { patientTheme } from "../../constants/patientTheme";
import type { PatientLocation } from "../../types/location";

type Props = {
  location: PatientLocation;
  selected?: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const iconForLabel = (label?: string | null) => {
  const normalized = String(label || "").trim().toLowerCase();
  if (normalized === "home") return "home";
  if (normalized === "work") return "briefcase";
  return "location";
};

export default function SavedLocationRow({ location, selected = false, onPress, onEdit, onDelete }: Props) {
  return (
    <TouchableOpacity style={[styles.row, selected ? styles.rowSelected : null]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconForLabel(location.label)} size={18} color={selected ? "#0284C7" : "#64748B"} />
      </View>
      <View style={styles.copy}>
        <View style={styles.topLine}>
          <Text style={styles.label}>{location.label || location.city || "Saved location"}</Text>
          {location.isDefault ? <Text style={styles.defaultChip}>Default</Text> : null}
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {location.formattedAddress}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={16} color="#475569" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: patientTheme.colors.border,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  rowSelected: {
    borderColor: "#38BDF8",
    backgroundColor: "#F0F9FF",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    color: patientTheme.colors.navy,
  },
  defaultChip: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0369A1",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  address: {
    fontSize: 13,
    lineHeight: 18,
    color: patientTheme.colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
});
