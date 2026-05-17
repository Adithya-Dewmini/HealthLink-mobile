import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { patientTheme } from "../../../constants/patientTheme";

const THEME = patientTheme.colors;

type Props = {
  doctorName: string;
  clinicName: string;
  sessionTime: string;
  queueNumber?: number | null;
  currentServingNumber?: number | null;
  badgeLabel: string;
  badgeTone: "live" | "info" | "warning";
  message?: string | null;
  onPress: () => void;
};

const tonePalette = {
  live: { bg: "#DCFCE7", text: "#166534", accent: "#16A34A" },
  info: { bg: "#E0F2FE", text: "#075985", accent: "#0284C7" },
  warning: { bg: "#FEF3C7", text: "#92400E", accent: "#D97706" },
} as const;

export default function LiveQueueAppointmentCard({
  doctorName,
  clinicName,
  sessionTime,
  queueNumber,
  currentServingNumber,
  badgeLabel,
  badgeTone,
  message,
  onPress,
}: Props) {
  const palette = tonePalette[badgeTone];

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="radio-outline" size={20} color={palette.accent} />
        </View>
        <View style={styles.copyWrap}>
          <Text style={styles.eyebrow}>Live Queue Active</Text>
          <Text style={styles.doctorName} numberOfLines={1}>
            {doctorName}
          </Text>
          <Text style={styles.clinicName} numberOfLines={1}>
            {clinicName}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
          <Text style={[styles.badgeText, { color: palette.text }]}>{badgeLabel}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaPill icon="time-outline" label={sessionTime} />
        {queueNumber ? <MetaPill icon="ticket-outline" label={`Queue #${queueNumber}`} /> : null}
        {currentServingNumber ? <MetaPill icon="megaphone-outline" label={`Serving #${currentServingNumber}`} /> : null}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity style={styles.button} activeOpacity={0.88} onPress={onPress}>
        <Text style={styles.buttonText}>View Queue Progress</Text>
        <Ionicons name="arrow-forward" size={16} color={THEME.white} />
      </TouchableOpacity>
    </View>
  );
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={14} color={THEME.textDark} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.white,
    borderRadius: 26,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    ...patientTheme.shadows.soft,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
  },
  copyWrap: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textDark,
  },
  clinicName: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.background,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textDark,
  },
  message: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  button: {
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  buttonText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
