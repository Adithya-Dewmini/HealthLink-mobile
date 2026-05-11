import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  type DimensionValue,
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
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  deleteReceptionSession,
  fetchReceptionSessionAvailabilityState,
  fetchReceptionSessionSchedules,
  type ReceptionSessionItem,
} from "../../services/receptionistSessionService";
import {
  formatLocalDateKey,
  formatSessionAvailabilityLine,
  formatSessionDateLabel,
  formatSessionTimeRangeLabel,
} from "../../utils/sessionPresentation";
import { getSocket } from "../../services/socket";

type Props = NativeStackScreenProps<
  ReceptionistStackParamList,
  "ReceptionistDoctorSessionOverview"
>;

type AvailabilityStateKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

type AvailabilityStateResponse = {
  availability?: Partial<Record<AvailabilityStateKey, Array<{ id: string; start: string; end: string }>>>;
};

type FilterKey =
  | "all"
  | "today"
  | "upcoming"
  | "routine"
  | "manual"
  | "completed"
  | "cancelled";

const THEME = {
  navy: "#03045E",
  blue: "#0077B6",
  aqua: "#00B4D8",
  lightAqua: "#CAF0F8",
  background: "#F8FCFD",
  surface: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  slate: "#64748B",
  purple: "#7C3AED",
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "routine", label: "Routine" },
  { key: "manual", label: "Manual" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const DEFAULT_DOCTOR_NAME = "Doctor";
const DEFAULT_SPECIALIZATION = "Specialist";
const DEFAULT_CLINIC_NAME = "Clinic";
const EMPTY_AVAILABILITY_LABEL = "No availability shared";
const EMPTY_NEXT_SESSION_LABEL = "No upcoming session";

const getStatusMeta = (session: ReceptionSessionItem) => {
  const toneByLabel = {
    Upcoming: "upcoming",
    Live: "live",
    Completed: "completed",
    Cancelled: "cancelled",
    Full: "full",
  } as const;

  return {
    label: session.status,
    tone: toneByLabel[session.status],
  };
};

const getDoctorInitials = (name?: string | null) =>
  (name || DEFAULT_DOCTOR_NAME)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "DR";

const getSessionProgress = (session: ReceptionSessionItem) => {
  if (session.maxPatients <= 0) return 0;
  return Math.max(0, Math.min(session.bookedCount / session.maxPatients, 1));
};

const formatAvailabilitySummary = (
  availabilityState: AvailabilityStateResponse | null,
  dayKey: AvailabilityStateKey
) => {
  const slots = availabilityState?.availability?.[dayKey] || [];
  if (!Array.isArray(slots) || slots.length === 0) return EMPTY_AVAILABILITY_LABEL;
  if (slots.length === 1) {
    return `${slots[0].start.slice(0, 5)} - ${slots[0].end.slice(0, 5)}`;
  }
  return `${slots[0].start.slice(0, 5)} - ${slots[slots.length - 1].end.slice(0, 5)} • ${slots.length} windows`;
};

export default function DoctorSessionOverview({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const hasAccess = useReceptionPermissionGuard("schedule", "schedule_management", true);
  const canManageSessions = hasAccess;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ReceptionSessionItem[]>([]);
  const [availabilityState, setAvailabilityState] = useState<AvailabilityStateResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const doctorDisplayName = route.params.doctorName || DEFAULT_DOCTOR_NAME;
  const specializationLabel = route.params.specialization || DEFAULT_SPECIALIZATION;

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    try {
      const [schedulePayload, availabilityPayload] = await Promise.all([
        fetchReceptionSessionSchedules(route.params.doctorUserId, false),
        fetchReceptionSessionAvailabilityState(route.params.doctorUserId),
      ]);
      setSessions(Array.isArray(schedulePayload) ? schedulePayload : []);
      setAvailabilityState(availabilityPayload);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load doctor sessions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.doctorUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadData("initial");
    }, [loadData])
  );

  React.useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = (payload?: { doctorId?: number | string }) => {
      if (payload?.doctorId && Number(payload.doctorId) !== route.params.doctorUserId) {
        return;
      }
      void loadData("refresh");
    };

    socket.on("schedule:update", handleScheduleUpdate);
    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
    };
  }, [loadData, route.params.doctorUserId]);

  const todayKey = useMemo(() => formatLocalDateKey(new Date()), []);
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const status = getStatusMeta(session);
      switch (activeFilter) {
        case "today":
          return session.date === todayKey;
        case "upcoming":
          return status.label === "Upcoming" || status.label === "Live" || status.label === "Full";
        case "routine":
          return session.source === "routine";
        case "manual":
          return session.source !== "routine";
        case "completed":
          return status.label === "Completed";
        case "cancelled":
          return status.label === "Cancelled";
        default:
          return true;
      }
    });
  }, [activeFilter, sessions, todayKey]);

  const todayAvailability = useMemo(() => {
    const key = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()] as AvailabilityStateKey;
    return formatAvailabilitySummary(availabilityState, key);
  }, [availabilityState]);

  const stats = useMemo(() => {
    const upcoming = sessions.filter((s) => {
      const status = getStatusMeta(s).label;
      return status === "Upcoming" || status === "Live" || status === "Full";
    }).length;
    const today = sessions.filter((s) => s.date === todayKey && s.isActive).length;
    const bookedSlots = sessions.reduce((sum, s) => sum + s.bookedCount, 0);
    const availableSlots = sessions.reduce((sum, s) => sum + s.availableSlots, 0);
    return { upcoming, today, bookedSlots, availableSlots };
  }, [sessions, todayKey]);

  const nextSession = useMemo(
    () =>
      sessions
        .filter((item) => item.isActive && item.date >= todayKey)
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0] || null,
    [sessions, todayKey]
  );

  const overallStatus = useMemo(() => {
    if (sessions.length === 0) return "No sessions";
    const remaining = stats.availableSlots;
    if (remaining <= 0 && stats.upcoming > 0) return "Fully booked";
    return "Active";
  }, [sessions.length, stats.availableSlots, stats.upcoming]);

  const headerClinicName = useMemo(
    () => sessions.find((session) => session.clinicName)?.clinicName || DEFAULT_CLINIC_NAME,
    [sessions]
  );

  const confirmDelete = useCallback(
    (session: ReceptionSessionItem) => {
      Alert.alert(
        "Delete session",
        `Remove the ${session.source === "routine" ? "routine" : "manual"} session on ${formatSessionDateLabel(session.date)}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                await deleteReceptionSession(session.id, route.params.doctorUserId);
                await loadData("refresh");
              })().catch((error: unknown) => {
                Alert.alert(
                  "Delete failed",
                  error instanceof Error ? error.message : "Failed to delete session"
                );
              });
            },
          },
        ]
      );
    },
    [loadData, route.params.doctorUserId]
  );

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Doctor session management has not been assigned to your account." />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData("refresh")} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={THEME.navy} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Doctor Sessions</Text>
            <Text style={styles.headerSubtitle}>{doctorDisplayName} • {specializationLabel}</Text>
          </View>
          <View style={styles.clinicChip}>
            <Text style={styles.clinicChipText}>{headerClinicName}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getDoctorInitials(doctorDisplayName)}</Text>
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryName}>{doctorDisplayName}</Text>
              <Text style={styles.summarySpecialty}>{specializationLabel}</Text>
              <View style={styles.availabilityInline}>
                <Ionicons name="time-outline" size={14} color={THEME.blue} />
                <Text style={styles.availabilityText}>{todayAvailability}</Text>
              </View>
            </View>
            <StatusBadge label={overallStatus} />
          </View>

          <View style={styles.statsRow}>
            <StatBlock label="Upcoming" value={stats.upcoming} icon="calendar-outline" />
            <StatBlock label="Today" value={stats.today} icon="today-outline" />
            <StatBlock label="Booked" value={stats.bookedSlots} icon="checkmark-done-outline" />
            <StatBlock label="Open" value={stats.availableSlots} icon="sparkles-outline" />
          </View>

          <View style={styles.statsRowSecondary}>
            <MiniPill icon="layers-outline" label={`${stats.upcoming} upcoming`} />
            <MiniPill
              icon="arrow-forward-outline"
              label={nextSession ? formatSessionTimeRangeLabel(nextSession.startTime, nextSession.endTime) : EMPTY_NEXT_SESSION_LABEL}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, active ? styles.filterChipActive : null]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={THEME.blue} />
          </View>
        ) : error ? (
          <StateCard title="Sessions unavailable" message={error} actionLabel="Try Again" onPress={() => void loadData("refresh")} />
        ) : filteredSessions.length === 0 ? (
          <StateCard
            title="No sessions assigned yet"
            message="Create manual or routine sessions for this doctor to start clinic bookings."
            actionLabel="Create Session"
            onPress={() =>
              navigation.navigate("ReceptionistDoctorSessionManagement", {
                doctorId: route.params.doctorId,
                doctorUserId: route.params.doctorUserId,
                doctorName: route.params.doctorName,
                specialization: route.params.specialization || null,
                initialTab: "manual",
              })
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredSessions.map((session) => {
              const status = getStatusMeta(session);
              const progressWidth = `${getSessionProgress(session) * 100}%` as DimensionValue;
              return (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardDate}>{formatSessionDateLabel(session.date)}</Text>
                    <View style={styles.headerBadges}>
                      <SourceBadge source={session.source} />
                      <StatusBadge label={status.label} tone={status.tone} />
                    </View>
                  </View>

                  <Text style={styles.cardTime}>{formatSessionTimeRangeLabel(session.startTime, session.endTime)}</Text>
                  <View style={styles.cardMetaRow}>
                    <View style={styles.cardMetaPill}>
                      <Ionicons name="business-outline" size={13} color={THEME.slate} />
                      <Text style={styles.cardClinic}>{session.clinicName || headerClinicName}</Text>
                    </View>
                  </View>
                  <View style={styles.occupancyWrap}>
                    <View style={styles.occupancyHeader}>
                      <Text style={styles.cardAvailability}>
                        {formatSessionAvailabilityLine({
                          bookedCount: session.bookedCount,
                          maxPatients: session.maxPatients,
                          availableSlots: session.availableSlots,
                        })}
                      </Text>
                      <Text style={styles.occupancyMeta}>
                        {session.bookedCount}/{session.maxPatients}
                      </Text>
                    </View>
                    <View style={styles.occupancyTrack}>
                      <View style={[styles.occupancyFill, { width: progressWidth }]} />
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <ActionButton
                      label="View"
                      onPress={() =>
                        navigation.navigate("ReceptionistDoctorSessionDetails", {
                          session,
                          doctorName: route.params.doctorName,
                          specialization: route.params.specialization || null,
                        })
                      }
                    />
                    {canManageSessions ? (
                      <ActionButton
                        label="Edit"
                        primary
                        onPress={() =>
                          navigation.navigate("ReceptionistDoctorSessionManagement", {
                            doctorId: route.params.doctorId,
                            doctorUserId: route.params.doctorUserId,
                            doctorName: route.params.doctorName,
                            specialization: route.params.specialization || null,
                            editScheduleId: session.source === "routine" ? undefined : session.id,
                            initialTab: session.source === "routine" ? "routine" : "manual",
                            suggestedDate: session.date,
                            suggestedStartTime: session.startTime,
                            suggestedEndTime: session.endTime,
                            suggestedSlotDuration: session.slotDuration,
                            suggestedMaxPatients: session.maxPatients,
                          })
                        }
                      />
                    ) : null}
                    {canManageSessions ? (
                      <ActionButton label="Delete" destructive onPress={() => confirmDelete(session)} />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() =>
            navigation.navigate("ReceptionistDoctorSessionManagement", {
              doctorId: route.params.doctorId,
              doctorUserId: route.params.doctorUserId,
              doctorName: route.params.doctorName,
              specialization: route.params.specialization || null,
              initialTab: "manual",
            })
          }
        >
          <Text style={styles.secondaryCtaText}>Create Manual Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() =>
            navigation.navigate("ReceptionistDoctorSessionManagement", {
              doctorId: route.params.doctorId,
              doctorUserId: route.params.doctorUserId,
              doctorName: route.params.doctorName,
              specialization: route.params.specialization || null,
              initialTab: "routine",
            })
          }
        >
          <Text style={styles.primaryCtaText}>Create Routine</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StatBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statBlock}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={14} color={THEME.blue} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniPill({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.miniPill}>
      <Ionicons name={icon} size={13} color={THEME.blue} />
      <Text style={styles.miniPillText}>{label}</Text>
    </View>
  );
}

function SourceBadge({ source }: { source: string }) {
  const routine = source === "routine";
  return (
    <View style={[styles.badge, { backgroundColor: routine ? "#E0F2FE" : "#ECFEFF" }]}>
      <Text style={[styles.badgeText, { color: routine ? "#1D4ED8" : "#0F766E" }]}>
        {routine ? "Routine" : "Manual"}
      </Text>
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone?: "upcoming" | "live" | "completed" | "cancelled" | "full";
}) {
  const palette =
    tone === "live"
      ? { bg: "#E0F2FE", fg: "#0077B6" }
      : tone === "completed"
        ? { bg: "#DCFCE7", fg: "#16A34A" }
        : tone === "cancelled"
          ? { bg: "#F1F5F9", fg: "#64748B" }
          : tone === "full"
            ? { bg: "#FEF3C7", fg: "#B45309" }
            : { bg: "#EEF2FF", fg: "#4338CA" };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  primary = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        primary ? styles.actionButtonPrimary : null,
        destructive ? styles.actionButtonDestructive : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.actionButtonText,
          primary ? styles.actionButtonTextPrimary : null,
          destructive ? styles.actionButtonTextDestructive : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StateCard({
  title,
  message,
  actionLabel,
  onPress,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <Ionicons name="calendar-outline" size={28} color={THEME.blue} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
      {actionLabel && onPress ? (
        <TouchableOpacity style={styles.stateButton} onPress={onPress}>
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.navy },
  headerSubtitle: { marginTop: 3, fontSize: 13, color: THEME.textSecondary },
  clinicChip: {
    borderRadius: 999,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clinicChipText: { fontSize: 12, fontWeight: "700", color: THEME.blue },
  summaryCard: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 18,
  },
  summaryTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.lightAqua,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { fontSize: 17, fontWeight: "800", color: THEME.blue },
  summaryCopy: { flex: 1 },
  summaryName: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  summarySpecialty: { fontSize: 13, color: THEME.textSecondary, marginTop: 3 },
  availabilityInline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  availabilityText: { flex: 1, fontSize: 12, color: THEME.textSecondary, lineHeight: 17 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statBlock: {
    flex: 1,
    backgroundColor: "#F8FBFE",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#EAF5FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  statLabel: { fontSize: 11, color: THEME.textSecondary, marginTop: 4, lineHeight: 14 },
  statsRowSecondary: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  miniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniPillText: { fontSize: 11, fontWeight: "700", color: THEME.blue },
  filterRow: { paddingBottom: 6, gap: 10 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: { backgroundColor: THEME.blue, borderColor: THEME.blue },
  filterText: { fontSize: 12, fontWeight: "700", color: THEME.textSecondary },
  filterTextActive: { color: "#FFFFFF" },
  centerState: { paddingTop: 80, alignItems: "center" },
  list: { gap: 14, marginTop: 12 },
  sessionCard: {
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerBadges: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  cardDate: { fontSize: 15, fontWeight: "800", color: THEME.textPrimary },
  cardTime: { marginTop: 12, fontSize: 18, fontWeight: "800", color: THEME.navy },
  cardMetaRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap" },
  cardMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#F8FBFE",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cardClinic: { fontSize: 12, color: THEME.textSecondary },
  occupancyWrap: { marginTop: 12 },
  occupancyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardAvailability: { fontSize: 14, fontWeight: "700", color: THEME.textPrimary },
  occupancyMeta: { fontSize: 12, fontWeight: "700", color: THEME.textSecondary },
  occupancyTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E9EEF5",
    overflow: "hidden",
  },
  occupancyFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: THEME.blue,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: THEME.surface,
  },
  actionButtonPrimary: {
    backgroundColor: THEME.blue,
    borderColor: THEME.blue,
  },
  actionButtonDestructive: {
    backgroundColor: "#FFF7F7",
    borderColor: "#FECACA",
  },
  actionButtonText: { fontSize: 13, fontWeight: "700", color: THEME.textPrimary },
  actionButtonTextPrimary: { color: "#FFFFFF" },
  actionButtonTextDestructive: { color: THEME.danger },
  stateCard: {
    alignItems: "center",
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 12,
  },
  stateTitle: { marginTop: 16, fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: THEME.blue,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stateButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 26,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  secondaryCta: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryCtaText: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },
  primaryCta: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: THEME.blue,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryCtaText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});
