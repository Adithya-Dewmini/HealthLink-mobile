import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  fetchReceptionQueue,
  registerReceptionPatient,
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

type QueueSessionOption = {
  queueId: number | null;
  sessionId: number;
  doctorName: string;
  specialty: string;
  startTime: string;
  endTime: string;
  queueStatus: "LIVE" | "PAUSED";
  waitingCount: number;
};

const normalizeQueueSession = (input: any): QueueSessionOption | null => {
  const sessionId = Number(input?.sessionId ?? input?.session_id ?? 0);
  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return null;
  }

  const queueStatus = String(input?.queueStatus || input?.queue_status || "").toUpperCase();
  if (queueStatus !== "LIVE" && queueStatus !== "PAUSED") {
    return null;
  }

  return {
    queueId: input?.queueId || input?.queue_id ? Number(input?.queueId ?? input?.queue_id) : null,
    sessionId,
    doctorName: String(input?.doctorName || input?.doctor_name || "Doctor"),
    specialty: String(input?.specialty || "General Physician"),
    startTime: String(input?.startTime || input?.start_time || "").slice(0, 5),
    endTime: String(input?.endTime || input?.end_time || "").slice(0, 5),
    queueStatus,
    waitingCount: Number(input?.waitingCount ?? input?.waiting_count ?? 0),
  };
};

