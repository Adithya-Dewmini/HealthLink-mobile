import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type TimeSlotPillProps = {
  start: string;
  end: string;
  onEdit: () => void;
  onDelete: () => void;
};

function TimeSlotPillComponent({ start, end, onEdit, onDelete }: TimeSlotPillProps) {
  return (
    <View style={styles.pill}>
      <TouchableOpacity style={styles.editAction} activeOpacity={0.85} onPress={onEdit}>
        <Ionicons name="time-outline" size={14} color="#2563EB" />
        <Text style={styles.label}>
          {start} - {end}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteAction} activeOpacity={0.85} onPress={onDelete}>
        <Ionicons name="close" size={14} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
}

export default memo(TimeSlotPillComponent);

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    overflow: "hidden",
  },
  editAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  deleteAction: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderLeftColor: "#DBEAFE",
    backgroundColor: "#F8FAFC",
  },
});
