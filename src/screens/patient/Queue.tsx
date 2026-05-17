import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import { getSocket } from "../../services/socket";
import { connectRealtimeSocket, subscribeToPatientRealtime } from "../../services/socketService";
import { fetchPatientActiveQueueStatus } from "../../services/patientQueueApi";
import { apiFetch } from "../../config/api";
import { useAuth } from "../../utils/AuthContext";

const THEME = patientTheme.colors;

type QueueScreenRoute = RouteProp<PatientStackParamList, "PatientQueue">;
type QueueStep = "booked" | "checked_in" | "waiting" | "called" | "consultation" | "completed";

const formatShortTime = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "--";

  if (raw.includes("T")) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString("en-LK", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  const [hours, minutes] = raw.slice(0, 5).split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return raw;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

const getQueueHeadline = (status?: string) => {
  switch (status) {
    case "not_arrived":
      return "Queue started";
    case "check_in_required":
      return "Check-in required";
    case "checked_in":
    case "waiting":
      return "Waiting in live queue";
    case "next":
      return "You are next";
    case "called":
      return "Doctor is ready for you";
    case "in_consultation":
      return "Consultation in progress";
    case "queue_live":
      return "Queue is live";
    case "today_appointment":
      return "Appointment scheduled";
    case "late":
      return "Marked late";
    case "cancelled":
      return "Appointment cancelled";
    case "completed":
      return "Consultation completed";
    case "missed":
      return "Appointment missed";
    default:
      return "Queue progress";
  }
};

const getQueueMessage = (status?: string, message?: string | null) => {
  if (message) return message;
  switch (status) {
    case "not_arrived":
    case "check_in_required":
      return "Queue has started. Please check in at reception.";
    case "checked_in":
      return "You are checked in. Please wait for your turn.";
    case "waiting":
      return "Stay nearby and keep notifications enabled.";
    case "next":
      return "You are next. Please stay nearby.";
    case "called":
      return "Doctor is ready for you. Please enter the consultation room.";
    case "in_consultation":
      return "Consultation in progress.";
    case "queue_live":
      return "Queue has started. Please check in at reception.";
    case "today_appointment":
      return "Your appointment is scheduled. Queue has not started yet.";
    case "late":
      return "You are marked late. Please contact reception.";
    case "cancelled":
      return "This appointment was cancelled.";
    case "completed":
      return "Your consultation is completed.";
    case "missed":
      return "Appointment missed.";
    default:
      return "Queue information is unavailable right now.";
  }
};

const getTimelineState = (status?: string): QueueStep[] => {
  if (status === "completed") {
    return ["booked", "checked_in", "waiting", "called", "consultation", "completed"];
  }
  if (status === "in_consultation") {
    return ["booked", "checked_in", "waiting", "called", "consultation"];
  }
  if (status === "called" || status === "next") {
    return ["booked", "checked_in", "waiting", "called"];
  }
  if (status === "checked_in" || status === "waiting") {
    return ["booked", "checked_in", "waiting"];
  }
  if (
    status === "late" ||
    status === "queue_live" ||
    status === "check_in_required" ||
    status === "not_arrived" ||
    status === "today_appointment" ||
    status === "appointment_booked" ||
    status === "missed" ||
    status === "cancelled"
  ) {
    return ["booked"];
  }
  return [];
};

const getStatusChip = (status?: string) => {
  switch (status) {
    case "next":
      return { label: "You Are Next", backgroundColor: "#DCFCE7", textColor: "#166534" };
    case "called":
      return { label: "Called", backgroundColor: "#DBEAFE", textColor: "#1D4ED8" };
    case "in_consultation":
      return { label: "In Consultation", backgroundColor: "#E0F2FE", textColor: "#0369A1" };
    case "waiting":
    case "checked_in":
      return { label: "Checked In", backgroundColor: "#E0F2FE", textColor: "#0369A1" };
    case "check_in_required":
    case "not_arrived":
    case "queue_live":
      return { label: "Check-In Required", backgroundColor: "#E0F2FE", textColor: "#0369A1" };
    case "late":
      return { label: "Late", backgroundColor: "#FEF3C7", textColor: "#B45309" };
    case "missed":
      return { label: "Missed", backgroundColor: "#FEE2E2", textColor: "#B91C1C" };
    case "cancelled":
      return { label: "Cancelled", backgroundColor: "#E2E8F0", textColor: "#475569" };
    case "completed":
      return { label: "Completed", backgroundColor: "#DCFCE7", textColor: "#166534" };
    case "today_appointment":
      return { label: "Scheduled Today", backgroundColor: "#E0F2FE", textColor: "#0369A1" };
    case "appointment_booked":
      return { label: "Booked", backgroundColor: "#EFF6FF", textColor: "#1D4ED8" };
    default:
      return { label: "Live Status", backgroundColor: "#E0F2FE", textColor: "#0369A1" };
  }
};

const getStatusNote = (status?: string) => {
  switch (status) {
    case "late":
      return "Reception has marked this appointment late.";
    case "missed":
      return "This appointment is no longer part of the active queue.";
    case "cancelled":
      return "This appointment was cancelled and will not appear in the queue.";
    case "completed":
      return "Your consultation is finished.";
    case "called":
      return "Please go to the consultation room now.";
    case "in_consultation":
      return "The doctor is currently with you.";
    case "check_in_required":
    case "not_arrived":
      return "A queue number will appear after reception checks you in.";
    case "today_appointment":
      return "Queue numbers will appear when the session goes live.";
    case "waiting":
    case "checked_in":
      return "Keep this page open to track your progress.";
    default:
      return null;
  }
};

const TIMELINE_ITEMS: Array<{
  key: QueueStep;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "booked", label: "Booked", icon: "calendar-outline" },
  { key: "checked_in", label: "Checked In", icon: "log-in-outline" },
  { key: "waiting", label: "Waiting", icon: "time-outline" },
  { key: "called", label: "Called", icon: "megaphone-outline" },
  { key: "consultation", label: "Consultation", icon: "medkit-outline" },
  { key: "completed", label: "Completed", icon: "checkmark-done-outline" },
];

