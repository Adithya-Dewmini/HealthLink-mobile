import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RECEPTION_THEME,
  ReceptionistButton,
  StatusBadge,
  SurfaceCard,
} from "../../components/receptionist/PanelUI";
import {
  fetchReceptionAppointments,
  fetchReceptionQueueDetail,
  fetchReceptionVisits,
  markReceptionVisitMissed,
  queueStart,
  registerReceptionPatient,
  updateReceptionAppointment,
  checkInReceptionVisit,
} from "../../services/receptionService";
import { getFriendlyError } from "../../utils/friendlyErrors";
import { getSocket } from "../../services/socket";

type RouteParams = RouteProp<ReceptionistStackParamList, "ReceptionistCheckInPatients">;

type VisitStatus =
  | "booked"
  | "checked_in"
  | "waiting"
  | "with_doctor"
  | "completed"
  | "missed"
  | "cancelled";

type VisitItem = {
  bookingId: number;
  patientName: string;
  patientPhone?: string | null;
  doctorName: string;
  specialty: string;
  sessionId?: number | null;
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  appointmentTime: string;
  tokenNumber?: number | null;
  visitStatus: VisitStatus;
  queueId?: number | null;
};

type SessionItem = {
  id: number;
  doctorName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  queueId: number | null;
  queueStatus: string | null;
};

type QueuePatient = {
  id: number;
  patientName: string;
  tokenNumber: number;
  status: string;
  isWalkIn?: boolean | null;
};

type SectionKey = "booked" | "checked_in" | "late" | "missed" | "walkins";

const LATE_THRESHOLD_MINUTES = 15;
const SECTION_TABS: Array<{ key: SectionKey; label: string }> = [
  { key: "booked", label: "Booked" },
  { key: "checked_in", label: "Checked In" },
  { key: "late", label: "Late" },
  { key: "missed", label: "Missed" },
  { key: "walkins", label: "Walk-ins" },
];

const normalizeSession = (input: any): SessionItem => ({
  id: Number(input?.id ?? 0),
  doctorName: String(input?.doctor_name || input?.doctorName || "Doctor"),
  specialty: String(input?.specialty || "Specialist"),
  date: String(input?.date || ""),
  startTime: String(input?.start_time || input?.startTime || "").slice(0, 5),
  endTime: String(input?.end_time || input?.endTime || "").slice(0, 5),
  queueId: input?.queue_id ? Number(input.queue_id) : input?.queueId ? Number(input.queueId) : null,
  queueStatus:
    input?.queue_status || input?.queueStatus ? String(input.queue_status ?? input.queueStatus).toUpperCase() : null,
});

const isVisitLate = (visit: VisitItem) => {
  if (visit.visitStatus !== "booked") return false;
  const [hours, minutes] = String(visit.appointmentTime || "")
    .slice(0, 5)
    .split(":")
    .map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return false;

  const scheduledAt = new Date();
  scheduledAt.setHours(hours, minutes + LATE_THRESHOLD_MINUTES, 0, 0);
  return Date.now() > scheduledAt.getTime();
};

const queueStatusTone = (status?: string | null): "info" | "warning" | "success" | "danger" | "neutral" => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "LIVE") return "success";
  if (normalized === "PAUSED") return "warning";
  if (normalized === "ENDED" || normalized === "COMPLETED") return "neutral";
  return "info";
};

