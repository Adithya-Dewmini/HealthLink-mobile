import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { patientTheme } from "../../constants/patientTheme";

const THEME = patientTheme.colors;

export type ActiveQueueStatus =
  | "none"
  | "appointment_booked"
  | "today_appointment"
  | "queue_live"
  | "check_in_required"
  | "not_arrived"
  | "checked_in"
  | "waiting"
  | "next"
  | "called"
  | "in_consultation"
  | "late"
  | "missed"
  | "cancelled"
  | "completed";

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
  currentServingNumber?: number;
  position?: number;
  estimatedWaitMinutes?: number;
  waitingCount?: number;
  queueStatus?: string | null;
  patientQueueStatus?: string | null;
  consultationStatus?: string | null;
  checkInState?: string | null;
  message?: string | null;
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

const formatWaitCopy = (minutes?: number) => {
  const normalized = Number(minutes ?? 0);
  if (!normalized) return "Waiting time updating";
  if (normalized < 60) return `${normalized} min`;
  return `${Math.floor(normalized / 60)}h ${normalized % 60}m`;
};

const getQueueVisual = (queue: ActiveQueueState) => {
  switch (queue.status) {
    case "next":
      return {
        badgeLabel: "You are next",
        badgeTone: styles.badgeSuccess,
        icon: "notifications-outline" as const,
        message: queue.message || "Please stay nearby. The doctor will call you shortly.",
        cta: "Open Queue",
      };
    case "called":
      return {
        badgeLabel: "Called",
        badgeTone: styles.badgeSuccess,
        icon: "megaphone-outline" as const,
        message: queue.message || "Doctor is ready for you. Please enter the consultation room.",
        cta: "Open Queue",
      };
    case "in_consultation":
      return {
        badgeLabel: "In Consultation",
        badgeTone: styles.badgeInfo,
        icon: "medkit-outline" as const,
        message: queue.message || "Consultation in progress.",
        cta: "View Status",
      };
    case "late":
      return {
        badgeLabel: "Late",
        badgeTone: styles.badgeWarning,
        icon: "alert-circle-outline" as const,
        message: queue.message || "You are marked late. Please contact reception.",
        cta: "View Details",
      };
    case "check_in_required":
    case "not_arrived":
    case "queue_live":
      return {
        badgeLabel: "Check-In Required",
        badgeTone: styles.badgeNeutral,
        icon: "log-in-outline" as const,
        message: queue.message || "Queue has started. Please check in at reception.",
        cta: "View Details",
      };
    case "checked_in":
    case "waiting":
      return {
        badgeLabel: "Waiting",
        badgeTone: styles.badgeInfo,
        icon: "time-outline" as const,
        message: queue.message || "You are checked in. Please wait for your turn.",
        cta: "Open Queue",
      };
    case "missed":
      return {
        badgeLabel: "Missed",
        badgeTone: styles.badgeDanger,
        icon: "close-circle-outline" as const,
        message: queue.message || "Appointment missed.",
        cta: "View Details",
      };
    default:
      return {
        badgeLabel: "Live",
        badgeTone: styles.badgeInfo,
        icon: "pulse-outline" as const,
        message: queue.message || "Queue is active for this appointment.",
        cta: "Open Queue",
      };
  }
};

const MetricPill = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metricPill}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

