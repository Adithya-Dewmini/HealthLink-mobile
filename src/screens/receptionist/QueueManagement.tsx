import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CompositeNavigationProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { AuthContext } from "../../utils/AuthContext";
import { fetchReceptionQueue } from "../../services/receptionService";
import { getSocket } from "../../services/socket";
import { getFriendlyError } from "../../utils/friendlyErrors";
import type { ReceptionistStackParamList, ReceptionistTabParamList } from "../../types/navigation";

const RECEPTION_QUEUE_BOARD_BANNER = require("../../../assets/images/reception-queue-board-banner.png");

const theme = {
  navy: "#061A2E",
  deepBlue: "#0B3558",
  brand: "#0EA5E9",
  softCyan: "#38BDF8",
  bgLight: "#EFF8FF",
  surface: "#FFFFFF",
  muted: "#F8FAFC",
  border: "#D8E7F3",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  success: "#10B981",
  successBg: "#D1FAE5",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  infoBg: "#E0F2FE",
};

type QueueStatus = "LIVE" | "WAITING" | "IDLE" | "PAUSED" | "COMPLETED";
type QueueFilterKey = "live" | "paused" | "ready" | "all";

type QueueSession = {
  queueId: number | null;
  sessionId: number;
  doctorId: number;
  doctorName: string;
  specialty: string;
  medicalCenterId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  roomNumber?: string | null;
  queueStatus: QueueStatus;
  sessionStatus?: string | null;
  currentToken: number | null;
  currentPatient: { tokenNumber: number; patientName: string } | null;
  nextToken: number | null;
  nextPatient: { tokenNumber: number; patientName: string } | null;
  waitingCount: number;
  withDoctorCount: number;
  completedCount: number;
  missedCount: number;
  avgWaitMinutes: number;
};

type QueueDashboard = {
  clinic: {
    id: string;
    name: string;
  };
  date: string;
  summary: {
    activeQueues: number;
    waitingPatients: number;
    withDoctor: number;
    completedToday: number;
  };
  liveQueues: QueueSession[];
  upcomingQueues: QueueSession[];
  endedQueues: QueueSession[];
};

const FILTERS: Array<{ key: QueueFilterKey; label: string }> = [
  { key: "live", label: "Live" },
  { key: "paused", label: "Paused" },
  { key: "ready", label: "Ready" },
  { key: "all", label: "All" },
];

const normalizeQueueDashboard = (input: Partial<QueueDashboard> | null | undefined): QueueDashboard => ({
  clinic: {
    id: typeof input?.clinic?.id === "string" ? input.clinic.id : "",
    name: typeof input?.clinic?.name === "string" ? input.clinic.name : "Clinic",
  },
  date: typeof input?.date === "string" ? input.date : new Date().toISOString().slice(0, 10),
  summary: {
    activeQueues: Number(input?.summary?.activeQueues ?? 0),
    waitingPatients: Number(input?.summary?.waitingPatients ?? 0),
    withDoctor: Number(input?.summary?.withDoctor ?? 0),
    completedToday: Number(input?.summary?.completedToday ?? 0),
  },
  liveQueues: Array.isArray(input?.liveQueues) ? input.liveQueues : [],
  upcomingQueues: Array.isArray(input?.upcomingQueues) ? input.upcomingQueues : [],
  endedQueues: Array.isArray(input?.endedQueues) ? input.endedQueues : [],
});

const normalizeText = (value?: string | null) => String(value || "").trim().toLowerCase();

const queueStatusLabel = (status?: string | null) => {
  const normalized = normalizeText(status);
  if (normalized === "live") return "Queue Live";
  if (normalized === "paused") return "Paused";
  if (normalized === "waiting" || normalized === "idle") return "Ready";
  if (normalized === "completed") return "Completed";
  return "Queue";
};

