import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
};

export default function QuickReplyButton({ label, onPress, variant = "secondary" }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, styles[`button_${variant}`]]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Text style={[styles.text, styles[`text_${variant}`]]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  button_primary: {
    backgroundColor: "#0F766E",
    shadowColor: "#0F766E",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button_secondary: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0B3954",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button_ghost: {
    backgroundColor: "#EAF7FA",
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
  text_primary: {
    color: "#FFFFFF",
  },
  text_secondary: {
    color: "#12344E",
  },
  text_ghost: {
    color: "#0F5E78",
  },
});