export default function Queue() {
  const navigation = useNavigation();
  const route = useRoute<QueueScreenRoute>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueState, setQueueState] = useState<any | null>(null);

  const loadQueue = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const scopedState = await fetchPatientActiveQueueStatus({
          appointmentId: route.params?.appointmentId,
          sessionId: route.params?.sessionId,
        });

        if (scopedState) {
          setQueueState(scopedState);
          setError(null);
          return;
        }

        if (!route.params?.doctorId) {
          setQueueState(null);
          setError("Queue details are unavailable for this appointment.");
          return;
        }

        const query = route.params?.clinicId
          ? `?clinicId=${encodeURIComponent(route.params.clinicId)}`
          : "";
        const response = await apiFetch(`/api/patients/doctor/queue-status/${route.params.doctorId}${query}`, {
          suppressErrorLog: true,
        });

        if (!response.ok) {
          throw new Error("Queue details are unavailable for this appointment.");
        }

        const payload = await response.json().catch(() => null);
        setQueueState(
          payload
            ? {
                active: true,
                status:
                  payload.patientStatus === "WITH_DOCTOR"
                    ? "called"
                    : payload.patientStatus === "WAITING"
                      ? "waiting"
                      : payload.status === "LIVE"
                        ? "queue_live"
                        : "today_appointment",
                doctorName: payload.doctorName,
                medicalCenterName: payload.clinicName ?? payload.medicalCenterName,
                sessionId: Number(payload.sessionId ?? 0) || route.params?.sessionId,
                tokenNumber: Number(payload.patientToken ?? 0) || undefined,
                currentServingNumber: Number(payload.currentToken ?? 0) || undefined,
                position: Number(payload.yourPosition ?? 0) || undefined,
                estimatedWaitMinutes: Number(payload.estimatedWaitMinutes ?? 0) || undefined,
                sessionTime: payload.sessionTime ? String(payload.sessionTime) : undefined,
              }
            : null
        );
        setError(null);
      } catch (loadError) {
        setQueueState(null);
        setError(loadError instanceof Error ? loadError.message : "Could not load queue progress.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params?.appointmentId, route.params?.clinicId, route.params?.doctorId, route.params?.sessionId]
  );

  useEffect(() => {
    void loadQueue("initial");
  }, [loadQueue]);

  useEffect(() => {
    if (user?.id) {
      void connectRealtimeSocket();
      void subscribeToPatientRealtime(user.id);
    }

    const socket = getSocket();
    const refresh = () => {
      void loadQueue("refresh");
    };

    socket.on("queue:update", refresh);
    socket.on("session.updated", refresh);
    socket.on("appointment.updated", refresh);
    socket.on("consultation.updated", refresh);
    socket.on("connect", refresh);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("session.updated", refresh);
      socket.off("appointment.updated", refresh);
      socket.off("consultation.updated", refresh);
      socket.off("connect", refresh);
    };
  }, [loadQueue, user?.id]);

  const headline = getQueueHeadline(queueState?.status);
  const supportingMessage = getQueueMessage(queueState?.status, queueState?.message);
  const timelineState = getTimelineState(queueState?.status);
  const statusChip = getStatusChip(queueState?.status);
  const statusNote = getStatusNote(queueState?.status);

  const estimatedWaitLabel = useMemo(() => {
    const minutes = Number(queueState?.estimatedWaitMinutes ?? 0);
    if (!minutes) return "Updating";
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }, [queueState?.estimatedWaitMinutes]);

  const queueNumberLabel = queueState?.tokenNumber ? `#${queueState.tokenNumber}` : "Not assigned";
  const currentServingLabel = queueState?.currentServingNumber ? `#${queueState.currentServingNumber}` : "--";
  const patientsAheadLabel =
    queueState?.position !== undefined && queueState?.position !== null
      ? String(Math.max(Number(queueState.position) || 0, 0))
      : queueState?.tokenNumber && queueState?.currentServingNumber
        ? String(Math.max(Number(queueState.tokenNumber) - Number(queueState.currentServingNumber) - 1, 0))
        : "--";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.textDark} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Queue Progress</Text>
          <Text style={styles.headerSubtitle}>Live appointment and queue status</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => void loadQueue("refresh")}>
          <Ionicons name="refresh-outline" size={20} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={THEME.primary}
            onRefresh={() => void loadQueue("refresh")}
          />
        }
      >
        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.stateText}>Loading queue progress...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={34} color={THEME.danger} />
            <Text style={styles.stateTitle}>Queue unavailable</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={() => void loadQueue("refresh")}>
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : queueState ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroEyebrow}>HealthLink Queue</Text>
                <View style={[styles.statusChip, { backgroundColor: statusChip.backgroundColor }]}>
                  <Text style={[styles.statusChipText, { color: statusChip.textColor }]}>{statusChip.label}</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>{headline}</Text>
              <Text style={styles.heroSubtitle}>{supportingMessage}</Text>

              {statusNote ? (
                <View style={styles.noticeStrip}>
                  <Ionicons name="information-circle-outline" size={16} color={THEME.primary} />
                  <Text style={styles.noticeText}>{statusNote}</Text>
                </View>
              ) : null}

              <View style={styles.metricRow}>
                <MetricCard label="Queue Number" value={queueNumberLabel} />
                <MetricCard label="Now Serving" value={currentServingLabel} />
              </View>
              <View style={styles.metricRow}>
                <MetricCard label="Patients Ahead" value={patientsAheadLabel} />
                <MetricCard label="Estimated Wait" value={estimatedWaitLabel} />
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Session Details</Text>
              <DetailRow icon="medical-outline" label={queueState.doctorName || "Doctor"} />
              <DetailRow icon="business-outline" label={queueState.medicalCenterName || "Medical Center"} />
              <DetailRow
                icon="time-outline"
                label={queueState.sessionTime || formatShortTime(queueState.scheduledTime)}
              />
              <DetailRow icon="pulse-outline" label={statusChip.label} />
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Status Timeline</Text>
              {TIMELINE_ITEMS.map((item) => {
                const active = timelineState.includes(item.key);
                return (
                  <View key={item.key} style={styles.timelineRow}>
                    <View style={[styles.timelineIcon, active && styles.timelineIconActive]}>
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={active ? THEME.white : THEME.textMuted}
                      />
                    </View>
                    <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.stateCard}>
            <Ionicons name="information-circle-outline" size={34} color={THEME.textMuted} />
            <Text style={styles.stateTitle}>No active queue</Text>
            <Text style={styles.stateText}>This appointment is not currently linked to a live queue.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={THEME.primary} />
      <Text style={styles.detailText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: THEME.white,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
  },
  headerCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textDark,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
    gap: 14,
  },
  heroCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#DDEBF7",
    ...patientTheme.shadows.soft,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: THEME.textDark,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  noticeStrip: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#EAF8FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: THEME.textDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: THEME.background,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  metricValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textDark,
  },
  detailsCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.textDark,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: THEME.textDark,
    fontWeight: "600",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF2F7",
  },
  timelineIconActive: {
    backgroundColor: THEME.primary,
  },
  timelineLabel: {
    fontSize: 15,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  timelineLabelActive: {
    color: THEME.textDark,
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "800",
  },
  stateCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textDark,
  },
  stateText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textMuted,
    fontWeight: "600",
  },
});
