import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CompositeNavigationProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchReceptionDashboard } from "../../services/receptionService";
import { AuthContext } from "../../utils/AuthContext";
import { hasAnyReceptionistPermission } from "../../utils/receptionistPermissions";
import type { ReceptionistStackParamList, ReceptionistTabParamList } from "../../types/navigation";
import { getFriendlyError } from "../../utils/friendlyErrors";

const theme = {
  primary: "#061A2E",
  sidebar: "#08233D",
  deepBlue: "#0B3558",
  brand: "#0EA5E9",
  softCyan: "#38BDF8",
  bgLight: "#EFF8FF",
  cardBg: "#FFFFFF",
  mutedSurface: "#F8FAFC",
  border: "#D8E7F3",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  success: "#10B981",
  successBg: "#D1FAE5",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
};

type NowServingPatient = {
  queueNumber?: number | null;
  patientName?: string | null;
};

type ReceptionActiveSession = {
  id: number;
  doctorId?: number | null;
  doctorUserId?: number | null;
  doctorName: string;
  doctorImageUrl?: string | null;
  specialization?: string | null;
  medicalCenterName?: string | null;
  roomNumber?: string | null;
  startTime: string;
  endTime: string;
  status?: string | null;
  queueStatus?: string | null;
  nowServingPatient?: NowServingPatient | null;
  waitingCount?: number | null;
  bookedCount?: number | null;
  date?: string | null;
};

type DashboardPayload = {
  clinic?: { id?: string; name?: string };
  activeSession?: Partial<ReceptionActiveSession> | null;
  activeSessions?: Array<Partial<ReceptionActiveSession>> | null;
  sessions?: Array<Partial<ReceptionActiveSession>> | null;
  queue?: {
    waitingCount?: number;
    currentPatient?:
      | {
          patient_name?: string | null;
          queue_number?: number | null;
          token_number?: number | null;
        }
      | null;
    averageWaitMinutes?: number;
    status?: string | null;
  } | null;
  nextPatient?: {
    token_number?: number | null;
    patient_name?: string | null;
  } | null;
  stats?: {
    totalPatients?: number;
    todayAppointments?: number;
    missedToday?: number;
    inQueue?: number;
    checkedInToday?: number;
    completedToday?: number;
    walkInsToday?: number;
    todaySessions?: number;
  };
};

type OverviewStat = {
  id: string;
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  iconColor: string;
  enabled: boolean;
  onPress: () => void;
};

const EMPTY_STATS = {
  totalPatients: 0,
  todayAppointments: 0,
  missedToday: 0,
  inQueue: 0,
  checkedInToday: 0,
  completedToday: 0,
  walkInsToday: 0,
  todaySessions: 0,
};

const LIVE_QUEUE_STATUS_VALUES = ["live", "queue_live", "now_serving", "in_progress", "paused"];

