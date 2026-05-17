import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { patientTheme } from "../../constants/patientTheme";

const THEME = patientTheme.colors;

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
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button_secondary: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  button_ghost: {
    backgroundColor: THEME.highlight,
    borderWidth: 1,
    borderColor: THEME.borderStrong,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
  text_primary: {
    color: "#FFFFFF",
  },
  text_secondary: {
    color: THEME.textPrimary,
  },
  text_ghost: {
    color: THEME.primary,
  },
});
