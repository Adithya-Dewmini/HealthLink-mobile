import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  fetchReceptionQueueDetail,
  queueCompletePatient,
  queueEnd,
  queueMissPatient,
  queueNextPatient,
  queuePause,
  queueResume,
  queueStart,
} from "../../services/receptionService";
import { getSocket, joinSessionRoom, leaveSessionRoom } from "../../services/socket";
import {
  ErrorState,
  LoadingState,
  RECEPTION_THEME,
  ReceptionistButton,
  StatusBadge,
  SurfaceCard,
} from "../../components/receptionist/PanelUI";
import { getFriendlyError } from "../../utils/friendlyErrors";

type QueueStatus = "LIVE" | "WAITING" | "PAUSED" | "COMPLETED";

type QueueCard = {
  queueId: number | null;
  sessionId: number;
  doctorId: number;
  doctorName: string;
  specialty: string;
  medicalCenterId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  queueStatus: QueueStatus | "IDLE";
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

type QueuePatient = {
  id: number;
  patientId: number;
  tokenNumber: number;
  status: string;
  patientName: string;
  phone?: string | null;
  bookingTime?: string | null;
  isWalkIn?: boolean | null;
};

type QueueDetailPayload = {
  clinic: {
    id: string;
    name: string;
  };
  queue: QueueCard;
  currentPatient: QueuePatient | null;
  nextPatient: QueuePatient | null;
  waitingPatients: QueuePatient[];
  withDoctorPatients: QueuePatient[];
  missedPatients: QueuePatient[];
  completedPatients: QueuePatient[];
};

type QueueActionKind = "start" | "pause" | "resume" | "end" | "next" | "complete" | "miss";
type QueueSectionKey = "waiting" | "walkins" | "withDoctor" | "completed" | "missed";

const normalizeQueueDetail = (
  input: Partial<QueueDetailPayload> | null | undefined
): QueueDetailPayload | null => {
  if (!input?.queue) {
    return null;
  }

  return {
    clinic: {
      id: typeof input?.clinic?.id === "string" ? input.clinic.id : "",
      name: typeof input?.clinic?.name === "string" ? input.clinic.name : "Clinic",
    },
    queue: input.queue,
    currentPatient: input.currentPatient ?? null,
    nextPatient: input.nextPatient ?? null,
    waitingPatients: Array.isArray(input.waitingPatients) ? input.waitingPatients : [],
    withDoctorPatients: Array.isArray(input.withDoctorPatients) ? input.withDoctorPatients : [],
    missedPatients: Array.isArray(input.missedPatients) ? input.missedPatients : [],
    completedPatients: Array.isArray(input.completedPatients) ? input.completedPatients : [],
  };
};

const isWalkInPatient = (patient: QueuePatient) =>
  patient.isWalkIn === true || (patient as QueuePatient & { is_walkin?: boolean | null }).is_walkin === true;

const uniquePatients = (patients: QueuePatient[]) => {
  const byId = new Map<number, QueuePatient>();
  patients.forEach((patient) => byId.set(patient.id, patient));
  return Array.from(byId.values()).sort((left, right) => left.tokenNumber - right.tokenNumber);
};

const statusToneMap: Record<QueueStatus | "IDLE", "info" | "warning" | "success" | "neutral"> = {
  LIVE: "info",
  WAITING: "warning",
  IDLE: "warning",
  PAUSED: "neutral",
  COMPLETED: "success",
};

const SECTION_TABS: Array<{ key: QueueSectionKey; label: string }> = [
  { key: "waiting", label: "Waiting" },
  { key: "walkins", label: "Walk-ins" },
  { key: "withDoctor", label: "With Doctor" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Missed" },
];

export default function ReceptionistQueueDetails() {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const route =
    useRoute<RouteProp<ReceptionistStackParamList, "ReceptionistQueueDetails">>();
  const hasAccess = useReceptionPermissionGuard("queue", "queue_access");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueueDetailPayload | null>(null);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<QueueSectionKey>("waiting");
  const [actionsVisible, setActionsVisible] = useState(false);

  const loadDetail = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = normalizeQueueDetail((await fetchReceptionQueueDetail({
        queueId: route.params?.queueId,
        sessionId: route.params?.sessionId,
      })) as Partial<QueueDetailPayload>);
      setDetail(data);
      setError(null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load queue details."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params?.queueId, route.params?.sessionId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail("initial");
    }, [loadDetail])
  );

  useEffect(() => {
    const sessionId = detail?.queue.sessionId ?? route.params?.sessionId;
    if (!sessionId) {
      return;
    }

    const socket = getSocket();
    const refresh = () => {
      void loadDetail("refresh");
    };

    joinSessionRoom(sessionId);
    socket.on("queue:update", refresh);
    socket.on("queue:next", refresh);
    socket.on("session:start", refresh);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("queue:next", refresh);
      socket.off("session:start", refresh);
      leaveSessionRoom(sessionId);
    };
  }, [detail?.queue.sessionId, loadDetail, route.params?.sessionId]);

  const runAction = useCallback(
    async (action: QueueActionKind) => {
      if (!detail?.queue || busyKey) {
        return;
      }

      const actionKey = `${action}:${detail.queue.queueId ?? detail.queue.sessionId}`;
      const payload = {
        queueId: detail.queue.queueId,
        sessionId: detail.queue.sessionId,
      };

      const handler =
        action === "start"
          ? () => queueStart(detail.queue.sessionId)
          : action === "pause"
            ? () => queuePause(payload)
            : action === "resume"
              ? () => queueResume(payload)
              : action === "end"
                ? () => queueEnd(payload)
                : action === "next"
                  ? () => queueNextPatient(payload)
                  : action === "complete"
                    ? () => queueCompletePatient(payload)
                    : () => queueMissPatient(payload);

      Alert.alert("Queue action", `Do you want to ${action.replace("-", " ")}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setBusyKey(actionKey);
            setNotice(null);
            void handler()
              .then((result) => {
                setNotice(
                  typeof result?.message === "string" ? result.message : "Queue updated."
                );
                return loadDetail("refresh");
              })
              .catch((actionError) => {
                setNotice(getFriendlyError(actionError, "Unable to update queue."));
              })
              .finally(() => {
                setBusyKey(null);
              });
          },
        },
      ]);
    },
    [busyKey, detail?.queue, loadDetail]
  );

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Queue management has not been assigned to your account." />
    );
  }

  const queue = detail?.queue;
  const allPatients = detail
    ? uniquePatients([
        ...(detail.currentPatient ? [detail.currentPatient] : []),
        ...(detail.nextPatient ? [detail.nextPatient] : []),
        ...detail.waitingPatients,
        ...detail.withDoctorPatients,
        ...detail.completedPatients,
        ...detail.missedPatients,
      ])
    : [];
  const walkInPatients = allPatients.filter(isWalkInPatient);
  const bookedWaitingPatients = detail?.waitingPatients.filter((patient) => !isWalkInPatient(patient)) ?? [];
  const bookedWithDoctorPatients = detail?.withDoctorPatients.filter((patient) => !isWalkInPatient(patient)) ?? [];
  const bookedCompletedPatients = detail?.completedPatients.filter((patient) => !isWalkInPatient(patient)) ?? [];
  const bookedMissedPatients = detail?.missedPatients.filter((patient) => !isWalkInPatient(patient)) ?? [];
  const filteredAllPatients = allPatients.filter((patient) =>
    [patient.patientName, patient.phone || "", String(patient.tokenNumber)].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const filteredWaitingPatients = bookedWaitingPatients.filter((patient) =>
    [patient.patientName, patient.phone || "", String(patient.tokenNumber)].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const filteredWalkInPatients = walkInPatients.filter((patient) =>
    [patient.patientName, patient.phone || "", String(patient.tokenNumber)].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const filteredWithDoctorPatients = bookedWithDoctorPatients.filter((patient) =>
    [patient.patientName, patient.phone || "", String(patient.tokenNumber)].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const filteredCompletedPatients = bookedCompletedPatients.filter((patient) =>
    [patient.patientName, patient.phone || "", String(patient.tokenNumber)].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const filteredMissedPatients = bookedMissedPatients.filter((patient) =>
    [patient.patientName, patient.phone || "", String(patient.tokenNumber)].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );
  const sectionCounts: Record<QueueSectionKey, number> = {
    waiting: bookedWaitingPatients.length,
    walkins: walkInPatients.length,
    withDoctor: bookedWithDoctorPatients.length,
    completed: bookedCompletedPatients.length,
    missed: bookedMissedPatients.length,
  };
  const sectionData = detail
    ? activeSection === "waiting"
      ? [{ key: "waiting", title: "Waiting List", items: filteredWaitingPatients, empty: "No booked patients waiting." }]
      : activeSection === "walkins"
        ? [{ key: "walkins", title: "Walk-ins", items: filteredWalkInPatients, empty: "No walk-in patients in this queue." }]
        : activeSection === "withDoctor"
          ? [{ key: "withDoctor", title: "With Doctor", items: filteredWithDoctorPatients, empty: "No patient is currently with the doctor." }]
          : activeSection === "completed"
            ? [{ key: "completed", title: "Completed", items: filteredCompletedPatients, empty: "No completed patients yet." }]
            : [{ key: "missed", title: "Missed", items: filteredMissedPatients, empty: "No missed patients." }]
    : [];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={RECEPTION_THEME.navy} />
      </SafeAreaView>
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.topBrandRow}>
            <Ionicons name="medical" size={18} color={RECEPTION_THEME.aqua} />
            <Text style={styles.topHeaderBrandText}>HealthLink</Text>
          </View>
          <Text style={styles.topHeaderTitle}>Live Queue</Text>
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => void loadDetail("refresh")}
            accessibilityLabel="Refresh queue details"
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back to queues"
          >
            <Ionicons name="arrow-back-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
        <FlatList
        data={sectionData}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={RECEPTION_THEME.primary}
            onRefresh={() => void loadDetail("refresh")}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {notice ? (
              <SurfaceCard style={styles.noticeCard}>
                <Text style={styles.noticeText}>{notice}</Text>
              </SurfaceCard>
            ) : null}

            {loading ? (
              <LoadingState label="Loading queue details..." />
            ) : error ? (
              <ErrorState
                title="Queue details unavailable"
                message={error}
                onRetry={() => void loadDetail("refresh")}
              />
            ) : queue ? (
              <>
                <SurfaceCard style={styles.sessionStripCard}>
                  <View style={styles.sessionStripHeader}>
                    <View style={styles.sessionAvatar}>
                      <Text style={styles.sessionAvatarText}>
                        {(queue.doctorName || route.params?.doctorName || "Q")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((item) => item[0]?.toUpperCase())
                          .join("")}
                      </Text>
                    </View>
                    <View style={styles.sessionStripCopy}>
                      <Text style={styles.sessionDoctor}>
                        {queue.doctorName || route.params?.doctorName || "Queue"}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {queue.specialty} • {queue.startTime} - {queue.endTime}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {detail?.clinic.name || "Clinic"}
                      </Text>
                    </View>
                    <StatusBadge label={queue.queueStatus} tone={statusToneMap[queue.queueStatus]} />
                  </View>
                </SurfaceCard>

                <SurfaceCard style={styles.heroCard}>
                  <View style={styles.heroHeader}>
                    <View style={styles.heroCopy}>
                      <Text style={styles.heroTitle}>Current Queue Status</Text>
                      <Text style={styles.heroMeta}>
                        {queue.startTime} - {queue.endTime}
                      </Text>
                    </View>
                    <StatusBadge label={queue.queueStatus} tone={statusToneMap[queue.queueStatus]} />
                  </View>

                  <View style={styles.metricsRow}>
                    <MetricCard label="Now Serving" value={queue.currentToken ? `#${queue.currentToken}` : "--"} />
                    <MetricCard label="Next Token" value={queue.nextToken ? `#${queue.nextToken}` : "--"} />
                    <MetricCard label="Waiting" value={String(queue.waitingCount)} />
                    <MetricCard label="With Doctor" value={String(queue.withDoctorCount)} />
                    <MetricCard label="Walk-ins" value={String(walkInPatients.length)} />
                  </View>
                </SurfaceCard>

                <View style={styles.actionsLauncherWrap}>
                  <TouchableOpacity
                    style={styles.actionsLauncher}
                    onPress={() => setActionsVisible(true)}
                    accessibilityLabel="Open queue actions"
                  >
                    <Ionicons name="flash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionsLauncherText}>Queue Actions</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={18} color={RECEPTION_THEME.textSecondary} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search patient or queue number"
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                  />
                </View>

                <FlatList
                  horizontal
                  data={SECTION_TABS}
                  keyExtractor={(item) => item.key}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryTabs}
                  renderItem={({ item }) => {
                    const selected = activeSection === item.key;
                    return (
                      <TouchableOpacity
                        style={[styles.categoryTab, selected && styles.categoryTabActive]}
                        onPress={() => setActiveSection(item.key)}
                      >
                        <Text style={[styles.categoryTabText, selected && styles.categoryTabTextActive]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.categoryCount, selected && styles.categoryCountActive]}>
                          {sectionCounts[item.key]}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              <StatusBadge label={`${item.items.length}`} tone="info" />
            </View>
            {item.items.length === 0 ? (
              <SurfaceCard style={styles.emptySectionCard}>
                <Text style={styles.emptySectionText}>{item.empty}</Text>
              </SurfaceCard>
            ) : (
              item.items.map((patient) => (
                <SurfaceCard key={`${item.key}:${patient.id}`} style={styles.patientCard}>
                  <View style={styles.patientCardAccent} />
                  <View style={styles.patientTopRow}>
                    <View style={styles.queueMiniChip}>
                      <Text style={styles.queueMiniLabel}>#{patient.tokenNumber}</Text>
                    </View>
                    <View style={styles.patientCopy}>
                      <Text style={styles.patientName} numberOfLines={1}>
                        {patient.patientName}
                      </Text>
                      <View style={styles.patientPillsRow}>
                        <View
                          style={[
                            styles.sourcePill,
                            isWalkInPatient(patient) ? styles.sourcePillWalkIn : styles.sourcePillBooked,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sourcePillText,
                              isWalkInPatient(patient) ? styles.sourcePillWalkInText : styles.sourcePillBookedText,
                            ]}
                          >
                            {isWalkInPatient(patient) ? "Walk-in" : "Booked"}
                          </Text>
                        </View>
                        <StatusBadge
                          label={patient.status.replace("_", " ")}
                          tone={
                            patient.status === "MISSED"
                              ? "danger"
                              : patient.status === "COMPLETED"
                                ? "success"
                                : "info"
                          }
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.patientMetaRow}>
                    <View style={styles.patientMetaItem}>
                      <Ionicons name="call-outline" size={14} color={RECEPTION_THEME.textSecondary} />
                      <Text style={styles.patientMetaText}>{patient.phone || "No phone"}</Text>
                    </View>
                    {patient.bookingTime ? (
                      <View style={styles.patientMetaItem}>
                        <Ionicons name="time-outline" size={14} color={RECEPTION_THEME.textSecondary} />
                        <Text style={styles.patientMetaText}>{patient.bookingTime}</Text>
                      </View>
                    ) : null}
                  </View>
                </SurfaceCard>
              ))
            )}
          </View>
        )}
      />
      <Modal
        visible={actionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionsVisible(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setActionsVisible(false)}
          />
          <View style={styles.actionsSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.actionsSheetTitle}>Queue Actions</Text>
            <Text style={styles.actionsSheetSubtitle}>
              Manage the live queue without cluttering the main screen.
            </Text>

            {(queue?.queueStatus === "WAITING" || queue?.queueStatus === "IDLE") ? (
              <ActionMenuButton
                label="Start Queue"
                onPress={() => {
                  setActionsVisible(false);
                  void runAction("start");
                }}
                busy={busyKey === `start:${queue?.queueId ?? queue?.sessionId}`}
                icon="play-outline"
              />
            ) : null}

            {queue?.queueStatus === "PAUSED" ? (
              <ActionMenuButton
                label="Resume Queue"
                onPress={() => {
                  setActionsVisible(false);
                  void runAction("resume");
                }}
                busy={busyKey === `resume:${queue?.queueId ?? queue?.sessionId}`}
                icon="play-forward-outline"
              />
            ) : null}

            {queue?.queueStatus === "LIVE" ? (
              <>
                <ActionMenuButton
                  label="Call Next"
                  onPress={() => {
                    setActionsVisible(false);
                    void runAction("next");
                  }}
                  busy={busyKey === `next:${queue?.queueId ?? queue?.sessionId}`}
                  disabled={!queue.currentToken && !queue.nextToken}
                  icon="play-skip-forward-outline"
                />
                <ActionMenuButton
                  label="Complete Current"
                  onPress={() => {
                    setActionsVisible(false);
                    void runAction("complete");
                  }}
                  busy={busyKey === `complete:${queue?.queueId ?? queue?.sessionId}`}
                  disabled={!queue.currentToken}
                  icon="checkmark-done-outline"
                  tone="secondary"
                />
                <ActionMenuButton
                  label="Mark Missed"
                  onPress={() => {
                    setActionsVisible(false);
                    void runAction("miss");
                  }}
                  busy={busyKey === `miss:${queue?.queueId ?? queue?.sessionId}`}
                  disabled={!queue.currentToken}
                  icon="alert-circle-outline"
                  tone="secondary"
                />
                <ActionMenuButton
                  label="Pause Queue"
                  onPress={() => {
                    setActionsVisible(false);
                    void runAction("pause");
                  }}
                  busy={busyKey === `pause:${queue?.queueId ?? queue?.sessionId}`}
                  icon="pause-outline"
                  tone="secondary"
                />
                <ActionMenuButton
                  label="End Queue"
                  onPress={() => {
                    setActionsVisible(false);
                    void runAction("end");
                  }}
                  busy={busyKey === `end:${queue?.queueId ?? queue?.sessionId}`}
                  icon="stop-outline"
                  tone="danger"
                />
              </>
            ) : null}

            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setActionsVisible(false)}
            >
              <Text style={styles.sheetCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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

function MiniAction({
  label,
  onPress,
  busy = false,
  disabled = false,
  tone = "secondary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "secondary" | "danger";
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      disabled={busy || disabled}
      style={[
        styles.miniAction,
        tone === "danger" ? styles.miniActionDanger : styles.miniActionSecondary,
        (busy || disabled) && styles.miniActionBusy,
      ]}
    >
      <Text style={[styles.miniActionText, tone === "danger" && styles.miniActionTextDanger]}>
        {busy ? "Working..." : label}
      </Text>
    </TouchableOpacity>
  );
}

function ActionMenuButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  tone = "primary",
  icon,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const isDanger = tone === "danger";
  const isSecondary = tone === "secondary";
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.actionMenuButton,
        isSecondary && styles.actionMenuButtonSecondary,
        isDanger && styles.actionMenuButtonDanger,
        (busy || disabled) && styles.actionMenuButtonDisabled,
      ]}
      onPress={onPress}
      disabled={busy || disabled}
    >
      <View style={styles.actionMenuButtonLeft}>
        <View
          style={[
            styles.actionMenuIconWrap,
            isSecondary && styles.actionMenuIconWrapSecondary,
            isDanger && styles.actionMenuIconWrapDanger,
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={isDanger ? RECEPTION_THEME.danger : isSecondary ? RECEPTION_THEME.primary : "#FFFFFF"}
          />
        </View>
        <Text
          style={[
            styles.actionMenuButtonText,
            isSecondary && styles.actionMenuButtonTextSecondary,
            isDanger && styles.actionMenuButtonTextDanger,
          ]}
        >
          {busy ? "Working..." : label}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDanger ? RECEPTION_THEME.danger : isSecondary ? RECEPTION_THEME.primary : "#FFFFFF"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  topSafeArea: {
    backgroundColor: RECEPTION_THEME.navy,
  },
  topHeader: {
    backgroundColor: RECEPTION_THEME.navy,
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
    color: RECEPTION_THEME.aqua,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  topHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 18,
    paddingBottom: 48,
  },
  noticeCard: {
    marginBottom: 16,
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  noticeText: {
    color: RECEPTION_THEME.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: {
    marginBottom: 16,
  },
  sessionStripCard: {
    marginBottom: 16,
  },
  sessionStripHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: RECEPTION_THEME.lightAqua,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sessionAvatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: RECEPTION_THEME.primary,
  },
  sessionStripCopy: {
    flex: 1,
    paddingRight: 10,
  },
  sessionDoctor: {
    fontSize: 22,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  sessionMeta: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: RECEPTION_THEME.textSecondary,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  heroMeta: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  metricCard: {
    minWidth: "22%",
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricValue: {
    color: RECEPTION_THEME.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    marginTop: 3,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
  },
  actionsLauncherWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  actionsLauncher: {
    minWidth: 190,
    height: 50,
    borderRadius: 18,
    backgroundColor: RECEPTION_THEME.navy,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: RECEPTION_THEME.navy,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  actionsLauncherText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  searchBar: {
    marginBottom: 14,
    height: 52,
    borderRadius: 22,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  categoryTabs: {
    paddingBottom: 6,
    marginBottom: 2,
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    marginRight: 10,
    gap: 8,
  },
  categoryTabActive: {
    backgroundColor: RECEPTION_THEME.navy,
    borderColor: RECEPTION_THEME.navy,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
  categoryCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: RECEPTION_THEME.infoSurface,
    textAlign: "center",
    lineHeight: 20,
    fontSize: 11,
    fontWeight: "800",
    color: RECEPTION_THEME.primary,
  },
  categoryCountActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
    color: "#FFFFFF",
  },
  miniAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  miniActionSecondary: {
    backgroundColor: RECEPTION_THEME.surface,
    borderColor: RECEPTION_THEME.border,
  },
  miniActionDanger: {
    backgroundColor: RECEPTION_THEME.dangerSurface,
    borderColor: "#F3B1B1",
  },
  miniActionBusy: {
    opacity: 0.64,
  },
  miniActionText: {
    color: RECEPTION_THEME.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  miniActionTextDanger: {
    color: RECEPTION_THEME.danger,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 26, 46, 0.36)",
  },
  actionsSheet: {
    backgroundColor: RECEPTION_THEME.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
  },
  sheetHandle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D7E3F0",
    alignSelf: "center",
    marginBottom: 14,
  },
  actionsSheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  actionsSheetSubtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: RECEPTION_THEME.textSecondary,
  },
  actionMenuButton: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: RECEPTION_THEME.navy,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionMenuButtonSecondary: {
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
  },
  actionMenuButtonDanger: {
    backgroundColor: RECEPTION_THEME.dangerSurface,
    borderWidth: 1,
    borderColor: "#F3B1B1",
  },
  actionMenuButtonDisabled: {
    opacity: 0.56,
  },
  actionMenuButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionMenuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionMenuIconWrapSecondary: {
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  actionMenuIconWrapDanger: {
    backgroundColor: "#FEE2E2",
  },
  actionMenuButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  actionMenuButtonTextSecondary: {
    color: RECEPTION_THEME.primary,
  },
  actionMenuButtonTextDanger: {
    color: RECEPTION_THEME.danger,
  },
  sheetCloseButton: {
    height: 48,
    borderRadius: 18,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sheetCloseButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  section: {
    marginTop: 18,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  emptySectionCard: {
    paddingVertical: 16,
  },
  emptySectionText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
  },
  patientCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "rgba(6, 26, 46, 0.08)",
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  patientCardAccent: {
    position: "absolute",
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: RECEPTION_THEME.primary,
  },
  patientTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  queueMiniChip: {
    minWidth: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: RECEPTION_THEME.infoSurface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  queueMiniLabel: {
    color: RECEPTION_THEME.navy,
    fontSize: 20,
    fontWeight: "800",
  },
  tokenBadge: {
    minWidth: 74,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: RECEPTION_THEME.infoSurface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
  },
  tokenHash: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tokenText: {
    color: RECEPTION_THEME.navy,
    fontSize: 22,
    fontWeight: "800",
  },
  patientCopy: {
    flex: 1,
    minWidth: 0,
  },
  patientName: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    flexShrink: 1,
  },
  patientPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  sourcePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sourcePillBooked: {
    backgroundColor: RECEPTION_THEME.infoSurface,
    borderColor: RECEPTION_THEME.border,
  },
  sourcePillWalkIn: {
    backgroundColor: RECEPTION_THEME.warningSurface,
    borderColor: "#FDE68A",
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  sourcePillBookedText: {
    color: RECEPTION_THEME.primary,
  },
  sourcePillWalkInText: {
    color: "#B45309",
  },
  patientMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EAF2F9",
  },
  patientMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  patientMetaText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});