const SectionHeader = ({ title, actionText, onPress }: { title: string; actionText?: string; onPress?: () => void }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionText ? (
      <TouchableOpacity onPress={onPress} disabled={!onPress}>
        <Text style={styles.sectionAction}>{actionText}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const StatusPill = ({ status }: { status: string }) => {
  const { bgColor, textColor } = getStatusPillStyle(status);
  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      <Text style={[styles.pillText, { color: textColor }]}>{getQueueStatusLabel(status)}</Text>
    </View>
  );
};

const normalizeQueueStatus = (status?: string | null) => String(status || "").trim().toLowerCase();

const isLiveQueue = (session: Partial<ReceptionActiveSession> | null | undefined) => {
  if (!session) return false;
  const queueStatus = normalizeQueueStatus(session.queueStatus || session.status);
  return LIVE_QUEUE_STATUS_VALUES.includes(queueStatus);
};

const getSessionPriority = (session: Partial<ReceptionActiveSession>) => {
  const status = normalizeQueueStatus(session.queueStatus || session.status);
  if (status === "live" || status === "queue_live" || status === "now_serving") return 0;
  if (status === "paused") return 1;
  if (status === "in_progress") return 2;
  return 99;
};

const getTimeValue = (value?: string | null) => {
  if (!value) return 9999;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  return Number(match[1]) * 60 + Number(match[2]);
};

const normalizeActiveSession = (
  session: Partial<ReceptionActiveSession>,
  dashboard: DashboardPayload
): ReceptionActiveSession | null => {
  if (!session.id || !session.doctorName) return null;

  const currentPatient = dashboard.queue?.currentPatient;
  const normalizedNowServing =
    session.nowServingPatient ||
    (currentPatient
      ? {
          queueNumber: currentPatient.queue_number ?? currentPatient.token_number ?? null,
          patientName: currentPatient.patient_name ?? null,
        }
      : null);

  return {
    id: session.id,
    doctorId: session.doctorId ?? null,
    doctorUserId: session.doctorUserId ?? null,
    doctorName: session.doctorName,
    doctorImageUrl: session.doctorImageUrl ?? null,
    specialization: session.specialization ?? null,
    medicalCenterName: session.medicalCenterName ?? dashboard.clinic?.name ?? null,
    roomNumber: session.roomNumber ?? null,
    startTime: session.startTime || "--",
    endTime: session.endTime || "--",
    status: session.status ?? null,
    queueStatus: session.queueStatus ?? dashboard.queue?.status ?? session.status ?? null,
    nowServingPatient: normalizedNowServing,
    waitingCount: session.waitingCount ?? dashboard.queue?.waitingCount ?? 0,
    bookedCount: session.bookedCount ?? null,
    date: session.date ?? null,
  };
};

const getLiveQueueFromSessions = (dashboard: DashboardPayload): ReceptionActiveSession | null => {
  const pool: Array<Partial<ReceptionActiveSession>> = [];

  if (dashboard.activeSession) pool.push(dashboard.activeSession);
  if (Array.isArray(dashboard.activeSessions)) pool.push(...dashboard.activeSessions);
  if (Array.isArray(dashboard.sessions)) pool.push(...dashboard.sessions);

  const unique = pool.filter(
    (session, index, list) => session?.id && list.findIndex((item) => item?.id === session.id) === index
  );

  const active = unique
    .filter(isLiveQueue)
    .sort((a, b) => {
      const priorityDiff = getSessionPriority(a) - getSessionPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return getTimeValue(a.startTime) - getTimeValue(b.startTime);
    });

  if (active.length === 0) return null;
  return normalizeActiveSession(active[0], dashboard);
};

const getQueueStatusLabel = (status?: string | null) => {
  const normalized = normalizeQueueStatus(status);
  if (normalized === "queue_live" || normalized === "live") return "Queue Live";
  if (normalized === "now_serving") return "Now Serving";
  if (normalized === "paused") return "Paused";
  if (normalized === "in_progress") return "In Progress";
  if (normalized === "not_started") return "Not Started";
  if (normalized === "doctor_delayed") return "Doctor Delayed";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled") return "Cancelled";
  return status || "Scheduled";
};

const getStatusPillStyle = (status?: string | null) => {
  const normalized = normalizeQueueStatus(status);
  if (normalized === "queue_live" || normalized === "live" || normalized === "now_serving" || normalized === "in_progress") {
    return { bgColor: theme.successBg, textColor: theme.success };
  }
  if (normalized === "paused" || normalized === "doctor_delayed") {
    return { bgColor: theme.warningBg, textColor: theme.warning };
  }
  if (normalized === "cancelled") {
    return { bgColor: theme.dangerBg, textColor: theme.danger };
  }
  if (normalized === "completed") {
    return { bgColor: "#DBEAFE", textColor: theme.deepBlue };
  }
  return { bgColor: theme.mutedSurface, textColor: theme.textSecondary };
};

const isTodayDate = (value?: string | null) => {
  if (!value) return false;
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);
  return value.slice(0, 10) === todayString;
};

const isFutureDate = (value?: string | null) => {
  if (!value) return false;
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return target > today;
};

const getAllSessions = (dashboard: DashboardPayload): ReceptionActiveSession[] => {
  const pool: Array<Partial<ReceptionActiveSession>> = [];
  if (dashboard.activeSession) pool.push(dashboard.activeSession);
  if (Array.isArray(dashboard.activeSessions)) pool.push(...dashboard.activeSessions);
  if (Array.isArray(dashboard.sessions)) pool.push(...dashboard.sessions);

  const unique = pool.filter(
    (session, index, list) => session?.id && list.findIndex((item) => item?.id === session.id) === index
  );

  return unique
    .map((session) => normalizeActiveSession(session, dashboard))
    .filter((session): session is ReceptionActiveSession => Boolean(session));
};

