import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import ClinicEndedModal from "../../components/ClinicEndedModal";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import { notifyLocal } from "../../services/notifications";
import { apiFetch } from "../../config/api";
import {
  getQueueDashboard,
  startQueue,
  callNextPatient,
  skipPatient,
  endClinic,
} from "../../services/doctorQueueService";
import { connectSocket, joinDoctorRoom, joinSessionRoom, leaveSessionRoom, socket } from "../../services/socket";
import { useAuth } from "../../utils/AuthContext";
import { doctorColors, getDoctorStatusTone } from "../../constants/doctorTheme";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";

const THEME = {
  background: doctorColors.background,
  white: doctorColors.surface,
  textDark: doctorColors.textPrimary,
  textGray: doctorColors.textSecondary,
  accentBlue: doctorColors.primary,
  accentBlueDark: doctorColors.deep,
  softBlue: "#EAF7F7",
  border: doctorColors.border,
  success: doctorColors.primary,
  softSuccess: doctorColors.successBg,
  warning: doctorColors.warningText,
  danger: doctorColors.dangerText,
  softDanger: doctorColors.dangerBg,
  softWarning: doctorColors.warningBg,
  softNeutral: "#EEF7F7",
  cardDark: doctorColors.deep,
};

export default function QueueScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [queue, setQueue] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [doctorId, setDoctorId] = useState<number | string | null>(null);
  const [showClinicEndedModal, setShowClinicEndedModal] = useState(false);
  const [todayShift, setTodayShift] = useState<{ start: string; end: string } | null>(null);
  const sessionId = queue?.sessionId ?? null;
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  const showApprovalRequiredToast = () => {
    Toast.show({
      type: "info",
      text1: "Approval required",
      text2: "This feature is available after admin approval",
    });
  };

  const isNotVerifiedError = (error: any) => {
    return (
      error?.response?.status === 403 &&
      String(error?.response?.data?.message || "").toLowerCase().includes("not verified")
    );
  };

  const loadDashboard = async () => {
    if (!isVerifiedDoctor) {
      setQueue(null);
      setPatients([]);
      setCurrentPatient(null);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token"); // Ensure token is retrieved before API call
      if (!token) return;
      const data = await getQueueDashboard(token);
      setQueue(data.queue ?? null);
      setPatients(data.patients ?? []);
      setCurrentPatient(data.currentPatient ?? null);
      setDoctorId(data?.doctor?.id ?? null);
    } catch (error: any) {
      if (isNotVerifiedError(error)) {
        showApprovalRequiredToast();
        return;
      }
      Toast.show({ type: "error", text1: "Unable to load queue" });
    }
  };

  const loadTodayShift = async () => {
    if (!isVerifiedDoctor) {
      setTodayShift(null);
      return;
    }

    try {
      const res = await apiFetch("/api/doctors/availability");
      if (!res.ok) {
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          const message = String(data?.message || "");
          if (message.toLowerCase().includes("not verified")) {
            showApprovalRequiredToast();
            return;
          }
        }
        return;
      }
      const data = await res.json();
      const dayKeys = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ] as const;
      const todayKey = dayKeys[new Date().getDay()];
      const today = Array.isArray(data?.availability?.[todayKey]) ? data.availability[todayKey][0] : null;
      if (today?.start && today?.end) {
        setTodayShift({
          start: String(today.start).slice(0, 5),
          end: String(today.end).slice(0, 5),
        });
      } else {
        setTodayShift(null);
      }
    } catch {
      setTodayShift(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadDashboard();
      await loadTodayShift();
    };
    void init();
  }, [isVerifiedDoctor]);

  useEffect(() => {
    if (!isVerifiedDoctor) return;
    if (!doctorId) return;
    connectSocket();
    joinDoctorRoom(doctorId);
    if (sessionId) {
      joinSessionRoom(sessionId);
    }

    const handleQueueUpdated = async (data: any) => {
      if (sessionId && data?.sessionId && String(data.sessionId) !== String(sessionId)) return;
      if (!sessionId && data?.doctorId !== doctorId) return;
      if (!data?.queueId && !data?.sessionId) return;

      if (data?.type === "QUEUE_STARTED") {
        Toast.show({
          type: "success",
          text1: "Queue Started",
          text2: "The clinic queue is now active",
        });
      }

      if (data?.type === "PATIENT_ADDED") {
        Toast.show({
          type: "info",
          text1: "New Patient",
          text2: "A patient joined the queue",
        });
      }

      if (data?.type === "QUEUE_EMPTY") {
        void notifyLocal("Queue Empty", "There are no patients waiting.");
      }

      if (data?.type === "CLINIC_ENDED") {
        Toast.show({
          type: "info",
          text1: "Clinic Ended",
          text2: "Today's clinic session has ended",
        });
      }

      await loadDashboard();
    };

    const handleReconnect = async () => {
      joinDoctorRoom(doctorId);
      if (sessionId) {
        joinSessionRoom(sessionId);
      }
      await loadDashboard();
    };

    socket.on("queue:update", handleQueueUpdated);
    socket.on("queue:next", handleQueueUpdated);
    socket.on("session:start", handleQueueUpdated);
    socket.on("connect", handleReconnect);
    return () => {
      socket.off("queue:update", handleQueueUpdated);
      socket.off("queue:next", handleQueueUpdated);
      socket.off("session:start", handleQueueUpdated);
      socket.off("connect", handleReconnect);
      if (sessionId) {
        leaveSessionRoom(sessionId);
      }
    };
  }, [doctorId, isVerifiedDoctor, sessionId]);

  const queueStatus = queue?.status || "NOT_STARTED";
  const isQueueEnded = queueStatus === "ENDED";
  const isQueueLive = queueStatus === "LIVE";
  const isQueueActive = queueStatus === "LIVE" || queueStatus === "PAUSED";
  const queueStatusLabel =
    queueStatus === "LIVE"
      ? "LIVE"
      : queueStatus === "PAUSED"
        ? "PAUSED"
      : queueStatus === "ENDED"
        ? "ENDED"
        : "NOT STARTED";
  const queueStatusColor =
    queueStatus === "LIVE"
      ? THEME.danger
      : queueStatus === "PAUSED"
        ? THEME.warning
      : queueStatus === "ENDED"
        ? THEME.textGray
        : THEME.textGray;
  const queueStatusBg =
    queueStatus === "LIVE"
      ? THEME.softDanger
      : queueStatus === "PAUSED"
        ? THEME.softWarning
      : THEME.softNeutral;
  const clinicStatusTitle =
    queueStatus === "LIVE"
      ? "Clinic Running"
      : queueStatus === "PAUSED"
        ? "Clinic Paused"
      : queueStatus === "ENDED"
        ? "Clinic Ended"
        : "Clinic Not Started";
  const clinicStatusSubtitle =
    queueStatus === "LIVE"
      ? "Serving patients"
      : queueStatus === "PAUSED"
        ? "Queue temporarily paused"
      : queueStatus === "ENDED"
        ? "This clinic session has ended"
        : "Start the session to begin";

  // API Action Handlers
  const handleStartQueue = async () => {
    if (!isVerifiedDoctor) {
      showApprovalRequiredToast();
      return;
    }
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    try {
      const confirmStart = async () => {
        const res = await startQueue(token);
        Alert.alert("Clinic Status", res?.message ?? "Queue started");
        await loadDashboard();
      };

      const now = new Date();
      if (todayShift?.start) {
        const [h, m] = todayShift.start.split(":").map(Number);
        const shiftStart = new Date(now);
        shiftStart.setHours(h, m, 0, 0);
        const earlyStartWindow = new Date(shiftStart.getTime() - 30 * 60 * 1000);

        if (now >= earlyStartWindow && now < shiftStart) {
          Alert.alert(
            "Start Queue Early?",
            "You are starting up to 30 minutes before your shift. Continue?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Start Queue", onPress: confirmStart },
            ]
          );
          return;
        }
      }

      await confirmStart();
    } catch (err: any) {
      if (isNotVerifiedError(err)) {
        showApprovalRequiredToast();
        return;
      }
      const backendMessage = err?.response?.data?.message;
      if (backendMessage === "No active shift found for this time") {
        Alert.alert(
          "No Active Shift",
          "You don't have a shift scheduled for the current time. Please start the clinic during your shift hours."
        );
      } else {
        Alert.alert("Error", backendMessage || "Unable to start queue");
      }
    }
  };

  const handleNextPatient = async () => {
    if (!isVerifiedDoctor) {
      showApprovalRequiredToast();
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await callNextPatient(token);
      if (res?.message === "Queue Empty") {
        void notifyLocal("Queue Empty", "There are no patients waiting.");
        return;
      }
      if (res?.queueId) {
        navigation.navigate("ConsultationPage", { queueId: res.queueId });
      }
      await loadDashboard();
    } catch (error: any) {
      if (isNotVerifiedError(error)) {
        showApprovalRequiredToast();
        return;
      }
      const err: any = error;
      if (err?.response?.status === 409) {
        void notifyLocal("Queue Empty", "There are no patients waiting.");
      }
    }
  };

  const handleOpenConsultation = async () => {
    if (!isVerifiedDoctor) {
      showApprovalRequiredToast();
      return;
    }
    const targetQueueId = currentPatient?.queue_id || queue?.id;
    if (!targetQueueId) {
      if (!isQueueActive) {
        Toast.show({ type: "info", text1: "Queue is not active" });
        return;
      }
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const res = await callNextPatient(token);
        if (res?.queueId) {
          navigation.navigate("ConsultationPage", { queueId: res.queueId });
        }
        await loadDashboard();
        return;
      } catch (error: any) {
        if (isNotVerifiedError(error)) {
          showApprovalRequiredToast();
          return;
        }
        Toast.show({ type: "error", text1: "Unable to open consultation" });
        return;
      }
    }
    navigation.navigate("ConsultationPage", { queueId: targetQueueId });
  };
  const handleSkipPatient = async () => {
    if (!isVerifiedDoctor) {
      showApprovalRequiredToast();
      return;
    }
    Alert.alert(
      "Skip Patient",
      "Are you sure you want to skip the current patient?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (token) {
                const res = await skipPatient(token);
                if (res?.message === "No more patients in queue") {
                  void notifyLocal("Queue Empty", "No more patients waiting.");
                } else {
                  void notifyLocal("Patient Skipped", "The current patient was marked as skipped.");
                }
                await loadDashboard();
              }
            } catch (error: any) {
              if (isNotVerifiedError(error)) {
                showApprovalRequiredToast();
                return;
              }
              Toast.show({ type: "error", text1: "Unable to skip patient" });
            }
          },
        },
      ]
    );
  };

  const handleEndClinic = async () => {
    if (!isVerifiedDoctor) {
      showApprovalRequiredToast();
      return;
    }
    Alert.alert(
      "End Clinic",
      "Are you sure you want to end today's clinic? This will mark remaining patients as MISSED.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Clinic",
          style: "destructive",
          onPress: async () => {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            try {
              await endClinic(token);
              setShowClinicEndedModal(true);
              await loadDashboard();
            } catch (error: any) {
              if (isNotVerifiedError(error)) {
                showApprovalRequiredToast();
                return;
              }
              Toast.show({ type: "error", text1: "Unable to end clinic" });
            }
          },
        },
      ]
    );
  };

  const formatTime = (value?: string | null) => {
    if (!value) return "--:--";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "--:--"
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const appointmentTime =
    currentPatient?.appointment_time ||
    currentPatient?.appointmentTime ||
    currentPatient?.scheduled_time ||
    null;
  const patientNotes =
    currentPatient?.symptoms ||
    currentPatient?.notes ||
    currentPatient?.note ||
    null;

  if (showClinicEndedModal) {
    return (
      <ClinicEndedModal onClose={() => setShowClinicEndedModal(false)} />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Patient Queue</Text>
            <Text style={styles.subtitle}>{queue?.name || "Daily Clinic"}</Text>
          </View>
        <View style={[styles.liveBadge, { backgroundColor: queueStatusBg }]}>
            <ScheduleStatusBadge
              label={queueStatusLabel}
              tone={
                queueStatus === "LIVE"
                  ? "live"
                  : queueStatus === "PAUSED"
                    ? "conflict"
                    : queueStatus === "ENDED"
                      ? "completed"
                      : "upcoming"
              }
            />
          </View>
        </View>

        {!isVerifiedDoctor ? <PendingApprovalBanner /> : null}

        {!isVerifiedDoctor ? (
          <View style={styles.pendingInfoCard}>
            <Text style={styles.pendingInfoTitle}>Limited access</Text>
            <Text style={styles.pendingInfoText}>
              Your account is under review. You can explore your profile while waiting
              for approval.
            </Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>CLINIC STATUS</Text>
          <Text style={styles.heroTitle}>{clinicStatusTitle}</Text>
          <Text style={styles.heroSubtitle}>{clinicStatusSubtitle}</Text>

          <View style={styles.heroActions}>
            <ActionTile
              icon="play"
              label={isVerifiedDoctor ? "Start Clinic" : "Approval Needed"}
              color={THEME.accentBlue}
              disabled={isQueueEnded}
              accessibilityLabel="Start clinic queue"
              onPress={handleStartQueue}
            />
            <ActionTile
              icon="play-forward"
              label="Call Next"
              color={THEME.textDark}
              disabled={!isQueueLive}
              accessibilityLabel="Call next patient"
              onPress={handleNextPatient}
            />
            <ActionTile
              icon="refresh-circle"
              label="Skip"
              color={THEME.warning}
              disabled={!isQueueLive}
              accessibilityLabel="Skip current patient"
              onPress={handleSkipPatient}
            />
            <ActionTile
              icon="stop"
              label="End Clinic"
              color={THEME.danger}
              disabled={isQueueEnded}
              accessibilityLabel="End clinic queue"
              onPress={handleEndClinic}
            />
          </View>
        </View>

        <View style={[styles.focusCard, { backgroundColor: THEME.softBlue }]}>
          <View style={styles.focusHeader}>
            <Text style={styles.actionLabel}>CURRENT PATIENT</Text>
            <View style={styles.focusToken}>
              <Text style={styles.focusTokenText}>
                #{String(currentPatient?.token_number ?? "--")}
              </Text>
            </View>
          </View>

          <Text style={styles.focusName} numberOfLines={1}>
            {currentPatient?.name || "No patient yet"}
          </Text>
          <Text style={styles.focusMeta}>
            {appointmentTime
              ? `Appointment • ${formatTime(appointmentTime)}`
              : "Walk-in or time not set"}
          </Text>

          <View style={styles.focusNotes}>
            <Text style={styles.focusNotesLabel}>Symptoms / Notes</Text>
            <Text style={styles.focusNotesText}>
              {patientNotes || "No notes added"}
            </Text>
          </View>

          <View style={styles.focusActions}>
            <View style={styles.focusActionRow}>
              <TouchableOpacity
                style={[styles.focusActionSecondary, styles.focusActionPrimaryAlt]}
                onPress={handleOpenConsultation}
                disabled={!isVerifiedDoctor ? false : (!currentPatient && !isQueueActive)}
                accessibilityRole="button"
                accessibilityLabel="Open patient consultation"
              >
                <Ionicons name="document-text-outline" size={16} color={THEME.white} />
                <Text style={[styles.focusActionSecondaryText, styles.focusActionPrimaryAltText]}>
                  Open Consultation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Waiting Queue</Text>
          <Text style={styles.countText}>
            {patients.filter((p) => p.status !== "WITH_DOCTOR").length} total
          </Text>
        </View>

        {patients.filter((p) => p.status !== "WITH_DOCTOR").length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={THEME.textGray} />
            <Text style={styles.emptyText}>No patients are waiting right now.</Text>
          </View>
        ) : (
          patients
            .filter((p) => p.status !== "WITH_DOCTOR")
            .map((p) => {
            const isPreBooked =
              Boolean(p?.appointment_time) ||
              Boolean(p?.appointmentTime) ||
              Boolean(p?.scheduled_time) ||
              p?.type === "PREBOOKED" ||
              p?.type === "PRE_BOOKED";
            const typeLabel = isPreBooked ? "Pre-booked" : "Walk-in";
            const typeColor = isPreBooked
              ? THEME.accentBlueDark
              : THEME.accentBlue;
            const statusLabel =
              p?.status === "SKIPPED"
                ? "Skipped"
                : p?.status === "WAITING"
                  ? "Waiting"
                  : p?.status || "Waiting";

            return (
              <View key={p.id} style={styles.queueItem}>
                <View style={styles.queueBadge}>
                  <Text style={styles.queueBadgeText}>
                    {String(p.token_number || "--")}
                  </Text>
                </View>
                <View style={styles.queueInfo}>
                  <Text style={styles.queueName} numberOfLines={1}>
                    {p.name || `Patient ${p.patient_id}`}
                  </Text>
                  <View style={styles.queueMetaRow}>
                    <View style={styles.metaPill}>
                      <View style={[styles.metaDot, { backgroundColor: typeColor }]} />
                      <Text style={[styles.metaText, { color: typeColor }]}>
                        {typeLabel}
                      </Text>
                    </View>
                    <ScheduleStatusBadge
                      label={statusLabel}
                      tone={p?.status === "SKIPPED" ? "cancelled" : "upcoming"}
                    />
                  </View>
                </View>
                <View style={styles.queueActions}>
                  <TouchableOpacity
                    style={styles.queueActionButton}
                    onPress={() =>
                      Alert.alert(
                        "Queue order unchanged",
                        "Queue reordering is not available in this version."
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Prioritize ${p.name || `patient ${p.patient_id}`}`}
                  >
                    <Ionicons name="arrow-up" size={16} color={THEME.accentBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.queueActionButton}
                    onPress={() =>
                      Alert.alert(
                        "Queue removal unavailable",
                        "Removing a patient from the queue is not available in this version."
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${p.name || `patient ${p.patient_id}`} from queue`}
                  >
                    <Ionicons name="close" size={16} color={THEME.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ActionTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

const ActionTile = ({ icon, label, color, onPress, disabled, accessibilityLabel }: ActionTileProps) => (
  <TouchableOpacity
    style={[styles.actionTile, disabled && styles.actionTileDisabled]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || label}
  >
    <View style={[styles.actionIcon, { backgroundColor: color + "1A" }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  scrollContent: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    backgroundColor: THEME.white,
    padding: 18,
    borderRadius: 22,
    shadowColor: "#DCE5F2",
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  title: { fontSize: 24, fontWeight: "900", color: THEME.textDark },
  subtitle: { fontSize: 13, color: THEME.textGray, fontWeight: "600", marginTop: 2 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },

  heroCard: {
    backgroundColor: THEME.cardDark,
    borderRadius: 26,
    padding: 22,
    marginBottom: 22,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A1A8B3",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: THEME.white,
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#C7CDD6",
    marginTop: 2,
    marginBottom: 16,
  },
  heroActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  pendingInfoCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
    marginBottom: 16,
  },
  pendingInfoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#B45309",
    marginBottom: 6,
  },
  pendingInfoText: {
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textGray,
  },

  actionTile: {
    backgroundColor: THEME.white,
    width: "23%",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#DCE5F2",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  actionTileDisabled: { opacity: 0.45 },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionLabel: { fontSize: 12, fontWeight: "800" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: THEME.textDark },
  countText: { fontSize: 12, color: THEME.textGray, fontWeight: "600" },

  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  queueBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  queueBadgeText: { fontSize: 16, fontWeight: "800", color: THEME.textDark },
  queueInfo: { flex: 1 },
  queueName: { fontSize: 16, fontWeight: "800", color: THEME.textDark },
  queueMetaRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: THEME.softNeutral,
  },
  metaDot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 11, fontWeight: "700", color: THEME.textGray },
  queueActions: { flexDirection: "row", gap: 6, marginLeft: 8 },
  queueActionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME.softNeutral,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { marginTop: 10, color: THEME.textGray, fontSize: 14 },

  focusCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 22,
  },
  focusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  focusToken: {
    backgroundColor: THEME.cardDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  focusTokenText: { color: THEME.white, fontWeight: "800", fontSize: 12 },
  focusName: { fontSize: 20, fontWeight: "900", color: THEME.textDark, marginTop: 10 },
  focusMeta: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  focusNotes: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
  },
  focusNotesLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.textGray,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  focusNotesText: { fontSize: 13, color: THEME.textDark },
  focusActions: { marginTop: 16 },
  focusActionPrimary: {
    backgroundColor: THEME.accentBlue,
    borderRadius: 16,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  focusActionPrimaryText: { color: THEME.white, fontWeight: "800" },
  focusActionRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  focusActionSecondary: {
    backgroundColor: THEME.accentBlue,
    borderRadius: 18,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  focusActionSecondaryText: { fontSize: 14, fontWeight: "800", color: THEME.white },
  focusActionPrimaryAlt: {
    backgroundColor: THEME.accentBlue,
  },
  focusActionPrimaryAltText: { color: THEME.white },
});
