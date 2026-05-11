import React, { useCallback, useContext, useState } from "react";
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { fetchReceptionDashboard } from "../../services/receptionService";
import { AuthContext } from "../../utils/AuthContext";
import { hasAnyReceptionistPermission } from "../../utils/receptionistPermissions";
import {
  LoadingState,
  PermissionUpdatedBanner,
  RECEPTION_THEME,
  ReceptionistButton,
  ReceptionistHeader,
  SurfaceCard,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "../../components/receptionist/PanelUI";

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

const EMPTY_STATS: DashboardPayload["stats"] = {
  totalPatients: 0,
  todayAppointments: 0,
  missedToday: 0,
  inQueue: 0,
};

export default function ReceptionDashboard() {
  const navigation = useNavigation<any>();
  const { user, logout, pendingPermissionUpdate, refreshReceptionPermissions, receptionistPermissions } =
    useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  const stats = dashboard?.stats ?? EMPTY_STATS;
  const receptionistName = user?.name?.trim() || "Receptionist";
  const hasAssignedResponsibilities = hasAnyReceptionistPermission(receptionistPermissions);

  const loadDashboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        await refreshReceptionPermissions().catch(() => null);
        const data = (await fetchReceptionDashboard()) as DashboardPayload;
        setDashboard(data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshReceptionPermissions]
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard("initial");
    }, [loadDashboard])
  );

  const handleLogout = useCallback(() => {
    Alert.alert("Sign out", "Do you want to sign out of the receptionist panel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }, [logout]);

  const activeStatus = String(dashboard?.activeSession?.status || "idle").toUpperCase();
  const activeTone: "info" | "success" | "warning" | "danger" =
    activeStatus === "ACTIVE" || activeStatus === "OPEN"
      ? "success"
      : activeStatus === "IDLE"
        ? "warning"
        : "info";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={RECEPTION_THEME.primary}
            onRefresh={() => void loadDashboard("refresh")}
          />
        }
      >
        <ReceptionistHeader
          eyebrow="Reception Desk"
          title={dashboard?.clinic?.name || "Reception Dashboard"}
          subtitle={`Welcome back, ${receptionistName}.`}
          right={
            <View style={styles.headerActions}>
              <HeaderIconButton icon="refresh-outline" onPress={() => void loadDashboard("refresh")} />
              <HeaderIconButton icon="log-out-outline" onPress={handleLogout} />
            </View>
          }
        />

        {pendingPermissionUpdate ? (
          <PermissionUpdatedBanner
            message="Your latest permissions are ready. Review the updated actions in your panel."
            onPress={() => {
              void refreshReceptionPermissions();
            }}
          />
        ) : null}

        {loading ? (
          <LoadingState label="Loading live dashboard..." />
        ) : error ? (
          <ErrorState title="Dashboard unavailable" message={error} onRetry={() => void loadDashboard("refresh")} />
        ) : (
          <>
            <SurfaceCard style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroLabel}>Active Session</Text>
                  <Text style={styles.heroTitle}>
                    {dashboard?.activeSession?.doctorName || "No live session"}
                  </Text>
                  <Text style={styles.heroMeta}>
                    {dashboard?.activeSession
                      ? `${dashboard.activeSession.startTime} - ${dashboard.activeSession.endTime}`
                      : "Sessions will appear here when your clinic starts consulting."}
                  </Text>
                </View>
                <StatusBadge label={activeStatus} tone={activeTone} />
              </View>

              <View style={styles.heroMetrics}>
                <MetricPill icon="time-outline" label={`${dashboard?.queue?.waitingCount ?? 0} waiting`} />
                <MetricPill icon="pulse-outline" label={`${dashboard?.queue?.averageWaitMinutes ?? 0} min avg`} />
              </View>
            </SurfaceCard>

            <View style={styles.statsGrid}>
              <StatCard
                label="Patients"
                value={String(stats.totalPatients)}
                tone="primary"
                icon="people-outline"
              />
              <StatCard
                label="Visits Today"
                value={String(stats.todayAppointments)}
                tone="success"
                icon="calendar-outline"
              />
              <StatCard
                label="Missed"
                value={String(stats.missedToday)}
                tone="danger"
                icon="alert-circle-outline"
              />
              <StatCard
                label="In Queue"
                value={String(stats.inQueue)}
                tone="warning"
                icon="people-circle-outline"
              />
            </View>

            {hasAssignedResponsibilities ? (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Next Patient</Text>
                </View>
                <SurfaceCard style={styles.nextCard}>
                  <View style={styles.nextInfo}>
                    <Text style={styles.nextToken}>
                      {dashboard?.nextPatient ? `Token #${dashboard.nextPatient.token_number}` : "Queue clear"}
                    </Text>
                    <Text style={styles.nextName}>
                      {dashboard?.nextPatient?.patient_name || "No patient waiting right now"}
                    </Text>
                  </View>
                  <ReceptionistButton
                    label="Open Queue"
                    icon="arrow-forward-outline"
                    onPress={() => navigation.navigate("ReceptionistQueue")}
                    disabled={!dashboard?.activeSession || !receptionistPermissions.queue_access}
                  />
                </SurfaceCard>

                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                <View style={styles.quickActionsGrid}>
                  {receptionistPermissions.queue_access ? (
                    <QuickActionCard
                      label="Queue"
                      description="Manage live patient flow"
                      icon="people-circle-outline"
                      onPress={() => navigation.navigate("ReceptionistQueue")}
                    />
                  ) : null}
                  {receptionistPermissions.appointments ? (
                    <QuickActionCard
                      label="Visits"
                      description="Track and book appointments"
                      icon="calendar-clear-outline"
                      onPress={() => navigation.navigate("ReceptionistAppointments")}
                    />
                  ) : null}
                  {receptionistPermissions.check_in ? (
                    <QuickActionCard
                      label="Check-in"
                      description="Register and queue walk-ins"
                      icon="person-add-outline"
                      onPress={() => navigation.navigate("ReceptionistRegistration")}
                    />
                  ) : null}
                  {receptionistPermissions.schedule_management ? (
                    <QuickActionCard
                      label="Sessions"
                      description="Manage doctor clinic sessions"
                      icon="time-outline"
                      onPress={() => navigation.navigate("ReceptionistSessions")}
                    />
                  ) : null}
                </View>
              </>
            ) : (
              <EmptyState
                title="No responsibilities assigned yet."
                message="Please contact your clinic admin."
                icon="shield-checkmark-outline"
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.iconButton} onPress={onPress}>
      <Ionicons name={icon} size={18} color={RECEPTION_THEME.primary} />
    </TouchableOpacity>
  );
}

function MetricPill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={16} color={RECEPTION_THEME.navy} />
      <Text style={styles.metricPillText}>{label}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const toneMap = {
    primary: { bg: RECEPTION_THEME.infoSurface, color: RECEPTION_THEME.primary },
    success: { bg: RECEPTION_THEME.successSurface, color: RECEPTION_THEME.success },
    warning: { bg: RECEPTION_THEME.warningSurface, color: RECEPTION_THEME.warning },
    danger: { bg: RECEPTION_THEME.dangerSurface, color: RECEPTION_THEME.danger },
  } as const;

  return (
    <SurfaceCard style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: toneMap[tone].bg }]}>
        <Ionicons name={icon} size={18} color={toneMap[tone].color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </SurfaceCard>
  );
}

function QuickActionCard({
  label,
  description,
  icon,
  onPress,
}: {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.quickActionCard} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={18} color={RECEPTION_THEME.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Text style={styles.quickActionDescription}>{description}</Text>
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
    paddingBottom: 124,
    gap: 18,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: RECEPTION_THEME.surface,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: RECEPTION_THEME.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 14,
    color: RECEPTION_THEME.textSecondary,
    lineHeight: 20,
  },
  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: RECEPTION_THEME.lightAqua,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  metricPillText: {
    color: RECEPTION_THEME.navy,
    fontWeight: "700",
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    minWidth: 150,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  statLabel: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
  },
  sectionRow: {
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  nextCard: {
    gap: 16,
  },
  nextInfo: {
    gap: 6,
  },
  nextToken: {
    color: RECEPTION_THEME.primary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  nextName: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: "47%",
    minWidth: 150,
    backgroundColor: RECEPTION_THEME.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    padding: 16,
    shadowColor: RECEPTION_THEME.navy,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: RECEPTION_THEME.infoSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    marginTop: 14,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  quickActionDescription: {
    marginTop: 6,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
