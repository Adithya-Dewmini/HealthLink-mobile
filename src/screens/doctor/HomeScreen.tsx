import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import DoctorPanelHeader from "../../components/doctor/DoctorPanelHeader";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";
import { doctorColors, getDoctorStatusTone } from "../../constants/doctorTheme";
import {
  connectSocket,
  joinDoctorRoom,
  socket,
} from "../../services/socket";
import {
  fetchDoctorDashboard,
  type DoctorDashboardData,
  type DoctorDashboardLiveSession,
} from "../../services/doctorDashboardService";
import { useAuth } from "../../utils/AuthContext";
import { formatLongDateLabel, formatTimeRangeLabel } from "../../utils/dateUtils";
import { getFriendlyError } from "../../utils/friendlyErrors";
import { getDisplayInitials, resolveDoctorImage } from "../../utils/imageUtils";

const THEME = {
  background: "#F3F7FB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#DDE6F0",
  text: "#182033",
  muted: "#667085",
  soft: "#EDF5FF",
  primary: doctorColors.primary,
  deep: doctorColors.deep,
  liveBg: "#123B43",
  liveMuted: "rgba(255,255,255,0.72)",
  warningBg: "#FFF7E8",
  warningText: "#B45309",
  successBg: "#EAF8F5",
};

type DoctorNavigation = NativeStackNavigationProp<any>;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const isLiveSessionStatus = (status?: string | null) => {
  const normalized = String(status || "").trim().toLowerCase();
  return ["live", "started", "in_progress", "active", "paused"].includes(normalized);
};

const formatSessionRange = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "Session time unavailable";
  return formatTimeRangeLabel(start, end);
};

const getTodayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(new Date());

