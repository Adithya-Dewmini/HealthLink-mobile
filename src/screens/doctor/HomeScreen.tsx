import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import { doctorColors, getDoctorStatusTone } from "../../constants/doctorTheme";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";
import { getDailyReport, getQueueDashboard } from "../../services/doctorQueueService";
import { fetchDoctorPrescriptions, type DoctorPrescriptionListItem } from "../../services/doctorPrescriptionService";
import { fetchDoctorSessionsRange } from "../../services/doctorScheduleService";
import { connectSocket, joinDoctorRoom, socket } from "../../services/socket";
import { useAuth } from "../../utils/AuthContext";

const { width } = Dimensions.get("window");
type DoctorNavigation = NativeStackNavigationProp<any>;

// --- Constants & Utilities ---
const THEME = {
  background: "#F1F5F9",
  surface: "#FFFFFF",
  primary: doctorColors.primary,
  secondary: "#64748B",
  accent: "#2DD4BF",
  dark: "#1E293B",
  border: "#E2E8F0",
};

const formatDateLabel = (value?: string | null) => {
  if (!value) return "Upcoming";
  const parsed = new Date(value);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(parsed);
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "Time not set";
  return `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}`;
};

const formatDateKey = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

const isSameCalendarDay = (value?: string | null) => {
  if (!value) return false;
  return formatDateKey(new Date(value)) === formatDateKey(new Date());
};

