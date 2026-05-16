import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { useAuth } from "../../utils/AuthContext";
import type { ReceptionistStackParamList } from "../../types/navigation";
import {
  cancelReceptionVisit,
  checkInReceptionVisit,
  completeReceptionVisit,
  fetchReceptionVisits,
  markReceptionVisitMissed,
  sendReceptionVisitToQueue,
} from "../../services/receptionService";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  EmptyState,
  ErrorState,
  RECEPTION_THEME,
  ReceptionistButton,
  SurfaceCard,
  StatusBadge,
} from "../../components/receptionist/PanelUI";
import { formatShortDate } from "../../utils/dateUtils";
import { getFriendlyError } from "../../utils/friendlyErrors";
import { getSocket } from "../../services/socket";

type VisitStatus =
  | "booked"
  | "checked_in"
  | "waiting"
  | "with_doctor"
  | "completed"
  | "missed"
  | "cancelled";

type VisitItem = {
  appointmentId: number;
  bookingId: number;
  patientId: number;
  patientName: string;
  patientPhone?: string | null;
  doctorId: number;
  doctorName: string;
  specialty: string;
  clinicId: string;
  clinicName: string;
  sessionId?: number | null;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  appointmentTime: string;
  tokenNumber?: number | null;
  visitStatus: VisitStatus;
  bookingSource: "patient" | "receptionist" | "admin";
  createdAt: string;
  queueId?: number | null;
  queueStatus?: string | null;
};

type VisitsPayload = {
  visits: VisitItem[];
  summary: {
    todaysVisits: number;
    checkedIn: number;
    waiting: number;
    completed: number;
  };
  doctors: Array<{
    doctorId: number;
    doctorName: string;
    specialty: string | null;
  }>;
};

type FilterKey = "today" | "upcoming" | "completed" | "missed";
type VisitAction = "check-in" | "send-to-queue" | "complete" | "missed" | "cancel";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Missed" },
];

const SUMMARY_METRICS: Array<{
  key: keyof VisitsPayload["summary"];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}> = [
  { key: "todaysVisits", label: "Today's Visits", icon: "calendar-outline", tint: "#E0F2FE" },
  { key: "checkedIn", label: "Checked In", icon: "log-in-outline", tint: "#EDE9FE" },
  { key: "waiting", label: "Waiting", icon: "time-outline", tint: "#FEF3C7" },
  { key: "completed", label: "Completed", icon: "checkmark-done-outline", tint: "#DCFCE7" },
];

const statusBadgeTone = (status: VisitStatus): "info" | "warning" | "success" | "danger" | "neutral" => {
  switch (status) {
    case "booked":
      return "info";
    case "checked_in":
      return "info";
    case "waiting":
      return "warning";
    case "with_doctor":
      return "neutral";
    case "completed":
      return "success";
    case "missed":
      return "danger";
    case "cancelled":
      return "neutral";
  }
};

const statusLabel = (status: VisitStatus) =>
  ({
    booked: "Booked",
    checked_in: "Checked In",
    waiting: "Waiting",
    with_doctor: "With Doctor",
    completed: "Completed",
    missed: "Missed",
    cancelled: "Cancelled",
  })[status];

const actionCopy = {
  "check-in": "check in this patient",
  "send-to-queue": "send this patient to the queue",
  complete: "complete this visit",
  missed: "mark this visit as missed",
  cancel: "cancel this visit",
} as const;

