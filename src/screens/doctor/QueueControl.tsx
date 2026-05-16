import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import ClinicEndedModal from "../../components/ClinicEndedModal";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import DoctorAvatar from "../../components/common/DoctorAvatar";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";
import { doctorColors } from "../../constants/doctorTheme";
import {
  callNextPatient,
  endClinic,
  getQueueDashboard,
  startQueue,
  skipPatient,
  type DoctorQueueDashboard,
  type DoctorQueuePatient,
} from "../../services/doctorQueueService";
import { fetchDoctorSessionsRange } from "../../services/doctorScheduleService";
import { fetchDoctorClinics, type DoctorClinicItem } from "../../services/doctorClinicsService";
import { connectSocket, joinDoctorRoom, joinSessionRoom, leaveSessionRoom, socket } from "../../services/socket";
import { notifyLocal } from "../../services/notifications";
import { useAuth } from "../../utils/AuthContext";
import { formatLongDateLabel, formatTimeLabel, formatTimeRangeLabel } from "../../utils/dateUtils";
import { getFriendlyError } from "../../utils/friendlyErrors";
import { getDisplayInitials, resolveDoctorImage } from "../../utils/imageUtils";
import type { ScheduleSession } from "./scheduleTypes";

const THEME = {
  background: doctorColors.background,
  surface: doctorColors.surface,
  deep: doctorColors.deep,
  primary: doctorColors.primary,
  text: doctorColors.textPrimary,
  textSecondary: doctorColors.textSecondary,
  border: doctorColors.border,
  soft: "#EAF7F7",
  softAlt: "#F7FAFC",
  warning: doctorColors.warningText,
  warningBg: doctorColors.warningBg,
  danger: doctorColors.dangerText,
  dangerBg: doctorColors.dangerBg,
  mutedBg: "#E6ECF2",
  successBg: doctorColors.successBg,
};

const NO_ACTIVE_PATIENT_BANNER = require("../../../assets/images/no-active-patient-banner.png");

type QueueRouteParams = {
  scheduleId?: string | number;
  sessionId?: string | number;
  queueId?: string | number;
  medicalCenterId?: string;
  clinicId?: string;
  date?: string;
};

type QueueSessionCard = ScheduleSession & {
  location?: string;
  imageUrl?: string | null;
};

const getTodayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(new Date());

const isQueueStatusLive = (status?: string | null) => {
  const normalized = String(status || "").toUpperCase();
  return normalized === "LIVE" || normalized === "PAUSED";
};

const getHeaderStatusVariant = (status?: string | null) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "LIVE") return "live" as const;
  if (normalized === "ENDED") return "error" as const;
  if (normalized === "PAUSED") return "pending" as const;
  return "idle" as const;
};

const getHeaderStatusLabel = (status?: string | null) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "LIVE") return "Live";
  if (normalized === "PAUSED") return "Paused";
  if (normalized === "ENDED") return "Ended";
  return "Not Started";
};

