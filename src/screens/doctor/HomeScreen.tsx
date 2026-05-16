import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import { doctorColors, getDoctorStatusTone } from "../../constants/doctorTheme";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";
import { getDailyReport, getQueueDashboard } from "../../services/doctorQueueService";
import { fetchDoctorPrescriptions } from "../../services/doctorPrescriptionService";
import { fetchDoctorSessionsRange } from "../../services/doctorScheduleService";
import { fetchDoctorClinics, type DoctorClinicItem } from "../../services/doctorClinicsService";
import { connectSocket, joinDoctorRoom, socket } from "../../services/socket";
import { useAuth } from "../../utils/AuthContext";
import { getFriendlyError } from "../../utils/friendlyErrors";
import { formatLongDateLabel, formatTimeRangeLabel } from "../../utils/dateUtils";
import DoctorPanelHeader from "../../components/doctor/DoctorPanelHeader";
import { getDisplayInitials, resolveDoctorImage } from "../../utils/imageUtils";

type DoctorNavigation = NativeStackNavigationProp<any>;
type DashboardSession = {
  id: string;
  clinicName: string;
  date: string;
  startTime: string;
  endTime: string;
  patientCount: number;
  maxPatients?: number;
  status: string;
  source?: string;
};
type FeaturedClinicCard = {
  id: string;
  name: string;
  location: string;
  tag: string;
  trustLabel: string;
  accent: string;
  imageBase?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  logoUrl?: string;
};

// --- Constants & Utilities ---
const THEME = {
  background: "#F1F5F9",
  surface: "#FFFFFF",
  primary: doctorColors.primary,
  secondary: "#64748B",
  dark: "#1E293B",
  border: "#E2E8F0",
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
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Demo fallback clinics used only when live clinic data is unavailable.
const FEATURED_CLINIC_FALLBACK: FeaturedClinicCard[] = [
  { id: "lanka-hospitals", name: "Lanka Hospitals", location: "Colombo 05", tag: "Verified", trustLabel: "Trusted by patients", accent: "#D8F3EE", imageBase: "#DFF6F0" },
  { id: "nawaloka-medical-centre", name: "Nawaloka Medical Centre", location: "Colombo 02", tag: "Popular", trustLabel: "High demand clinic", accent: "#E6F0FF", imageBase: "#EAF2FF" },
  { id: "asiri-central-clinic", name: "Asiri Central Clinic", location: "Kandy", tag: "Specialist Center", trustLabel: "Specialist care", accent: "#F5E8FF", imageBase: "#F5ECFF" },
  { id: "ninewells-family-clinic", name: "Ninewells Family Clinic", location: "Narahenpita", tag: "24/7", trustLabel: "Extended hours", accent: "#FFF1DD", imageBase: "#FFF3E4" },
];

const NO_UPCOMING_SESSIONS_BANNER = require("../../../assets/images/no-upcoming-sessions-banner.png");

const FeaturedClinicImage = memo(function FeaturedClinicImage({
  clinic,
}: {
  clinic: FeaturedClinicCard;
}) {
  const preferredImageUrl = clinic.coverImageUrl || clinic.imageUrl || clinic.logoUrl || null;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [preferredImageUrl]);

  useEffect(() => {
    if (__DEV__) {
      console.log("[DoctorDashboard] Featured clinic image", {
        clinicId: clinic.id,
        clinicName: clinic.name,
        imageUrl: preferredImageUrl,
      });
    }
  }, [clinic.id, clinic.name, preferredImageUrl]);

  if (preferredImageUrl && !imageFailed) {
    return (
      <Image
        source={{ uri: preferredImageUrl }}
        style={styles.clinicCarouselImage}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.clinicFallbackImage, { backgroundColor: clinic.imageBase || clinic.accent }]}>
      <View style={styles.clinicFallbackIconWrap}>
        <Ionicons name="business-outline" size={28} color={THEME.primary} />
      </View>
      <Text style={styles.clinicFallbackText}>Clinic image unavailable</Text>
    </View>
  );
});