const getTodaySessions = (sessions: ReceptionActiveSession[]) =>
  sessions
    .filter((session) => isTodayDate(session.date) || !session.date)
    .sort((a, b) => getTimeValue(a.startTime) - getTimeValue(b.startTime));

const getUpcomingSessions = (sessions: ReceptionActiveSession[]) =>
  sessions
    .filter((session) => isFutureDate(session.date))
    .sort((a, b) => {
      const dateDiff = new Date(a.date || "").getTime() - new Date(b.date || "").getTime();
      if (dateDiff !== 0) return dateDiff;
      return getTimeValue(a.startTime) - getTimeValue(b.startTime);
    });

const formatSessionDate = (value?: string | null) => {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatDateLabel = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || "RC";

export default function ReceptionistDashboardScreen() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<ReceptionistTabParamList>,
      NativeStackNavigationProp<ReceptionistStackParamList>
    >
  >();
  const { user, logout, receptionistPermissions } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const loadDashboard = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = (await fetchReceptionDashboard()) as DashboardPayload;
      setDashboard(response);
      setError(null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load dashboard."));
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
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, dashboard]);

  const handleLogout = useCallback(() => {
    Alert.alert("Sign out", "Do you want to sign out of the receptionist panel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }, [logout]);

  const stats = { ...EMPTY_STATS, ...(dashboard?.stats ?? {}) };
  const allSessions = useMemo(() => (dashboard ? getAllSessions(dashboard) : []), [dashboard]);
  const liveQueueSession = useMemo(() => (dashboard ? getLiveQueueFromSessions(dashboard) : null), [dashboard]);
  const todaySessions = useMemo(() => getTodaySessions(allSessions), [allSessions]);
  const upcomingSessions = useMemo(() => getUpcomingSessions(allSessions), [allSessions]);
  const activeSessionCount = useMemo(() => {
    const pool = [
      ...(dashboard?.activeSession ? [dashboard.activeSession] : []),
      ...(Array.isArray(dashboard?.activeSessions) ? dashboard.activeSessions : []),
      ...(Array.isArray(dashboard?.sessions) ? dashboard.sessions : []),
    ];
    return pool.filter(isLiveQueue).length;
  }, [dashboard]);

  const overviewStats: OverviewStat[] = [
    {
      id: "sessions",
      title: "Sessions",
      value: String(stats.todaySessions || todaySessions.length),
      icon: "calendar",
      color: theme.brand,
    },
    {
      id: "booked",
      title: "Booked",
      value: String(stats.todayAppointments),
      icon: "people",
      color: theme.deepBlue,
    },
    {
      id: "checked-in",
      title: "Checked-in",
      value: String(stats.checkedInToday),
      icon: "checkmark-circle",
      color: theme.success,
    },
    {
      id: "waiting",
      title: "Waiting",
      value: String(liveQueueSession?.waitingCount ?? stats.inQueue),
      icon: "time",
      color: theme.warning,
    },
    {
      id: "completed",
      title: "Completed",
      value: String(stats.completedToday),
      icon: "flag",
      color: theme.success,
    },
    {
      id: "walk-ins",
      title: "Walk-ins",
      value: String(stats.walkInsToday),
      icon: "walk",
      color: theme.softCyan,
    },
    {
      id: "missed",
      title: "Missed / Late",
      value: String(stats.missedToday),
      icon: "alert-circle",
      color: theme.danger,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: "sessions",
      label: "Today Sessions",
      icon: "calendar-outline",
      backgroundColor: "#E0F2FE",
      iconColor: theme.brand,
      enabled: receptionistPermissions.schedule_management,
      onPress: () => navigation.navigate("ReceptionistSessions"),
    },
    {
      id: "queue",
      label: "Live Queue",
      icon: "git-network-outline",
      backgroundColor: "#DCFCE7",
      iconColor: theme.success,
      enabled: receptionistPermissions.queue_access,
      onPress: () => navigation.navigate("ReceptionistQueue"),
    },
    {
      id: "checkin",
      label: "Check-in",
      icon: "qr-code-outline",
      backgroundColor: "#E0E7FF",
      iconColor: "#6366F1",
      enabled: receptionistPermissions.check_in,
      onPress: () => navigation.navigate("ReceptionistRegistration"),
    },
    {
      id: "walkins",
      label: "Walk-ins",
      icon: "person-add-outline",
      backgroundColor: "#FEF3C7",
      iconColor: theme.warning,
      enabled: receptionistPermissions.check_in,
      onPress: () => navigation.navigate("ReceptionistRegistration"),
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: "book-outline",
      backgroundColor: "#EDE9FE",
      iconColor: "#8B5CF6",
      enabled: receptionistPermissions.appointments,
      onPress: () => navigation.navigate("ReceptionistBookAppointment"),
    },
    {
      id: "late",
      label: "Late / Missed",
      icon: "alert-circle-outline",
      backgroundColor: "#FEE2E2",
      iconColor: theme.danger,
      enabled: receptionistPermissions.appointments,
      onPress: () => navigation.navigate("ReceptionistAppointments"),
    },
  ];

  const receptionistName = user?.name?.trim() || "Receptionist";
  const canUsePanel = hasAnyReceptionistPermission(receptionistPermissions);
  const entranceStyle = useMemo(
    () => ({
      opacity: entrance,
      transform: [
        {
          translateY: entrance.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
      ],
    }),
    [entrance]
  );

  const openQueueForSession = useCallback((session?: ReceptionActiveSession | null) => {
    navigation.navigate("ReceptionistQueue");
  }, [navigation]);

  const viewSessionForItem = useCallback((session?: ReceptionActiveSession | null) => {
    if (session?.doctorId && session?.doctorUserId) {
      navigation.navigate("ReceptionistDoctorSessionOverview", {
        doctorId: session.doctorId,
        doctorUserId: session.doctorUserId,
        doctorName: session.doctorName,
        specialization: session.specialization || null,
      });
      return;
    }

    // TODO: Connect Active Session action to a direct session detail route when dashboard returns doctor/session context.
    navigation.navigate("ReceptionistSessions");
  }, [navigation]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.brandRow}>
          <Ionicons name="medical" size={18} color={theme.softCyan} />
          <Text style={styles.headerBrandText}>HealthLink</Text>
        </View>
        <Text style={styles.headerTitle}>Reception</Text>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton} onPress={() => void loadDashboard("refresh")}>
          <Ionicons name="refresh-outline" size={22} color={theme.cardBg} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.avatarPlaceholder} onPress={handleLogout}>
          <Text style={styles.avatarText}>{getInitials(receptionistName)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStats = () => (
      <Animated.View style={[styles.sectionContainer, styles.topSectionSpacing, entranceStyle]}>
        <SectionHeader title="Clinic Overview" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        {overviewStats.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statCardAccent, { backgroundColor: stat.color }]} />
            <View style={[styles.statIconWrapper, { backgroundColor: `${stat.color}1A` }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.title}</Text>
          </View>
        ))}
      </ScrollView>
      </Animated.View>
  );

  const renderLiveQueueCard = () => {
    if (!loading && !error && !liveQueueSession) {
      return null;
    }

    return (
      <Animated.View style={[styles.sectionContainer, styles.topSectionSpacing, entranceStyle]}>
        <SectionHeader title="Live Queue Now" />
      {loading ? (
        <View style={styles.activeSessionCardLoading}>
          <ActivityIndicator size="small" color={theme.brand} />
          <Text style={styles.loadingText}>Loading live queue...</Text>
        </View>
      ) : error ? (
        <View style={styles.activeSessionCard}>
          <Text style={styles.errorTitle}>Could not load live queue.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void loadDashboard("refresh")}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : liveQueueSession ? (
        <View style={styles.activeSessionCard}>
          <View style={styles.activeSessionHeader}>
            <View style={styles.doctorInfoRow}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>{getInitials(liveQueueSession.doctorName)}</Text>
              </View>
              <View style={styles.doctorTextWrap}>
                <Text style={styles.doctorName}>{liveQueueSession.doctorName}</Text>
                <Text style={styles.doctorSpecialty}>
                  {liveQueueSession.specialization || "Doctor"}
                  {liveQueueSession.roomNumber ? ` • ${liveQueueSession.roomNumber}` : ""}
                </Text>
              </View>
            </View>
            <StatusPill status={String(liveQueueSession.queueStatus || liveQueueSession.status || "Queue Live")} />
          </View>

          <View style={styles.sessionDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={styles.detailText}>
                {`${liveQueueSession.startTime} - ${liveQueueSession.endTime}`}
              </Text>
            </View>
            {liveQueueSession.nowServingPatient?.patientName ? (
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.detailText}>
                  Now serving:{" "}
                  {liveQueueSession.nowServingPatient.queueNumber
                    ? `#${liveQueueSession.nowServingPatient.queueNumber} `
                    : ""}
                  {liveQueueSession.nowServingPatient.patientName}
                </Text>
              </View>
            ) : null}
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={16} color={theme.textSecondary} />
              <Text style={styles.detailText}>Waiting: {liveQueueSession.waitingCount ?? 0} patients</Text>
            </View>
            {activeSessionCount > 1 ? (
              <View style={styles.detailItem}>
                <Ionicons name="layers-outline" size={16} color={theme.brand} />
                <Text style={styles.detailText}>More active sessions available</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sessionActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => openQueueForSession(liveQueueSession)}>
              <Text style={styles.primaryButtonText}>Open Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => viewSessionForItem(liveQueueSession)}>
              <Text style={styles.secondaryButtonText}>View Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      </Animated.View>
    );
  };

  const renderQuickActions = () => (
    <Animated.View style={[styles.sectionContainer, entranceStyle]}>
      <SectionHeader title="Quick Actions" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionItem, !action.enabled && styles.actionCardDisabled]}
            onPress={action.onPress}
            disabled={!action.enabled}
            accessibilityLabel={action.label}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: action.backgroundColor }]}>
              <Ionicons name={action.icon} size={24} color={action.iconColor} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderTodaySessions = () => (
    <Animated.View style={[styles.sectionContainer, entranceStyle]}>
      <SectionHeader title="Today's Sessions" actionText="View All" onPress={() => navigation.navigate("ReceptionistSessions")} />
      {todaySessions.length ? (
        todaySessions.map((session) => (
          <View key={`today-${session.id}`} style={styles.sessionCard}>
            <View style={styles.sessionCardAccent} />
            <View style={styles.sessionCardHeader}>
              <View style={styles.sessionLeading}>
                <View style={styles.sessionAvatar}>
                  <Text style={styles.sessionAvatarText}>{getInitials(session.doctorName)}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionCardTitle}>{session.doctorName}</Text>
                <Text style={styles.sessionCardSubtitle}>
                  {session.specialization || "Doctor"}
                  {session.roomNumber ? ` • ${session.roomNumber}` : ""}
                </Text>
                <Text style={styles.sessionMeta}>{session.startTime} - {session.endTime}</Text>
                <Text style={styles.sessionMeta}>Booked: {session.bookedCount ?? 0}</Text>
              </View>
              <View style={styles.sessionRight}>
                <StatusPill status={session.queueStatus || session.status || "Not Started"} />
              </View>
            </View>
            <View style={styles.sessionCardActions}>
              <TouchableOpacity style={styles.secondaryButtonCompact} onPress={() => viewSessionForItem(session)}>
                <Text style={styles.secondaryButtonCompactText}>View</Text>
              </TouchableOpacity>
              {isLiveQueue(session) ? (
                <TouchableOpacity style={styles.primaryButtonCompact} onPress={() => openQueueForSession(session)}>
                  <Text style={styles.primaryButtonCompactText}>Open Queue</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.sessionEmptyCard}>
          <View style={[styles.sessionEmptyIconWrap, styles.todayEmptyIconWrap]}>
            <Ionicons name="calendar-clear-outline" size={22} color={theme.brand} />
          </View>
          <View style={styles.sessionEmptyContent}>
            <Text style={styles.emptyStateTitle}>No sessions scheduled for today.</Text>
            <Text style={styles.emptyStateText}>Today's doctor sessions will appear here.</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );

  const renderUpcoming = () => (
    <View style={styles.sectionContainer}>
      <SectionHeader title="Upcoming Sessions" />
      {upcomingSessions.length ? (
        upcomingSessions.slice(0, 4).map((session) => (
          <View key={`upcoming-${session.id}`} style={styles.sessionCard}>
            <View style={styles.sessionCardAccent} />
            <View style={styles.sessionCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionCardTitle}>{session.doctorName}</Text>
                <Text style={styles.sessionCardSubtitle}>
                  {session.specialization || "Doctor"}
                  {session.roomNumber ? ` • ${session.roomNumber}` : ""}
                </Text>
              </View>
              <StatusPill status={session.queueStatus || session.status || "Scheduled"} />
            </View>
            <Text style={styles.sessionMeta}>
              {formatSessionDate(session.date)} • {session.startTime} - {session.endTime}
            </Text>
            <Text style={styles.sessionMeta}>Booked: {session.bookedCount ?? 0}</Text>
          </View>
        ))
      ) : (
        <View style={styles.sessionEmptyCard}>
          <View style={[styles.sessionEmptyIconWrap, styles.upcomingEmptyIconWrap]}>
            <Ionicons name="time-outline" size={22} color={theme.warning} />
          </View>
          <View style={styles.sessionEmptyContent}>
            <Text style={styles.emptyStateTitle}>No upcoming sessions.</Text>
            <Text style={styles.emptyStateText}>Future doctor sessions will appear here.</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderPulse = () => (
    <View style={styles.sectionContainer}>
      <SectionHeader title="Clinic Pulse" />
      <View style={styles.pulseGrid}>
        <View style={styles.pulseCard}>
          <Ionicons
            name="swap-vertical"
            size={18}
            color={(liveQueueSession?.waitingCount ?? stats.inQueue) > 10 ? theme.warning : theme.success}
          />
          <Text style={styles.pulseTitle}>Queue Health</Text>
          <Text style={styles.pulseValue}>
            {(liveQueueSession?.waitingCount ?? stats.inQueue) > 10 ? "Pressure rising" : "Flow clear"}
          </Text>
        </View>
        <View style={styles.pulseCard}>
          <Ionicons name="checkmark-done" size={18} color={theme.brand} />
          <Text style={styles.pulseTitle}>Readiness</Text>
          <Text style={styles.pulseValue}>{stats.checkedInToday} checked in</Text>
        </View>
        <View style={styles.pulseCard}>
          <Ionicons name="alert-circle" size={18} color={theme.warning} />
          <Text style={styles.pulseTitle}>Follow-up</Text>
          <Text style={styles.pulseValue}>{stats.missedToday} issue{stats.missedToday === 1 ? "" : "s"}</Text>
        </View>
      </View>
    </View>
  );

  const renderGuidance = () => (
    <View style={[styles.sectionContainer, { paddingBottom: 40 }]}>
      <SectionHeader title="Front Desk Flow" />
      <View style={styles.guidanceCard}>
        <View style={styles.guidanceStep}>
          <Text style={styles.guidanceNumber}>1.</Text>
          <Text style={styles.guidanceText}>Confirm today’s active doctor session.</Text>
        </View>
        <View style={styles.guidanceStep}>
          <Text style={styles.guidanceNumber}>2.</Text>
          <Text style={styles.guidanceText}>Check in arrived patients before calling the queue.</Text>
        </View>
        <View style={styles.guidanceStep}>
          <Text style={styles.guidanceNumber}>3.</Text>
          <Text style={styles.guidanceText}>Handle late or missed patients before queue pressure grows.</Text>
        </View>
        <View style={styles.guidanceStep}>
          <Text style={styles.guidanceNumber}>4.</Text>
          <Text style={styles.guidanceText}>Keep walk-ins separated from booked appointments.</Text>
        </View>
        <View style={styles.guidanceNoteBox}>
          <Text style={styles.guidanceNote}>
            Reception focus: Keep sessions and queue data in sync before calling the next patient.
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      {renderHeader()}

      <View style={styles.contentWrapper}>
        {!canUsePanel ? (
          <View style={styles.emptyWrapper}>
            <Text style={styles.emptyStateTitle}>No responsibilities assigned yet.</Text>
            <Text style={styles.emptyStateText}>Please contact your clinic admin.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard("refresh")} />
            }
          >
            {renderLiveQueueCard()}
            {renderStats()}
            {renderQuickActions()}
            {renderTodaySessions()}
            {renderUpcoming()}
            {renderPulse()}
            {renderGuidance()}
          </ScrollView>
        )}

        {receptionistPermissions.schedule_management ? (
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("ReceptionistSessions")}
          >
            <Ionicons name="add" size={24} color={theme.cardBg} />
            <Text style={styles.fabText}>Add Session</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primary,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: theme.bgLight,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 112,
  },
  topSectionSpacing: {
    marginTop: 2,
  },
  header: {
    backgroundColor: theme.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  headerLeft: {
    flexDirection: "column",
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  headerBrandText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.softCyan,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.cardBg,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.softCyan,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.brand,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.cardBg,
    fontSize: 13,
    fontWeight: "bold",
  },
  statsScroll: {
    paddingRight: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    width: 164,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  statCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.textPrimary,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.deepBlue,
  },
  sectionAction: {
    fontSize: 14,
    color: theme.brand,
    fontWeight: "600",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activeSessionCard: {
    backgroundColor: "#F9FCFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C7E7FA",
    ...Platform.select({
      ios: {
        shadowColor: theme.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  activeSessionCardLoading: {
    backgroundColor: theme.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  activeSessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  doctorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.bgLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  doctorAvatarText: {
    color: theme.brand,
    fontSize: 13,
    fontWeight: "800",
  },
  doctorTextWrap: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  sessionDetails: {
    backgroundColor: "#EFF8FF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D4ECFB",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    marginLeft: 8,
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: "500",
    flex: 1,
  },
  sessionActions: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.brand,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: theme.cardBg,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.mutedSurface,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryButtonText: {
    color: theme.deepBlue,
    fontSize: 14,
    fontWeight: "700",
  },
  quickActionsScroll: {
    paddingRight: 16,
    gap: 14,
  },
  actionCardDisabled: {
    opacity: 0.45,
  },
  quickActionItem: {
    width: 96,
    alignItems: "center",
    paddingVertical: 4,
  },
  quickActionCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: theme.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textPrimary,
    textAlign: "center",
    lineHeight: 16,
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sessionLeading: {
    justifyContent: "center",
    alignItems: "center",
  },
  sessionAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#D9F2FB",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionAvatarText: {
    color: theme.brand,
    fontSize: 16,
    fontWeight: "800",
  },
  sessionRight: {
    alignSelf: "flex-start",
  },
  sessionCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 3,
  },
  sessionCardSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  sessionMeta: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  sessionCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  secondaryButtonCompact: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.mutedSurface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  secondaryButtonCompactText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.deepBlue,
  },
  primaryButtonCompact: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.brand,
    alignItems: "center",
  },
  primaryButtonCompactText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.cardBg,
  },
  sessionCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 28,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: theme.deepBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
    }),
  },
  sessionCardAccent: {
    position: "absolute",
    left: 0,
    top: 18,
    bottom: 18,
    width: 5,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: theme.brand,
  },
  sessionEmptyCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: theme.deepBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
    }),
  },
  sessionEmptyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  todayEmptyIconWrap: {
    backgroundColor: "#E8F3FF",
  },
  upcomingEmptyIconWrap: {
    backgroundColor: "#FFF2DF",
  },
  sessionEmptyContent: {
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.textPrimary,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.danger,
    marginBottom: 10,
  },
  pulseGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  pulseCard: {
    flex: 1,
    backgroundColor: "#FBFDFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pulseTitle: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 8,
    marginBottom: 2,
  },
  pulseValue: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  guidanceCard: {
    backgroundColor: "#FBFDFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D5EAF7",
  },
  guidanceStep: {
    flexDirection: "row",
    marginBottom: 12,
  },
  guidanceNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.brand,
    marginRight: 8,
    width: 16,
  },
  guidanceText: {
    flex: 1,
    fontSize: 14,
    color: theme.textPrimary,
    lineHeight: 20,
  },
  guidanceNoteBox: {
    backgroundColor: theme.mutedSurface,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  guidanceNote: {
    fontSize: 12,
    color: theme.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
  emptyWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: theme.bgLight,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    backgroundColor: theme.brand,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: theme.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  fabText: {
    color: theme.cardBg,
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
  },
});
