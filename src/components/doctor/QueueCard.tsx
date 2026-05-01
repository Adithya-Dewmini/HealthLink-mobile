import React, { memo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type QueueStatus = "IDLE" | "LIVE";

type QueueCardProps = {
  status: QueueStatus;
  currentToken: string;
  estimatedWait: string;
  title?: string;
  subtitle: string;
  buttonLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onStartPress: () => void;
};

const COLORS = {
  white: "#FFFFFF",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  blueBorder: "#D7E5FF",
  green: "#22C55E",
  greenSoft: "#E8F8EE",
  slate: "#64748B",
  slateSoft: "#F1F5F9",
  textDark: "#1E293B",
  textGray: "#64748B",
  textMuted: "#94A3B8",
};

function QueueCardComponent({
  status,
  currentToken,
  estimatedWait,
  title = "Consultation Queue",
  subtitle,
  buttonLabel,
  loading = false,
  disabled = false,
  onStartPress,
}: QueueCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View
          style={[
            styles.badge,
            status === "LIVE" ? styles.badgeLive : styles.badgeIdle,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: status === "LIVE" ? COLORS.green : COLORS.slate },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Token</Text>
          <Text style={styles.detailValue}>{currentToken}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Estimated wait</Text>
          <Text style={styles.detailValue}>{estimatedWait}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, disabled ? styles.buttonDisabled : null]}
        activeOpacity={0.85}
        onPress={onStartPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.blue} />
        ) : (
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default memo(QueueCardComponent);

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.blueBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: COLORS.textGray,
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeLive: {
    backgroundColor: COLORS.greenSoft,
  },
  badgeIdle: {
    backgroundColor: COLORS.slateSoft,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: COLORS.textDark,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    marginBottom: 18,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: COLORS.textMuted,
  },
  detailValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  detailDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  button: {
    marginTop: 20,
    backgroundColor: COLORS.blue,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