export default function WalkInRegistration() {
  const hasAccess = useReceptionPermissionGuard("registration", "check_in");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addToQueue, setAddToQueue] = useState(true);
  const [queueSessions, setQueueSessions] = useState<QueueSessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setSessionError(null);
    try {
      const queueDashboard = await fetchReceptionQueue();
      const liveQueues = Array.isArray((queueDashboard as any)?.liveQueues)
        ? (queueDashboard as any).liveQueues
        : [];
      const pausedQueues = Array.isArray((queueDashboard as any)?.upcomingQueues)
        ? (queueDashboard as any).upcomingQueues.filter(
            (item: any) => String(item?.queueStatus || item?.queue_status || "").toUpperCase() === "PAUSED"
          )
        : [];

      const nextQueueSessions = [...liveQueues, ...pausedQueues]
        .map(normalizeQueueSession)
        .filter((item): item is QueueSessionOption => Boolean(item));

      setQueueSessions(nextQueueSessions);
      setSelectedSessionId((current) => {
        if (current && nextQueueSessions.some((item) => item.sessionId === current)) {
          return current;
        }
        return nextQueueSessions[0]?.sessionId ?? null;
      });
      if (nextQueueSessions.length === 0) {
        setAddToQueue(false);
      }
    } catch (error) {
      setQueueSessions([]);
      setSelectedSessionId(null);
      setAddToQueue(false);
      setSessionError(error instanceof Error ? error.message : "Failed to load current session");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSession();
    }, [loadSession])
  );

  const selectedSession = useMemo(
    () => queueSessions.find((item) => item.sessionId === selectedSessionId) ?? null,
    [queueSessions, selectedSessionId]
  );

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setNotice("Patient name is required.");
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const result = await registerReceptionPatient({
        name: name.trim(),
        phone: phone.trim() || undefined,
        sessionId: selectedSessionId,
        addToQueue: addToQueue && Boolean(selectedSessionId),
      });

      if ((result as any).queue) {
        setNotice(
          selectedSession
            ? `Patient saved and added to ${selectedSession.doctorName}'s ${selectedSession.queueStatus.toLowerCase()} queue.`
            : "Patient saved and added to the live queue."
        );
      } else {
        setNotice("Patient profile created and saved successfully.");
      }
      setName("");
      setPhone("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to register patient.");
    } finally {
      setSubmitting(false);
    }
  }, [addToQueue, name, phone, selectedSession, selectedSessionId]);

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Patient check-in has not been assigned to your account." />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ReceptionistHeader
          eyebrow="Check-in"
          title="Register Walk-in Patient"
          subtitle="Create the patient first, then optionally attach them to a live or paused queue session."
          right={
            <TouchableOpacity style={styles.refreshButton} onPress={() => void loadSession()}>
              <Ionicons name="refresh-outline" size={18} color={RECEPTION_THEME.primary} />
            </TouchableOpacity>
          }
        />

        {loadingSession ? (
          <LoadingState label="Loading current session..." />
        ) : sessionError ? (
          <ErrorState title="Session unavailable" message={sessionError} onRetry={() => void loadSession()} />
        ) : null}

        {notice ? (
          <SurfaceCard style={styles.noticeCard}>
            <Text style={styles.noticeText}>{notice}</Text>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <Text style={styles.inputLabel}>Patient Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={RECEPTION_THEME.primary} />
            <TextInput
              style={styles.input}
              placeholder="Enter patient name"
              placeholderTextColor={RECEPTION_THEME.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color={RECEPTION_THEME.primary} />
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor={RECEPTION_THEME.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </SurfaceCard>

        <ReceptionistButton
          label="Register Patient"
          icon="checkmark-circle-outline"
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={submitting}
        />

        <SurfaceCard style={styles.queueSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Add directly to queue</Text>
              <Text style={styles.toggleSubtitle}>
                {selectedSession
                  ? "When enabled, the saved patient is also inserted into the selected queue session."
                  : "No live or paused queue is available right now. The patient will be saved only."}
              </Text>
            </View>
            <Switch
              value={addToQueue && Boolean(selectedSession)}
              disabled={!selectedSession}
              onValueChange={setAddToQueue}
              trackColor={{ false: "#D7DEE8", true: "#BFEAF5" }}
              thumbColor={addToQueue && selectedSession ? RECEPTION_THEME.primary : "#FFFFFF"}
            />
          </View>

          <View style={styles.queueSectionHeader}>
            <Text style={styles.queueSectionTitle}>Queue Sessions</Text>
            {selectedSession ? (
              <StatusBadge
                label={selectedSession.queueStatus === "PAUSED" ? "Paused" : "Live"}
                tone={selectedSession.queueStatus === "PAUSED" ? "neutral" : "warning"}
              />
            ) : null}
          </View>

          {queueSessions.length === 0 ? (
            <View style={styles.sessionEmptyState}>
              <Text style={styles.sessionEmptyTitle}>No queue session available</Text>
              <Text style={styles.sessionEmptyMessage}>
                Start a queue first if you want to register and send the patient directly to a doctor queue.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionScrollContent}
            >
              {queueSessions.map((session) => {
                const isSelected = session.sessionId === selectedSessionId;
                return (
                  <TouchableOpacity
                    key={session.sessionId}
                    activeOpacity={0.9}
                    style={[styles.sessionCard, isSelected && styles.sessionCardActive]}
                    onPress={() => setSelectedSessionId(session.sessionId)}
                  >
                    <View style={styles.sessionCardTop}>
                      <Text style={[styles.sessionDoctorName, isSelected && styles.sessionDoctorNameActive]}>
                        {session.doctorName}
                      </Text>
                      <StatusBadge
                        label={session.queueStatus === "PAUSED" ? "Paused" : "Live"}
                        tone={session.queueStatus === "PAUSED" ? "neutral" : "warning"}
                      />
                    </View>
                    <Text style={[styles.sessionSpecialty, isSelected && styles.sessionSpecialtyActive]}>
                      {session.specialty}
                    </Text>
                    <Text style={[styles.sessionTime, isSelected && styles.sessionTimeActive]}>
                      {session.startTime} - {session.endTime}
                    </Text>
                    <Text style={[styles.sessionMeta, isSelected && styles.sessionMetaActive]}>
                      {session.waitingCount} waiting
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
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
  noticeCard: {
    marginBottom: 14,
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  noticeText: {
    color: RECEPTION_THEME.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  inputLabel: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputWrap: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: RECEPTION_THEME.textPrimary,
  },
  queueSection: {
    marginTop: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  toggleSubtitle: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  queueSectionHeader: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  queueSectionTitle: {
    color: RECEPTION_THEME.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sessionEmptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    padding: 16,
  },
  sessionEmptyTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  sessionEmptyMessage: {
    marginTop: 6,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  sessionScrollContent: {
    paddingRight: 6,
    gap: 12,
  },
  sessionCard: {
    width: 236,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    padding: 14,
  },
  sessionCardActive: {
    borderColor: RECEPTION_THEME.primary,
    backgroundColor: "#EEF9FF",
  },
  sessionCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sessionDoctorName: {
    flex: 1,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  sessionDoctorNameActive: {
    color: RECEPTION_THEME.navy,
  },
  sessionSpecialty: {
    marginTop: 6,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  sessionSpecialtyActive: {
    color: RECEPTION_THEME.navy,
  },
  sessionTime: {
    marginTop: 10,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  sessionTimeActive: {
    color: RECEPTION_THEME.navy,
  },
  sessionMeta: {
    marginTop: 8,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  sessionMetaActive: {
    color: RECEPTION_THEME.primary,
  },
});