export default function HomeScreen() {
  const navigation = useNavigation<DoctorNavigation>();
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<{ name?: string; specialization?: string } | null>(null);
  const [doctorProfileImage, setDoctorProfileImage] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState("IDLE");
  const [dailyStats, setDailyStats] = useState({ totalPatients: 0, avgMinutes: 0, issuedToday: 0 });
  const [doctorId, setDoctorId] = useState<number | string | null>(null);
  const [assignedSessions, setAssignedSessions] = useState<DashboardSession[]>([]);
  const [featuredClinics, setFeaturedClinics] = useState<FeaturedClinicCard[]>(FEATURED_CLINIC_FALLBACK);
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => getGreeting(), []);
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      setError(null);
      if (!isVerifiedDoctor) {
        setDoctorProfile({ 
          name: user?.name ?? undefined, 
          specialization: user?.specialization ?? undefined 
        });
        setPatients([]);
        setAssignedSessions([]);
        setFeaturedClinics(FEATURED_CLINIC_FALLBACK);
        setDoctorProfileImage(resolveDoctorImage(user?.profile_image ?? null));
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const [dashboard, report, doctorResponse, sessions, prescriptions, clinics] = await Promise.all([
        getQueueDashboard(token),
        getDailyReport(token),
        apiFetch("/api/doctor/dashboard"),
        fetchDoctorSessionsRange(formatDateKey(new Date()), formatDateKey(new Date(Date.now() + 14 * 86400000))),
        fetchDoctorPrescriptions({ limit: 5 }),
        fetchDoctorClinics().catch(() => ({ active: [], pending: [] })),
      ]);

      const doctorData = doctorResponse.ok ? await doctorResponse.json() : null;
      
      setDoctorId(doctorData?.doctor?.id ?? user?.id ?? null);
      setPatients(dashboard?.patients || []);
      setQueueStatus(String(dashboard?.queue?.status || "IDLE").toUpperCase());
      setDailyStats({
        totalPatients: report?.dailySummary?.totalPatients || 0,
        avgMinutes: report?.dailySummary?.averageConsultationMinutes || 0,
        issuedToday: prescriptions.filter((item: any) => isSameCalendarDay(item.issuedAt)).length,
      });

      setDoctorProfile({ 
        name: (doctorData?.doctor?.name || user?.name) ?? undefined, 
        specialization: (doctorData?.doctor?.specialization || user?.specialization) ?? undefined 
      });
      setDoctorProfileImage(resolveDoctorImage(doctorData?.doctor?.profile_image, user?.profile_image ?? null));
      
      const internalSessions = sessions.filter((s: DashboardSession) => s.source !== "external");
      setAssignedSessions(internalSessions);
      setFeaturedClinics(
        clinics.active.length
          ? clinics.active.slice(0, 4).map((clinic: DoctorClinicItem, index: number) => ({
              id: clinic.id,
              name: clinic.name,
              location: clinic.location || clinic.address || "Sri Lanka",
              tag: index % 2 === 0 ? "Verified" : "Popular",
              trustLabel: index % 2 === 0 ? "Trusted medical center" : "Booked often by patients",
              accent: FEATURED_CLINIC_FALLBACK[index % FEATURED_CLINIC_FALLBACK.length].accent,
              imageBase: FEATURED_CLINIC_FALLBACK[index % FEATURED_CLINIC_FALLBACK.length].imageBase,
              imageUrl: clinic.image_url,
              coverImageUrl: clinic.cover_image_url,
              logoUrl: clinic.logo_url,
            }))
          : FEATURED_CLINIC_FALLBACK
      );
    } catch (err) {
      console.error(err);
      setError(getFriendlyError(err, "Could not load your doctor workspace."));
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
  const queueCounts = useMemo(() => {
    const counts = {
      waiting: 0,
      inConsultation: 0,
      completed: 0,
      missed: 0,
    };

    patients.forEach((patient) => {
      const status = String(patient?.status || "").toUpperCase();
      if (["WITH_DOCTOR", "IN_CONSULTATION", "ACTIVE"].includes(status)) counts.inConsultation += 1;
      else if (["COMPLETED", "DONE"].includes(status)) counts.completed += 1;
      else if (["MISSED", "SKIPPED"].includes(status)) counts.missed += 1;
      else counts.waiting += 1;
    });

    return counts;
  }, [patients]);
  const activeSession = useMemo(
    () =>
      assignedSessions.find((session) => {
        const status = String(session.status || "").toLowerCase();
        return status === "live" || status === "active";
      }) ??
      (queueStatus === "LIVE"
        ? assignedSessions.find((session) => {
            const startsAt = parseSessionDateTime(session.date, session.startTime);
            if (!startsAt) return false;
            return formatDateKey(startsAt) === formatDateKey(new Date());
          }) ?? null
        : null),
    [assignedSessions, queueStatus]
  );
  const nextSession = useMemo(
    () =>
      assignedSessions
        .map((session) => ({
          ...session,
          startsAt: parseSessionDateTime(session.date, session.startTime),
        }))
        .filter((session) => {
          const status = String(session.status || "").toLowerCase();
          return session.startsAt && session.startsAt.getTime() >= Date.now() && status !== "live" && status !== "active";
        })
        .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())[0] ?? null,
    [assignedSessions]
  );
  const doctorInitials = useMemo(() => {
    return getDisplayInitials(doctorProfile?.name || user?.name || "Doctor", "DR");
  }, [doctorProfile?.name, user?.name]);

  return (
    <View style={styles.safeArea}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
      </SafeAreaView>

      <DoctorPanelHeader
        variant="hero"
        title={`${greeting},`}
        doctorName={`Dr. ${doctorProfile?.name || "Doctor"}`}
        subtitle={doctorProfile?.specialization || "Doctor Workspace"}
        initials={doctorInitials}
        rightAvatarUrl={doctorProfileImage}
        secondaryIcon="notifications-outline"
        onSecondaryPress={() => Alert.alert("Notifications", "No new notifications right now.")}
        onAvatarPress={() => navigation.navigate("ProfileEdit")}
        statusLabel={activeSession ? "Live" : queueStatus === "IDLE" ? undefined : queueStatus}
        statusVariant={activeSession ? "live" : queueStatus === "IDLE" ? "idle" : "pending"}
      />

      <View style={styles.contentWrapper}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
        >
        <View style={styles.contentBody}>
        {!isVerifiedDoctor && <PendingApprovalBanner />}

        {loading && !refreshing ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={THEME.primary} />
            <Text style={styles.loadingTitle}>Preparing your workspace</Text>
            <Text style={styles.loadingCaption}>Today’s queue, clinics, and prescription activity will appear here.</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color="#B45309" />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Could not refresh the dashboard</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadDashboard()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {realtimeNotice ? (
          <View style={styles.realtimeBanner}>
            <Ionicons name="radio-outline" size={16} color={THEME.primary} />
            <Text style={styles.realtimeText} numberOfLines={1}>{realtimeNotice}</Text>
          </View>
        ) : null}

        {activeSession ? (
          <View style={styles.activeSessionCard}>
            <View style={styles.sectionTitleRow}>
              <View>
                <Text style={styles.cardEyebrow}>Active Session</Text>
                <Text style={styles.activeSessionTitle} numberOfLines={1}>
                  {activeSession.clinicName}
                </Text>
              </View>
              <ScheduleStatusBadge label={activeSession.status || "Live"} tone={getDoctorStatusTone(activeSession.status || "live")} />
            </View>
            <Text style={styles.activeSessionMeta}>
              {`${formatLongDateLabel(activeSession.date)} • ${formatTimeRangeLabel(activeSession.startTime, activeSession.endTime)}`}
            </Text>
            <View style={styles.activeSessionPatientRow}>
              <View style={styles.activeSessionPatientCard}>
                <Text style={styles.activeSessionPatientLabel}>Current patient</Text>
                <Text style={styles.activeSessionPatientName}>{currentPatient?.name || "Waiting for next patient"}</Text>
                <Text style={styles.activeSessionPatientSub}>
                  {currentPatient?.token_number ? `Queue #${currentPatient.token_number}` : "Queue is live"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.activeSessionButton}
                onPress={() =>
                  navigation.navigate("DoctorTabs", {
                    screen: "DoctorQueueControl",
                    params: {
                      scheduleId: activeSession.id,
                    },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Open queue"
              >
                <Text style={styles.activeSessionButtonText}>Open Queue</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionHeader}>Quick Actions</Text>
              <Text style={styles.sectionSubtitle}>Shortcuts for your clinic workflow</Text>
            </View>
          </View>
          <View style={styles.quickActionsRow}>
            {[
              { key: "queue", label: "Queue", icon: "pulse-outline" as const, color: "#D7F5EF", iconColor: "#1D7A74", onPress: () => navigation.navigate("DoctorQueueControl") },
              { key: "calendar", label: "Calendar", icon: "calendar-outline" as const, color: "#E5EFFA", iconColor: "#275D92", onPress: () => navigation.navigate("DoctorSchedule", { initialTab: "calendar" }) },
              { key: "sessions", label: "Sessions", icon: "layers-outline" as const, color: "#E7F4FF", iconColor: "#2563A6", onPress: () => navigation.navigate("DoctorSchedule", { initialTab: "routine" }) },
              { key: "rx", label: "RX", icon: "document-text-outline" as const, color: "#FDF1DB", iconColor: "#C47A08", onPress: () => navigation.navigate("DoctorPrescriptions") },
              { key: "reports", label: "Reports", icon: "bar-chart-outline" as const, color: "#EDE7FF", iconColor: "#6A52CC", onPress: () => navigation.navigate("DoctorReport") },
            ].map((action) => (
              <TouchableOpacity key={action.key} style={styles.quickActionCircleItem} onPress={action.onPress} activeOpacity={0.85}>
                <View style={[styles.quickActionCircle, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={24} color={action.iconColor} />
                </View>
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {nextSession || !activeSession ? (
          <View style={styles.sectionBlock}>
            {nextSession ? (
              <>
                <View style={styles.sectionTitleRow}>
                  <View>
                    <Text style={styles.sectionHeader}>Upcoming Sessions</Text>
                    <Text style={styles.sectionSubtitle}>Your next assigned clinic on HealthLink</Text>
                  </View>
                </View>
                <View style={styles.nextClinicCard}>
                  <View style={styles.nextClinicCopy}>
                    <Text style={styles.nextClinicLabel}>Next Clinic</Text>
                    <Text style={styles.nextClinicTitle} numberOfLines={1}>
                      {nextSession.clinicName}
                    </Text>
                    <Text style={styles.nextClinicMeta}>
                      {`${formatLongDateLabel(nextSession.date)} • ${formatTimeRangeLabel(nextSession.startTime, nextSession.endTime)}`}
                    </Text>
                  </View>
                  <View style={styles.countdownBadge}>
                    <Text style={styles.countdownValue}>{formatCountdown(nextSession.date, nextSession.startTime)}</Text>
                    <Text style={styles.countdownLabel}>starts</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.noUpcomingBannerCard}>
                <Image source={NO_UPCOMING_SESSIONS_BANNER} style={styles.noUpcomingBannerImage} resizeMode="cover" />
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.queueSummaryCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeader}>Overview</Text>
            <ScheduleStatusBadge label={queueStatus} tone={getDoctorStatusTone(queueStatus)} />
          </View>
          <View style={styles.queueSummaryGrid}>
            <View style={styles.queueSummaryItem}>
              <Text style={styles.queueSummaryValue}>{dailyStats.totalPatients}</Text>
              <Text style={styles.queueSummaryLabel}>Today</Text>
            </View>
            <View style={styles.queueSummaryItem}>
              <Text style={styles.queueSummaryValue}>{queueCounts.waiting}</Text>
              <Text style={styles.queueSummaryLabel}>Waiting</Text>
            </View>
            <View style={styles.queueSummaryItem}>
              <Text style={styles.queueSummaryValue}>{queueCounts.inConsultation}</Text>
              <Text style={styles.queueSummaryLabel}>In Consultation</Text>
            </View>
            <View style={styles.queueSummaryItem}>
              <Text style={styles.queueSummaryValue}>{dailyStats.issuedToday}</Text>
              <Text style={styles.queueSummaryLabel}>RX Sent</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionHeader}>Featured Clinics</Text>
              <Text style={styles.sectionSubtitle}>Trusted medical centers on HealthLink</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.clinicCarouselContent}
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={308}
            disableIntervalMomentum
          >
            {featuredClinics.map((clinic) => (
              <TouchableOpacity
                key={clinic.id}
                style={styles.clinicCarouselCard}
                activeOpacity={0.92}
                onPress={() => navigation.navigate("DoctorClinics")}
              >
                <FeaturedClinicImage clinic={clinic} />
                <View style={styles.clinicImageOverlay} />
                <View style={styles.clinicFloatingTag}>
                  <Text style={styles.clinicFloatingTagText}>{clinic.tag}</Text>
                </View>
                <View style={styles.clinicCarouselBody}>
                  <View style={styles.clinicCarouselRow}>
                    <View style={styles.clinicCarouselCopy}>
                      <Text style={styles.clinicCarouselName} numberOfLines={1}>{clinic.name}</Text>
                      <Text style={styles.clinicCarouselLocation} numberOfLines={1}>{clinic.location}</Text>
                    </View>
                    <View style={styles.clinicTrustBadge}>
                      <Ionicons name="star" size={12} color="#F79009" />
                      <Text style={styles.clinicTrustBadgeText}>Top rated</Text>
                    </View>
                  </View>
                  <View style={styles.clinicCarouselFooter}>
                    <Text style={styles.clinicCarouselTrust}>{clinic.trustLabel}</Text>
                    <Text style={styles.clinicCarouselLink}>View clinic</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  topSafeArea: { backgroundColor: THEME.primary },
  headerShell: { backgroundColor: THEME.primary },
  contentWrapper: { flex: 1, backgroundColor: THEME.background },
  scrollBody: { paddingBottom: 120 },
  header: {
    backgroundColor: THEME.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  headerLeft: {
    flex: 1,
    marginRight: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  headerBrandText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C9FFF2",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.82)",
  },
  headerDoctorName: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 6,
    color: "rgba(255,255,255,0.84)",
    fontSize: 15,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F9F96",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  contentBody: {
    backgroundColor: THEME.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    gap: 14,
  },
  loadingCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: THEME.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
  },
  loadingTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: THEME.dark,
  },
  loadingCaption: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.secondary,
    textAlign: "center",
  },
  errorCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#FFF7ED",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorCopy: { flex: 1 },
  errorTitle: { fontSize: 14, fontWeight: "800", color: "#9A3412" },
  errorText: { marginTop: 2, fontSize: 12, lineHeight: 18, color: "#B45309" },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.surface,
  },
  retryButtonText: { fontSize: 12, fontWeight: "800", color: THEME.primary },
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
  activeSessionCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.dark,
    borderRadius: 24,
    padding: 18,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.68)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  activeSessionTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.surface,
  },
  activeSessionMeta: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255,255,255,0.72)",
  },
  activeSessionPatientRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  activeSessionPatientCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 16,
  },
  activeSessionPatientLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  activeSessionPatientName: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.surface,
  },
  activeSessionPatientSub: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.68)",
  },
  activeSessionButton: {
    minWidth: 112,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  activeSessionButtonText: {
    color: THEME.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionBlock: {
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.secondary,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionHeader: { fontSize: 18, fontWeight: "800", color: THEME.dark, marginBottom: 4 },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickActionCircleItem: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  quickActionCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(23,35,56,0.06)",
  },
  quickActionText: {
    color: THEME.dark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  nextClinicCard: {
    backgroundColor: THEME.surface,
    borderRadius: 22,
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
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  nextClinicMeta: {
    color: THEME.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  countdownBadge: {
    minWidth: 84,
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
  noUpcomingBannerCard: {
    backgroundColor: "#EAF7F3",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  noUpcomingBannerImage: {
    width: "100%",
    height: 220,
  },
  queueSummaryCard: {
    marginHorizontal: 20,
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  queueSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  queueSummaryItem: {
    width: "47%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  queueSummaryValue: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME.dark,
  },
  queueSummaryLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: THEME.secondary,
    fontWeight: "700",
  },
  clinicCarouselContent: {
    paddingRight: 20,
    gap: 14,
  },
  clinicCarouselCard: {
    width: 294,
    backgroundColor: THEME.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  clinicCarouselImage: {
    width: "100%",
    height: 164,
  },
  clinicFallbackImage: {
    width: "100%",
    height: 164,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  clinicFallbackIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  clinicFallbackText: {
    color: THEME.dark,
    fontSize: 13,
    fontWeight: "700",
  },
  clinicImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 164,
    backgroundColor: "rgba(23,35,56,0.12)",
  },
  clinicFloatingTag: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clinicFloatingTagText: {
    color: THEME.dark,
    fontSize: 11,
    fontWeight: "800",
  },
  clinicCarouselBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  clinicCarouselRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  clinicCarouselCopy: {
    flex: 1,
    minWidth: 0,
  },
  clinicCarouselName: {
    color: THEME.dark,
    fontSize: 19,
    fontWeight: "800",
  },
  clinicCarouselLocation: {
    marginTop: 4,
    color: THEME.secondary,
    fontSize: 14,
  },
  clinicTrustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#FFF7E8",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clinicTrustBadgeText: {
    color: "#975A16",
    fontSize: 11,
    fontWeight: "800",
  },
  clinicCarouselFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  clinicCarouselTrust: {
    flex: 1,
    color: THEME.secondary,
    fontSize: 13,
  },
  clinicCarouselLink: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
