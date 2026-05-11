import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
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
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { useAuth } from "../../utils/AuthContext";
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
  ReceptionistHeader,
  SurfaceCard,
  StatusBadge,
} from "../../components/receptionist/PanelUI";

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

const prettyDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
};

const actionCopy = {
  "check-in": "check in this patient",
  "send-to-queue": "send this patient to the queue",
  complete: "complete this visit",
  missed: "mark this visit as missed",
  cancel: "cancel this visit",
} as const;

export default function AppointmentManagement() {
  const navigation = useNavigation<any>();
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
        setError(loadError instanceof Error ? loadError.message : "Failed to load clinic visits");
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
                setNotice(
                  actionError instanceof Error ? actionError.message : "Unable to update visit."
                );
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />
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
            <ReceptionistHeader
              eyebrow="VISITS"
              title="Appointments & Bookings"
              subtitle="Track and manage clinic visits from one place"
              right={
                <View style={styles.headerActionWrap}>
                  <TouchableOpacity
                    style={styles.bookFab}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("ReceptionistBookAppointment")}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.bookFabText}>Book Visit</Text>
                  </TouchableOpacity>
                </View>
              }
            />

            {notice ? (
              <SurfaceCard style={styles.noticeCard}>
                <Text style={styles.noticeText}>{notice}</Text>
              </SurfaceCard>
            ) : null}

            <View style={styles.summaryGrid}>
              <SummaryCard label="Today's Visits" value={String(payload.summary.todaysVisits)} />
              <SummaryCard label="Checked In" value={String(payload.summary.checkedIn)} />
              <SummaryCard label="Waiting" value={String(payload.summary.waiting)} />
              <SummaryCard label="Completed" value={String(payload.summary.completed)} />
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
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <SurfaceCard style={styles.summaryCard}>
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
            {prettyDate(visit.sessionDate)} • {visit.appointmentTime}
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
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  content: {
    padding: 18,
    paddingBottom: 130,
  },
  headerActionWrap: {
    paddingTop: 18,
  },
  bookFab: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: RECEPTION_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  bookFabText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  noticeCard: {
    marginBottom: 14,
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
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    width: "47%",
    minWidth: 148,
  },
  summaryValue: {
    color: RECEPTION_THEME.navy,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    marginTop: 6,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
  },
  filterRow: {
    gap: 10,
    paddingBottom: 10,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: RECEPTION_THEME.surface,
  },
  filterChipActive: {
    backgroundColor: RECEPTION_THEME.primary,
    borderColor: RECEPTION_THEME.primary,
  },
  filterChipText: {
    color: RECEPTION_THEME.textSecondary,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  controlsCard: {
    marginBottom: 16,
  },
  searchWrap: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FDFEFF",
    paddingHorizontal: 14,
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
    paddingTop: 14,
  },
  doctorChip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: "700",
  },
  doctorChipTextActive: {
    color: RECEPTION_THEME.navy,
  },
  visitCard: {
    marginBottom: 12,
    gap: 14,
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
    fontSize: 18,
    fontWeight: "800",
  },
  metaText: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 18,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 11,
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