export default function HomeScreen() {
  const navigation = useNavigation<DoctorNavigation>();
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DoctorDashboardData | null>(null);
  const [doctorRoomId, setDoctorRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);

  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";
  const greeting = useMemo(() => getGreeting(), []);
  const doctorName = dashboard?.doctor?.name?.trim() || user?.name || "Doctor";
  const specialization = dashboard?.doctor?.specialization?.trim() || user?.specialization || "Clinic dashboard";
  const today = dashboard?.today ?? null;
  const upcoming = dashboard?.upcoming ?? null;
  const liveSession = dashboard?.liveSession ?? null;
  const nextSession = dashboard?.nextSession ?? null;
  const shouldShowActiveQueue =
    Boolean(liveSession) &&
    liveSession?.date === getTodayKey() &&
    isLiveSessionStatus(liveSession?.status);
  const hasNoScheduledWork =
    !shouldShowActiveQueue &&
    Number(today?.sessionCount ?? 0) === 0 &&
    Number(today?.appointmentCount ?? 0) === 0 &&
    Number(upcoming?.sessionCount ?? 0) === 0 &&
    Number(upcoming?.appointmentCount ?? 0) === 0;

  const loadDashboard = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    try {
      setError(null);
      const payload = await fetchDoctorDashboard();
      setDashboard(payload);
      setDoctorRoomId(payload?.doctor?.id ? String(payload.doctor.id) : null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load your doctor dashboard."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard("initial");
    }, [loadDashboard])
  );

  useEffect(() => {
    if (!isVerifiedDoctor || !doctorRoomId) {
      return undefined;
    }

    connectSocket();
    joinDoctorRoom(doctorRoomId);

    const refreshFromRealtime = (message: string) => {
      setRealtimeNotice(message);
      void loadDashboard("refresh");
    };

    const handleQueueUpdate = () => refreshFromRealtime("Queue updated");
    const handleSessionUpdate = () => refreshFromRealtime("Session updated");
    const handleAppointmentUpdate = () => refreshFromRealtime("Appointments updated");

    socket.on("queue:update", handleQueueUpdate);
    socket.on("session.updated", handleSessionUpdate);
    socket.on("appointment.updated", handleAppointmentUpdate);
    socket.on("session:start", handleSessionUpdate);
    socket.on("schedule:update", handleAppointmentUpdate);

    return () => {
      socket.off("queue:update", handleQueueUpdate);
      socket.off("session.updated", handleSessionUpdate);
      socket.off("appointment.updated", handleAppointmentUpdate);
      socket.off("session:start", handleSessionUpdate);
      socket.off("schedule:update", handleAppointmentUpdate);
    };
  }, [doctorRoomId, isVerifiedDoctor, loadDashboard]);

  const handleOpenQueue = useCallback(
    (session: DoctorDashboardLiveSession | null) => {
      if (!session?.id) {
        Alert.alert("Queue unavailable", "Live queue details are not available right now.");
        return;
      }

      navigation.navigate("DoctorTabs", {
        screen: "DoctorQueueControl",
        params: {
          scheduleId: session.id,
          sessionId: session.id,
          queueId: session.queueId ?? undefined,
        },
      });
    },
    [navigation]
  );

  const doctorInitials = useMemo(
    () => getDisplayInitials(doctorName, "DR"),
    [doctorName]
  );

  return (
    <View style={styles.safeArea}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
      </SafeAreaView>

      <DoctorPanelHeader
        variant="hero"
        title={greeting}
        doctorName={`Dr. ${doctorName}`}
        subtitle={specialization}
        initials={doctorInitials}
        rightAvatarUrl={resolveDoctorImage(dashboard?.doctor?.profile_image, user?.profile_image ?? null)}
        secondaryIcon="refresh-outline"
        onSecondaryPress={() => void loadDashboard("refresh")}
        onAvatarPress={() => navigation.navigate("ProfileEdit")}
        statusLabel={shouldShowActiveQueue ? "Live Queue" : undefined}
        statusVariant={shouldShowActiveQueue ? "live" : "idle"}
      />

      <View style={styles.contentWrapper}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard("refresh")} />}
        >
          <View style={styles.contentBody}>
            {!isVerifiedDoctor ? <PendingApprovalBanner /> : null}

            {loading && !refreshing ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={THEME.primary} />
                <Text style={styles.loadingTitle}>Loading dashboard</Text>
                <Text style={styles.loadingCaption}>
                  Your assigned sessions, appointments, and live queue will appear here.
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={22} color={THEME.warningText} />
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>Could not load dashboard</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
                <TouchableOpacity style={styles.retryButton} onPress={() => void loadDashboard("refresh")}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {realtimeNotice ? (
              <View style={styles.realtimeBanner}>
                <Ionicons name="radio-outline" size={16} color={THEME.primary} />
                <Text style={styles.realtimeText} numberOfLines={1}>
                  {realtimeNotice}
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <View>
                  <Text style={styles.sectionHeader}>Today</Text>
                  <Text style={styles.sectionSubtitle}>
                    Real sessions and appointments for your current day
                  </Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{Number(today?.sessionCount ?? 0)}</Text>
                  <Text style={styles.summaryLabel}>Sessions</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryValue}>{Number(today?.appointmentCount ?? 0)}</Text>
                  <Text style={styles.summaryLabel}>Appointments</Text>
                </View>
              </View>

              {nextSession ? (
                <View style={styles.nextSessionCard}>
                  <View style={styles.nextSessionCopy}>
                    <Text style={styles.nextSessionEyebrow}>Next Session</Text>
                    <Text style={styles.nextSessionTitle} numberOfLines={1}>
                      {nextSession.medicalCenterName || "Upcoming clinic"}
                    </Text>
                    <Text style={styles.nextSessionMeta}>
                      {`${formatLongDateLabel(nextSession.date)} • ${formatSessionRange(
                        nextSession.startTime,
                        nextSession.endTime
                      )}`}
                    </Text>
                  </View>
                  <ScheduleStatusBadge
                    label={String(nextSession.status || "Upcoming")}
                    tone={getDoctorStatusTone(nextSession.status || "upcoming")}
                  />
                </View>
              ) : Number(today?.appointmentCount ?? 0) === 0 ? (
                <Text style={styles.emptyInlineText}>No appointments scheduled for today.</Text>
              ) : null}
            </View>

            <View
              style={[
                styles.sectionCard,
                shouldShowActiveQueue && liveSession ? styles.liveQueueSectionCard : null,
              ]}
            >
              {shouldShowActiveQueue && liveSession ? (
                <>
                  <View style={styles.sectionTitleRow}>
                    <View>
                      <Text style={styles.liveQueueEyebrow}>Live Queue Active</Text>
                      <Text style={styles.liveQueueTitle} numberOfLines={1}>
                        {liveSession.medicalCenterName || "Clinic Session"}
                      </Text>
                      <Text style={styles.liveQueueMeta}>Dr. {doctorName}</Text>
                    </View>
                    <ScheduleStatusBadge label="Live" tone="live" />
                  </View>

                  <Text style={styles.liveQueueMeta}>
                    {`${formatLongDateLabel(liveSession.date)} • ${formatSessionRange(
                      liveSession.startTime,
                      liveSession.endTime
                    )}`}
                  </Text>

                  <View style={styles.liveQueueGrid}>
                    <View style={styles.liveMetricCard}>
                      <Text style={styles.liveMetricValue}>{liveSession.checkedInCount}</Text>
                      <Text style={styles.liveMetricLabel}>Checked In</Text>
                    </View>
                    <View style={styles.liveMetricCard}>
                      <Text style={styles.liveMetricValue}>{liveSession.waitingCount}</Text>
                      <Text style={styles.liveMetricLabel}>Waiting</Text>
                    </View>
                    <View style={styles.liveMetricCard}>
                      <Text style={styles.liveMetricValue}>
                        {liveSession.currentServingNumber ?? "--"}
                      </Text>
                      <Text style={styles.liveMetricLabel}>Current Serving</Text>
                    </View>
                    <View style={styles.liveMetricCard}>
                      <Text style={styles.liveMetricValue}>
                        {liveSession.nextQueueNumber ?? "--"}
                      </Text>
                      <Text style={styles.liveMetricLabel}>Next Queue</Text>
                    </View>
                  </View>

                  <View style={styles.liveQueueActions}>
                    <TouchableOpacity
                      style={[
                        styles.primaryActionButton,
                        !liveSession.id && styles.actionButtonDisabled,
                      ]}
                      disabled={!liveSession.id}
                      onPress={() => handleOpenQueue(liveSession)}
                    >
                      <Text style={styles.primaryActionText}>Open Queue</Text>
                    </TouchableOpacity>

                    {liveSession.currentServingNumber != null ? (
                      <TouchableOpacity
                        style={[
                          styles.secondaryActionButton,
                          !liveSession.id && styles.actionButtonDisabled,
                        ]}
                        disabled={!liveSession.id}
                        onPress={() => handleOpenQueue(liveSession)}
                      >
                        <Text style={styles.secondaryActionText}>Start Consultation</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.sectionTitleRow}>
                    <View>
                      <Text style={styles.sectionHeader}>Upcoming</Text>
                      <Text style={styles.sectionSubtitle}>
                        Future assigned sessions and appointments for this doctor
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryValue}>{Number(upcoming?.sessionCount ?? 0)}</Text>
                      <Text style={styles.summaryLabel}>Sessions</Text>
                    </View>
                    <View style={styles.summaryTile}>
                      <Text style={styles.summaryValue}>{Number(upcoming?.appointmentCount ?? 0)}</Text>
                      <Text style={styles.summaryLabel}>Appointments</Text>
                    </View>
                  </View>

                  {nextSession ? (
                    <View style={styles.upcomingSessionCard}>
                      <Text style={styles.upcomingSessionTitle} numberOfLines={1}>
                        {nextSession.medicalCenterName || "Upcoming clinic"}
                      </Text>
                      <Text style={styles.upcomingSessionMeta}>
                        {`${formatLongDateLabel(nextSession.date)} • ${formatSessionRange(
                          nextSession.startTime,
                          nextSession.endTime
                        )}`}
                      </Text>
                      <Text style={styles.upcomingSessionFoot}>
                        {`${nextSession.appointmentCount} appointment${
                          nextSession.appointmentCount === 1 ? "" : "s"
                        }`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.emptyInlineText}>No upcoming sessions assigned right now.</Text>
                  )}
                </>
              )}
            </View>

            {hasNoScheduledWork ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="calendar-clear-outline" size={28} color={THEME.muted} />
                <Text style={styles.emptyStateTitle}>No appointments scheduled for today.</Text>
                <Text style={styles.emptyStateText}>
                  When a receptionist books or starts your clinic session, it will appear here automatically.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  topSafeArea: {
    backgroundColor: THEME.primary,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollBody: {
    paddingBottom: 120,
  },
  contentBody: {
    paddingTop: 18,
    gap: 14,
  },
  loadingCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  loadingTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: THEME.text,
  },
  loadingCaption: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.muted,
    textAlign: "center",
  },
  errorCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.warningBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F8D49A",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorCopy: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.warningText,
  },
  errorText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: "#975A16",
  },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.surface,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.primary,
  },
  realtimeBanner: {
    marginHorizontal: 20,
    backgroundColor: "#E6FFFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#B7F2EA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  realtimeText: {
    flex: 1,
    color: THEME.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  liveQueueCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.liveBg,
    borderRadius: 24,
    padding: 18,
  },
  liveQueueEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.68)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liveQueueTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: THEME.surface,
  },
  liveQueueMeta: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.liveMuted,
  },
  liveQueueGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  liveMetricCard: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  liveMetricValue: {
    color: THEME.surface,
    fontSize: 22,
    fontWeight: "900",
  },
  liveMetricLabel: {
    marginTop: 4,
    color: THEME.liveMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  liveQueueActions: {
    marginTop: 16,
    gap: 10,
  },
  primaryActionButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: THEME.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryActionButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: THEME.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  sectionCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  liveQueueSectionCard: {
    backgroundColor: THEME.liveBg,
    borderColor: THEME.liveBg,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.muted,
  },
  summaryGrid: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: THEME.soft,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.deep,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: THEME.muted,
  },
  nextSessionCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  nextSessionCopy: {
    flex: 1,
  },
  nextSessionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextSessionTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  nextSessionMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.muted,
  },
  upcomingSessionCard: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: THEME.successBg,
    padding: 14,
  },
  upcomingSessionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  upcomingSessionMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.muted,
  },
  upcomingSessionFoot: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: THEME.primary,
  },
  emptyInlineText: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.muted,
  },
  emptyStateCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.muted,
    textAlign: "center",
  },
});