const parseSessionDateTime = (date?: string | null, time?: string | null) => {
  if (!date) return null;
  const normalizedTime = time ? String(time).slice(0, 5) : "00:00";
  const parsed = new Date(`${date}T${normalizedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCountdown = (date?: string | null, time?: string | null) => {
  const startsAt = parseSessionDateTime(date, time);
  if (!startsAt) return "No upcoming clinic";
  const diffMs = startsAt.getTime() - Date.now();
  if (diffMs <= 0) return "Now";
  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Hello";
  if (hour < 17) return "Welcome";
  return "Good evening";
};

export default function HomeScreen() {
  const navigation = useNavigation<DoctorNavigation>();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<{ name?: string; specialization?: string } | null>(null);
  const [queueStatus, setQueueStatus] = useState("IDLE");
  const [waitingNow, setWaitingNow] = useState(0);
  const [dailyStats, setDailyStats] = useState({ totalPatients: 0, avgMinutes: 0, issuedToday: 0 });
  const [doctorId, setDoctorId] = useState<number | string | null>(null);
  const [assignedSessions, setAssignedSessions] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<DoctorPrescriptionListItem[]>([]);
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => getGreeting(), []);
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      if (!isVerifiedDoctor) {
        // Fix: Use nullish coalescing to avoid 'null' being assigned to string|undefined types
        setDoctorProfile({ 
          name: user?.name ?? undefined, 
          specialization: user?.specialization ?? undefined 
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const [dashboard, report, doctorResponse, sessions, prescriptions] = await Promise.all([
        getQueueDashboard(token),
        getDailyReport(token),
        apiFetch("/api/doctor/dashboard"),
        fetchDoctorSessionsRange(formatDateKey(new Date()), formatDateKey(new Date(Date.now() + 14 * 86400000))),
        fetchDoctorPrescriptions({ limit: 5 }),
      ]);

      const doctorData = doctorResponse.ok ? await doctorResponse.json() : null;
      
      setDoctorId(doctorData?.doctor?.id ?? user?.id ?? null);
      setPatients(dashboard?.patients || []);
      setQueueStatus(String(dashboard?.queue?.status || "IDLE").toUpperCase());
      setWaitingNow(dashboard?.queue?.waitingCount || 0);
      setDailyStats({
        totalPatients: report?.dailySummary?.totalPatients || 0,
        avgMinutes: report?.dailySummary?.averageConsultationMinutes || 0,
        issuedToday: prescriptions.filter((item: any) => isSameCalendarDay(item.issuedAt)).length,
      });

      // Fix: Ensure null values from API are converted to undefined for the state
      setDoctorProfile({ 
        name: (doctorData?.doctor?.name || user?.name) ?? undefined, 
        specialization: (doctorData?.doctor?.specialization || user?.specialization) ?? undefined 
      });
      
      const internalSessions = sessions.filter((s: any) => s.source !== "external");
      setAssignedSessions(internalSessions);
      setUpcomingSessions(internalSessions.slice(0, 3));
      setRecentPrescriptions(prescriptions.slice(0, 3));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isVerifiedDoctor, user]);

  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  useEffect(() => {
    if (!isVerifiedDoctor || !doctorId) return undefined;
    void connectSocket();
    joinDoctorRoom(doctorId);

    const refreshFromRealtime = (message: string) => {
      setRealtimeNotice(message);
      void loadDashboard();
    };

    const handleQueueUpdate = () => refreshFromRealtime("Queue updated by clinic staff");
    const handleScheduleUpdate = () => refreshFromRealtime("Schedule updated by medical center");

    socket.on("queue:update", handleQueueUpdate);
    socket.on("queue:next", handleQueueUpdate);
    socket.on("session:start", handleQueueUpdate);
    socket.on("schedule:update", handleScheduleUpdate);

    return () => {
      socket.off("queue:update", handleQueueUpdate);
      socket.off("queue:next", handleQueueUpdate);
      socket.off("session:start", handleQueueUpdate);
      socket.off("schedule:update", handleScheduleUpdate);
    };
  }, [doctorId, isVerifiedDoctor, loadDashboard]);

  const currentPatient = patients.find((p) => p.status === "WITH_DOCTOR") || patients[0];
  const nextSession = useMemo(
    () =>
      assignedSessions
        .map((session) => ({
          ...session,
          startsAt: parseSessionDateTime(session.date, session.startTime),
        }))
        .filter((session) => session.startsAt && session.startsAt.getTime() >= Date.now())
        .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())[0] ?? null,
    [assignedSessions]
  );
  const queueProgress = useMemo(() => {
    const total = patients.length;
    const completed = patients.filter((patient) =>
      ["COMPLETED", "DONE", "SKIPPED", "MISSED"].includes(String(patient.status || "").toUpperCase())
    ).length;
    return {
      total,
      completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
    };
  }, [patients]);
  const scheduleInsights = useMemo(() => {
    const today = new Date();
    const weekEnd = new Date(today.getTime() + 7 * 86400000);
    const weeklySessions = assignedSessions.filter((session) => {
      const startsAt = parseSessionDateTime(session.date, session.startTime);
      return startsAt && startsAt >= today && startsAt <= weekEnd;
    });
    const occupancySessions = weeklySessions.filter((session) => Number(session.maxPatients || 0) > 0);
    const booked = occupancySessions.reduce((sum, session) => sum + Number(session.patientCount || 0), 0);
    const capacity = occupancySessions.reduce((sum, session) => sum + Number(session.maxPatients || 0), 0);
    const cancellations = weeklySessions.filter((session) =>
      ["CANCELLED", "CANCELED"].includes(String(session.status || "").toUpperCase())
    ).length;
    return {
      weeklyLoad: weeklySessions.length,
      occupancy: capacity ? Math.round((booked / capacity) * 100) : null,
      cancellations,
    };
  }, [assignedSessions]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingText}>{greeting},</Text>
          <Text style={styles.doctorName}>Dr. {doctorProfile?.name || "User"}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("DoctorSettings")}
          accessibilityRole="button"
          accessibilityLabel="Open doctor settings"
        >
          <Ionicons name="person-circle-outline" size={32} color={THEME.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{dailyStats.totalPatients}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: THEME.border }]}>
            <Text style={styles.statValue}>{waitingNow}</Text>
            <Text style={styles.statLabel}>Waiting</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{dailyStats.issuedToday}</Text>
            <Text style={styles.statLabel}>RX Sent</Text>
          </View>
        </View>

        {!isVerifiedDoctor && <PendingApprovalBanner />}

        {realtimeNotice ? (
          <View style={styles.realtimeBanner}>
            <Ionicons name="radio-outline" size={16} color={THEME.primary} />
            <Text style={styles.realtimeText} numberOfLines={1}>{realtimeNotice}</Text>
          </View>
        ) : null}

        <View style={styles.nextClinicCard}>
          <View style={styles.nextClinicCopy}>
            <Text style={styles.nextClinicLabel}>Next clinic</Text>
            <Text style={styles.nextClinicTitle} numberOfLines={1}>
              {nextSession?.clinicName || "No upcoming clinic"}
            </Text>
            <Text style={styles.nextClinicMeta}>
              {nextSession
                ? `${formatDateLabel(nextSession.date)} • ${formatTimeRange(nextSession.startTime, nextSession.endTime)}`
                : "Assigned clinic sessions will appear here."}
            </Text>
          </View>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownValue}>{formatCountdown(nextSession?.date, nextSession?.startTime)}</Text>
            <Text style={styles.countdownLabel}>starts</Text>
          </View>
        </View>

        <View style={styles.commanderCard}>
          <View style={styles.commanderHeader}>
            <Text style={styles.commanderTitle}>Live Consultation</Text>
            <View style={[styles.liveDot, { backgroundColor: queueStatus === "LIVE" ? THEME.accent : "#CBD5E1" }]} />
          </View>
          
          <View style={styles.patientFocus}>
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenLabel}>NO.</Text>
              <Text style={styles.tokenNumber}>{currentPatient?.token_number || "--"}</Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName} numberOfLines={1}>{currentPatient?.name || "No Active Patient"}</Text>
              <Text style={styles.queueStatusText}>{queueStatus === "LIVE" ? "Ready for review" : "Queue not started"}</Text>
            </View>
          </View>
          <View style={styles.progressBlock}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Queue progress</Text>
              <Text style={styles.progressValue}>{queueProgress.completed}/{queueProgress.total || 0}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${queueProgress.percent}%` }]} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("DoctorQueueControl")}
            accessibilityRole="button"
            accessibilityLabel="Open queue control center"
          >
            <Text style={styles.actionButtonText}>Launch Queue Center</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME.surface} />
          </TouchableOpacity>
        </View>

        <View style={styles.insightsRow}>
          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>{scheduleInsights.weeklyLoad}</Text>
            <Text style={styles.insightLabel}>Weekly clinics</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>
              {scheduleInsights.occupancy === null ? "N/A" : `${scheduleInsights.occupancy}%`}
            </Text>
            <Text style={styles.insightLabel}>Occupancy</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>{scheduleInsights.cancellations}</Text>
            <Text style={styles.insightLabel}>Cancelled</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate("DoctorSchedule")}
            accessibilityRole="button"
            accessibilityLabel="Open doctor schedule"
          >
            <View style={[styles.iconBox, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="calendar" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.gridLabel}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate("DoctorPrescriptions")}
            accessibilityRole="button"
            accessibilityLabel="Open doctor prescriptions"
          >
            <View style={[styles.iconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="document-text" size={24} color="#10B981" />
            </View>
            <Text style={styles.gridLabel}>E-Scripts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate("DoctorClinics")}
            accessibilityRole="button"
            accessibilityLabel="Open doctor clinics"
          >
            <View style={[styles.iconBox, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="business" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.gridLabel}>Clinics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate("DoctorSettings")}
            accessibilityRole="button"
            accessibilityLabel="Open doctor controls"
          >
            <View style={[styles.iconBox, { backgroundColor: "#F1F5F9" }]}>
              <Ionicons name="options" size={24} color="#475569" />
            </View>
            <Text style={styles.gridLabel}>Controls</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Upcoming Shifts</Text>
          {loading ? (
            <ActivityIndicator color={THEME.primary} />
          ) : upcomingSessions.map((session, index) => (
            <View key={index} style={styles.sessionItem}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateDay}>{formatDateLabel(session.date).split(' ')[0]}</Text>
                <Text style={styles.dateNum}>{new Date(session.date).getDate()}</Text>
              </View>
              <View style={styles.sessionDetails}>
                <Text style={styles.sessionClinic} numberOfLines={1}>{session.clinicName}</Text>
                <Text style={styles.sessionTime}>{formatTimeRange(session.startTime, session.endTime)}</Text>
              </View>
              <ScheduleStatusBadge 
                label={session.status ?? "Upcoming"} 
                tone={getDoctorStatusTone(session.status ?? "upcoming")} 
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>Recent Prescriptions</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("DoctorPrescriptions")}
              accessibilityRole="button"
              accessibilityLabel="Open all prescriptions"
            >
              <Text style={styles.linkText}>View all</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={THEME.primary} />
          ) : recentPrescriptions.length ? (
            recentPrescriptions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.prescriptionItem}
                onPress={() => navigation.navigate("DoctorPrescriptionDetails", { prescriptionId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Open prescription for ${item.patient.name}`}
              >
                <View style={styles.rxIcon}>
                  <Ionicons name="document-text-outline" size={18} color={THEME.primary} />
                </View>
                <View style={styles.rxDetails}>
                  <Text style={styles.rxPatient} numberOfLines={1}>{item.patient.name}</Text>
                  <Text style={styles.rxMeta} numberOfLines={1}>
                    {item.medicineCount} medicines • {item.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={THEME.secondary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyPanelTitle}>No prescriptions issued yet</Text>
              <Text style={styles.emptyPanelText}>Completed consultations will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: THEME.surface },
  greetingText: { fontSize: 14, color: THEME.secondary, fontWeight: "500" },
  doctorName: { fontSize: 22, fontWeight: "800", color: THEME.dark },
  profileButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  scrollBody: { paddingBottom: 40 },
  statsRow: { flexDirection: "row", backgroundColor: THEME.surface, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: THEME.border },
  statBox: { flex: 1, paddingVertical: 15, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: THEME.dark },
  statLabel: { fontSize: 12, color: THEME.secondary, marginTop: 2 },
  realtimeBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#E6FFFB",
    borderWidth: 1,
    borderColor: "#B7F2EA",
    borderRadius: 14,
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
  nextClinicCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  nextClinicCopy: { flex: 1, minWidth: 0 },
  nextClinicLabel: {
    color: THEME.secondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  nextClinicTitle: {
    color: THEME.dark,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  nextClinicMeta: {
    color: THEME.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  countdownBadge: {
    minWidth: 78,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  countdownValue: {
    color: THEME.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  countdownLabel: {
    color: THEME.secondary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
  },
  commanderCard: { margin: 20, backgroundColor: THEME.dark, borderRadius: 24, padding: 20, elevation: 8 },
  commanderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  commanderTitle: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  patientFocus: { flexDirection: "row", alignItems: "center", marginBottom: 25 },
  tokenBadge: { backgroundColor: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 16, alignItems: "center", minWidth: 60 },
  tokenLabel: { color: THEME.accent, fontSize: 10, fontWeight: "800" },
  tokenNumber: { color: "#FFF", fontSize: 24, fontWeight: "900" },
  patientInfo: { marginLeft: 15, flex: 1 },
  patientName: { color: "#FFF", fontSize: 20, fontWeight: "700" },
  queueStatusText: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 },
  progressBlock: { marginBottom: 18 },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: { color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "700" },
  progressValue: { color: THEME.surface, fontSize: 12, fontWeight: "800" },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: THEME.accent,
  },
  actionButton: { backgroundColor: THEME.primary, height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  actionButtonText: { color: "#FFF", fontWeight: "700", fontSize: 15, marginRight: 8 },
  insightsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  insightCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  insightValue: { color: THEME.dark, fontSize: 20, fontWeight: "900" },
  insightLabel: { color: THEME.secondary, fontSize: 11, fontWeight: "700", marginTop: 4 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 15 },
  gridItem: { width: (width - 60) / 2, backgroundColor: THEME.surface, margin: 7, padding: 16, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: THEME.border },
  iconBox: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  gridLabel: { fontSize: 14, fontWeight: "700", color: THEME.dark },
  section: { padding: 20 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionHeader: { fontSize: 16, fontWeight: "800", color: THEME.dark, marginBottom: 15 },
  linkText: { color: THEME.primary, fontSize: 13, fontWeight: "800" },
  sessionItem: { flexDirection: "row", alignItems: "center", backgroundColor: THEME.surface, padding: 15, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: THEME.border },
  dateBlock: { alignItems: "center", paddingRight: 15, borderRightWidth: 1, borderRightColor: THEME.border, minWidth: 50 },
  dateDay: { fontSize: 10, fontWeight: "800", color: THEME.secondary, textTransform: "uppercase" },
  dateNum: { fontSize: 18, fontWeight: "800", color: THEME.primary },
  sessionDetails: { flex: 1, paddingHorizontal: 15 },
  sessionClinic: { fontSize: 15, fontWeight: "700", color: THEME.dark },
  sessionTime: { fontSize: 12, color: THEME.secondary, marginTop: 2 },
  prescriptionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 10,
  },
  rxIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rxDetails: { flex: 1, minWidth: 0 },
  rxPatient: { color: THEME.dark, fontSize: 14, fontWeight: "800" },
  rxMeta: { color: THEME.secondary, fontSize: 12, marginTop: 3 },
  emptyPanel: {
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyPanelTitle: { color: THEME.dark, fontSize: 14, fontWeight: "800" },
  emptyPanelText: { color: THEME.secondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
