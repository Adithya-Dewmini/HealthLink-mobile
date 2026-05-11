import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import { fetchReceptionSessionDoctors } from "../../services/receptionistSessionService";

type SessionDoctor = {
  doctorId: number;
  doctorUserId: number;
  doctorName: string;
  specialization?: string | null;
  availabilitySummary?: string[];
  todaySessionCount?: number;
  upcomingSessionCount?: number;
};

const THEME = {
  navy: "#03045E",
  primary: "#0077B6",
  aqua: "#00B4D8",
  lightAqua: "#CAF0F8",
  background: "#F8FCFD",
  surface: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  shadow: "rgba(3, 4, 94, 0.10)",
};

export default function ReceptionistSessions() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const hasAccess = useReceptionPermissionGuard(
    "schedule",
    "schedule_management",
    true
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<SessionDoctor[]>([]);

  const loadDoctors = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    try {
      const payload = (await fetchReceptionSessionDoctors()) as SessionDoctor[];
      setDoctors(Array.isArray(payload) ? payload : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load clinic doctors");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDoctors("initial");
    }, [loadDoctors])
  );

  const summary = useMemo(() => {
    const today = doctors.reduce((sum, doctor) => sum + (doctor.todaySessionCount || 0), 0);
    const upcoming = doctors.reduce(
      (sum, doctor) => sum + Math.max((doctor.upcomingSessionCount || 0) - (doctor.todaySessionCount || 0), 0),
      0
    );
    return {
      doctors: doctors.length,
      today,
      upcoming,
    };
  }, [doctors]);

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Doctor session management has not been assigned to your account." />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadDoctors("refresh")} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SESSIONS</Text>
          <Text style={styles.title}>Manage doctor clinic sessions</Text>
          <Text style={styles.subtitle}>
            Create and maintain routine and manual clinic sessions for assigned doctors.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Doctors" value={summary.doctors} />
          <SummaryCard label="Today" value={summary.today} />
          <SummaryCard label="Upcoming" value={summary.upcoming} />
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : error ? (
          <StateCard
            title="Sessions unavailable"
            message={error}
            actionLabel="Try Again"
            onPress={() => void loadDoctors("refresh")}
            danger
          />
        ) : doctors.length === 0 ? (
          <StateCard
            title="No doctors ready for session management"
            message="Doctors assigned to this clinic will appear here once they are active and available for scheduling."
          />
        ) : (
          <View style={styles.list}>
            {doctors.map((doctor) => (
              <View key={`${doctor.doctorUserId}-${doctor.doctorId}`} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Ionicons name="medkit-outline" size={20} color={THEME.primary} />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{doctor.doctorName}</Text>
                    <Text style={styles.cardSubtitle}>
                      {doctor.specialization || "General practice"}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <MetricPill icon="today-outline" label={`${doctor.todaySessionCount || 0} today`} />
                  <MetricPill
                    icon="calendar-outline"
                    label={`${doctor.upcomingSessionCount || 0} upcoming`}
                  />
                </View>

                <View style={styles.availabilityBox}>
                  <Text style={styles.availabilityLabel}>Availability</Text>
                  <Text style={styles.availabilityText}>
                    {doctor.availabilitySummary && doctor.availabilitySummary.length > 0
                      ? doctor.availabilitySummary.join("  •  ")
                      : "No weekly availability shared yet"}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() =>
                      navigation.navigate("ReceptionistDoctorAvailability", {
                        doctorId: doctor.doctorId,
                        doctorUserId: doctor.doctorUserId,
                        doctorName: doctor.doctorName,
                        specialization: doctor.specialization || null,
                      })
                    }
                  >
                    <Text style={styles.secondaryButtonText}>View Availability</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() =>
                      navigation.navigate("ReceptionistDoctorSessionOverview", {
                        doctorId: doctor.doctorId,
                        doctorUserId: doctor.doctorUserId,
                        doctorName: doctor.doctorName,
                        specialization: doctor.specialization || null,
                      })
                    }
                  >
                    <Text style={styles.primaryButtonText}>Manage Sessions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MetricPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={14} color={THEME.primary} />
      <Text style={styles.metricText}>{label}</Text>
    </View>
  );
}

function StateCard({
  title,
  message,
  actionLabel,
  onPress,
  danger = false,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <View style={[styles.stateCard, danger ? styles.stateCardDanger : null]}>
      <Ionicons
        name={danger ? "alert-circle-outline" : "calendar-outline"}
        size={26}
        color={danger ? "#DC2626" : THEME.primary}
      />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
      {actionLabel && onPress ? (
        <TouchableOpacity style={styles.stateButton} onPress={onPress}>
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 20, paddingBottom: 34 },
  header: { marginBottom: 18 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: THEME.aqua,
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: THEME.navy },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textSecondary,
  },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  summaryCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  summaryValue: { fontSize: 26, fontWeight: "800", color: THEME.navy },
  summaryLabel: { marginTop: 6, fontSize: 13, color: THEME.textSecondary },
  centerState: { paddingTop: 80, alignItems: "center" },
  list: { gap: 14 },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.lightAqua,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  cardSubtitle: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#EDF8FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricText: { fontSize: 12, fontWeight: "700", color: THEME.navy },
  availabilityBox: {
    borderRadius: 18,
    backgroundColor: "#F7FBFD",
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 14,
  },
  availabilityLabel: { fontSize: 12, fontWeight: "800", color: THEME.aqua, marginBottom: 6 },
  availabilityText: { fontSize: 13, lineHeight: 20, color: THEME.textSecondary },
  cardActions: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.surface,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "700", color: THEME.textPrimary },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  stateCard: {
    alignItems: "center",
    backgroundColor: THEME.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
  },
  stateCardDanger: {
    backgroundColor: "#FFF7F7",
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stateButtonText: { fontSize: 15, fontWeight: "800", color: THEME.primary },
});
