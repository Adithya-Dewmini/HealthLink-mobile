import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppointmentItem, AppointmentStatus } from "../../../types/appointments";
import { getPatientStatusTone, patientTheme } from "../../../constants/patientTheme";

const THEME = patientTheme.colors;

const getStatusPalette = (status: AppointmentStatus) => {
  switch (status) {
    case "UPCOMING":
      return getPatientStatusTone("upcoming");
    case "COMPLETED":
      return getPatientStatusTone("completed");
    case "MISSED":
      return getPatientStatusTone("missed");
    case "CANCELLED":
      return getPatientStatusTone("cancelled");
    default:
      return getPatientStatusTone("upcoming");
  }
};

export default function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
  onGoToQueue,
  onViewSummary,
  onRebook,
}: {
  appointment: AppointmentItem;
  onCancel: () => void;
  onReschedule: () => void;
  onGoToQueue: () => void;
  onViewSummary: () => void;
  onRebook: () => void;
}) {
  const palette = getStatusPalette(appointment.status);
  const showStatusBadge = appointment.status !== "UPCOMING";

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Ionicons name="medical" size={20} color={THEME.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardLabel}>{appointment.type}</Text>
          <Text style={styles.cardDoctor}>{appointment.doctor}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={THEME.textMuted} />
        </TouchableOpacity>
      </View>

      {showStatusBadge ? (
        <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
          <Text style={[styles.statusBadgeText, { color: palette.text }]}>
            {appointment.status.replaceAll("_", " ")}
          </Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="calendar" size={14} color={THEME.textDark} />
          <Text style={styles.metaChipText}>{appointment.displayDate}</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="time" size={14} color={THEME.textDark} />
          <Text style={styles.metaChipText}>{appointment.displayTime}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={15} color={THEME.textMuted} />
        <Text style={styles.locationText}>{appointment.location}</Text>
      </View>

      {appointment.isLate && appointment.status === "UPCOMING" ? (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
          <Text style={styles.warningText}>
            You are late for this appointment. Please go to the queue before it is marked missed.
          </Text>
        </View>
      ) : null}

      {appointment.status === "UPCOMING" && appointment.backendStatus === "BOOKED" ? (
        <View style={styles.actionRow}>
          <ActionButton label="Reschedule" variant="secondary" onPress={onReschedule} />
          <ActionButton label="Cancel" variant="danger" onPress={onCancel} />
        </View>
      ) : null}

      {appointment.status === "UPCOMING" && appointment.backendStatus === "CONFIRMED" ? (
        <View style={styles.actionRow}>
          <ActionButton label="Go to Queue" variant="primary" onPress={onGoToQueue} />
        </View>
      ) : null}

      {appointment.status === "UPCOMING" && appointment.backendStatus === "IN_PROGRESS" ? (
        <View style={styles.actionRow}>
          <ActionButton label="Join Now" variant="primary" onPress={onGoToQueue} />
          <ActionButton label="Go to Queue" variant="secondary" onPress={onGoToQueue} />
        </View>
      ) : null}

      {appointment.status === "MISSED" ? (
        <View style={styles.actionRow}>
          <ActionButton label="Book Again" variant="primary" onPress={onRebook} />
        </View>
      ) : null}

      {appointment.status === "CANCELLED" ? (
        <View style={styles.actionRow}>
          <ActionButton label="Book Again" variant="primary" onPress={onRebook} />
        </View>
      ) : null}

      {appointment.status === "CANCELLED" && appointment.cancelledReason ? (
        <Text style={styles.metaNote}>{appointment.cancelledReason}</Text>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  variant,
  onPress,
}: {
  label: string;
  variant: "primary" | "secondary" | "danger";
  onPress: () => void;
}) {
  const styleMap = {
    primary: {
      button: styles.primaryBtn,
      text: styles.primaryBtnText,
    },
    secondary: {
      button: styles.secondaryBtn,
      text: styles.secondaryBtnText,
    },
    danger: {
      button: styles.dangerBtn,
      text: styles.dangerBtnText,
    },
  } as const;

  return (
    <TouchableOpacity style={[styles.actionBtnBase, styleMap[variant].button]} onPress={onPress}>
      <Text style={styleMap[variant].text}>{label}</Text>
    </TouchableOpacity>
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
    borderColor: THEME.border,
    ...patientTheme.shadows.soft,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.lightBlueBg,
  },
  cardText: { flex: 1, marginLeft: 12, paddingRight: 12 },
  cardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textDark,
    lineHeight: 18,
  },
  cardDoctor: { marginTop: 2, fontSize: 13, fontWeight: "400", color: THEME.textMuted },
  moreButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginLeft: 0,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: THEME.background,
  },
  metaChipText: { fontSize: 13, fontWeight: "500", color: THEME.textDark },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, marginLeft: 2 },
  locationText: { fontSize: 13, color: THEME.textMuted, fontWeight: "400" },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    borderRadius: 14,
    padding: 10,
    backgroundColor: THEME.warningSoft,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#B45309",
    fontWeight: "600",
  },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  actionRowDisabled: { opacity: 0.5 },
  metaNote: {
    marginTop: 10,
    fontSize: 12,
    color: THEME.textMuted,
  },
  actionBtnBase: {
    flex: 1,
    borderRadius: 14,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: { backgroundColor: THEME.primary },
  primaryBtnText: { color: THEME.white, fontWeight: "600", fontSize: 11 },
  secondaryBtn: {
    backgroundColor: THEME.highlight,
    borderWidth: 1,
    borderColor: THEME.softAqua,
  },
  secondaryBtnText: { color: THEME.primary, fontWeight: "600", fontSize: 11 },
  dangerBtn: { backgroundColor: THEME.dangerSoft },
  dangerBtnText: { color: THEME.danger, fontWeight: "600", fontSize: 11 },
  rebookBtn: {
    marginTop: 18,
    borderRadius: 14,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.highlight,
  },
  rebookBtnText: { color: THEME.primary, fontWeight: "600", fontSize: 11 },
});