const queueStatusColors = (status?: string | null) => {
  const normalized = normalizeText(status);
  if (normalized === "live") {
    return { bg: theme.successBg, color: theme.success, accent: theme.success };
  }
  if (normalized === "paused") {
    return { bg: theme.warningBg, color: theme.warning, accent: theme.warning };
  }
  if (normalized === "waiting" || normalized === "idle") {
    return { bg: theme.infoBg, color: theme.brand, accent: theme.brand };
  }
  if (normalized === "completed") {
    return { bg: theme.muted, color: theme.textSecondary, accent: theme.deepBlue };
  }
  return { bg: theme.muted, color: theme.textSecondary, accent: theme.brand };
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || "RC";

const formatClinicDate = (value: string) => {
  const safeValue = value.includes("T") ? value.slice(0, 10) : value;
  const parsed = new Date(`${safeValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
};

export default function QueueManagement() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<ReceptionistTabParamList>,
      NativeStackNavigationProp<ReceptionistStackParamList>
    >
  >();
  const insets = useSafeAreaInsets();
  const { user, logout } = useContext(AuthContext);
  const hasAccess = useReceptionPermissionGuard("queue", "queue_access");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<QueueDashboard | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<QueueFilterKey>("live");

  const receptionistName = user?.name?.trim() || "Receptionist";

  const loadQueues = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const payload = normalizeQueueDashboard((await fetchReceptionQueue()) as Partial<QueueDashboard>);
      setDashboard(payload);
      setError(null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load live queues."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadQueues("initial");
    }, [loadQueues])
  );

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => {
      void loadQueues("refresh");
    };

    socket.on("queue:update", refresh);
    socket.on("queue:next", refresh);
    socket.on("session:start", refresh);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("queue:next", refresh);
      socket.off("session:start", refresh);
    };
  }, [loadQueues]);

  const allQueues = useMemo(
    () => [
      ...(dashboard?.liveQueues ?? []),
      ...(dashboard?.upcomingQueues ?? []),
      ...(dashboard?.endedQueues ?? []),
    ],
    [dashboard]
  );

  const counts = useMemo(() => {
    const live = allQueues.filter((queue) => normalizeText(queue.queueStatus) === "live").length;
    const paused = allQueues.filter((queue) => normalizeText(queue.queueStatus) === "paused").length;
    const ready = allQueues.filter((queue) => {
      const status = normalizeText(queue.queueStatus);
      return status === "waiting" || status === "idle";
    }).length;
    return {
      live,
      paused,
      ready,
      all: allQueues.length,
    };
  }, [allQueues]);

  const visibleQueues = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allQueues.filter((queue) => {
      const normalizedStatus = normalizeText(queue.queueStatus);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "live" && normalizedStatus === "live") ||
        (activeFilter === "paused" && normalizedStatus === "paused") ||
        (activeFilter === "ready" && (normalizedStatus === "waiting" || normalizedStatus === "idle"));

      const matchesSearch =
        !query ||
        [
          queue.doctorName,
          queue.specialty,
          queue.roomNumber || "",
          queue.currentPatient?.patientName || "",
          String(queue.currentToken || ""),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, allQueues, search]);

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

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Queue management has not been assigned to your account." />
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={theme.navy} />
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <View style={styles.topBrandRow}>
              <Ionicons name="medical" size={18} color={theme.softCyan} />
              <Text style={styles.topHeaderBrandText}>HealthLink</Text>
            </View>
            <Text style={styles.topHeaderTitle}>Live Queues</Text>
          </View>

          <View style={styles.topHeaderRight}>
            <TouchableOpacity
              style={styles.topIconButton}
              onPress={() => void loadQueues("refresh")}
              accessibilityLabel="Refresh live queues"
            >
              <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topAvatarPlaceholder}
              onPress={handleLogout}
              accessibilityLabel="Open receptionist account"
            >
              <Text style={styles.topAvatarText}>{getInitials(receptionistName)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.brand}
            onRefresh={() => void loadQueues("refresh")}
          />
        }
      >
        <View style={styles.bannerCard}>
          <Image
            source={RECEPTION_QUEUE_BOARD_BANNER}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScroll}>
          <SummaryCard icon="radio-outline" label="Live" value={String(counts.live)} accent={theme.success} />
          <SummaryCard icon="pause-outline" label="Paused" value={String(counts.paused)} accent={theme.warning} />
          <SummaryCard
            icon="time-outline"
            label="Waiting"
            value={String(dashboard?.summary.waitingPatients ?? 0)}
            accent={theme.brand}
          />
          <SummaryCard
            icon="checkmark-circle-outline"
            label="Completed"
            value={String(dashboard?.summary.completedToday ?? 0)}
            accent={theme.deepBlue}
          />
        </ScrollView>

        <View style={styles.searchShell}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={19} color={theme.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search doctor, room, or current patient"
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {FILTERS.map((filter) => {
            const selected = activeFilter === filter.key;
            const count = filter.key === "live" ? counts.live : filter.key === "paused" ? counts.paused : filter.key === "ready" ? counts.ready : counts.all;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
                accessibilityLabel={`${filter.label} queues`}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
                <View style={[styles.filterCount, selected && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, selected && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Queue Sessions</Text>
            <Text style={styles.sectionSubtitle}>
              {visibleQueues.length} queue{visibleQueues.length === 1 ? "" : "s"} available in this view
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.brand} />
            <Text style={styles.loadingText}>Loading queue sessions...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Queue board unavailable</Text>
            <Text style={styles.stateMessage}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => void loadQueues("refresh")}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : visibleQueues.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>
              {activeFilter === "live" ? "No live queues right now." : "No matching queues found."}
            </Text>
            <Text style={styles.stateMessage}>
              {activeFilter === "live"
                ? "Start a queue from Today Sessions when the doctor is ready."
                : "Try another filter or search keyword."}
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("ReceptionistSessions")}
            >
              <Text style={styles.secondaryButtonText}>View Today Sessions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsColumn}>
            {visibleQueues.map((queue) => {
              const statusColors = queueStatusColors(queue.queueStatus);
              return (
                <TouchableOpacity
                  key={`${queue.sessionId}-${queue.queueId ?? "queue"}`}
                  activeOpacity={0.92}
                  style={styles.queueCard}
                  onPress={() =>
                    navigation.navigate("ReceptionistQueueDetails", {
                      queueId: queue.queueId ?? undefined,
                      sessionId: queue.sessionId,
                      doctorName: queue.doctorName,
                    })
                  }
                >
                  <View style={[styles.queueCardAccent, { backgroundColor: statusColors.accent }]} />
                  <View style={styles.queueCardHeader}>
                    <View style={styles.queueAvatar}>
                      <Text style={styles.queueAvatarText}>{getInitials(queue.doctorName)}</Text>
                    </View>
                    <View style={styles.queueCopy}>
                      <Text style={styles.queueDoctor}>{queue.doctorName}</Text>
                      <Text style={styles.queueMeta}>
                        {queue.specialty || "Doctor"}
                        {queue.roomNumber ? ` • ${queue.roomNumber}` : " • Room not set"}
                      </Text>
                    </View>
                    <View style={[styles.queueStatusPill, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.queueStatusText, { color: statusColors.color }]}>
                        {queueStatusLabel(queue.queueStatus)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.queueMinimalRow}>
                    <View style={styles.queueInfoChip}>
                      <Ionicons name="time-outline" size={14} color={theme.brand} />
                      <Text style={styles.queueInfoChipText}>
                        {queue.startTime} - {queue.endTime}
                      </Text>
                    </View>
                    <View style={styles.queueInfoChip}>
                      <Ionicons name="people-outline" size={14} color={theme.brand} />
                      <Text style={styles.queueInfoChipText}>{queue.waitingCount} waiting</Text>
                    </View>
                  </View>

                  <View style={styles.queueFooter}>
                    <Text style={styles.queueFooterHint}>
                      {queue.currentPatient?.patientName
                        ? `Now serving #${queue.currentPatient.tokenNumber}`
                        : "Open patient flow control"}
                    </Text>
                    <View style={styles.openButton}>
                      <Text style={styles.openButtonText}>Open Queue</Text>
                      <Ionicons name="arrow-forward" size={16} color={theme.brand} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: `${accent}16` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bgLight,
  },
  topSafeArea: {
    backgroundColor: theme.navy,
  },
  topHeader: {
    backgroundColor: theme.navy,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  topHeaderLeft: {
    flexDirection: "column",
    justifyContent: "center",
  },
  topBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  topHeaderBrandText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.softCyan,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  topHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  topAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.brand,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  topAvatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    padding: 18,
    paddingTop: 16,
  },
  bannerCard: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  bannerImage: {
    width: "100%",
    height: 210,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: "#F7FBFF",
    borderWidth: 1,
    borderColor: "#CFE4F4",
    padding: 18,
    shadowColor: theme.navy,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: "hidden",
  },
  heroGlowPrimary: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    right: -50,
    top: -20,
    backgroundColor: "rgba(14,165,233,0.12)",
  },
  heroGlowSecondary: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 999,
    left: -34,
    bottom: -42,
    backgroundColor: "rgba(56,189,248,0.10)",
  },
  heroRow: {
    gap: 12,
  },
  heroEyebrow: {
    color: theme.brand,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "800",
    color: theme.textPrimary,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
  },
  heroDateChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.infoBg,
  },
  heroDateText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.deepBlue,
  },
  summaryScroll: {
    paddingTop: 18,
    paddingBottom: 6,
    paddingRight: 6,
  },
  summaryCard: {
    width: 96,
    minHeight: 96,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.textPrimary,
    marginTop: 12,
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: "700",
  },
  searchShell: {
    marginTop: 10,
  },
  searchBar: {
    height: 54,
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  filterTabs: {
    paddingTop: 16,
    paddingBottom: 6,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 10,
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: theme.navy,
    borderColor: theme.navy,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.infoBg,
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.brand,
  },
  filterCountTextActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: theme.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  loadingWrap: {
    paddingVertical: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  stateCard: {
    marginTop: 6,
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 22,
    alignItems: "flex-start",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.textPrimary,
  },
  stateMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: theme.textSecondary,
  },
  primaryButton: {
    marginTop: 16,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.brand,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 16,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryButtonText: {
    color: theme.deepBlue,
    fontSize: 14,
    fontWeight: "800",
  },
  cardsColumn: {
    gap: 14,
  },
  queueCard: {
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    shadowColor: theme.navy,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    overflow: "hidden",
  },
  queueCardAccent: {
    position: "absolute",
    left: 0,
    top: 20,
    bottom: 20,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  queueCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  queueAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.infoBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  queueAvatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.brand,
  },
  queueCopy: {
    flex: 1,
    paddingRight: 10,
  },
  queueDoctor: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.textPrimary,
  },
  queueMeta: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 16,
    color: theme.textSecondary,
  },
  queueStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  queueStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  queueMinimalRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  queueInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.infoBg,
  },
  queueInfoChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.deepBlue,
  },
  queueFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  queueFooterHint: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.brand,
  },
});
