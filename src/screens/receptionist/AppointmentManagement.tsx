import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { useAuth } from "../../utils/AuthContext";
import { fetchReceptionAppointments, updateReceptionAppointment } from "../../services/receptionService";

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  success: "#2BB673",
  danger: "#EF4444",
  warning: "#F59E0B",
  border: "#E2E8F0",
};

type AppointmentItem = {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  time: string;
  status: string;
};

const FILTERS = ["ALL", "BOOKED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "MISSED"] as const;

export default function AppointmentManagement() {
  useReceptionPermissionGuard("appointments", "can_manage_appointments");
  const { receptionistPermissions } = useAuth();
  const canManageAppointments = receptionistPermissions.can_manage_appointments;
  const navigation = useNavigation<any>();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const loadAppointments = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchReceptionAppointments();
      setAppointments(Array.isArray((data as any).appointments) ? (data as any).appointments : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load appointments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAppointments("initial");
    }, [loadAppointments])
  );

  const filteredAppointments = useMemo(
    () =>
      activeFilter === "ALL"
        ? appointments
        : appointments.filter((item) => String(item.status || "").toUpperCase() === activeFilter),
    [activeFilter, appointments]
  );

  const handleStatusUpdate = useCallback(
    async (appointmentId: number, status: string) => {
      if (busyId) {
        return;
      }

      setBusyId(appointmentId);
      try {
        await updateReceptionAppointment(appointmentId, { status });
        await loadAppointments("refresh");
      } catch (updateError) {
        Alert.alert("Update Failed", updateError instanceof Error ? updateError.message : "Unable to update appointment.");
      } finally {
        setBusyId(null);
      }
    },
    [busyId, loadAppointments]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Appointments</Text>
          <Text style={styles.subtitle}>Manage real clinic bookings</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerButton, !canManageAppointments && styles.disabledButton]}
          onPress={() => navigation.navigate("ReceptionistBookAppointment")}
          disabled={!canManageAppointments}
        >
          <Ionicons name="add" size={24} color={THEME.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadAppointments("refresh")} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {!canManageAppointments ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Appointment access removed</Text>
                <Text style={styles.infoText}>
                  You can review appointments, but appointment actions are now disabled.
                </Text>
              </View>
            ) : null}
            <FlatList
              horizontal
              data={FILTERS as unknown as string[]}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              renderItem={({ item }) => {
                const active = activeFilter === item;
                return (
                  <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setActiveFilter(item as (typeof FILTERS)[number])}>
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item === "ALL" ? "All" : item.replace("_", " ")}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Appointments unavailable</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={56} color={THEME.border} />
              <Text style={styles.emptyTitle}>No appointments found</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const normalizedStatus = String(item.status || "").toUpperCase();
          const tone =
            normalizedStatus === "COMPLETED"
              ? { bg: "#E8F8EF", color: THEME.success }
              : normalizedStatus === "MISSED"
                ? { bg: "#FEF2F2", color: THEME.danger }
                : normalizedStatus === "IN_PROGRESS"
                  ? { bg: "#E3F2FD", color: THEME.primary }
                  : { bg: "#FEF7E6", color: THEME.warning };

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>{item.patient_name || "Patient"}</Text>
                  <Text style={styles.metaText}>{item.doctor_name || "Doctor"}</Text>
                  <Text style={styles.metaText}>{item.date} • {item.time}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusText, { color: tone.color }]}>{normalizedStatus}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <ActionButton
                  label="Confirm"
                  activeColor={THEME.primary}
                  disabled={!canManageAppointments || busyId === item.id || normalizedStatus === "CONFIRMED"}
                  onPress={() => void handleStatusUpdate(item.id, "CONFIRMED")}
                />
                <ActionButton
                  label="Complete"
                  activeColor={THEME.success}
                  disabled={!canManageAppointments || busyId === item.id || normalizedStatus === "COMPLETED"}
                  onPress={() => void handleStatusUpdate(item.id, "COMPLETED")}
                />
                <ActionButton
                  label="Miss"
                  activeColor={THEME.danger}
                  disabled={!canManageAppointments || busyId === item.id || normalizedStatus === "MISSED"}
                  onPress={() => void handleStatusUpdate(item.id, "MISSED")}
                />
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  activeColor,
  disabled,
  onPress,
}: {
  label: string;
  activeColor: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.actionButtonText, { color: activeColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, backgroundColor: THEME.white, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  title: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, paddingBottom: 36 },
  filterRow: { gap: 8, marginBottom: 16 },
  filterChip: { height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  filterChipText: { fontSize: 12, fontWeight: "700", color: THEME.textSecondary },
  filterChipTextActive: { color: THEME.white },
  infoCard: { backgroundColor: "#FFF7ED", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#FED7AA", marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: "800", color: "#9A3412" },
  infoText: { marginTop: 6, fontSize: 13, color: "#9A3412", lineHeight: 19 },
  centerState: { paddingVertical: 72, alignItems: "center" },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#B91C1C" },
  errorText: { marginTop: 8, fontSize: 13, color: "#991B1B" },
  emptyState: { paddingTop: 72, alignItems: "center" },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  card: { backgroundColor: THEME.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  patientName: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  metaText: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  actionButton: { flex: 1, height: 38, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center", backgroundColor: "#FAFCFF" },
  actionButtonDisabled: { opacity: 0.45 },
  actionButtonText: { fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.45 },
});
