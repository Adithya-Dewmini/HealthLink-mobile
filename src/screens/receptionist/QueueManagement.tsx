import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import { useAuth } from "../../utils/AuthContext";
import {
  fetchReceptionQueue,
  queueCompletePatient,
  queueEnd,
  queueMissPatient,
  queueNextPatient,
  queuePause,
  queueResume,
  queueStart,
} from "../../services/receptionService";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RECEPTION_THEME,
  ReceptionistButton,
  ReceptionistHeader,
  StatusBadge,
  SurfaceCard,
} from "../../components/receptionist/PanelUI";

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
  queueStatus: "LIVE" | "WAITING" | "IDLE" | "PAUSED" | "COMPLETED";
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
  liveQueues: QueueCard[];
  upcomingQueues: QueueCard[];
  endedQueues: QueueCard[];
};

type QueueActionKind = "start" | "pause" | "resume" | "end" | "next" | "complete" | "miss";

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

const formatDisplayDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
};

const statusToneMap: Record<QueueCard["queueStatus"], "info" | "warning" | "success" | "neutral"> = {
  LIVE: "info",
  WAITING: "warning",
  IDLE: "warning",
  PAUSED: "neutral",
  COMPLETED: "success",
};

const queueActionLabel = (action: QueueActionKind) =>
  ({
    start: "Start Queue",
    pause: "Pause Queue",
    resume: "Resume Queue",
    end: "End Queue",
    next: "Call Next",
    complete: "Complete Current",
    miss: "Mark Missed",
  })[action];

