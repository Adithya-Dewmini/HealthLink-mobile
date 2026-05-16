import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { useAuth } from "../../utils/AuthContext";
import {
  cancelReceptionVisit,
  checkInReceptionVisit,
  completeReceptionVisit,
  fetchReceptionVisitDetail,
  markReceptionVisitMissed,
  sendReceptionVisitToQueue,
} from "../../services/receptionService";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  ErrorState,
  LoadingState,
  RECEPTION_THEME,
  ReceptionistButton,
  ReceptionistHeader,
  StatusBadge,
  SurfaceCard,
} from "../../components/receptionist/PanelUI";
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

type VisitDetailPayload = {
  visit: {
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
    bookingSource: string;
    queueId?: number | null;
  };
  actionAvailability: {
    canCheckIn: boolean;
    canSendToQueue: boolean;
    canComplete: boolean;
    canMarkMissed: boolean;
    canCancel: boolean;
  };
};

const statusTone = (status: VisitStatus): "info" | "warning" | "success" | "danger" | "neutral" => {
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

export default function VisitDetails() {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const route = useRoute<RouteProp<ReceptionistStackParamList, "ReceptionistVisitDetails">>();
  const hasAccess = useReceptionPermissionGuard("appointments", "appointments");
  const { receptionistPermissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detail, setDetail] = useState<VisitDetailPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadDetail = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    try {
      const data = (await fetchReceptionVisitDetail(route.params.visitId)) as VisitDetailPayload;
      setDetail(data);
      setError(null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load the visit."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.visitId]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail("initial");
    }, [loadDetail])
  );

  useEffect(() => {
    const socket = getSocket();

    const refresh = (payload?: { queueId?: number | string | null; sessionId?: number | string | null }) => {
      const currentVisit = detail?.visit;
      if (!currentVisit) {
        void loadDetail("refresh");
        return;
      }

      const payloadQueueId = payload?.queueId == null ? null : Number(payload.queueId);
      const payloadSessionId = payload?.sessionId == null ? null : Number(payload.sessionId);
      const visitQueueId = currentVisit.queueId == null ? null : Number(currentVisit.queueId);
      const visitSessionId = currentVisit.sessionId == null ? null : Number(currentVisit.sessionId);

      if (
        (payloadQueueId !== null && visitQueueId !== null && payloadQueueId === visitQueueId) ||
        (payloadSessionId !== null && visitSessionId !== null && payloadSessionId === visitSessionId) ||
        (payloadQueueId === null && payloadSessionId === null)
      ) {
        void loadDetail("refresh");
      }
    };

    const handleReconnect = () => {
      void loadDetail("refresh");
    };

    socket.on("queue:update", refresh);
    socket.on("queue:next", refresh);
    socket.on("session:start", refresh);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("queue:next", refresh);
      socket.off("session:start", refresh);
      socket.off("connect", handleReconnect);
    };
  }, [detail?.visit, loadDetail]);

  const runAction = useCallback(
    async (action: "check-in" | "send-to-queue" | "complete" | "missed" | "cancel") => {
      if (!detail?.visit || busy) return;

      const handler =
        action === "check-in"
          ? () => checkInReceptionVisit(detail.visit.bookingId)
          : action === "send-to-queue"
            ? () => sendReceptionVisitToQueue(detail.visit.bookingId)
            : action === "complete"
              ? () => completeReceptionVisit(detail.visit.bookingId)
              : action === "missed"
                ? () => markReceptionVisitMissed(detail.visit.bookingId)
                : () => cancelReceptionVisit(detail.visit.bookingId);

      Alert.alert("Update visit", `Do you want to ${action.split("-").join(" ")}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setBusy(action);
            setNotice(null);
            void handler()
              .then((result) => {
                setNotice(
                  typeof result?.message === "string" ? result.message : "Visit updated."
                );
                return loadDetail("refresh");
              })
              .catch((actionError) => {
                setNotice(getFriendlyError(actionError, "Unable to update visit."));
              })
              .finally(() => {
                setBusy(null);
              });
          },
        },
      ]);
    },
    [busy, detail?.visit, loadDetail]
  );

  if (!hasAccess) {
    return <ReceptionAccessNotAssigned message="You don’t have permission to manage appointments." />;
  }

  const visit = detail?.visit;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={RECEPTION_THEME.primary}
            onRefresh={() => void loadDetail("refresh")}
          />
        }
      >
        <ReceptionistHeader
          eyebrow="Visit Details"
          title={visit?.patientName || "Visit"}
          subtitle="Patient, session, and queue status"
          right={
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={18} color={RECEPTION_THEME.primary} />
            </TouchableOpacity>
          }
        />

        {notice ? (
          <SurfaceCard style={styles.noticeCard}>
            <Text style={styles.noticeText}>{notice}</Text>
          </SurfaceCard>
        ) : null}

        {loading ? (
          <LoadingState label="Loading visit details..." />
        ) : error ? (
          <ErrorState title="Visit unavailable" message={error} onRetry={() => void loadDetail("refresh")} />
        ) : visit && detail ? (
          <>
            <SurfaceCard style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>{visit.doctorName}</Text>
                  <Text style={styles.heroMeta}>
                    {visit.specialty} • {visit.sessionDate} • {visit.startTime} - {visit.endTime}
                  </Text>
                </View>
                <StatusBadge label={statusLabel(visit.visitStatus)} tone={statusTone(visit.visitStatus)} />
              </View>

              <View style={styles.metricsRow}>
                <MetricCard label="Current Token" value={visit.tokenNumber ? `#${visit.tokenNumber}` : "--"} />
                <MetricCard label="Appointment" value={visit.appointmentTime} />
                <MetricCard label="Queue" value={visit.queueId ? "Linked" : "Not Linked"} />
                <MetricCard label="Source" value={visit.bookingSource} />
              </View>
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Patient</Text>
              <Text style={styles.bodyLine}>{visit.patientName}</Text>
              <Text style={styles.bodyLineMuted}>{visit.patientPhone || "No phone number"}</Text>
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Appointment & Session</Text>
              <Text style={styles.bodyLine}>Clinic: {visit.clinicName}</Text>
              <Text style={styles.bodyLine}>Date: {visit.sessionDate}</Text>
              <Text style={styles.bodyLine}>Time: {visit.appointmentTime}</Text>
              <Text style={styles.bodyLine}>Session: {visit.startTime} - {visit.endTime}</Text>
              <Text style={styles.bodyLineMuted}>Status flow: booked → checked_in → waiting → with_doctor → completed</Text>
            </SurfaceCard>

            <View style={styles.actionsWrap}>
              {detail.actionAvailability.canCheckIn && receptionistPermissions.check_in ? (
                <ReceptionistButton
                  label="Check In"
                  onPress={() => void runAction("check-in")}
                  loading={busy === "check-in"}
                />
              ) : null}
              {detail.actionAvailability.canSendToQueue && receptionistPermissions.queue_access ? (
                <ReceptionistButton
                  label={visit.queueId ? "Open Queue" : "Send to Queue"}
                  onPress={() =>
                    visit.queueId
                      ? navigation.navigate("ReceptionistQueueDetails", {
                          queueId: visit.queueId ?? undefined,
                          sessionId: visit.sessionId ?? undefined,
                          doctorName: visit.doctorName,
                        })
                      : void runAction("send-to-queue")
                  }
                  loading={busy === "send-to-queue"}
                />
              ) : null}
              {detail.actionAvailability.canComplete ? (
                <ReceptionistButton
                  label="Complete Visit"
                  tone="secondary"
                  onPress={() => void runAction("complete")}
                  loading={busy === "complete"}
                />
              ) : null}
              {detail.actionAvailability.canMarkMissed ? (
                <ReceptionistButton
                  label="Mark Missed"
                  tone="danger"
                  onPress={() => void runAction("missed")}
                  loading={busy === "missed"}
                />
              ) : null}
              {detail.actionAvailability.canCancel ? (
                <ReceptionistButton
                  label="Cancel Visit"
                  tone="secondary"
                  onPress={() => void runAction("cancel")}
                  loading={busy === "cancel"}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
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
    marginBottom: 14,
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  noticeText: {
    color: RECEPTION_THEME.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: {
    marginBottom: 14,
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
    marginTop: 5,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  sectionCard: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  bodyLine: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  bodyLineMuted: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  actionsWrap: {
    gap: 10,
  },
});