export function UpcomingAppointmentCard({
  appointment,
  onPress,
}: {
  appointment: ActiveQueueState;
  onPress: () => void;
}) {
  const isTodayAppointment = appointment.status === "today_appointment";
  return (
    <View style={styles.upcomingCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderCopy}>
          <Text style={styles.cardEyebrow}>
            {isTodayAppointment ? "Today's Appointment" : "Upcoming Appointment"}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {appointment.doctorName || "Appointment booked"}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {appointment.medicalCenterName || "Medical Center"}
          </Text>
        </View>
        <View style={[styles.statusBadge, styles.badgeNeutral]}>
          <Text style={styles.statusBadgeText}>{isTodayAppointment ? "Today" : "Booked"}</Text>
        </View>
      </View>

      <View style={styles.inlineInfoRow}>
        <View style={styles.inlineInfoPill}>
          <Ionicons name="time-outline" size={14} color={THEME.primaryBlue} />
          <Text style={styles.inlineInfoText}>
            {appointment.sessionTime || formatTimeCopy(appointment.scheduledTime)}
          </Text>
        </View>
      </View>

      <Text style={styles.supportingCopy}>
        {appointment.message ||
          (isTodayAppointment
            ? "Your appointment is scheduled. Queue has not started yet."
            : "Your appointment is booked and will appear here on the day of the session.")}
      </Text>

      <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.88} onPress={onPress}>
        <Text style={styles.secondaryButtonText}>
          {isTodayAppointment ? "View Queue Status" : "View Appointment"}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={THEME.primaryBlue} />
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
  const visual = getQueueVisual(queue);
  const patientsAhead =
    queue.position !== undefined && queue.position !== null
      ? Math.max(Number(queue.position) || 0, 0)
      : null;

  return (
    <TouchableOpacity style={styles.liveCardTouch} activeOpacity={0.92} onPress={onPress}>
      <LinearGradient
        colors={["#07182F", THEME.primaryBlue, "#35C8F4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.liveCard}
      >
        <View style={styles.liveCardOverlay} />
        <View style={styles.cardHeader}>
          <View style={styles.liveIdentity}>
            <View style={styles.liveIconBox}>
              <Ionicons name={visual.icon} size={18} color="#FFFFFF" />
            </View>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.liveEyebrow}>Live Queue Active</Text>
              <Text style={styles.liveTitle} numberOfLines={1}>
                {queue.doctorName || "Doctor appointment"}
              </Text>
              <Text style={styles.liveSubtitle} numberOfLines={1}>
                {queue.medicalCenterName || "Medical Center"}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, visual.badgeTone]}>
            <Text style={styles.statusBadgeText}>{visual.badgeLabel}</Text>
          </View>
        </View>

        <View style={styles.inlineInfoRow}>
          {queue.sessionTime ? (
            <View style={styles.liveInfoPill}>
              <Ionicons name="time-outline" size={13} color="#D7F6FF" />
              <Text style={styles.liveInfoText}>{queue.sessionTime}</Text>
            </View>
          ) : null}
          {queue.estimatedWaitMinutes ? (
            <View style={styles.liveInfoPill}>
              <Ionicons name="hourglass-outline" size={13} color="#D7F6FF" />
              <Text style={styles.liveInfoText}>{formatWaitCopy(queue.estimatedWaitMinutes)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metricsRow}>
          {queue.tokenNumber ? <MetricPill label="Queue No" value={`#${queue.tokenNumber}`} /> : null}
          <MetricPill
            label="Now Serving"
            value={queue.currentServingNumber ? `#${queue.currentServingNumber}` : "--"}
          />
          {patientsAhead !== null ? <MetricPill label="Ahead" value={String(patientsAhead)} /> : null}
        </View>

        <Text style={styles.liveMessage}>{visual.message}</Text>

        <View style={styles.liveButtonRow}>
          <View style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{visual.cta}</Text>
            <Ionicons name="arrow-forward" size={16} color="#07182F" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  liveCardTouch: {
    marginBottom: 12,
  },
  liveCard: {
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
    minHeight: 198,
  },
  liveCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderCopy: {
    flex: 1,
  },
  liveIdentity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  liveIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveEyebrow: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  liveTitle: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  liveSubtitle: {
    marginTop: 3,
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    fontWeight: "600",
  },
  statusBadge: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInfo: {
    backgroundColor: "rgba(14,165,233,0.18)",
  },
  badgeSuccess: {
    backgroundColor: "rgba(22,163,74,0.18)",
  },
  badgeWarning: {
    backgroundColor: "rgba(245,158,11,0.18)",
  },
  badgeDanger: {
    backgroundColor: "rgba(220,38,38,0.18)",
  },
  badgeNeutral: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  inlineInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  liveInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  liveInfoText: {
    color: "#EAF8FF",
    fontSize: 12,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  metricPill: {
    minWidth: 92,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: {
    color: "rgba(234,248,255,0.72)",
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  liveMessage: {
    marginTop: 14,
    color: "#EAF8FF",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  liveButtonRow: {
    marginTop: 14,
    alignItems: "flex-start",
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#07182F",
    fontSize: 14,
    fontWeight: "800",
  },
  upcomingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  cardTitle: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "800",
    color: THEME.navy,
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  inlineInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: THEME.lightBlueBg,
  },
  inlineInfoText: {
    color: THEME.primaryBlue,
    fontSize: 12,
    fontWeight: "700",
  },
  supportingCopy: {
    marginTop: 12,
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.softAqua,
    backgroundColor: THEME.lightBlueBg,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryButtonText: {
    color: THEME.primaryBlue,
    fontSize: 14,
    fontWeight: "800",
  },
});
