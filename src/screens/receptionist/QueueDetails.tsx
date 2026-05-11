import React, { useCallback, useState } from "react";
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
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
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
import {
  ErrorState,
  LoadingState,
  RECEPTION_THEME,
  ReceptionistButton,
  ReceptionistHeader,
  StatusBadge,
  SurfaceCard,
} from "../../components/receptionist/PanelUI";

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

const statusToneMap: Record<QueueStatus | "IDLE", "info" | "warning" | "success" | "neutral"> = {
  LIVE: "info",
  WAITING: "warning",
  IDLE: "warning",
  PAUSED: "neutral",
  COMPLETED: "success",
};

export default function ReceptionistQueueDetails() {
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<ReceptionistStackParamList, "ReceptionistQueueDetails">>();
  const hasAccess = useReceptionPermissionGuard("queue", "queue_access");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueueDetailPayload | null>(null);

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
      setError(loadError instanceof Error ? loadError.message : "Failed to load queue details");
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
    [busyKey, detail?.queue, loadDetail]
  );

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Queue management has not been assigned to your account." />
    );
  }

  const queue = detail?.queue;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />
      <FlatList
        data={
          detail
            ? [
                { key: "waiting", title: "Waiting List", items: detail.waitingPatients, empty: "No patients waiting." },
                {
                  key: "withDoctor",
                  title: "With Doctor",
                  items: detail.withDoctorPatients,
                  empty: "No patient is currently with the doctor.",
                },
                {
                  key: "completed",
                  title: "Completed",
                  items: detail.completedPatients,
                  empty: "No completed patients yet.",
                },
                {
                  key: "missed",
                  title: "Missed",
                  items: detail.missedPatients,
                  empty: "No missed patients.",
                },
              ]
            : []
        }
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
            <ReceptionistHeader
              eyebrow="Queue Details"
              title={queue?.doctorName || route.params?.doctorName || "Queue"}
              subtitle={
                queue
                  ? `${detail?.clinic.name || "Clinic"} • ${queue.specialty} • ${queue.startTime} - ${queue.endTime}`
                  : "Clinic queue details"
              }
              right={
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="close" size={20} color={RECEPTION_THEME.navy} />
                </TouchableOpacity>
              }
            />

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
                  </View>
                </SurfaceCard>

                <View style={styles.actionRow}>
                  {queue.queueStatus === "WAITING" || queue.queueStatus === "IDLE" ? (
                    <ReceptionistButton
                      label="Start Queue"
                      onPress={() => void runAction("start")}
                      loading={busyKey === `start:${queue.queueId ?? queue.sessionId}`}
                    />
                  ) : null}
                  {queue.queueStatus === "PAUSED" ? (
                    <ReceptionistButton
                      label="Resume Queue"
                      onPress={() => void runAction("resume")}
                      loading={busyKey === `resume:${queue.queueId ?? queue.sessionId}`}
                    />
                  ) : null}
                  {queue.queueStatus === "LIVE" ? (
                    <>
                      <ReceptionistButton
                        label="Call Next"
                        onPress={() => void runAction("next")}
                        loading={busyKey === `next:${queue.queueId ?? queue.sessionId}`}
                        disabled={!queue.currentToken && !queue.nextToken}
                      />
                      <ReceptionistButton
                        label="Complete Current"
                        tone="secondary"
                        onPress={() => void runAction("complete")}
                        loading={busyKey === `complete:${queue.queueId ?? queue.sessionId}`}
                        disabled={!queue.currentToken}
                      />
                    </>
                  ) : null}
                </View>

                {queue.queueStatus === "LIVE" ? (
                  <View style={styles.secondaryActionRow}>
                    <MiniAction
                      label="Mark Missed"
                      onPress={() => void runAction("miss")}
                      busy={busyKey === `miss:${queue.queueId ?? queue.sessionId}`}
                      disabled={!queue.currentToken}
                    />
                    <MiniAction
                      label="Pause Queue"
                      onPress={() => void runAction("pause")}
                      busy={busyKey === `pause:${queue.queueId ?? queue.sessionId}`}
                    />
                    <MiniAction
                      label="End Queue"
                      tone="danger"
                      onPress={() => void runAction("end")}
                      busy={busyKey === `end:${queue.queueId ?? queue.sessionId}`}
                    />
                  </View>
                ) : null}
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
                  <View style={styles.patientLeft}>
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenText}>#{patient.tokenNumber}</Text>
                    </View>
                    <View style={styles.patientCopy}>
                      <Text style={styles.patientName}>{patient.patientName}</Text>
                      <Text style={styles.patientMeta}>
                        {patient.phone || "No phone"}
                        {patient.bookingTime ? ` • ${patient.bookingTime}` : ""}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge label={patient.status.replace("_", " ")} tone={patient.status === "MISSED" ? "danger" : patient.status === "COMPLETED" ? "success" : "info"} />
                </SurfaceCard>
              ))
            )}
          </View>
        )}
      />
    </SafeAreaView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  content: {
    padding: 18,
    paddingBottom: 48,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    alignItems: "center",
    justifyContent: "center",
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
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  secondaryActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  patientLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  tokenBadge: {
    minWidth: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: RECEPTION_THEME.infoSurface,
    alignItems: "center",
  },
  tokenText: {
    color: RECEPTION_THEME.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  patientCopy: {
    flex: 1,
  },
  patientName: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  patientMeta: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
  },
});
