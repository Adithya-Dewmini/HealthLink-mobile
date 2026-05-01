import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { fetchReceptionDashboard } from "../../services/receptionService";
import { AuthContext } from "../../utils/AuthContext";

const THEME = {
  primary: "#2196F3",
  success: "#2BB673",
  warning: "#F59E0B",
  danger: "#EF4444",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  softBlue: "#E3F2FD",
  softGreen: "#E8F8EF",
  softWarning: "#FEF7E6",
  softDanger: "#FEF2F2",
};

type DashboardPayload = {
  clinic: { id: string; name: string };
  activeSession: {
    id: number;
    doctorName: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null;
  queue: {
    waitingCount: number;
    currentPatient?: { patient_name?: string | null } | null;
    averageWaitMinutes: number;
  } | null;
  nextPatient: {
    token_number: number;
    patient_name: string;
  } | null;
  stats: {
    totalPatients: number;
    todayAppointments: number;
    missedToday: number;
    inQueue: number;
  };
};

export default function ReceptionDashboard() {
  const navigation = useNavigation<any>();
  const { logout, pendingPermissionUpdate, refreshReceptionPermissions } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  const loadDashboard = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = (await fetchReceptionDashboard()) as DashboardPayload;
      setDashboard(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard("initial");
    }, [loadDashboard])
  );

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Do you want to sign out of the receptionist panel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }, [logout]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard("refresh")} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Reception Panel</Text>
            <Text style={styles.title}>{dashboard?.clinic?.name || "Clinic Dashboard"}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => void loadDashboard("refresh")}>
              <Ionicons name="refresh-outline" size={20} color={THEME.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={THEME.primary} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Dashboard unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {pendingPermissionUpdate ? (
              <View style={styles.permissionCard}>
                <View style={styles.permissionIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={THEME.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permissionTitle}>Your responsibilities have been updated</Text>
                  <Text style={styles.permissionSubtitle}>
                    Review and apply the latest access changes before continuing.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={() => {
                    void refreshReceptionPermissions();
                  }}
                >
                  <Text style={styles.permissionButtonText}>Review Changes</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>Active Session</Text>
                  <Text style={styles.heroDoctor}>
                    {dashboard?.activeSession?.doctorName || "No live session"}
                  </Text>
                  <Text style={styles.heroMeta}>
                    {dashboard?.activeSession
                      ? `${dashboard.activeSession.startTime} - ${dashboard.activeSession.endTime}`
                      : "Queue opens when a clinic session is active"}
                  </Text>
                </View>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {dashboard?.activeSession?.status || "IDLE"}
                  </Text>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <Text style={styles.heroStat}>
                  In Queue: {dashboard?.queue?.waitingCount ?? 0}
                </Text>
                <Text style={styles.heroStat}>
                  Avg Wait: {dashboard?.queue?.averageWaitMinutes ?? 0}m
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <SummaryCard label="Patients" value={String(dashboard?.stats.totalPatients ?? 0)} tint={THEME.softBlue} color={THEME.primary} icon="people-outline" />
              <SummaryCard label="Today" value={String(dashboard?.stats.todayAppointments ?? 0)} tint={THEME.softGreen} color={THEME.success} icon="calendar-outline" />
              <SummaryCard label="Missed" value={String(dashboard?.stats.missedToday ?? 0)} tint={THEME.softDanger} color={THEME.danger} icon="close-circle-outline" />
              <SummaryCard label="Queue" value={String(dashboard?.stats.inQueue ?? 0)} tint={THEME.softWarning} color={THEME.warning} icon="time-outline" />
            </View>

            <Text style={styles.sectionTitle}>Next Up</Text>
            <View style={styles.nextCard}>
              <View>
                <Text style={styles.nextToken}>
                  {dashboard?.nextPatient ? `#${dashboard.nextPatient.token_number}` : "No queue"}
                </Text>
                <Text style={styles.nextName}>
                  {dashboard?.nextPatient?.patient_name || "No patient waiting"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, !dashboard?.activeSession && styles.buttonDisabled]}
                disabled={!dashboard?.activeSession}
                onPress={() => navigation.navigate("ReceptionistQueue")}
              >
                <Text style={styles.primaryButtonText}>Open Queue</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <ActionButton label="Walk-in" icon="person-add-outline" onPress={() => navigation.navigate("ReceptionistRegistration")} />
              <ActionButton label="Book" icon="calendar-clear-outline" onPress={() => navigation.navigate("ReceptionistBookAppointment")} />
              <ActionButton label="Patients" icon="people-circle-outline" onPress={() => navigation.navigate("ReceptionistPatients")} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  tint,
  color,
  icon,
}: {
  label: string;
  value: string;
  tint: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={20} color={THEME.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { fontSize: 14, fontWeight: "600", color: THEME.textSecondary },
  title: { marginTop: 4, fontSize: 28, fontWeight: "800", color: THEME.textPrimary },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  logoutButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.primary,
  },
  centerState: { paddingVertical: 72, alignItems: "center" },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#B91C1C" },
  errorText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: "#991B1B" },
  permissionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },
  permissionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  permissionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  permissionButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: THEME.primary,
  },
  permissionButtonText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: "700",
  },
  heroCard: { backgroundColor: THEME.softBlue, borderRadius: 24, padding: 18, marginBottom: 18 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroLabel: { fontSize: 12, fontWeight: "700", color: THEME.textSecondary, textTransform: "uppercase" },
  heroDoctor: { marginTop: 6, fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  heroMeta: { marginTop: 6, fontSize: 14, color: THEME.textSecondary },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#D7F5E4" },
  heroBadgeText: { fontSize: 11, fontWeight: "800", color: THEME.success },
  heroStatsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  heroStat: { fontSize: 14, fontWeight: "700", color: THEME.textPrimary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  summaryCard: { width: "47%", backgroundColor: THEME.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border },
  summaryIcon: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  summaryValue: { fontSize: 28, fontWeight: "800", color: THEME.textPrimary },
  summaryLabel: { marginTop: 4, fontSize: 14, color: THEME.textSecondary, fontWeight: "600" },
  sectionTitle: { marginBottom: 12, fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  nextCard: { backgroundColor: THEME.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: THEME.border, marginBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  nextToken: { fontSize: 13, fontWeight: "800", color: THEME.primary },
  nextName: { marginTop: 4, fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  primaryButton: { height: 42, borderRadius: 14, backgroundColor: THEME.primary, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  buttonDisabled: { opacity: 0.45 },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionCard: { flex: 1, backgroundColor: THEME.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, alignItems: "center" },
  actionIconWrap: { width: 40, height: 40, borderRadius: 14, backgroundColor: THEME.softBlue, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: "700", color: THEME.textPrimary },
});
