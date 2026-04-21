import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
};

type AppointmentStatus = "Completed" | "Pending" | "Missed";
type StatusFilter = "All" | AppointmentStatus;
type DoctorFilter = "All Doctors" | "Dr. Silva" | "Dr. Perera" | "Dr. Fernando";

type Appointment = {
  id: string;
  dateKey: string;
  time: string;
  patient: string;
  doctor: Exclude<DoctorFilter, "All Doctors">;
  status: AppointmentStatus;
  type: string;
  token: string;
};

const DATE_OPTIONS = [
  { key: "2026-04-18", label: "Mon 18" },
  { key: "2026-04-19", label: "Tue 19" },
  { key: "2026-04-20", label: "Wed 20" },
  { key: "2026-04-21", label: "Thu 21" },
  { key: "2026-04-22", label: "Fri 22" },
];

const STATUS_FILTERS: StatusFilter[] = ["All", "Completed", "Pending", "Missed"];
const DOCTOR_FILTERS: DoctorFilter[] = [
  "All Doctors",
  "Dr. Silva",
  "Dr. Perera",
  "Dr. Fernando",
];

const APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    dateKey: "2026-04-19",
    time: "09:30 AM",
    patient: "Nimal Perera",
    doctor: "Dr. Silva",
    status: "Pending",
    type: "Consultation",
    token: "A-12",
  },
  {
    id: "2",
    dateKey: "2026-04-19",
    time: "10:30 AM",
    patient: "Amaya Fernando",
    doctor: "Dr. Perera",
    status: "Completed",
    type: "Review",
    token: "B-05",
  },
  {
    id: "3",
    dateKey: "2026-04-19",
    time: "11:00 AM",
    patient: "Saman Kumara",
    doctor: "Dr. Silva",
    status: "Missed",
    type: "Consultation",
    token: "A-18",
  },
  {
    id: "4",
    dateKey: "2026-04-19",
    time: "02:00 PM",
    patient: "Ruwan Jayasinghe",
    doctor: "Dr. Fernando",
    status: "Pending",
    type: "Follow-up",
    token: "C-03",
  },
  {
    id: "5",
    dateKey: "2026-04-20",
    time: "09:00 AM",
    patient: "Ishara De Silva",
    doctor: "Dr. Perera",
    status: "Pending",
    type: "Consultation",
    token: "B-01",
  },
];

export default function MedicalCenterAppointments() {
  const [selectedDate, setSelectedDate] = useState("2026-04-19");
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>("All Doctors");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const filteredAppointments = useMemo(() => {
    return APPOINTMENTS.filter((appointment) => {
      const matchesDate = appointment.dateKey === selectedDate;
      const matchesDoctor =
        doctorFilter === "All Doctors" || appointment.doctor === doctorFilter;
      const matchesStatus =
        statusFilter === "All" || appointment.status === statusFilter;
      return matchesDate && matchesDoctor && matchesStatus;
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [doctorFilter, selectedDate, statusFilter]);

  const selectedDayAppointments = useMemo(
    () => APPOINTMENTS.filter((appointment) => appointment.dateKey === selectedDate),
    [selectedDate]
  );

  const stats = useMemo(() => {
    const total = selectedDayAppointments.length;
    const completed = selectedDayAppointments.filter(
      (appointment) => appointment.status === "Completed"
    ).length;
    const missed = selectedDayAppointments.filter(
      (appointment) => appointment.status === "Missed"
    ).length;
    const upcoming = selectedDayAppointments.filter(
      (appointment) => appointment.status === "Pending"
    ).length;
    return { total, completed, missed, upcoming };
  }, [selectedDayAppointments]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSubtitle}>Clinic schedule overview</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="filter-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="calendar-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStrip}
        >
          {DATE_OPTIONS.map((date) => {
            const selected = selectedDate === date.key;
            return (
              <TouchableOpacity
                key={date.key}
                style={[styles.datePill, selected && styles.datePillActive]}
                onPress={() => setSelectedDate(date.key)}
              >
                <Text style={[styles.datePillText, selected && styles.datePillTextActive]}>
                  {date.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Doctor</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {DOCTOR_FILTERS.map((filter) => {
              const selected = doctorFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterPill, selected && styles.filterPillActive]}
                  onPress={() => setDoctorFilter(filter)}
                >
                  <Text style={[styles.filterPillText, selected && styles.filterPillTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_FILTERS.map((filter) => {
              const selected = statusFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterPill, selected && styles.filterPillActive]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text style={[styles.filterPillText, selected && styles.filterPillTextActive]}>
                    {filter}
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

        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-clear-outline" size={32} color={THEME.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No appointments found</Text>
            <Text style={styles.emptyText}>Try a different day, doctor, or status filter.</Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))
        )}
      </ScrollView>
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

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const statusMap =
    appointment.status === "Completed"
      ? {
          card: styles.cardDefault,
          badge: styles.completedBadge,
          text: styles.completedBadgeText,
          icon: "checkmark-circle-outline" as const,
        }
      : appointment.status === "Missed"
        ? {
            card: styles.cardMissed,
            badge: styles.missedBadge,
            text: styles.missedBadgeText,
            icon: "warning-outline" as const,
          }
        : {
            card: styles.cardDefault,
            badge: styles.pendingBadge,
            text: styles.pendingBadgeText,
            icon: "time-outline" as const,
          };

  return (
    <View style={[styles.card, statusMap.card]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.timeText}>{appointment.time}</Text>
        <View style={[styles.statusBadge, statusMap.badge]}>
          <Ionicons name={statusMap.icon} size={14} color={statusMap.text.color} />
          <Text style={[styles.statusBadgeText, statusMap.text]}>{appointment.status}</Text>
        </View>
      </View>

      <Text style={styles.patientName}>{appointment.patient}</Text>
      <Text style={styles.doctorName}>{appointment.doctor}</Text>

      <View style={styles.detailDivider} />

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Type:</Text>
        <Text style={styles.metaValue}>{appointment.type}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Queue / Token:</Text>
        <Text style={styles.metaValue}>{appointment.token}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            appointment.status !== "Pending" && styles.primaryButtonDisabled,
          ]}
          disabled={appointment.status !== "Pending"}
        >
          <Text
            style={[
              styles.primaryButtonText,
              appointment.status !== "Pending" && styles.primaryButtonTextDisabled,
            ]}
          >
            Mark Completed
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
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
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  dateStrip: {
    gap: 10,
    paddingBottom: 8,
  },
  datePill: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
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
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
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
    gap: 12,
    marginTop: 20,
  },
  statsCard: {
    width: "48%",
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
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
    fontSize: 11,
    color: THEME.textSecondary,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 14,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDefault: {
    backgroundColor: THEME.white,
  },
  cardMissed: {
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  completedBadge: {
    backgroundColor: THEME.softGreen,
  },
  completedBadgeText: {
    color: THEME.success,
  },
  pendingBadge: {
    backgroundColor: THEME.softAmber,
  },
  pendingBadgeText: {
    color: THEME.warning,
  },
  missedBadge: {
    backgroundColor: THEME.softRed,
  },
  missedBadgeText: {
    color: THEME.danger,
  },
  patientName: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  doctorName: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#EEF2F7",
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
    width: 110,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: "#DCE4F2",
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.white,
  },
  primaryButtonTextDisabled: {
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF2F7",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    color: THEME.textSecondary,
  },
});
