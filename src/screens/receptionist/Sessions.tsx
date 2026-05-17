import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  EmptyState,
  ErrorState,
  RECEPTION_THEME,
  ReceptionistButton,
  StatusBadge,
  SurfaceCard,
} from "../../components/receptionist/PanelUI";
import { AuthContext } from "../../utils/AuthContext";
import { fetchReceptionAppointments, fetchReceptionQueueDetail, fetchReceptionVisits, queueEnd, queueStart } from "../../services/receptionService";
import { fetchReceptionSessionDoctors } from "../../services/receptionistSessionService";
import { getFriendlyError } from "../../utils/friendlyErrors";
import { getSocket } from "../../services/socket";

type FilterKey = "all" | "live" | "today" | "upcoming" | "completed" | "no_sessions";

type SessionItem = {
  id: number;
  doctorId: number;
  doctorName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  queueId: number | null;
  queueStatus: string | null;
};

type VisitItem = {
  bookingId: number;
  sessionId?: number | null;
  visitStatus: string;
};

type DoctorItem = {
  doctorId: number;
  doctorUserId: number;
  doctorName: string;
  specialization?: string | null;
  todaySessionCount?: number;
  upcomingSessionCount?: number;
};

type QueueDetailLite = {
  currentServingNumber: number | null;
  walkInsCount: number;
};

type SessionBoardItem = SessionItem & {
  checkedInCount: number;
  waitingCount: number;
  bookedCount: number;
  completedCount: number;
  missedCount: number;
  walkInsCount: number;
  currentServingNumber: number | null;
  state: "live" | "today" | "upcoming" | "completed";
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "no_sessions", label: "No Sessions" },
];

const normalizeSession = (input: any): SessionItem => ({
  id: Number(input?.id ?? 0),
  doctorId: Number(input?.doctor_id ?? input?.doctorId ?? 0),
  doctorName: String(input?.doctor_name || input?.doctorName || "Doctor"),
  specialty: String(input?.specialty || "Specialist"),
  date: String(input?.date || ""),
  startTime: String(input?.start_time || input?.startTime || "").slice(0, 5),
  endTime: String(input?.end_time || input?.endTime || "").slice(0, 5),
  queueId: input?.queue_id ? Number(input.queue_id) : input?.queueId ? Number(input.queueId) : null,
  queueStatus:
    input?.queue_status || input?.queueStatus ? String(input.queue_status ?? input.queueStatus).toUpperCase() : null,
});

const buildTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const normalizeDateTime = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const statusTone = (state: SessionBoardItem["state"]): "info" | "success" | "warning" | "neutral" => {
  if (state === "live") return "success";
  if (state === "today") return "warning";
  if (state === "completed") return "neutral";
  return "info";
};

const statusLabel = (state: SessionBoardItem["state"]) => {
  if (state === "live") return "Live";
  if (state === "today") return "Today";
  if (state === "completed") return "Completed";
  return "Upcoming";
};

