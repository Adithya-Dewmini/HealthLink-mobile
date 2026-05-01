import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../config/api";

const THEME = {
  primary: "#2563EB",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  softBlue: "#DBEAFE",
  softGreen: "#DCFCE7",
  softAmber: "#FEF3C7",
  softRed: "#FEE2E2",
  softOrange: "#FFEDD5",
};

type AppointmentStatus = "completed" | "missed" | "upcoming";
type StatusFilter = "all" | AppointmentStatus;

type AppointmentItem = {
  id: string;
  patientName: string;
  doctorName: string;
  doctorId?: number;
  time: string;
  status: AppointmentStatus;
  date: string;
};

type AppointmentStats = {
  total: number;
  completed: number;
  missed: number;
  upcoming: number;
};

type AppointmentsResponse = {
  stats?: Partial<AppointmentStats>;
  appointments?: AppointmentItem[];
};

type DoctorOption = {
  id: number;
  name: string;
};

const DEFAULT_STATS: AppointmentStats = {
  total: 0,
  completed: 0,
  missed: 0,
  upcoming: 0,
};

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Missed" },
  { key: "upcoming", label: "Upcoming" },
];

const buildDateOptions = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 5 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    return {
      key: current.toISOString().slice(0, 10),
      label: current.toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
      }),
    };
  });
};

const DATE_OPTIONS = buildDateOptions();

const getErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    } catch {
      return raw.trim();
    }
  }

  return fallback;
};

const getQueryKey = (date: string, doctorId: number | null, status: StatusFilter) =>
  `${date}|${doctorId ?? "all"}|${status}`;

const createQuery = (selectedDate: string, selectedDoctor: number | null, selectedStatus: StatusFilter) => {
  const params = new URLSearchParams();
  params.set("date", selectedDate);

  if (selectedDoctor) {
    params.set("doctorId", String(selectedDoctor));
  }

  if (selectedStatus !== "all") {
    params.set("status", selectedStatus);
  }

  return params.toString();
};

const formatDisplayDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function MedicalCenterAppointments() {
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0]?.key ?? new Date().toISOString().slice(0, 10));
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [stats, setStats] = useState<AppointmentStats>(DEFAULT_STATS);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, { stats: AppointmentStats; appointments: AppointmentItem[] }>>({});

  const fetchAppointments = useCallback(
    async (mode: "load" | "refresh" = "load") => {
      const cacheKey = getQueryKey(selectedDate, selectedDoctor, selectedStatus);
      const cached = cacheRef.current[cacheKey];

      if (cached && mode === "load") {
        setAppointments(cached.appointments);
        setStats(cached.stats);
        setError(null);
        return;
      }

      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const query = createQuery(selectedDate, selectedDoctor, selectedStatus);
        const response = await apiFetch(`/api/center/appointments?${query}`);

        if (!response.ok) {
          throw new Error(await getErrorMessage(response, "Failed to fetch appointments"));
        }

        const payload = (await response.json().catch(() => ({}))) as AppointmentsResponse;
        const nextStats: AppointmentStats = {
          total: Number(payload.stats?.total ?? 0),
          completed: Number(payload.stats?.completed ?? 0),
          missed: Number(payload.stats?.missed ?? 0),
          upcoming: Number(payload.stats?.upcoming ?? 0),
        };
        const nextAppointments = Array.isArray(payload.appointments) ? payload.appointments : [];

        setAppointments(nextAppointments);
        setStats(nextStats);
        setError(null);
        cacheRef.current[cacheKey] = {
          stats: nextStats,
          appointments: nextAppointments,
        };

        setDoctorOptions((prev) => {
          const next = [...prev];

          for (const item of nextAppointments) {
            if (typeof item.doctorId !== "number") continue;
            if (next.some((option) => option.id === item.doctorId)) continue;
            next.push({ id: item.doctorId, name: item.doctorName });
          }

          return next.sort((left, right) => left.name.localeCompare(right.name));
        });
      } catch (fetchError) {
        console.error("Appointments fetch error:", fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load appointments");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, selectedDoctor, selectedStatus]
  );

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const headerComponent = useMemo(
    () => (
      <View>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Appointments</Text>
            <Text style={styles.headerSubtitle}>Clinic schedule overview</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.88}>
              <Ionicons name="filter-outline" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.88}>
              <Ionicons name="calendar-outline" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentWrap}>
          <FlatList
            horizontal
            data={DATE_OPTIONS}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
              const selected = item.key === selectedDate;
              return (
                <TouchableOpacity
                  style={[styles.datePill, selected && styles.datePillActive]}
                  onPress={() => setSelectedDate(item.key)}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.datePillText, selected && styles.datePillTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStrip}
          />

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Doctor</Text>
            <FlatList
              horizontal
              data={[{ id: 0, name: "All Doctors" }, ...doctorOptions]}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const selected = item.id === 0 ? selectedDoctor === null : selectedDoctor === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.filterPill, selected && styles.filterPillActive]}
                    onPress={() => setSelectedDoctor(item.id === 0 ? null : item.id)}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.filterPillText, selected && styles.filterPillTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_FILTERS.map((filter) => {
                const selected = selectedStatus === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterPill, selected && styles.filterPillActive]}
                    onPress={() => setSelectedStatus(filter.key)}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.filterPillText, selected && styles.filterPillTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatsCard
              icon="calendar-outline"
              label="Total Appointments"
              value={String(stats.total)}
              tint={THEME.softBlue}
              iconColor={THEME.primary}
            />
            <StatsCard
              icon="checkmark-done-outline"
              label="Completed"
              value={String(stats.completed)}
              tint={THEME.softGreen}
              iconColor={THEME.success}
            />
            <StatsCard
              icon="warning-outline"
              label="Missed"
              value={String(stats.missed)}
              tint={THEME.softRed}
              iconColor={THEME.danger}
              highlight
            />
            <StatsCard
              icon="time-outline"
              label="Upcoming"
              value={String(stats.upcoming)}
              tint={THEME.softAmber}
              iconColor={THEME.warning}
            />
          </View>

          <Text style={styles.sectionTitle}>Appointment List</Text>
        </View>
      </View>
    ),
    [doctorOptions, selectedDate, selectedDoctor, selectedStatus, stats]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppointmentItem }) => <AppointmentCard appointment={item} />,
    []
  );

  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="alert-circle-outline" size={32} color={THEME.danger} />
          </View>
          <Text style={styles.emptyTitle}>Unable to load appointments</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void fetchAppointments("refresh")}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="calendar-clear-outline" size={32} color={THEME.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No appointments found</Text>
        <Text style={styles.emptyText}>Try a different day, doctor, or status filter.</Text>
      </View>
    );
  }, [error, fetchAppointments, loading]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void fetchAppointments("refresh")} />
        }
      />
    </SafeAreaView>
  );
}

