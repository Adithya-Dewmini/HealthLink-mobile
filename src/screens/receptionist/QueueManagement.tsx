import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { useAuth } from "../../utils/AuthContext";
import {
  fetchReceptionQueue,
  queueCompletePatient,
  queueMissPatient,
  queueNextPatient,
} from "../../services/receptionService";

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  success: "#2BB673",
  warning: "#F59E0B",
  danger: "#EF4444",
};

type QueuePayload = {
  session: {
    id: number;
    doctorName: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null;
  currentPatient: QueuePatient | null;
  nextPatient: QueuePatient | null;
  patients: QueuePatient[];
  waitingCount: number;
  averageWaitMinutes: number;
};

type QueuePatient = {
  id: number;
  patient_id: number;
  token_number: number;
  status: string;
  patient_name: string;
  phone?: string | null;
  booking_time?: string | null;
};

export default function QueueManagement() {
  useReceptionPermissionGuard("queue", "can_manage_queue");
  const { receptionistPermissions } = useAuth();
  const canManageQueue = receptionistPermissions.can_manage_queue;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<"next" | "complete" | "miss" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueuePayload | null>(null);

  const loadQueue = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = (await fetchReceptionQueue()) as QueuePayload;
      setQueue(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadQueue("initial");
    }, [loadQueue])
  );

  const runAction = useCallback(
    async (type: "next" | "complete" | "miss") => {
      const sessionId = queue?.session?.id;
      if (!sessionId || busyAction) {
        return;
      }

      setBusyAction(type);
      try {
        if (type === "next") {
          await queueNextPatient(sessionId);
        } else if (type === "complete") {
          await queueCompletePatient(sessionId);
        } else {
          await queueMissPatient(sessionId);
        }

        await loadQueue("refresh");
      } catch (actionError) {
        Alert.alert("Queue Action Failed", actionError instanceof Error ? actionError.message : "Unable to update queue");
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction, loadQueue, queue?.session?.id]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Queue Management</Text>
          <Text style={styles.subtitle}>
            {queue?.session ? `${queue.session.doctorName} • ${queue.session.startTime}-${queue.session.endTime}` : "No active clinic session"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerButton, !canManageQueue && styles.disabledButton]}
          onPress={() => void loadQueue("refresh")}
          disabled={!canManageQueue}
        >
          <Ionicons name="refresh-outline" size={20} color={THEME.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Queue unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {!canManageQueue ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Queue access removed</Text>
              <Text style={styles.infoText}>
                You can view the current queue, but queue actions are now disabled.
              </Text>
            </View>
          ) : null}
          <FlatList
            data={queue?.patients || []}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadQueue("refresh")} />}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.heroCard}>
                <Text style={styles.heroTitle}>{queue?.session?.doctorName || "No queue active"}</Text>
                <Text style={styles.heroMeta}>Waiting {queue?.waitingCount ?? 0} patients</Text>
                <Text style={styles.heroMeta}>Average wait {queue?.averageWaitMinutes ?? 0} minutes</Text>
                <Text style={styles.heroCurrent}>
                  Current: {queue?.currentPatient?.patient_name || "No patient with doctor"}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={56} color={THEME.border} />
                <Text style={styles.emptyTitle}>No queue entries yet</Text>
                <Text style={styles.emptyText}>Patients added to the active session queue will appear here.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const tone =
                item.status === "WITH_DOCTOR"
                  ? { bg: "#E3F2FD", color: THEME.primary, label: "With Doctor" }
                  : item.status === "COMPLETED"
                    ? { bg: "#E8F8EF", color: THEME.success, label: "Completed" }
                    : item.status === "MISSED"
                      ? { bg: "#FEF2F2", color: THEME.danger, label: "Missed" }
                      : { bg: "#FEF7E6", color: THEME.warning, label: "Waiting" };

              return (
                <View style={styles.patientCard}>
                  <View style={styles.tokenWrap}>
                    <Text style={styles.tokenText}>#{item.token_number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{item.patient_name}</Text>
                    <Text style={styles.patientMeta}>
                      {item.phone || "No phone"}{item.booking_time ? ` • ${item.booking_time}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.color }]}>{tone.label}</Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.secondaryFooterButton, !queue?.session && styles.disabledButton]}
              disabled={!canManageQueue || !queue?.session || busyAction !== null}
              onPress={() => void runAction("miss")}
            >
              {busyAction === "miss" ? <ActivityIndicator color={THEME.danger} /> : <Text style={styles.secondaryFooterText}>Miss</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.secondaryFooterButton, !queue?.session && styles.disabledButton]}
              disabled={!canManageQueue || !queue?.session || busyAction !== null}
              onPress={() => void runAction("complete")}
            >
              {busyAction === "complete" ? <ActivityIndicator color={THEME.success} /> : <Text style={[styles.secondaryFooterText, { color: THEME.success }]}>Complete</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.primaryFooterButton, !queue?.session && styles.disabledButton]}
              disabled={!canManageQueue || !queue?.session || busyAction !== null}
              onPress={() => void runAction("next")}
            >
              {busyAction === "next" ? <ActivityIndicator color={THEME.white} /> : <Text style={styles.primaryFooterText}>Call Next</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, backgroundColor: THEME.white, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  title: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorCard: { margin: 16, backgroundColor: "#FEF2F2", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#B91C1C" },
  errorText: { marginTop: 8, fontSize: 13, color: "#991B1B" },
  listContent: { padding: 16, paddingBottom: 120 },
  infoCard: { backgroundColor: "#FFF7ED", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#FED7AA", marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: "800", color: "#9A3412" },
  infoText: { marginTop: 6, fontSize: 13, color: "#9A3412", lineHeight: 19 },
  heroCard: { backgroundColor: THEME.white, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: THEME.border },
  heroTitle: { fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  heroMeta: { marginTop: 6, fontSize: 14, color: THEME.textSecondary },
  heroCurrent: { marginTop: 12, fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  emptyState: { paddingTop: 80, alignItems: "center", paddingHorizontal: 24 },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  emptyText: { marginTop: 8, textAlign: "center", fontSize: 14, color: THEME.textSecondary, lineHeight: 20 },
  patientCard: { backgroundColor: THEME.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  tokenWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#E3F2FD", alignItems: "center", justifyContent: "center" },
  tokenText: { fontSize: 20, fontWeight: "800", color: THEME.primary },
  patientName: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  patientMeta: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: THEME.white, borderTopWidth: 1, borderTopColor: THEME.border, padding: 16, flexDirection: "row", gap: 10 },
  footerButton: { flex: 1, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  secondaryFooterButton: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: THEME.border },
  primaryFooterButton: { backgroundColor: THEME.primary },
  secondaryFooterText: { fontSize: 14, fontWeight: "800", color: THEME.danger },
  primaryFooterText: { fontSize: 14, fontWeight: "800", color: THEME.white },
  disabledButton: { opacity: 0.45 },
});