export default function ReceptionistSessions() {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const { user } = useContext(AuthContext);
  const hasAccess = useReceptionPermissionGuard("schedule", "schedule_management", true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<SessionBoardItem[]>([]);
  const [noSessionDoctors, setNoSessionDoctors] = useState<DoctorItem[]>([]);

  const receptionistName = user?.name?.trim() || "Receptionist";

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const [appointmentsPayload, visitsPayload, doctorsPayload] = await Promise.all([
          fetchReceptionAppointments(),
          fetchReceptionVisits({ filter: "all", page: 1, limit: 500 }),
          fetchReceptionSessionDoctors(),
        ]);

        const sessionRows: SessionItem[] = Array.isArray((appointmentsPayload as any)?.sessions)
          ? ((appointmentsPayload as any).sessions as any[]).map(normalizeSession)
          : [];
        const visitRows = Array.isArray((visitsPayload as any)?.visits)
          ? ((visitsPayload as any).visits as VisitItem[])
          : [];
        const doctorRows = Array.isArray(doctorsPayload) ? (doctorsPayload as DoctorItem[]) : [];
        const todayKey = buildTodayKey();

        const queueDetails = await Promise.all(
          sessionRows
            .filter((session: SessionItem) => session.date === todayKey || Boolean(session.queueId))
            .map(async (session: SessionItem) => {
              const detail = (await fetchReceptionQueueDetail({ sessionId: session.id }).catch(() => null)) as any;
              const queuePatients = detail
                ? [
                    ...(Array.isArray(detail.waitingPatients) ? detail.waitingPatients : []),
                    ...(Array.isArray(detail.withDoctorPatients) ? detail.withDoctorPatients : []),
                    ...(Array.isArray(detail.completedPatients) ? detail.completedPatients : []),
                    ...(Array.isArray(detail.missedPatients) ? detail.missedPatients : []),
                  ]
                : [];
              const currentServingNumber =
                Number(detail?.currentPatient?.tokenNumber ?? detail?.currentPatient?.token_number ?? 0) || null;
              const walkInsCount = queuePatients.filter(
                (patient: any) => patient?.isWalkIn === true || patient?.is_walkin === true
              ).length;

              return [session.id, { currentServingNumber, walkInsCount } satisfies QueueDetailLite] as const;
            })
        );

        const queueDetailMap = new Map<number, QueueDetailLite>(queueDetails);
        const now = new Date();

        const board: SessionBoardItem[] = sessionRows.map((session: SessionItem) => {
          const sessionVisits = visitRows.filter((visit) => Number(visit.sessionId ?? 0) === session.id);
          const sessionStart = normalizeDateTime(session.date, session.startTime);
          const sessionEnd = normalizeDateTime(session.date, session.endTime);
          const queueStatus = String(session.queueStatus || "").toUpperCase();
          const detail = queueDetailMap.get(session.id);

          const state: SessionBoardItem["state"] =
            queueStatus === "LIVE" || queueStatus === "PAUSED"
              ? "live"
              : sessionEnd && now > sessionEnd
                ? "completed"
                : session.date === todayKey
                  ? "today"
                  : sessionStart && now < sessionStart
                    ? "upcoming"
                    : session.date > todayKey
                      ? "upcoming"
                      : "completed";

          return {
            ...session,
            bookedCount: sessionVisits.filter((visit) => !["cancelled", "missed"].includes(visit.visitStatus)).length,
            checkedInCount: sessionVisits.filter((visit) =>
              ["checked_in", "waiting", "with_doctor", "completed"].includes(visit.visitStatus)
            ).length,
            waitingCount: sessionVisits.filter((visit) => ["waiting", "with_doctor"].includes(visit.visitStatus)).length,
            completedCount: sessionVisits.filter((visit) => visit.visitStatus === "completed").length,
            missedCount: sessionVisits.filter((visit) => visit.visitStatus === "missed").length,
            walkInsCount: detail?.walkInsCount ?? 0,
            currentServingNumber: detail?.currentServingNumber ?? null,
            state,
          };
        });

        const doctorIdsWithSessions = new Set<number>(board.map((item: SessionBoardItem) => item.doctorId));
        setNoSessionDoctors(
          doctorRows.filter((doctor) => !doctorIdsWithSessions.has(Number(doctor.doctorId)))
        );
        setSessions(board);
        setError(null);
      } catch (loadError) {
        setError(getFriendlyError(loadError, "Could not load doctor sessions."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadData("initial");
    }, [loadData])
  );

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => {
      void loadData("refresh");
    };

    socket.on("queue:update", refresh);
    socket.on("connect", refresh);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("connect", refresh);
    };
  }, [loadData]);

  const counts = useMemo(
    () => ({
      all: sessions.length,
      live: sessions.filter((item) => item.state === "live").length,
      today: sessions.filter((item) => item.state === "today").length,
      upcoming: sessions.filter((item) => item.state === "upcoming").length,
      completed: sessions.filter((item) => item.state === "completed").length,
      no_sessions: noSessionDoctors.length,
    }),
    [noSessionDoctors.length, sessions]
  );

  const visibleSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "live" && session.state === "live") ||
        (activeFilter === "today" && session.state === "today") ||
        (activeFilter === "upcoming" && session.state === "upcoming") ||
        (activeFilter === "completed" && session.state === "completed");

      const matchesSearch =
        !query ||
        [
          session.doctorName,
          session.specialty,
          session.startTime,
          session.endTime,
          session.state,
          statusLabel(session.state),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search, sessions]);

  const runStartSession = useCallback(
    async (sessionId: number) => {
      setBusyKey(`start:${sessionId}`);
      try {
        const result = await queueStart(sessionId);
        setNotice(typeof (result as any)?.message === "string" ? (result as any).message : "Session started.");
        await loadData("refresh");
      } catch (loadError) {
        setNotice(getFriendlyError(loadError, "Could not start this session."));
      } finally {
        setBusyKey(null);
      }
    },
    [loadData]
  );

  const runEndSession = useCallback(
    async (session: SessionBoardItem) => {
      Alert.alert("End session", "Do you want to end this live session?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: () => {
            setBusyKey(`end:${session.id}`);
            void queueEnd({ sessionId: session.id, queueId: session.queueId })
              .then((result) => {
                setNotice(typeof (result as any)?.message === "string" ? (result as any).message : "Session ended.");
                return loadData("refresh");
              })
              .catch((loadError) => {
                setNotice(getFriendlyError(loadError, "Could not end this session."));
              })
              .finally(() => {
                setBusyKey(null);
              });
          },
        },
      ]);
    },
    [loadData]
  );

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Doctor session management has not been assigned to your account." />
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={RECEPTION_THEME.navy} />
      </SafeAreaView>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Ionicons name="medical" size={18} color={RECEPTION_THEME.aqua} />
            <Text style={styles.brandText}>HealthLink</Text>
          </View>
          <Text style={styles.headerTitle}>Doctor Sessions</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={() => void loadData("refresh")}>
            <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {receptionistName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("") || "RC"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadData("refresh")} />
        }
      >
        {notice ? (
          <SurfaceCard style={styles.noticeCard}>
            <Text style={styles.noticeText}>{notice}</Text>
          </SurfaceCard>
        ) : null}

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={RECEPTION_THEME.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search doctor, specialty, session time, or status"
            placeholderTextColor={RECEPTION_THEME.textSecondary}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter.label} ({counts[filter.key]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={RECEPTION_THEME.primary} />
            <Text style={styles.loadingText}>Loading session workflow...</Text>
          </View>
        ) : error ? (
          <ErrorState title="Sessions unavailable" message={error} onRetry={() => void loadData("refresh")} />
        ) : activeFilter === "no_sessions" ? (
          noSessionDoctors.length === 0 ? (
            <EmptyState
              title="No doctors without sessions"
              message="Every assigned doctor currently has at least one clinic session."
              icon="checkmark-done-outline"
            />
          ) : (
            <View style={styles.stack}>
              {noSessionDoctors.map((doctor) => (
                <SurfaceCard key={doctor.doctorUserId} style={styles.noSessionCard}>
                  <View style={styles.noSessionCopy}>
                    <Text style={styles.sessionTitle}>{doctor.doctorName}</Text>
                    <Text style={styles.sessionMeta}>{doctor.specialization || "Specialist"}</Text>
                  </View>
                  <ReceptionistButton
                    label="Add Session"
                    onPress={() =>
                      navigation.navigate("ReceptionistDoctorSessionManagement", {
                        doctorId: doctor.doctorId,
                        doctorUserId: doctor.doctorUserId,
                        doctorName: doctor.doctorName,
                        specialization: doctor.specialization || null,
                      })
                    }
                  />
                </SurfaceCard>
              ))}
            </View>
          )
        ) : visibleSessions.length === 0 ? (
          <EmptyState
            title="No sessions found"
            message="Try another filter or search term."
            icon="calendar-outline"
          />
        ) : (
          <View style={styles.stack}>
            {visibleSessions.map((session) => (
              <SurfaceCard key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionCopy}>
                    <Text style={styles.sessionTitle}>{session.doctorName}</Text>
                    <Text style={styles.sessionMeta}>{session.specialty}</Text>
                    <Text style={styles.sessionMeta}>
                      {formatDateLabel(session.date)} • {session.startTime} - {session.endTime}
                    </Text>
                  </View>
                  <StatusBadge label={statusLabel(session.state)} tone={statusTone(session.state)} />
                </View>

                <View style={styles.metricsWrap}>
                  <InfoPill label={`Booked ${session.bookedCount}`} />
                  <InfoPill label={`Checked In ${session.checkedInCount}`} />
                  <InfoPill label={`Waiting ${session.waitingCount}`} />
                  <InfoPill label={`Walk-ins ${session.walkInsCount}`} />
                  <InfoPill
                    label={
                      session.currentServingNumber
                        ? `Serving #${session.currentServingNumber}`
                        : session.state === "live"
                          ? "Queue ready"
                          : "Queue not started"
                    }
                  />
                </View>

                {session.state === "today" ? (
                  <Text style={styles.summaryText}>
                    Scheduled for today. Start the session when the doctor is ready.
                  </Text>
                ) : null}
                {session.state === "upcoming" ? (
                  <Text style={styles.summaryText}>
                    Upcoming session. Queue actions will be available on the session day.
                  </Text>
                ) : null}
                {session.state === "completed" ? (
                  <Text style={styles.summaryText}>
                    Session completed. Review checked-in, missed, and walk-in activity from the summary.
                  </Text>
                ) : null}

                <View style={styles.actionsColumn}>
                  {session.state === "today" ? (
                    <ReceptionistButton
                      label="Start Session"
                      onPress={() => void runStartSession(session.id)}
                      loading={busyKey === `start:${session.id}`}
                    />
                  ) : null}
                  {session.state === "upcoming" ? (
                    <TouchableOpacity
                      style={styles.disabledAction}
                      activeOpacity={0.88}
                      onPress={() =>
                        Alert.alert("Session not ready", "You can start this session only on the scheduled date.")
                      }
                    >
                      <Text style={styles.disabledActionText}>Start Session</Text>
                    </TouchableOpacity>
                  ) : null}
                  {session.state === "live" ? (
                    <>
                      <View style={styles.inlineActions}>
                        <ReceptionistButton
                          label="View Queue"
                          onPress={() =>
                            navigation.navigate("ReceptionistQueueDetails", {
                              queueId: session.queueId ?? undefined,
                              sessionId: session.id,
                              doctorName: session.doctorName,
                            })
                          }
                        />
                        <ReceptionistButton
                          label="Check In"
                          tone="secondary"
                          onPress={() =>
                            navigation.navigate("ReceptionistCheckInPatients", {
                              sessionId: session.id,
                              doctorName: session.doctorName,
                              specialization: session.specialty,
                            })
                          }
                        />
                      </View>
                      <View style={styles.inlineActions}>
                        <ReceptionistButton
                          label="Add Walk-in"
                          tone="secondary"
                          onPress={() =>
                            navigation.navigate("ReceptionistCheckInPatients", {
                              sessionId: session.id,
                              doctorName: session.doctorName,
                              specialization: session.specialty,
                            })
                          }
                        />
                        <ReceptionistButton
                          label="End Session"
                          tone="secondary"
                          onPress={() => runEndSession(session)}
                          loading={busyKey === `end:${session.id}`}
                        />
                      </View>
                    </>
                  ) : null}
                  {session.state === "completed" ? (
                    <ReceptionistButton
                      label="View Summary"
                      onPress={() =>
                        navigation.navigate("ReceptionistCheckInPatients", {
                          sessionId: session.id,
                          doctorName: session.doctorName,
                          specialization: session.specialty,
                        })
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.navy,
  },
  topSafeArea: {
    backgroundColor: RECEPTION_THEME.navy,
  },
  header: {
    backgroundColor: RECEPTION_THEME.navy,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  brandText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginLeft: 6,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  scroll: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  noticeCard: {
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  noticeText: {
    color: RECEPTION_THEME.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: RECEPTION_THEME.navy,
    fontSize: 14,
    fontWeight: "600",
  },
  filtersRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: RECEPTION_THEME.navy,
  },
  filterText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
  },
  loadingText: {
    marginTop: 12,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  stack: {
    gap: 12,
  },
  sessionCard: {
    gap: 14,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sessionCopy: {
    flex: 1,
  },
  sessionTitle: {
    color: RECEPTION_THEME.navy,
    fontSize: 19,
    fontWeight: "800",
  },
  sessionMeta: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  metricsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoPill: {
    borderRadius: 14,
    backgroundColor: RECEPTION_THEME.lightAqua,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoPillText: {
    color: RECEPTION_THEME.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  actionsColumn: {
    gap: 10,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 10,
  },
  disabledAction: {
    height: 46,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledActionText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  noSessionCard: {
    gap: 14,
  },
  noSessionCopy: {
    gap: 4,
  },
});