export default function QueueManagement() {
  const navigation = useNavigation<any>();
  const { receptionistPermissions } = useAuth();
  const hasAccess = useReceptionPermissionGuard("queue", "queue_access");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<QueueDashboard | null>(null);

  const loadQueueDashboard = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = normalizeQueueDashboard((await fetchReceptionQueue()) as Partial<QueueDashboard>);
      setDashboard(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load clinic queues");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadQueueDashboard("initial");
    }, [loadQueueDashboard])
  );

  const sections = useMemo(
    () => [
      {
        key: "live",
        title: "Live Queues",
        description: "Queues currently serving patients across the clinic.",
        items: dashboard?.liveQueues ?? [],
      },
      {
        key: "upcoming",
        title: "Upcoming / Waiting Queues",
        description: "Sessions scheduled for today that are waiting to start or paused.",
        items: dashboard?.upcomingQueues ?? [],
      },
    ],
    [dashboard]
  );

  const confirmQueueAction = useCallback(
    async (action: QueueActionKind, queue: QueueCard) => {
      const actionKey = `${action}:${queue.queueId ?? queue.sessionId}`;
      if (busyKey) {
        return;
      }

      const payload = {
        queueId: queue.queueId,
        sessionId: queue.sessionId,
      };

      const handler =
        action === "start"
          ? () => queueStart(queue.sessionId)
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

      Alert.alert("Queue action", `Do you want to ${queueActionLabel(action).toLowerCase()}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setBusyKey(actionKey);
            setNotice(null);
            void handler()
              .then((result) => {
                setNotice(
                  typeof result?.message === "string" && result.message.trim()
                    ? result.message
                    : `${queueActionLabel(action)} complete.`
                );
                return loadQueueDashboard("refresh");
              })
              .catch((actionError) => {
                setNotice(
                  actionError instanceof Error ? actionError.message : "Unable to update queue."
                );
              })
              .finally(() => {
                setBusyKey(null);
              });
          },
        },
      ]);
    },
    [busyKey, loadQueueDashboard]
  );

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Queue management has not been assigned to your account." />
    );
  }

  const hasQueues =
    (dashboard?.liveQueues?.length ?? 0) > 0 ||
    (dashboard?.upcomingQueues?.length ?? 0) > 0 ||
    (dashboard?.endedQueues?.length ?? 0) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={RECEPTION_THEME.primary}
            onRefresh={() => void loadQueueDashboard("refresh")}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <ReceptionistHeader
              eyebrow="Queue"
              title="Clinic Queues"
              subtitle={
                dashboard
                  ? `${dashboard.clinic.name} • ${formatDisplayDate(dashboard.date)}`
                  : "Today’s live and upcoming clinic queues"
              }
              right={
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => void loadQueueDashboard("refresh")}
                  style={styles.refreshButton}
                >
                  <Ionicons name="refresh" size={18} color={RECEPTION_THEME.primary} />
                </TouchableOpacity>
              }
            />

            {notice ? (
              <SurfaceCard style={styles.noticeCard}>
                <Text style={styles.noticeText}>{notice}</Text>
              </SurfaceCard>
            ) : null}

            {loading ? (
              <LoadingState label="Loading clinic queues..." />
            ) : error ? (
              <ErrorState
                title="Queue dashboard unavailable"
                message={error}
                onRetry={() => void loadQueueDashboard("refresh")}
              />
            ) : (
              <>
                <View style={styles.summaryGrid}>
                  <SummaryCard label="Active Queues" value={String(dashboard?.summary.activeQueues ?? 0)} />
                  <SummaryCard label="Waiting Patients" value={String(dashboard?.summary.waitingPatients ?? 0)} />
                  <SummaryCard label="With Doctor" value={String(dashboard?.summary.withDoctor ?? 0)} />
                  <SummaryCard label="Completed Today" value={String(dashboard?.summary.completedToday ?? 0)} />
                </View>

                {!hasQueues ? (
                  <EmptyState
                    title="No clinic queues for today"
                    message="No clinic sessions scheduled for today."
                    icon="calendar-outline"
                    action={
                      receptionistPermissions.schedule_management ? (
                        <ReceptionistButton
                          label="Go to Sessions"
                          tone="secondary"
                          onPress={() => navigation.navigate("ReceptionistSessions")}
                        />
                      ) : undefined
                    }
                  />
                ) : null}
              </>
            )}
          </>
        }
        renderItem={({ item }) => {
          if (loading || error || item.items.length === 0) {
            return null;
          }

          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionTitle}>{item.title}</Text>
                  <Text style={styles.sectionDescription}>{item.description}</Text>
                </View>
                <StatusBadge
                  label={`${item.items.length}`}
                  tone={item.key === "live" ? "info" : "warning"}
                />
              </View>

              {item.items.map((queue) => (
                <QueueCardView
                  key={`${item.key}:${queue.queueId ?? queue.sessionId}`}
                  queue={queue}
                  busyKey={busyKey}
                  onOpen={() =>
                    navigation.navigate("ReceptionistQueueDetails", {
                      queueId: queue.queueId ?? undefined,
                      sessionId: queue.sessionId,
                      doctorName: queue.doctorName,
                    })
                  }
                  onAction={confirmQueueAction}
                />
              ))}
            </View>
          );
        }}
        ListFooterComponent={
          !loading && !error && (dashboard?.endedQueues?.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => setShowEnded((current) => !current)}
                style={styles.collapsibleHeader}
              >
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionTitle}>Ended / Completed Queues</Text>
                  <Text style={styles.sectionDescription}>
                    Review queues that already finished today.
                  </Text>
                </View>
                <View style={styles.collapsibleRight}>
                  <StatusBadge label={`${dashboard?.endedQueues?.length ?? 0}`} tone="success" />
                  <Ionicons
                    name={showEnded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={RECEPTION_THEME.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {showEnded
                ? dashboard?.endedQueues.map((queue) => (
                    <QueueCardView
                      key={`ended:${queue.queueId ?? queue.sessionId}`}
                      queue={queue}
                      busyKey={busyKey}
                      onOpen={() =>
                        navigation.navigate("ReceptionistQueueDetails", {
                          queueId: queue.queueId ?? undefined,
                          sessionId: queue.sessionId,
                          doctorName: queue.doctorName,
                        })
                      }
                      onAction={confirmQueueAction}
                    />
                  ))
                : null}
            </View>
          ) : (
            <View style={styles.footerSpacer} />
          )
        }
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

function QueueCardView({
  queue,
  busyKey,
  onOpen,
  onAction,
}: {
  queue: QueueCard;
  busyKey: string | null;
  onOpen: () => void;
  onAction: (action: QueueActionKind, queue: QueueCard) => void;
}) {
  const isLive = queue.queueStatus === "LIVE";
  const isWaiting = queue.queueStatus === "WAITING" || queue.queueStatus === "IDLE";
  const isPaused = queue.queueStatus === "PAUSED";
  const isCompleted = queue.queueStatus === "COMPLETED";

  return (
    <SurfaceCard style={styles.queueCard}>
      <View style={styles.queueHeader}>
        <View style={styles.queueHeaderCopy}>
          <Text style={styles.queueDoctor}>{queue.doctorName}</Text>
          <Text style={styles.queueMeta}>
            {queue.specialty} • {queue.startTime} - {queue.endTime}
          </Text>
        </View>
        <StatusBadge label={queue.queueStatus} tone={statusToneMap[queue.queueStatus]} />
      </View>

      <View style={styles.queueStatRow}>
        <InlineMetric label="Now" value={queue.currentToken ? `#${queue.currentToken}` : "--"} />
        <InlineMetric label="Next" value={queue.nextToken ? `#${queue.nextToken}` : "--"} />
        <InlineMetric label="Waiting" value={String(queue.waitingCount)} />
        <InlineMetric label="With Doctor" value={String(queue.withDoctorCount)} />
      </View>

      <View style={styles.queueStatRow}>
        <InlineMetric label="Completed" value={String(queue.completedCount)} />
        <InlineMetric label="Missed" value={String(queue.missedCount)} />
        <InlineMetric label="Avg Wait" value={`${queue.avgWaitMinutes}m`} />
      </View>

      <View style={styles.primaryActionRow}>
        <ReceptionistButton label={isCompleted ? "View Summary" : "Open Queue"} tone="secondary" onPress={onOpen} />
        {isWaiting ? (
          <ReceptionistButton
            label="Start Queue"
            onPress={() => onAction("start", queue)}
            loading={busyKey === `start:${queue.queueId ?? queue.sessionId}`}
          />
        ) : null}
        {isPaused ? (
          <ReceptionistButton
            label="Resume Queue"
            onPress={() => onAction("resume", queue)}
            loading={busyKey === `resume:${queue.queueId ?? queue.sessionId}`}
          />
        ) : null}
      </View>

      {queue.currentPatient || queue.nextPatient ? (
        <View style={styles.patientPreviewRow}>
          {queue.currentPatient ? (
            <View style={styles.patientPreview}>
              <Text style={styles.patientPreviewLabel}>Current Patient</Text>
              <Text style={styles.patientPreviewValue}>
                #{queue.currentPatient.tokenNumber} • {queue.currentPatient.patientName}
              </Text>
            </View>
          ) : null}
          {queue.nextPatient ? (
            <View style={styles.patientPreview}>
              <Text style={styles.patientPreviewLabel}>Next Patient</Text>
              <Text style={styles.patientPreviewValue}>
                #{queue.nextPatient.tokenNumber} • {queue.nextPatient.patientName}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {isLive ? (
        <View style={styles.quickActionsWrap}>
          <ActionPill
            label="Call Next"
            busy={busyKey === `next:${queue.queueId ?? queue.sessionId}`}
            disabled={!queue.currentToken && !queue.nextToken}
            onPress={() => onAction("next", queue)}
          />
          <ActionPill
            label="Complete Current"
            busy={busyKey === `complete:${queue.queueId ?? queue.sessionId}`}
            disabled={!queue.currentToken}
            onPress={() => onAction("complete", queue)}
          />
          <ActionPill
            label="Mark Missed"
            busy={busyKey === `miss:${queue.queueId ?? queue.sessionId}`}
            disabled={!queue.currentToken}
            onPress={() => onAction("miss", queue)}
          />
          <ActionPill
            label="Pause Queue"
            busy={busyKey === `pause:${queue.queueId ?? queue.sessionId}`}
            onPress={() => onAction("pause", queue)}
          />
          <ActionPill
            label="End Queue"
            busy={busyKey === `end:${queue.queueId ?? queue.sessionId}`}
            tone="danger"
            onPress={() => onAction("end", queue)}
          />
        </View>
      ) : null}
    </SurfaceCard>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineMetric}>
      <Text style={styles.inlineMetricValue}>{value}</Text>
      <Text style={styles.inlineMetricLabel}>{label}</Text>
    </View>
  );
}

function ActionPill({
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
      style={[
        styles.actionPill,
        tone === "danger" ? styles.actionPillDanger : styles.actionPillSecondary,
        (busy || disabled) && styles.actionPillBusy,
      ]}
      onPress={onPress}
      disabled={busy || disabled}
    >
      <Text style={[styles.actionPillText, tone === "danger" && styles.actionPillTextDanger]}>
        {busy ? "Working..." : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  content: {
    padding: 18,
    paddingBottom: 132,
  },
  noticeCard: {
    marginBottom: 16,
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 20,
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
    lineHeight: 18,
  },
  section: {
    marginTop: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionDescription: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  queueCard: {
    gap: 14,
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  queueHeaderCopy: {
    flex: 1,
  },
  queueDoctor: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  queueMeta: {
    marginTop: 5,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
  },
  queueStatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  inlineMetric: {
    minWidth: "22%",
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineMetricValue: {
    color: RECEPTION_THEME.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  inlineMetricLabel: {
    marginTop: 3,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
  },
  primaryActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  patientPreviewRow: {
    gap: 10,
  },
  patientPreview: {
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  patientPreviewLabel: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  patientPreviewValue: {
    marginTop: 4,
    color: RECEPTION_THEME.navy,
    fontSize: 14,
    fontWeight: "800",
  },
  quickActionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  actionPillSecondary: {
    backgroundColor: RECEPTION_THEME.surface,
    borderColor: RECEPTION_THEME.border,
  },
  actionPillDanger: {
    backgroundColor: RECEPTION_THEME.dangerSurface,
    borderColor: "#F4B3B3",
  },
  actionPillBusy: {
    opacity: 0.65,
  },
  actionPillText: {
    color: RECEPTION_THEME.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  actionPillTextDanger: {
    color: RECEPTION_THEME.danger,
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 4,
  },
  collapsibleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerSpacer: {
    height: 32,
  },
});