function ClinicImage({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.sessionImage}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={styles.sessionImageFallback}>
      <Ionicons name="business-outline" size={22} color={THEME.primary} />
      <Text style={styles.sessionImageFallbackText}>{getDisplayInitials(name, "CL")}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
  loading,
  tone = "default",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "default" | "primary" | "danger";
}) {
  const color =
    tone === "primary" ? THEME.surface : tone === "danger" ? THEME.danger : THEME.deep;
  const backgroundColor =
    tone === "primary" ? THEME.primary : tone === "danger" ? THEME.dangerBg : THEME.surface;

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor, borderColor: tone === "danger" ? "#F7C9C5" : THEME.border },
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: tone === "primary" ? "rgba(255,255,255,0.14)" : "#F4F7FA" }]}>
        {loading ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={18} color={color} />}
      </View>
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function QueueScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const routeParams = (route.params || {}) as QueueRouteParams;
  const routeScheduleId = String(routeParams.scheduleId || routeParams.sessionId || "").trim() || null;
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  const [queue, setQueue] = useState<DoctorQueueDashboard["queue"]>(null);
  const [patients, setPatients] = useState<DoctorQueuePatient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<DoctorQueuePatient | null>(null);
  const [doctorId, setDoctorId] = useState<number | string | null>(null);
  const [showClinicEndedModal, setShowClinicEndedModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | "start" | "next" | "skip" | "end" | "open">(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionCards, setSessionCards] = useState<QueueSessionCard[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(routeScheduleId);

  const queueStatus = String(queue?.status || "NOT_STARTED").toUpperCase();
  const queueStatusLabel = getHeaderStatusLabel(queueStatus);
  const isQueueEnded = queueStatus === "ENDED";
  const isQueueLive = queueStatus === "LIVE";
  const isQueueActive = isQueueStatusLive(queueStatus);
  const hasActivePatient =
    Boolean(currentPatient) && String(currentPatient?.status || "").toUpperCase() === "WITH_DOCTOR";
  const waitingPatients = patients.filter((patient) => String(patient.status || "").toUpperCase() !== "WITH_DOCTOR");
  const canGoBack = Boolean(routeScheduleId) && navigation.canGoBack();
  const activeSessionId = String(queue?.sessionId || "").trim() || null;

  const selectedSession = useMemo(() => {
    if (selectedScheduleId) {
      return sessionCards.find((session) => String(session.id) === String(selectedScheduleId)) || null;
    }

    if (queue?.sessionId) {
      return sessionCards.find((session) => String(session.id) === String(queue.sessionId)) || null;
    }

    return null;
  }, [queue?.sessionId, selectedScheduleId, sessionCards]);

  const sessionContext = useMemo(() => {
    if (selectedSession) {
      return {
        id: String(selectedSession.id),
        name: selectedSession.clinicName,
        date: selectedSession.date,
        startTime: selectedSession.startTime,
        endTime: selectedSession.endTime,
        location: selectedSession.location || null,
        imageUrl: selectedSession.imageUrl || null,
      };
    }

    if (queue?.sessionId || queue?.medicalCenterName) {
      return {
        id: String(queue?.sessionId || ""),
        name: queue?.medicalCenterName || "Clinic Session",
        date: queue?.sessionDate || null,
        startTime: queue?.sessionStart || null,
        endTime: queue?.sessionEnd || null,
        location: queue?.location || null,
        imageUrl: resolveDoctorImage(queue?.cover_image_url ?? null, queue?.logo_url ?? null),
      };
    }

    return null;
  }, [queue, selectedSession]);

  const headerSubtitle = useMemo(() => {
    if (!sessionContext) {
      return "Select or start a clinic session";
    }

    const dayLabel =
      sessionContext.date === getTodayKey()
        ? "Today"
        : sessionContext.date
          ? formatLongDateLabel(sessionContext.date)
          : "Clinic session";

    return `${sessionContext.name} • ${dayLabel}, ${formatTimeRangeLabel(
      sessionContext.startTime || "",
      sessionContext.endTime || ""
    )}`;
  }, [sessionContext]);

  const loadQueueScreen = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      if (!isVerifiedDoctor) {
        setQueue(null);
        setPatients([]);
        setCurrentPatient(null);
        setSessionCards([]);
        setDoctorId(null);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError(null);
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const todayKey = getTodayKey();
        const [sessions, clinics, baseDashboard] = await Promise.all([
          fetchDoctorSessionsRange(todayKey, todayKey),
          fetchDoctorClinics().catch(() => ({ active: [], pending: [] })),
          routeScheduleId || selectedScheduleId
            ? Promise.resolve(null)
            : getQueueDashboard(token),
        ]);

        const clinicMap = new Map<string, DoctorClinicItem>(
          clinics.active.map((clinic) => [String(clinic.id), clinic])
        );

        const todaySessions = sessions
          .filter((session) => session.source !== "external")
          .map<QueueSessionCard>((session) => {
            const clinic = session.clinicId ? clinicMap.get(String(session.clinicId)) : undefined;
            return {
              ...session,
              location: clinic?.address || clinic?.location || undefined,
              imageUrl: resolveDoctorImage(clinic?.cover_image_url, clinic?.image_url, clinic?.logo_url),
            };
          });

        setSessionCards(todaySessions);

        let nextSelectedScheduleId = routeScheduleId || selectedScheduleId;
        let dashboard = baseDashboard;

        if (nextSelectedScheduleId) {
          dashboard = await getQueueDashboard(token, { scheduleId: nextSelectedScheduleId });
        } else if (dashboard?.queue && isQueueStatusLive(String(dashboard.queue.status || ""))) {
          nextSelectedScheduleId = dashboard.queue.sessionId ? String(dashboard.queue.sessionId) : null;
        } else if (todaySessions.length === 1) {
          nextSelectedScheduleId = String(todaySessions[0].id);
          dashboard = await getQueueDashboard(token, { scheduleId: nextSelectedScheduleId });
        } else {
          dashboard = {
            doctor: dashboard?.doctor || null,
            queue: null,
            patients: [],
            currentPatient: null,
          } as DoctorQueueDashboard;
        }

        if (
          nextSelectedScheduleId &&
          dashboard?.queue?.sessionId &&
          String(dashboard.queue.sessionId) !== String(nextSelectedScheduleId)
        ) {
          setQueue(null);
          setPatients([]);
          setCurrentPatient(null);
          setDoctorId(dashboard?.doctor?.id ?? null);
          setSelectedScheduleId(nextSelectedScheduleId);
          setError("The selected clinic session does not match the loaded queue. Please refresh and try again.");
          return;
        }

        setSelectedScheduleId(nextSelectedScheduleId || null);
        setQueue(dashboard?.queue ?? null);
        setPatients(dashboard?.patients ?? []);
        setCurrentPatient(dashboard?.currentPatient ?? null);
        setDoctorId(dashboard?.doctor?.id ?? null);
      } catch (loadError: any) {
        Toast.show({ type: "error", text1: "Unable to load queue" });
        setError(getFriendlyError(loadError, "Unable to load the queue right now."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isVerifiedDoctor, routeScheduleId, selectedScheduleId]
  );

  useEffect(() => {
    void loadQueueScreen("initial");
  }, [loadQueueScreen]);

  useEffect(() => {
    if (!isVerifiedDoctor || !doctorId) return;

    connectSocket();
    joinDoctorRoom(doctorId);
    if (activeSessionId) {
      joinSessionRoom(activeSessionId);
    }

    const handleQueueUpdated = async (data: any) => {
      if (activeSessionId && data?.sessionId && String(data.sessionId) !== String(activeSessionId)) return;
      if (!activeSessionId && data?.doctorId && String(data.doctorId) !== String(doctorId)) return;

      await loadQueueScreen("refresh");
    };

    socket.on("queue:update", handleQueueUpdated);
    socket.on("queue:next", handleQueueUpdated);
    socket.on("session:start", handleQueueUpdated);

    return () => {
      socket.off("queue:update", handleQueueUpdated);
      socket.off("queue:next", handleQueueUpdated);
      socket.off("session:start", handleQueueUpdated);
      if (activeSessionId) {
        leaveSessionRoom(activeSessionId);
      }
    };
  }, [activeSessionId, doctorId, isVerifiedDoctor, loadQueueScreen]);

  const handleStartQueue = async () => {
    if (!selectedScheduleId) {
      Toast.show({ type: "info", text1: "Choose a clinic session to start the queue." });
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      setActionLoading("start");
      const response = await startQueue(token, selectedScheduleId);
      Alert.alert("Clinic Status", response?.message ?? "Queue started");
      Toast.show({ type: "success", text1: "Queue is now live" });
      await loadQueueScreen("refresh");
    } catch (loadError: any) {
      Alert.alert("Error", getFriendlyError(loadError, loadError?.response?.data?.message || "Unable to start queue"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleNextPatient = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      setActionLoading("next");
      const response = await callNextPatient(token);
      if (response?.message === "No patients waiting yet") {
        void notifyLocal("Queue Empty", "There are no patients waiting.");
      }
      if (response?.queueId) {
        navigation.navigate("ConsultationPage", { queueId: response.queueId });
      }
      await loadQueueScreen("refresh");
    } catch (loadError: any) {
      const backendMessage = String(loadError?.response?.data?.message || "");
      if (loadError?.response?.status === 409 && backendMessage.toLowerCase().includes("finish or skip")) {
        Alert.alert("Current consultation in progress", backendMessage);
      } else {
        Toast.show({ type: "error", text1: getFriendlyError(loadError, "Unable to call the next patient") });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenConsultation = () => {
    if (!currentPatient?.queue_id || !hasActivePatient) {
      Toast.show({ type: "info", text1: "No active patient" });
      return;
    }

    navigation.navigate("ConsultationPage", { queueId: currentPatient.queue_id });
  };

  const handleSkipPatient = () => {
    Alert.alert("Skip Patient", "Are you sure you want to skip the current patient?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        style: "destructive",
        onPress: async () => {
          const token = await AsyncStorage.getItem("token");
          if (!token) return;
          try {
            setActionLoading("skip");
            await skipPatient(token);
            Toast.show({ type: "success", text1: "Patient skipped" });
            await loadQueueScreen("refresh");
          } catch (loadError: any) {
            Toast.show({ type: "error", text1: getFriendlyError(loadError, "Unable to skip patient") });
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleEndClinic = () => {
    Alert.alert("End Clinic", "Are you sure you want to end this clinic session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Clinic",
        style: "destructive",
        onPress: async () => {
          const token = await AsyncStorage.getItem("token");
          if (!token) return;

          try {
            setActionLoading("end");
            await endClinic(token);
            setShowClinicEndedModal(true);
            Toast.show({ type: "success", text1: "Clinic session ended" });
            await loadQueueScreen("refresh");
          } catch (loadError: any) {
            if (loadError?.response?.status === 409 && loadError?.response?.data?.requiresConfirmation) {
              Alert.alert(
                "Waiting patients remain",
                String(loadError?.response?.data?.message || "There are waiting patients. End clinic anyway?"),
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "End Clinic",
                    style: "destructive",
                    onPress: async () => {
                      const retryToken = await AsyncStorage.getItem("token");
                      if (!retryToken) return;
                      try {
                        setActionLoading("end");
                        await endClinic(retryToken, true);
                        setShowClinicEndedModal(true);
                        Toast.show({ type: "success", text1: "Clinic session ended" });
                        await loadQueueScreen("refresh");
                      } catch (retryError: any) {
                        Toast.show({ type: "error", text1: getFriendlyError(retryError, "Unable to end clinic") });
                      } finally {
                        setActionLoading(null);
                      }
                    },
                  },
                ]
              );
              return;
            }

            Toast.show({ type: "error", text1: getFriendlyError(loadError, "Unable to end clinic") });
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const renderQueueEmptyState = () => {
    if (!selectedScheduleId && sessionCards.length > 1) {
      return (
        <View style={styles.emptyStateCard}>
          <Ionicons name="calendar-outline" size={28} color={THEME.textSecondary} />
          <Text style={styles.emptyStateTitle}>Select a clinic session to view queue.</Text>
        </View>
      );
    }

    if (!selectedScheduleId && sessionCards.length === 0) {
      return (
        <View style={styles.emptyStateCard}>
          <Ionicons name="calendar-clear-outline" size={28} color={THEME.textSecondary} />
          <Text style={styles.emptyStateTitle}>Select or start a clinic session.</Text>
        </View>
      );
    }

    if (!isQueueActive && !isQueueEnded) {
      return (
        <View style={styles.emptyStateCard}>
          <Ionicons name="play-circle-outline" size={28} color={THEME.textSecondary} />
          <Text style={styles.emptyStateTitle}>Start the clinic to begin queue management.</Text>
        </View>
      );
    }

    if (isQueueEnded) {
      return (
        <View style={styles.emptyStateCard}>
          <Ionicons name="checkmark-done-outline" size={28} color={THEME.textSecondary} />
          <Text style={styles.emptyStateTitle}>This clinic session has ended.</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyStateCard}>
        <Ionicons name="people-outline" size={28} color={THEME.textSecondary} />
        <Text style={styles.emptyStateTitle}>No waiting patients.</Text>
      </View>
    );
  };

  if (showClinicEndedModal) {
    return <ClinicEndedModal onClose={() => setShowClinicEndedModal(false)} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
      <View style={styles.headerShell}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTitleRow}>
              {canGoBack ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={20} color={THEME.surface} />
                </TouchableOpacity>
              ) : null}
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Queue Center</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {headerSubtitle}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerStatusPill}>
            <Text style={styles.headerStatusText}>{queueStatusLabel.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadQueueScreen("refresh")} />}
        showsVerticalScrollIndicator={false}
      >
        {!isVerifiedDoctor ? <PendingApprovalBanner /> : null}

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.stateTitle}>Loading queue</Text>
            <Text style={styles.stateText}>Today&apos;s session queue will appear here.</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={THEME.warning} />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Unable to load queue</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.errorRetryButton} onPress={() => void loadQueueScreen("refresh")}>
                <Text style={styles.errorRetryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!loading && sessionCards.length > 1 && !isQueueActive ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Today&apos;s Clinic Sessions</Text>
            <Text style={styles.sectionCaption}>Choose a clinic session to start or manage its queue.</Text>
            <View style={styles.sessionSelectorStack}>
              {sessionCards.map((session) => {
                const selected = String(session.id) === String(selectedScheduleId || "");
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.sessionSelectorCard, selected && styles.sessionSelectorCardActive]}
                    onPress={() => setSelectedScheduleId(String(session.id))}
                    activeOpacity={0.9}
                  >
                    <ClinicImage imageUrl={session.imageUrl} name={session.clinicName} />
                    <View style={styles.sessionSelectorCopy}>
                      <Text style={styles.sessionSelectorTitle} numberOfLines={1}>
                        {session.clinicName}
                      </Text>
                      <Text style={styles.sessionSelectorMeta} numberOfLines={1}>
                        {`${formatLongDateLabel(session.date)} • ${formatTimeRangeLabel(session.startTime, session.endTime)}`}
                      </Text>
                      <Text style={styles.sessionSelectorMeta} numberOfLines={1}>
                        {session.location || "Location not available"}
                      </Text>
                    </View>
                    <ScheduleStatusBadge label={session.status} tone="upcoming" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {sessionContext ? (
          <View style={styles.contextCard}>
            <ClinicImage imageUrl={sessionContext.imageUrl} name={sessionContext.name} />
            <View style={styles.contextCopy}>
              <Text style={styles.contextTitle} numberOfLines={1}>
                {sessionContext.name}
              </Text>
              <Text style={styles.contextMeta} numberOfLines={1}>
                {`${sessionContext.date ? formatLongDateLabel(sessionContext.date) : "Today"} • ${formatTimeRangeLabel(
                  sessionContext.startTime || "",
                  sessionContext.endTime || ""
                )}`}
              </Text>
              <Text style={styles.contextMeta} numberOfLines={1}>
                {sessionContext.location || "Location not available"}
              </Text>
            </View>
            <View style={styles.contextStats}>
              <ScheduleStatusBadge label={queueStatusLabel} tone={queueStatus === "ENDED" ? "completed" : isQueueLive ? "live" : "upcoming"} />
              <Text style={styles.contextCount}>{`${queue?.waitingCount ?? waitingPatients.length} waiting`}</Text>
              <Text style={styles.contextCount}>{`${queue?.completedCount ?? 0} completed`}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionGrid}>
          <ActionButton
            icon={isQueueActive ? "play-forward" : "play"}
            label={isQueueActive ? "Call Next" : "Start Clinic"}
            onPress={isQueueActive ? handleNextPatient : handleStartQueue}
            disabled={
              isQueueEnded ||
              (!isQueueActive && !selectedScheduleId) ||
              (isQueueActive && (!isQueueLive || hasActivePatient || waitingPatients.length === 0))
            }
            loading={actionLoading === "start" || actionLoading === "next"}
            tone="primary"
          />
          <ActionButton
            icon="arrow-redo-outline"
            label="Open Consultation"
            onPress={handleOpenConsultation}
            disabled={!hasActivePatient}
            loading={actionLoading === "open"}
          />
          <ActionButton
            icon="refresh-circle"
            label="Skip"
            onPress={handleSkipPatient}
            disabled={!isQueueLive || !hasActivePatient}
            loading={actionLoading === "skip"}
          />
          <ActionButton
            icon="stop"
            label="End Clinic"
            onPress={handleEndClinic}
            disabled={isQueueEnded || !isQueueActive || hasActivePatient}
            loading={actionLoading === "end"}
            tone="danger"
          />
        </View>

        {!selectedScheduleId && sessionCards.length > 0 && !isQueueActive ? (
          <Text style={styles.helperText}>Choose a clinic session to start the queue.</Text>
        ) : null}

        <View style={styles.currentPatientCard}>
          <View style={styles.currentPatientHeader}>
            <Text style={styles.sectionTitle}>Current Patient</Text>
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>#{String(currentPatient?.token_number ?? "--")}</Text>
            </View>
          </View>
          {hasActivePatient ? (
            <View style={styles.currentPatientBody}>
              <DoctorAvatar
                name={currentPatient?.name || "No active patient"}
                imageUrl={resolveDoctorImage(currentPatient?.profile_image ?? null)}
                size={48}
                fallbackLabel={getDisplayInitials(currentPatient?.name, "PT")}
              />
              <View style={styles.currentPatientCopy}>
                <Text style={styles.currentPatientName} numberOfLines={1}>
                  {currentPatient?.name || "No active patient"}
                </Text>
                <Text style={styles.currentPatientMeta}>
                  {currentPatient?.appointment_time || currentPatient?.appointmentTime || currentPatient?.scheduled_time
                    ? `Appointment • ${formatTimeLabel(
                        String(
                          currentPatient?.appointment_time ||
                            currentPatient?.appointmentTime ||
                            currentPatient?.scheduled_time
                        )
                      )}`
                    : "Walk-in patient"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.currentPatientBannerWrap}>
              <Image
                source={NO_ACTIVE_PATIENT_BANNER}
                style={styles.currentPatientBanner}
                resizeMode="cover"
              />
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryCta, !hasActivePatient && styles.primaryCtaDisabled]}
            onPress={handleOpenConsultation}
            disabled={!hasActivePatient}
          >
            <Text style={[styles.primaryCtaText, !hasActivePatient && styles.primaryCtaTextDisabled]}>
              {hasActivePatient ? "Open Consultation" : "Waiting for Next Patient"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.queueSectionHeader}>
          <Text style={styles.sectionTitle}>Waiting Queue</Text>
          <Text style={styles.sectionCount}>{waitingPatients.length}</Text>
        </View>

        {waitingPatients.length === 0
          ? renderQueueEmptyState()
          : waitingPatients.map((patient) => {
              const patientTime =
                patient.appointment_time || patient.appointmentTime || patient.scheduled_time || null;
              return (
                <View key={String(patient.id)} style={styles.queuePatientCard}>
                  <View style={styles.queuePatientLeading}>
                    <View style={styles.queueTokenPill}>
                      <Text style={styles.queueTokenText}>{String(patient.token_number || "--")}</Text>
                    </View>
                    <DoctorAvatar
                      name={patient.name || `Patient ${patient.patient_id}`}
                      imageUrl={resolveDoctorImage(patient.profile_image ?? null)}
                      size={40}
                      fallbackLabel={getDisplayInitials(patient.name || `Patient ${patient.patient_id}`, "PT")}
                    />
                  </View>
                  <View style={styles.queuePatientCopy}>
                    <Text style={styles.queuePatientName} numberOfLines={1}>
                      {patient.name || `Patient ${patient.patient_id}`}
                    </Text>
                    <Text style={styles.queuePatientMeta}>
                      {patientTime ? formatTimeLabel(String(patientTime)) : "Walk-in patient"}
                    </Text>
                  </View>
                  <ScheduleStatusBadge label={String(patient.status || "WAITING")} tone="upcoming" />
                </View>
              );
            })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.primary,
  },
  headerShell: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: THEME.surface,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.84)",
  },
  headerStatusPill: {
    backgroundColor: "rgba(234,247,247,0.96)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#5E6A84",
    letterSpacing: 0.6,
  },
  container: {
    padding: 20,
    paddingBottom: 120,
    backgroundColor: THEME.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  stateCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 18,
  },
  stateTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  stateText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: "#F8D9A8",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  errorCopy: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9A5B00",
  },
  errorText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  errorRetryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#FFF4DB",
    borderWidth: 1,
    borderColor: "#F8D9A8",
    alignItems: "center",
    justifyContent: "center",
  },
  errorRetryButtonText: {
    color: "#9A5B00",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.text,
  },
  sectionCaption: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  sessionSelectorStack: {
    marginTop: 14,
    gap: 12,
  },
  sessionSelectorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 12,
    backgroundColor: THEME.surface,
  },
  sessionSelectorCardActive: {
    borderColor: "#93D8D4",
    backgroundColor: "#F2FCFB",
  },
  sessionImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#DDEEEF",
  },
  sessionImageFallback: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#DFF4F2",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  sessionImageFallbackText: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.primary,
  },
  sessionSelectorCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  sessionSelectorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.text,
  },
  sessionSelectorMeta: {
    marginTop: 3,
    fontSize: 12,
    color: THEME.textSecondary,
  },
  contextCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  contextCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  contextMeta: {
    marginTop: 4,
    fontSize: 12,
    color: THEME.textSecondary,
  },
  contextStats: {
    alignItems: "flex-end",
    gap: 4,
  },
  contextCount: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    width: "47%",
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  helperText: {
    marginBottom: 18,
    fontSize: 12,
    color: THEME.textSecondary,
  },
  currentPatientCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  currentPatientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  queueBadge: {
    backgroundColor: THEME.soft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  queueBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.deep,
  },
  currentPatientBody: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  currentPatientBannerWrap: {
    marginTop: 14,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E8F5F3",
  },
  currentPatientBanner: {
    width: "100%",
    height: 184,
  },
  currentPatientCopy: {
    flex: 1,
    marginLeft: 12,
  },
  currentPatientName: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.text,
  },
  currentPatientMeta: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  primaryCta: {
    marginTop: 16,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaDisabled: {
    backgroundColor: THEME.mutedBg,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.surface,
  },
  primaryCtaTextDisabled: {
    color: THEME.textSecondary,
  },
  queueSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionCount: {
    minWidth: 28,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: THEME.soft,
    color: THEME.deep,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyStateCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: THEME.text,
    textAlign: "center",
  },
  queuePatientCard: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  queuePatientLeading: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  queueTokenPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: THEME.soft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  queueTokenText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.deep,
  },
  queuePatientCopy: {
    flex: 1,
    marginRight: 10,
  },
  queuePatientName: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.text,
  },
  queuePatientMeta: {
    marginTop: 4,
    fontSize: 12,
    color: THEME.textSecondary,
  },
});
