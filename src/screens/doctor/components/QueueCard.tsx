import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  queueStatus: string | null;
  patientName: string;
  patientToken: string;
  helperText: string;
  buttonLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const THEME = {
  textDark: "#182033",
  textGray: "#6B7280",
  white: "#FFFFFF",
  accentBlue: "#2F6FED",
  accentBlueDark: "#1D4ED8",
  accentBlueSoft: "#EAF1FF",
};

export default function QueueCard({
  queueStatus,
  patientName,
  patientToken,
  helperText,
  buttonLabel,
  loading = false,
  disabled = false,
  onPress,
}: Props) {
  const statusLabel = queueStatus ? String(queueStatus).toUpperCase() : "IDLE";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>Queue Overview</Text>
          <Text style={styles.statusTitle}>{statusLabel}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusBadgeText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.tokenWrap}>
          <Text style={styles.tokenValue}>{patientToken}</Text>
          <Text style={styles.tokenLabel}>Current Token</Text>
        </View>

        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patientName}</Text>
          <Text style={styles.helperText}>{helperText}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
        activeOpacity={0.9}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={THEME.white} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color={THEME.white} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: THEME.textGray,
  },
  statusTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "900",
    color: THEME.textDark,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.accentBlueSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.accentBlue,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: THEME.accentBlueDark,
  },
  contentRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  tokenWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  tokenValue: {
    fontSize: 26,
    fontWeight: "900",
    color: THEME.textDark,
  },
  tokenLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textGray,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 19,
    fontWeight: "800",
    color: THEME.textDark,
  },
  helperText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textGray,
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: THEME.accentBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: THEME.white,
  },
});
