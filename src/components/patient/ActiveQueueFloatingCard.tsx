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

type QueueCardVariant = "primary" | "compact";

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
  if (!normalized) return "Wait time updating";
  if (normalized < 60) return `${normalized} min`;
  return `${Math.floor(normalized / 60)}h ${normalized % 60}m`;
};

const formatMetric = (value?: number | null, prefix = "") => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "--";
  }
  return `${prefix}${value}`;
};

const resolveQueueIcon = (status: ActiveQueueStatus) => {
  switch (status) {
    case "called":
      return "megaphone-outline" as const;
    case "in_consultation":
      return "medkit-outline" as const;
    case "next":
      return "notifications-outline" as const;
    case "late":
      return "alert-circle-outline" as const;
    default:
      return "pulse-outline" as const;
  }
};

const getQueueCopy = (queue: ActiveQueueState) => {
  switch (queue.status) {
    case "called":
      return {
        title: "Doctor is ready",
        badgeLabel: "Called",
        badgeStyle: styles.badgeSuccess,
        message: "Please enter the consultation room.",
        cta: "Open Queue",
      };
    case "in_consultation":
      return {
        title: "Consultation in progress",
        badgeLabel: "In Consultation",
        badgeStyle: styles.badgeInfo,
        message: "Your consultation has started.",
        cta: "Open Queue",
      };
    case "next":
      return {
        title: "You are next",
        badgeLabel: "Next",
        badgeStyle: styles.badgeSuccess,
        message: "Please stay nearby.",
        cta: "Open Queue",
      };
    case "waiting":
    case "checked_in":
      return {
        title: "Live Queue Active",
        badgeLabel: "Waiting",
        badgeStyle: styles.badgeInfo,
        message: "You are checked in. Please wait for your turn.",
        cta: "Open Queue",
      };
    case "late":
      return {
        title: "Marked late",
        badgeLabel: "Late",
        badgeStyle: styles.badgeWarning,
        message: "Please contact reception.",
        cta: "View Details",
      };
    case "check_in_required":
    case "not_arrived":
    case "queue_live":
      return {
        title: "Queue has started",
        badgeLabel: "Check In",
        badgeStyle: styles.badgeNeutral,
        message: "Please check in at reception.",
        cta: "View Details",
      };
    default:
      return {
        title: "Live Queue Active",
        badgeLabel: "Queue",
        badgeStyle: styles.badgeInfo,
        message: queue.message || "Follow your live queue progress here.",
        cta: "Open Queue",
      };
  }
};

const QueueMetric = ({ label, value }: { label: string; value: string }) => (
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
      <View style={styles.simpleHeader}>
        <View style={styles.simpleHeaderCopy}>
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
        <View style={[styles.statusBadge, styles.badgeNeutralLight]}>
          <Text style={styles.statusBadgeDarkText}>{isTodayAppointment ? "Today" : "Booked"}</Text>
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
  variant = "primary",
}: {
  queue: ActiveQueueState;
  onPress: () => void;
  variant?: QueueCardVariant;
}) {
  const copy = getQueueCopy(queue);
  const patientsAhead =
    queue.position !== undefined && queue.position !== null
      ? Math.max(Number(queue.position) || 0, 0)
      : null;

  if (variant === "compact") {
    return (
      <TouchableOpacity style={styles.compactTouch} activeOpacity={0.9} onPress={onPress}>
        <View style={styles.compactShell}>
          <LinearGradient
            colors={["#0B2A4A", "#1269A3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactAccent}
          />
          <View style={styles.compactBody}>
            <View style={styles.compactLeft}>
              <View style={styles.compactIconBox}>
                <Ionicons name={resolveQueueIcon(queue.status)} size={18} color="#0B4F6C" />
              </View>
              <View style={styles.compactCopy}>
                <Text style={styles.compactEyebrow}>Live Queue</Text>
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {copy.title}
                </Text>
                <Text style={styles.compactSubtitle} numberOfLines={1}>
                  {queue.doctorName || "Doctor appointment"}
                </Text>
              </View>
            </View>
            <View style={styles.compactRight}>
              <View style={[styles.statusBadge, copy.badgeStyle]}>
                <Text style={styles.statusBadgeText}>{copy.badgeLabel}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={THEME.primaryBlue} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.primaryTouch} activeOpacity={0.94} onPress={onPress}>
      <View style={styles.shell}>
        <LinearGradient
          colors={["#07182F", "#0B4F6C", "#1EA7FD"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBand}
        >
          <View style={styles.headerRow}>
            <View style={styles.identityRow}>
              <View style={styles.iconBox}>
                <Ionicons name={resolveQueueIcon(queue.status)} size={18} color="#FFFFFF" />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.headerEyebrow}>Live Queue</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {queue.doctorName || "Doctor appointment"}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {queue.medicalCenterName || "Medical Center"}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, copy.badgeStyle]}>
              <Text style={styles.statusBadgeText}>{copy.badgeLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={styles.cardPrimaryTitle}>{copy.title}</Text>
              <Text style={styles.cardPrimaryMessage}>{copy.message}</Text>
            </View>
            <View style={styles.queueTokenPill}>
              <Text style={styles.queueTokenLabel}>Queue No</Text>
              <Text style={styles.queueTokenValue}>{formatMetric(queue.tokenNumber, "#")}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoPill}>
              <Ionicons name="time-outline" size={13} color={THEME.primaryBlue} />
              <Text style={styles.infoPillText}>
                {queue.sessionTime || formatTimeCopy(queue.scheduledTime)}
              </Text>
            </View>
            {queue.estimatedWaitMinutes ? (
              <View style={styles.infoPill}>
                <Ionicons name="hourglass-outline" size={13} color={THEME.primaryBlue} />
                <Text style={styles.infoPillText}>{formatWaitCopy(queue.estimatedWaitMinutes)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metricsRow}>
            <QueueMetric label="Now Serving" value={formatMetric(queue.currentServingNumber, "#")} />
            <QueueMetric label="Ahead" value={patientsAhead === null ? "--" : String(patientsAhead)} />
            <QueueMetric label="Status" value={copy.badgeLabel} />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={onPress}>
              <Text style={styles.primaryButtonText}>{copy.cta}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryTouch: {
    marginBottom: 0,
  },
  shell: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.borderStrong,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  headerBand: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTitle: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 2,
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
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  badgeNeutralLight: {
    backgroundColor: THEME.lightBlueBg,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  statusBadgeDarkText: {
    color: THEME.primaryBlue,
    fontSize: 11,
    fontWeight: "800",
  },
  cardBody: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCopy: {
    flex: 1,
    gap: 4,
  },
  cardPrimaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardPrimaryMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  queueTokenPill: {
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#F1F8FF",
    borderWidth: 1,
    borderColor: "#D8ECFA",
  },
  queueTokenLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#5E738A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  queueTokenValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    color: "#0B4F6C",
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: THEME.lightBlueBg,
  },
  infoPillText: {
    color: THEME.primaryBlue,
    fontSize: 12,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  metricPill: {
    flex: 1,
    minWidth: 88,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    marginTop: 4,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  actionRow: {
    marginTop: 14,
    alignItems: "flex-start",
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#1EA7FD",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  compactTouch: {
    marginBottom: 0,
  },
  compactShell: {
    flexDirection: "row",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  compactAccent: {
    width: 8,
  },
  compactBody: {
    flex: 1,
    minHeight: 86,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  compactLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  compactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EAF8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  compactCopy: {
    flex: 1,
  },
  compactEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#5E738A",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  compactTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  compactSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  compactRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
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
  simpleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  simpleHeaderCopy: {
    flex: 1,
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
  inlineInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
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