export default function AppointmentManagement() {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const hasAccess = useReceptionPermissionGuard("appointments", "appointments");
  const { receptionistPermissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("today");
  const [search, setSearch] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [payload, setPayload] = useState<VisitsPayload>({
    visits: [],
    summary: {
      todaysVisits: 0,
      checkedIn: 0,
      waiting: 0,
      completed: 0,
    },
    doctors: [],
  });

  const loadVisits = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = (await fetchReceptionVisits({
          filter: activeFilter,
          search: search.trim() || undefined,
          doctorId: selectedDoctorId,
          page: 1,
          limit: 100,
        })) as Partial<VisitsPayload>;

        setPayload({
          visits: Array.isArray(data?.visits) ? data.visits : [],
          summary: {
            todaysVisits: Number(data?.summary?.todaysVisits ?? 0),
            checkedIn: Number(data?.summary?.checkedIn ?? 0),
            waiting: Number(data?.summary?.waiting ?? 0),
            completed: Number(data?.summary?.completed ?? 0),
          },
          doctors: Array.isArray(data?.doctors) ? data.doctors : [],
        });
        setError(null);
      } catch (loadError) {
        setError(getFriendlyError(loadError, "Could not load clinic visits."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter, search, selectedDoctorId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadVisits("initial");
    }, [loadVisits])
  );

  useEffect(() => {
    const socket = getSocket();

    const refresh = () => {
      void loadVisits("refresh");
    };

    socket.on("queue:update", refresh);
    socket.on("queue:next", refresh);
    socket.on("session:start", refresh);
    socket.on("connect", refresh);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("queue:next", refresh);
      socket.off("session:start", refresh);
      socket.off("connect", refresh);
    };
  }, [loadVisits]);

  const runVisitAction = useCallback(
    async (visit: VisitItem, action: VisitAction) => {
      const key = `${action}:${visit.bookingId}`;
      if (busyKey) return;

      const handler =
        action === "check-in"
          ? () => checkInReceptionVisit(visit.bookingId)
          : action === "send-to-queue"
            ? () => sendReceptionVisitToQueue(visit.bookingId)
            : action === "complete"
              ? () => completeReceptionVisit(visit.bookingId)
              : action === "missed"
                ? () => markReceptionVisitMissed(visit.bookingId)
                : () => cancelReceptionVisit(visit.bookingId);

      Alert.alert("Update visit", `Do you want to ${actionCopy[action]}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setBusyKey(key);
            setNotice(null);
            void handler()
              .then((result) => {
                setNotice(
                  typeof result?.message === "string" && result.message.trim()
                    ? result.message
                    : "Visit updated successfully."
                );
                return loadVisits("refresh");
              })
              .catch((actionError) => {
                setNotice(getFriendlyError(actionError, "Unable to update visit."));
              })
              .finally(() => {
                setBusyKey(null);
              });
          },
        },
      ]);
    },
    [busyKey, loadVisits]
  );

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return "No visits found for this filter.";
    }
    if (activeFilter === "today") {
      return "No visits scheduled for today.";
    }
    return "No visits found for this filter.";
  }, [activeFilter, search]);

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="You don’t have permission to manage appointments." />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={RECEPTION_THEME.navy} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Ionicons name="medical" size={18} color={RECEPTION_THEME.aqua} />
            <Text style={styles.headerBrandText}>HealthLink</Text>
          </View>
          <Text style={styles.headerTitle}>Visits</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => void loadVisits("refresh")}>
            <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {receptionistPermissions.appointments ? (
            <TouchableOpacity
              style={styles.iconButtonPrimary}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("ReceptionistBookAppointment")}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.contentWrapper}>
        <FlatList
          data={payload.visits}
          keyExtractor={(item) => String(item.bookingId)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={RECEPTION_THEME.primary}
              onRefresh={() => void loadVisits("refresh")}
            />
          }
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {notice ? (
                <SurfaceCard style={styles.noticeCard}>
                  <Text style={styles.noticeText}>{notice}</Text>
                </SurfaceCard>
              ) : null}

              <View style={styles.summaryGrid}>
                {SUMMARY_METRICS.map((metric) => (
                  <SummaryCard
                    key={metric.key}
                    label={metric.label}
                    value={String(payload.summary[metric.key])}
                    icon={metric.icon}
                    tint={metric.tint}
                  />
                ))}
              </View>

              <FlatList
                horizontal
                data={FILTERS}
                keyExtractor={(item) => item.key}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                renderItem={({ item }) => {
                  const active = activeFilter === item.key;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setActiveFilter(item.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              <SurfaceCard style={styles.controlsCard}>
                <View style={styles.searchWrap}>
                  <Ionicons name="search" size={18} color={RECEPTION_THEME.textSecondary} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search patient, phone, or doctor"
                    placeholderTextColor={RECEPTION_THEME.textSecondary}
                    style={styles.searchInput}
                    returnKeyType="search"
                    onSubmitEditing={() => void loadVisits("refresh")}
                  />
                </View>

                <FlatList
                  horizontal
                  data={[
                    { doctorId: null, doctorName: "All Doctors", specialty: null },
                    ...payload.doctors,
                  ]}
                  keyExtractor={(item) => String(item.doctorId ?? "all")}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.doctorFiltersRow}
                  renderItem={({ item }) => {
                    const active = selectedDoctorId === item.doctorId;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={[styles.doctorChip, active && styles.doctorChipActive]}
                        onPress={() => setSelectedDoctorId(item.doctorId)}
                      >
                        <Text style={[styles.doctorChipText, active && styles.doctorChipTextActive]}>
                          {item.doctorName}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </SurfaceCard>
            </>
          }
          ListEmptyComponent={
            loading ? (
              <VisitsLoadingState />
            ) : error ? (
              <ErrorState
                title="Visits unavailable"
                message={error}
                onRetry={() => void loadVisits("refresh")}
              />
            ) : (
              <EmptyState
                title="No visits found"
                message={emptyMessage}
                icon="calendar-outline"
                action={
                  receptionistPermissions.appointments ? (
                    <ReceptionistButton
                      label="Book Visit"
                      icon="add-outline"
                      onPress={() => navigation.navigate("ReceptionistBookAppointment")}
                    />
                  ) : undefined
                }
              />
            )
          }
          renderItem={({ item }) => (
            <VisitCard
              visit={item}
              busyKey={busyKey}
              canCheckIn={receptionistPermissions.check_in}
              canQueue={receptionistPermissions.queue_access}
              onViewDetails={() =>
                navigation.navigate("ReceptionistVisitDetails", {
                  visitId: item.bookingId,
                })
              }
              onOpenQueue={() => {
                if (!item.queueId && !item.sessionId) return;
                navigation.navigate("ReceptionistQueueDetails", {
                  queueId: item.queueId ?? undefined,
                  sessionId: item.sessionId ?? undefined,
                  doctorName: item.doctorName,
                });
              }}
              onAction={runVisitAction}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}) {
  return (
    <SurfaceCard style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={16} color={RECEPTION_THEME.primary} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </SurfaceCard>
  );
}

function VisitCard({
  visit,
  busyKey,
  canCheckIn,
  canQueue,
  onViewDetails,
  onOpenQueue,
  onAction,
}: {
  visit: VisitItem;
  busyKey: string | null;
  canCheckIn: boolean;
  canQueue: boolean;
  onViewDetails: () => void;
  onOpenQueue: () => void;
  onAction: (visit: VisitItem, action: VisitAction) => void;
}) {
  const busy = (action: VisitAction) => busyKey === `${action}:${visit.bookingId}`;

  return (
    <SurfaceCard style={styles.visitCard}>
      <View style={styles.visitHeader}>
        <View style={styles.visitCopy}>
          <Text style={styles.patientName}>{visit.patientName}</Text>
          <Text style={styles.metaText}>{visit.patientPhone || "No phone"}</Text>
          <Text style={styles.metaText}>
            {visit.doctorName} • {visit.specialty}
          </Text>
          <Text style={styles.metaText}>
            {formatShortDate(visit.sessionDate)} • {visit.appointmentTime}
            {visit.tokenNumber ? ` • Token #${visit.tokenNumber}` : ""}
          </Text>
        </View>
        <StatusBadge label={statusLabel(visit.visitStatus)} tone={statusBadgeTone(visit.visitStatus)} />
      </View>

      <View style={styles.metaPillsRow}>
        <MetaPill label={`Source: ${visit.bookingSource}`} />
        {visit.startTime && visit.endTime ? <MetaPill label={`${visit.startTime} - ${visit.endTime}`} /> : null}
      </View>

      <View style={styles.actionStack}>
        {visit.visitStatus === "booked" ? (
          <View style={styles.actionRow}>
            {canCheckIn ? (
              <ReceptionistButton
                label="Check In"
                onPress={() => onAction(visit, "check-in")}
                loading={busy("check-in")}
              />
            ) : null}
            <ReceptionistButton label="View Details" tone="secondary" onPress={onViewDetails} />
            <ReceptionistButton
              label="Cancel"
              tone="secondary"
              onPress={() => onAction(visit, "cancel")}
              loading={busy("cancel")}
            />
          </View>
        ) : null}

        {visit.visitStatus === "checked_in" ? (
          <View style={styles.actionRow}>
            {canQueue ? (
              <ReceptionistButton
                label={visit.queueId ? "View Queue" : "Send to Queue"}
                onPress={() => (visit.queueId ? onOpenQueue() : onAction(visit, "send-to-queue"))}
                loading={busy("send-to-queue")}
              />
            ) : null}
            <ReceptionistButton label="View Details" tone="secondary" onPress={onViewDetails} />
          </View>
        ) : null}

        {visit.visitStatus === "waiting" ? (
          <View style={styles.actionRow}>
            <ReceptionistButton label="View Queue" onPress={onOpenQueue} />
            <ReceptionistButton label="View Details" tone="secondary" onPress={onViewDetails} />
          </View>
        ) : null}

        {visit.visitStatus === "with_doctor" ? (
          <View style={styles.actionRow}>
            <ReceptionistButton label="View Progress" onPress={onOpenQueue} />
            <ReceptionistButton
              label="Complete"
              tone="secondary"
              onPress={() => onAction(visit, "complete")}
              loading={busy("complete")}
            />
          </View>
        ) : null}

        {visit.visitStatus === "completed" ? (
          <View style={styles.actionRow}>
            <ReceptionistButton label="View Summary" tone="secondary" onPress={onViewDetails} />
          </View>
        ) : null}

        {visit.visitStatus === "missed" ? (
          <View style={styles.actionRow}>
            <ReceptionistButton label="Rebook" onPress={onViewDetails} />
            <ReceptionistButton label="View Details" tone="secondary" onPress={onViewDetails} />
          </View>
        ) : null}

        {visit.visitStatus === "cancelled" ? (
          <View style={styles.actionRow}>
            <ReceptionistButton label="View Details" tone="secondary" onPress={onViewDetails} />
          </View>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function VisitsLoadingState() {
  return (
    <View style={styles.loadingWrap}>
      {Array.from({ length: 3 }).map((_, index) => (
        <SurfaceCard key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonLineLg} />
          <View style={styles.skeletonLineMd} />
          <View style={styles.skeletonLineSm} />
        </SurfaceCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.navy,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#DDEAF6",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 130,
  },

  header: {
    backgroundColor: RECEPTION_THEME.navy,
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
        shadowColor: RECEPTION_THEME.navy,
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
    color: "rgba(255,255,255,0.78)",
    marginLeft: 6,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  iconButtonPrimary: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: RECEPTION_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  noticeCard: {
    marginBottom: 12,
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  noticeText: {
    color: RECEPTION_THEME.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    width: "48.4%",
    minWidth: 146,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    gap: 7,
  },
  summaryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    color: RECEPTION_THEME.navy,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
  },
  summaryLabel: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  filterRow: {
    gap: 8,
    paddingTop: 2,
    paddingBottom: 10,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    height: 39,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1D4868",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: RECEPTION_THEME.navy,
  },
  filterChipActive: {
    backgroundColor: "#0B2E4A",
    borderColor: RECEPTION_THEME.aqua,
  },
  filterChipText: {
    color: "#CFD9E4",
    fontSize: 15,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  controlsCard: {
    marginBottom: 18,
    borderRadius: 22,
    padding: 16,
  },
  searchWrap: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FDFEFF",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 14,
  },
  doctorFiltersRow: {
    gap: 10,
    paddingTop: 12,
  },
  doctorChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    justifyContent: "center",
    backgroundColor: "#FBFDFF",
  },
  doctorChipActive: {
    backgroundColor: RECEPTION_THEME.lightAqua,
    borderColor: "#A7DDEA",
  },
  doctorChipText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  doctorChipTextActive: {
    color: RECEPTION_THEME.navy,
  },
  visitCard: {
    marginBottom: 12,
    gap: 12,
    borderRadius: 20,
    borderColor: RECEPTION_THEME.border,
    borderWidth: 1,
    padding: 16,
  },
  visitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  visitCopy: {
    flex: 1,
  },
  patientName: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  metaText: {
    marginTop: 3,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  metaPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    borderRadius: 999,
    backgroundColor: "#F3F7FA",
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  metaPillText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  actionStack: {
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  loadingWrap: {
    gap: 12,
  },
  skeletonCard: {
    gap: 10,
  },
  skeletonLineLg: {
    height: 18,
    width: "56%",
    borderRadius: 8,
    backgroundColor: "#E8F0F5",
  },
  skeletonLineMd: {
    height: 14,
    width: "78%",
    borderRadius: 8,
    backgroundColor: "#EEF3F7",
  },
  skeletonLineSm: {
    height: 14,
    width: "42%",
    borderRadius: 8,
    backgroundColor: "#EEF3F7",
  },
});