function StatsCard({
  icon,
  label,
  value,
  tint,
  iconColor,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
  iconColor: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statsCard, highlight && styles.statsCardHighlight]}>
      <View style={[styles.statsIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.statsValue, highlight && styles.statsValueHighlight]}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
}

function AppointmentCard({ appointment }: { appointment: AppointmentItem }) {
  const statusMap =
    appointment.status === "completed"
      ? {
          badge: styles.completedBadge,
          text: styles.completedBadgeText,
          color: THEME.success,
          icon: "checkmark-circle-outline" as const,
          label: "Completed",
        }
      : appointment.status === "missed"
        ? {
            badge: styles.missedBadge,
            text: styles.missedBadgeText,
            color: THEME.danger,
            icon: "warning-outline" as const,
            label: "Missed",
          }
        : {
            badge: styles.upcomingBadge,
            text: styles.upcomingBadgeText,
            color: THEME.warning,
            icon: "time-outline" as const,
            label: "Upcoming",
          };

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Text style={styles.timeText}>{appointment.time}</Text>
        <View style={[styles.statusBadge, statusMap.badge]}>
          <Ionicons name={statusMap.icon} size={14} color={statusMap.color} />
          <Text style={[styles.statusBadgeText, statusMap.text]}>{statusMap.label}</Text>
        </View>
      </View>

      <Text style={styles.patientName}>{appointment.patientName}</Text>
      <Text style={styles.doctorName}>{appointment.doctorName}</Text>

      <View style={styles.detailDivider} />

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Date:</Text>
        <Text style={styles.metaValue}>{formatDisplayDate(appointment.date)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Status:</Text>
        <Text style={styles.metaValue}>{statusMap.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  listContent: {
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
  },
  contentWrap: {
    padding: 20,
  },
  dateStrip: {
    paddingBottom: 8,
  },
  datePill: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 10,
  },
  datePillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  datePillTextActive: {
    color: THEME.white,
  },
  filterSection: {
    marginTop: 16,
  },
  filterLabel: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  filterRow: {
    paddingRight: 8,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 10,
    marginBottom: 10,
  },
  filterPillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  filterPillTextActive: {
    color: THEME.white,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  statsCard: {
    width: "48%",
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statsCardHighlight: {
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  statsValueHighlight: {
    color: THEME.danger,
  },
  statsLabel: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  stateWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyState: {
    marginHorizontal: 20,
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: THEME.textSecondary,
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.primary,
  },
  retryButtonText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.primary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  completedBadge: {
    backgroundColor: THEME.softGreen,
  },
  completedBadgeText: {
    color: THEME.success,
  },
  missedBadge: {
    backgroundColor: THEME.softRed,
  },
  missedBadgeText: {
    color: THEME.danger,
  },
  upcomingBadge: {
    backgroundColor: THEME.softOrange,
  },
  upcomingBadgeText: {
    color: THEME.warning,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  doctorName: {
    marginTop: 4,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
});
