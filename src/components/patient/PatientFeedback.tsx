import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { patientTheme } from "../../constants/patientTheme";

const THEME = patientTheme.colors;

type IconName = keyof typeof Ionicons.glyphMap;

export function PatientLoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.stateWrap}>
      <ActivityIndicator size="large" color={THEME.modernAccent} />
      <Text style={styles.stateTitle}>{label}</Text>
    </View>
  );
}

export function PatientEmptyState({
  title,
  message,
  icon = "file-tray-outline",
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateWrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={THEME.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateText}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onAction} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function PatientErrorState({
  title = "We could not load this right now",
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateWrap}>
      <View style={[styles.iconCircle, styles.errorCircle]}>
        <Ionicons name="alert-circle-outline" size={30} color={THEME.danger} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateText}>{message}</Text> : null}
      {onRetry ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onRetry} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: THEME.modernBorder,
  },
  errorCircle: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.modernAccent,
  },
  primaryButtonText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