export default function ReceptionistCheckInPatients() {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const route = useRoute<RouteParams>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("booked");
  const [session, setSession] = useState<SessionItem | null>(null);
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [walkIns, setWalkIns] = useState<QueuePatient[]>([]);
  const [walkInModalVisible, setWalkInModalVisible] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const [appointmentsPayload, visitsPayload, queuePayload] = await Promise.all([
          fetchReceptionAppointments(),
          fetchReceptionVisits({ filter: "all", sessionId: route.params.sessionId, page: 1, limit: 500 }),
          fetchReceptionQueueDetail({ sessionId: route.params.sessionId }).catch(() => null),
        ]);

        const appointmentsRecord = appointmentsPayload as any;
        const sessionRow =
          Array.isArray(appointmentsRecord?.sessions)
            ? appointmentsRecord.sessions.map(normalizeSession).find((item: SessionItem) => item.id === route.params.sessionId)
            : null;

        setSession(sessionRow || {
          id: route.params.sessionId,
          doctorName: route.params.doctorName || "Doctor",
          specialty: route.params.specialization || "Specialist",
          date: "",
          startTime: "",
          endTime: "",
          queueId: null,
          queueStatus: null,
        });
        setVisits(Array.isArray((visitsPayload as any)?.visits) ? (visitsPayload as any).visits : []);

        const queueData = queuePayload as any;
        const queuePatients = queueData
          ? [
              ...(Array.isArray(queueData.waitingPatients) ? queueData.waitingPatients : []),
              ...(Array.isArray(queueData.withDoctorPatients) ? queueData.withDoctorPatients : []),
              ...(Array.isArray(queueData.completedPatients) ? queueData.completedPatients : []),
              ...(Array.isArray(queueData.missedPatients) ? queueData.missedPatients : []),
            ]
          : [];

        setWalkIns(
          queuePatients.filter((patient: any) => patient?.isWalkIn === true || patient?.is_walkin === true).map((patient: any) => ({
            id: Number(patient.id),
            patientName: String(patient.patientName || patient.patient_name || "Patient"),
            tokenNumber: Number(patient.tokenNumber ?? patient.token_number ?? 0),
            status: String(patient.status || ""),
            isWalkIn: true,
          }))
        );
        setError(null);
      } catch (loadError) {
        setError(getFriendlyError(loadError, "Could not load session patients."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params.doctorName, route.params.sessionId, route.params.specialization]
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

  const grouped = useMemo(() => {
    const booked = visits.filter((visit) => visit.visitStatus === "booked" && !isVisitLate(visit));
    const late = visits.filter((visit) => isVisitLate(visit));
    const checkedIn = visits.filter((visit) => ["checked_in", "waiting", "with_doctor"].includes(visit.visitStatus));
    const missed = visits.filter((visit) => visit.visitStatus === "missed");

    return {
      booked,
      checked_in: checkedIn,
      late,
      missed,
      walkins: walkIns,
    };
  }, [visits, walkIns]);

  const summary = useMemo(() => {
    const waiting = visits.filter((visit) => ["waiting", "with_doctor"].includes(visit.visitStatus)).length;
    return {
      booked: visits.filter((visit) => visit.visitStatus === "booked").length,
      checkedIn: grouped.checked_in.length,
      waiting,
      walkIns: walkIns.length,
    };
  }, [grouped.checked_in.length, visits, walkIns.length]);

  const runAction = useCallback(
    async (visit: VisitItem, action: "checkin" | "missed" | "undo") => {
      if (busyKey) return;
      const key = `${action}:${visit.bookingId}`;
      const label =
        action === "checkin" ? "check in this patient" : action === "missed" ? "mark this patient as missed" : "undo this check-in";

      Alert.alert("Confirm action", `Do you want to ${label}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setBusyKey(key);
            setNotice(null);
            const request =
              action === "checkin"
                ? checkInReceptionVisit(visit.bookingId)
                : action === "missed"
                  ? markReceptionVisitMissed(visit.bookingId)
                  : updateReceptionAppointment(visit.bookingId, { status: "BOOKED" });

            void request
              .then((result: any) => {
                setNotice(
                  typeof result?.message === "string" && result.message.trim()
                    ? result.message
                    : "Session updated successfully."
                );
                return loadData("refresh");
              })
              .catch((actionError) => {
                setNotice(getFriendlyError(actionError, "Could not update this patient."));
              })
              .finally(() => {
                setBusyKey(null);
              });
          },
        },
      ]);
    },
    [busyKey, loadData]
  );

  const startSession = useCallback(async () => {
    try {
      setBusyKey("start-session");
      const result = await queueStart(route.params.sessionId);
      setNotice(typeof (result as any)?.message === "string" ? (result as any).message : "Session started.");
      await loadData("refresh");
    } catch (loadError) {
      setNotice(getFriendlyError(loadError, "Could not start this session."));
    } finally {
      setBusyKey(null);
    }
  }, [loadData, route.params.sessionId]);

  const addWalkIn = useCallback(async () => {
    if (!walkInName.trim()) {
      setNotice("Walk-in patient name is required.");
      return;
    }

    try {
      setBusyKey("walkin-submit");
      const result = await registerReceptionPatient({
        name: walkInName.trim(),
        phone: walkInPhone.trim() || undefined,
        sessionId: route.params.sessionId,
        addToQueue: true,
      });
      setNotice(
        typeof (result as any)?.message === "string" && (result as any).message.trim()
          ? (result as any).message
          : "Walk-in patient added to the queue."
      );
      setWalkInName("");
      setWalkInPhone("");
      setWalkInModalVisible(false);
      await loadData("refresh");
    } catch (loadError) {
      setNotice(getFriendlyError(loadError, "Could not add the walk-in patient."));
    } finally {
      setBusyKey(null);
    }
  }, [loadData, route.params.sessionId, walkInName, walkInPhone]);

  const sectionCounts = {
    booked: grouped.booked.length,
    checked_in: grouped.checked_in.length,
    late: grouped.late.length,
    missed: grouped.missed.length,
    walkins: grouped.walkins.length,
  };

  const visibleRows = activeSection === "booked"
    ? grouped.booked
    : activeSection === "checked_in"
      ? grouped.checked_in
      : activeSection === "late"
        ? grouped.late
        : activeSection === "missed"
          ? grouped.missed
          : grouped.walkins;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Check In Patients</Text>
          <Text style={styles.headerSubtitle}>Session-based patient check-in workflow</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => void loadData("refresh")}>
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
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

        {loading ? (
          <LoadingState label="Loading session patients..." />
        ) : error ? (
          <ErrorState title="Check-in unavailable" message={error} onRetry={() => void loadData("refresh")} />
        ) : (
          <>
            <SurfaceCard style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={styles.summaryTitle}>{session?.doctorName || route.params.doctorName || "Doctor"}</Text>
                  <Text style={styles.summarySubtitle}>
                    {session?.specialty || route.params.specialization || "Specialist"} • {session?.startTime || "--:--"} - {session?.endTime || "--:--"}
                  </Text>
                </View>
                <StatusBadge
                  label={session?.queueStatus === "LIVE" ? "Live" : session?.queueStatus === "PAUSED" ? "Paused" : "Today"}
                  tone={queueStatusTone(session?.queueStatus)}
                />
              </View>

              <View style={styles.metricsRow}>
                <MetricCard label="Booked" value={String(summary.booked)} />
                <MetricCard label="Checked In" value={String(summary.checkedIn)} />
                <MetricCard label="Waiting" value={String(summary.waiting)} />
                <MetricCard label="Walk-ins" value={String(summary.walkIns)} />
              </View>

              <View style={styles.actionRow}>
                {session?.queueStatus === "LIVE" || session?.queueStatus === "PAUSED" ? (
                  <>
                    <ReceptionistButton
                      label="View Queue"
                      onPress={() =>
                        navigation.navigate("ReceptionistQueueDetails", {
                          queueId: session?.queueId ?? undefined,
                          sessionId: route.params.sessionId,
                          doctorName: session?.doctorName || route.params.doctorName,
                        })
                      }
                    />
                    <ReceptionistButton label="Add Walk-in" tone="secondary" onPress={() => setWalkInModalVisible(true)} />
                  </>
                ) : (
                  <>
                    <ReceptionistButton
                      label="Start Session"
                      onPress={() => void startSession()}
                      loading={busyKey === "start-session"}
                    />
                    <ReceptionistButton label="Add Walk-in" tone="secondary" onPress={() => setWalkInModalVisible(true)} />
                  </>
                )}
              </View>
            </SurfaceCard>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {SECTION_TABS.map((tab) => {
                const active = activeSection === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabChip, active && styles.tabChipActive]}
                    onPress={() => setActiveSection(tab.key)}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {tab.label} ({sectionCounts[tab.key]})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {visibleRows.length === 0 ? (
              <EmptyState
                title="No patients in this section"
                message="Pull to refresh or switch to another section."
                icon="people-outline"
              />
            ) : (
              <View style={styles.listWrap}>
                {visibleRows.map((item: any) =>
                  activeSection === "walkins" ? (
                    <SurfaceCard key={`walkin-${item.id}`} style={styles.rowCard}>
                      <View style={styles.rowHeader}>
                        <View style={styles.rowCopy}>
                          <Text style={styles.rowTitle}>{item.patientName}</Text>
                          <Text style={styles.rowSubtitle}>Walk-in token #{item.tokenNumber || "--"}</Text>
                        </View>
                        <StatusBadge label={String(item.status || "WAITING")} tone="warning" />
                      </View>
                      <ReceptionistButton
                        label="View Queue"
                        onPress={() =>
                          navigation.navigate("ReceptionistQueueDetails", {
                            queueId: session?.queueId ?? undefined,
                            sessionId: route.params.sessionId,
                            doctorName: session?.doctorName || route.params.doctorName,
                          })
                        }
                      />
                    </SurfaceCard>
                  ) : (
                    <PatientVisitRow
                      key={`visit-${item.bookingId}`}
                      visit={item}
                      isLateSection={activeSection === "late"}
                      canUndo={item.visitStatus === "checked_in" && !item.queueId}
                      busyKey={busyKey}
                      onCheckIn={() => void runAction(item, "checkin")}
                      onMissed={() => void runAction(item, "missed")}
                      onUndo={() => void runAction(item, "undo")}
                      onViewQueue={() =>
                        navigation.navigate("ReceptionistQueueDetails", {
                          queueId: item.queueId ?? session?.queueId ?? undefined,
                          sessionId: route.params.sessionId,
                          doctorName: item.doctorName || session?.doctorName || route.params.doctorName,
                        })
                      }
                    />
                  )
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={walkInModalVisible} transparent animationType="slide" onRequestClose={() => setWalkInModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Walk-in Patient</Text>
            <TextInput
              value={walkInName}
              onChangeText={setWalkInName}
              placeholder="Patient name"
              placeholderTextColor={RECEPTION_THEME.textSecondary}
              style={styles.modalInput}
            />
            <TextInput
              value={walkInPhone}
              onChangeText={setWalkInPhone}
              placeholder="Phone number"
              placeholderTextColor={RECEPTION_THEME.textSecondary}
              style={styles.modalInput}
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <ReceptionistButton label="Close" tone="secondary" onPress={() => setWalkInModalVisible(false)} />
              <ReceptionistButton
                label="Add Walk-in"
                onPress={() => void addWalkIn()}
                loading={busyKey === "walkin-submit"}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PatientVisitRow({
  visit,
  isLateSection,
  canUndo,
  busyKey,
  onCheckIn,
  onMissed,
  onUndo,
  onViewQueue,
}: {
  visit: VisitItem;
  isLateSection: boolean;
  canUndo: boolean;
  busyKey: string | null;
  onCheckIn: () => void;
  onMissed: () => void;
  onUndo: () => void;
  onViewQueue: () => void;
}) {
  const checkInBusy = busyKey === `checkin:${visit.bookingId}`;
  const missedBusy = busyKey === `missed:${visit.bookingId}`;
  const undoBusy = busyKey === `undo:${visit.bookingId}`;

  return (
    <SurfaceCard style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{visit.patientName}</Text>
          <Text style={styles.rowSubtitle}>
            {visit.appointmentTime}
            {visit.tokenNumber ? ` • Token #${visit.tokenNumber}` : ""}
          </Text>
          {visit.patientPhone ? <Text style={styles.rowSubtitle}>{visit.patientPhone}</Text> : null}
        </View>
        <StatusBadge
          label={isLateSection ? "Late" : visit.visitStatus.replaceAll("_", " ")}
          tone={isLateSection ? "warning" : visit.visitStatus === "missed" ? "danger" : "info"}
        />
      </View>

      <View style={styles.actionRow}>
        {visit.visitStatus === "booked" ? (
          <>
            <ReceptionistButton
              label={isLateSection ? "Check In Late" : "Check In"}
              onPress={onCheckIn}
              loading={checkInBusy}
            />
            <ReceptionistButton label="Mark Missed" tone="secondary" onPress={onMissed} loading={missedBusy} />
          </>
        ) : null}

        {["checked_in", "waiting", "with_doctor"].includes(visit.visitStatus) ? (
          <>
            <ReceptionistButton
              label={visit.queueId ? "View Queue" : "Checked In"}
              onPress={visit.queueId ? onViewQueue : () => undefined}
              tone={visit.queueId ? "primary" : "secondary"}
            />
            {canUndo ? (
              <ReceptionistButton label="Undo" tone="secondary" onPress={onUndo} loading={undoBusy} />
            ) : null}
          </>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.navy,
  },
  header: {
    backgroundColor: RECEPTION_THEME.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    fontWeight: "600",
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
  summaryCard: {
    gap: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryTitle: {
    color: RECEPTION_THEME.navy,
    fontSize: 20,
    fontWeight: "800",
  },
  summarySubtitle: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    minWidth: 140,
    backgroundColor: RECEPTION_THEME.lightAqua,
    borderRadius: 16,
    padding: 14,
  },
  metricValue: {
    color: RECEPTION_THEME.navy,
    fontSize: 24,
    fontWeight: "800",
  },
  metricLabel: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabChipActive: {
    backgroundColor: RECEPTION_THEME.navy,
  },
  tabText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  listWrap: {
    gap: 10,
  },
  rowCard: {
    gap: 12,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: RECEPTION_THEME.navy,
    fontSize: 17,
    fontWeight: "800",
  },
  rowSubtitle: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
  },
  modalTitle: {
    color: RECEPTION_THEME.navy,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#F8FAFC",
    color: RECEPTION_THEME.navy,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
});
