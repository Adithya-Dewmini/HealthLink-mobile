import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { patientTheme } from "../../constants/patientTheme";

const THEME = {
  ...patientTheme.colors,
  primary: "#0F172A",
  accent: "#38BDF8",
  white: "#FFFFFF",
};

export type ActiveQueueStatus =
  | "none"
  | "appointment_booked"
  | "queue_live"
  | "waiting"
  | "next"
  | "missed";

export type ActiveQueueState = {
  active: boolean;
  status: ActiveQueueStatus;
  appointmentId?: string;
  queueId?: string;
  doctorId?: number;
  clinicId?: string;
  sessionId?: number;
  doctorName?: string;
  medicalCenterName?: string;
  scheduledTime?: string;
  sessionTime?: string;
  queueStarted?: boolean;
  tokenNumber?: number;
  position?: number;
  estimatedWaitMinutes?: number;
};

const formatTimeCopy = (value?: string) => {
  if (!value) return "Upcoming session";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
};

const waitCopy = (minutes?: number) => {
  if (!minutes || minutes <= 0) return "Awaiting queue update";
  return `${minutes} min`;
};

export function UpcomingAppointmentCard({
  appointment,
  onPress,
}: {
  appointment: ActiveQueueState;
  onPress: () => void;
}) {
  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingTopRow}>
        <View style={styles.upcomingIconWrap}>
          <Ionicons name="calendar-outline" size={18} color={THEME.accent} />
        </View>
        <View style={styles.upcomingCopy}>
          <Text style={styles.upcomingEyebrow}>Upcoming Appointment</Text>
          <Text style={styles.upcomingTitle} numberOfLines={1}>
            {appointment.doctorName || "Appointment booked"}
          </Text>
          <Text style={styles.upcomingSub} numberOfLines={1}>
            {appointment.medicalCenterName || "Medical Center"}
          </Text>
        </View>
      </View>

      <View style={styles.upcomingMetaRow}>
        <Text style={styles.upcomingMetaText}>
          Queue starts at {formatTimeCopy(appointment.scheduledTime)}
        </Text>
      </View>

      <TouchableOpacity style={styles.upcomingButton} activeOpacity={0.88} onPress={onPress}>
        <Text style={styles.upcomingButtonText}>View Appointment</Text>
        <Ionicons name="arrow-forward" size={16} color={THEME.white} />
      </TouchableOpacity>
    </View>
  );
}

export default function ActiveQueueFloatingCard({
  queue,
  onPress,
}: {
  queue: ActiveQueueState;
  onPress: () => void;
}) {
  const visual = {
    waiting: {
      label: `You are #${queue.position ?? "-" } in line`,
      sub: `Estimated wait: ${waitCopy(queue.estimatedWaitMinutes)}`,
      button: "Track Queue",
      accent: ["#38BDF8", "#0284C7"] as const,
      icon: "time-outline" as const,
    },
    queue_live: {
      label: "Queue is live",
      sub: "Check in at reception to join the line",
      button: "View Details",
      accent: ["#22C55E", "#16A34A"] as const,
      icon: "radio-outline" as const,
    },
    next: {
      label: "You are next",
      sub: "Please stay nearby",
      button: "Open Queue",
      accent: ["#F59E0B", "#EA580C"] as const,
      icon: "notifications-outline" as const,
    },
    missed: {
      label: "You missed your turn",
      sub: "Please contact reception",
      button: "View Appointment",
      accent: ["#EF4444", "#DC2626"] as const,
      icon: "alert-circle-outline" as const,
    },
  }[queue.status === "waiting" || queue.status === "queue_live" || queue.status === "next" || queue.status === "missed" ? queue.status : "waiting"];

  return (
    <TouchableOpacity style={styles.floatingWrap} activeOpacity={0.92} onPress={onPress}>
      <LinearGradient colors={visual.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.floatingCard}>
        <View style={styles.glowOrb} />
        <View style={styles.floatingTopRow}>
          <View style={styles.floatingIdentity}>
            <View style={styles.floatingIconBox}>
              <Ionicons name={visual.icon} size={18} color={THEME.white} />
            </View>
            <View style={styles.floatingCopy}>
              <Text style={styles.floatingDoctor} numberOfLines={1}>
                {queue.doctorName || "Active queue"}
              </Text>
              <Text style={styles.floatingClinic} numberOfLines={1}>
                {queue.medicalCenterName || queue.sessionTime || "Medical Center"}
              </Text>
            </View>
          </View>
          {queue.tokenNumber ? (
            <View style={styles.tokenPill}>
              <Text style={styles.tokenLabel}>Token</Text>
              <Text style={styles.tokenValue}>{queue.tokenNumber}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.floatingHeadline}>{visual.label}</Text>
        <Text style={styles.floatingSub}>{visual.sub}</Text>

        <View style={styles.floatingButtonRow}>
          <Text style={styles.floatingButtonText}>{visual.button}</Text>
          <Ionicons name="arrow-forward" size={16} color={THEME.white} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  upcomingCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  upcomingTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  upcomingIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 12,
  },
  upcomingCopy: {
    flex: 1,
  },
  upcomingEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.primary,
  },
  upcomingSub: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  upcomingMetaRow: {
    marginTop: 16,
    marginBottom: 16,
  },
  upcomingMetaText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
  },
  upcomingButton: {
    height: 48,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  upcomingButtonText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "800",
  },
  floatingWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 112,
    zIndex: 40,
  },
  floatingCard: {
    borderRadius: 28,
    padding: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  glowOrb: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    top: -36,
    right: -26,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  floatingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  floatingIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  floatingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  floatingCopy: {
    flex: 1,
    minWidth: 0,
  },
  floatingDoctor: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: "800",
  },
  floatingClinic: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
  },
  tokenPill: {
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    marginLeft: 12,
  },
  tokenLabel: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tokenValue: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 1,
  },
  floatingHeadline: {
    marginTop: 18,
    color: THEME.white,
    fontSize: 22,
    fontWeight: "900",
  },
  floatingSub: {
    marginTop: 6,
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    fontWeight: "600",
  },
  floatingButtonRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  floatingButtonText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
