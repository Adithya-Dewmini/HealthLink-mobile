import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const THEME = {
  primary: "#2F6FED",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  success: "#10B981",
  danger: "#EF4444",
  softBlue: "#EFF6FF",
};

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  isActive: boolean;
  phone?: string;
  room: string;
};

type FilterValue = "all" | "active" | "inactive" | "cardiology" | "dermatology" | "general";

const DOCTORS: Doctor[] = [
  {
    id: "1",
    name: "Dr. Aruna Silva",
    specialization: "Cardiology",
    isActive: true,
    phone: "+94 77 123 4567",
    room: "Room 302",
  },
  {
    id: "2",
    name: "Dr. Sarah Perera",
    specialization: "Dermatology",
    isActive: true,
    phone: "+94 71 998 2211",
    room: "Room 204",
  },
  {
    id: "3",
    name: "Dr. Mohan Dias",
    specialization: "General Medicine",
    isActive: false,
    phone: "+94 76 555 4433",
    room: "Room 108",
  },
  {
    id: "4",
    name: "Dr. Nuwan Fernando",
    specialization: "Cardiology",
    isActive: true,
    phone: "+94 70 111 2288",
    room: "Room 305",
  },
];

const FILTERS: Array<{ key: FilterValue; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "cardiology", label: "Cardiology" },
  { key: "dermatology", label: "Dermatology" },
  { key: "general", label: "General" },
];

export default function MedicalCenterDoctors() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [doctors, setDoctors] = useState<Doctor[]>(DOCTORS);

  const stats = useMemo(() => {
    const total = doctors.length;
    const active = doctors.filter((doctor) => doctor.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const matchesSearch =
        query.length === 0 ||
        doctor.name.toLowerCase().includes(query) ||
        doctor.specialization.toLowerCase().includes(query) ||
        doctor.phone?.toLowerCase().includes(query);

      let matchesFilter = true;
      if (activeFilter === "active") matchesFilter = doctor.isActive;
      if (activeFilter === "inactive") matchesFilter = !doctor.isActive;
      if (activeFilter === "cardiology") {
        matchesFilter = doctor.specialization.toLowerCase().includes("cardio");
      }
      if (activeFilter === "dermatology") {
        matchesFilter = doctor.specialization.toLowerCase().includes("derma");
      }
      if (activeFilter === "general") {
        matchesFilter = doctor.specialization.toLowerCase().includes("general");
      }

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, doctors, search]);

  const toggleDoctor = (doctorId: string) => {
    setDoctors((current) =>
      current.map((doctor) =>
        doctor.id === doctorId ? { ...doctor, isActive: !doctor.isActive } : doctor
      )
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Doctors</Text>
          <Text style={styles.headerSub}>Manage clinic doctors</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="options-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={THEME.primary} />
            <TextInput
              placeholder="Search doctor..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor={THEME.textSecondary}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter-outline" size={20} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.statsContainer}>
          <StatsCard label="Total" value={String(stats.total)} tint="#DBEAFE" color={THEME.primary} />
          <StatsCard label="Active" value={String(stats.active)} tint="#DCFCE7" color={THEME.success} />
          <StatsCard label="Inactive" value={String(stats.inactive)} tint="#FEE2E2" color={THEME.danger} />
        </View>

        <Text style={styles.sectionLabel}>Doctor List</Text>

        {filteredDoctors.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="clipboard-outline" size={30} color={THEME.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No doctor records found</Text>
            <Text style={styles.emptyText}>Try a different name or phone number.</Text>
          </View>
        ) : (
          filteredDoctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} onToggle={() => toggleDoctor(doctor.id)} />
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={THEME.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatsCard({
  label,
  value,
  tint,
  color,
}: {
  label: string;
  value: string;
  tint: string;
  color: string;
}) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: tint }]}>
        <Ionicons name="medkit-outline" size={18} color={color} />
      </View>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
}

function DoctorCard({
  doctor,
  onToggle,
}: {
  doctor: Doctor;
  onToggle: () => void;
}) {
  const initials = doctor.name
    .split(" ")
    .filter(Boolean)
    .slice(1, 3)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const badgeColor = doctor.isActive ? THEME.success : THEME.danger;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "DR"}</Text>
        </View>
        <View style={styles.cardHeaderCopy}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.specialization}>{doctor.specialization}</Text>
          <Text style={styles.detailText}>
            Clinic: {doctor.room}  •  Ph: {doctor.phone || "Not added"}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${badgeColor}18` }]}>
          <Text style={[styles.statusText, { color: badgeColor }]}>
            {doctor.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="calendar-outline" size={17} color={THEME.textPrimary} />
          <Text style={styles.actionText}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="create-outline" size={17} color={THEME.textPrimary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onToggle}>
          <Ionicons
            name={doctor.isActive ? "power-outline" : "play-outline"}
            size={17}
            color={doctor.isActive ? THEME.danger : THEME.success}
          />
          <Text
            style={[
              styles.actionText,
              { color: doctor.isActive ? THEME.danger : THEME.success, fontWeight: "800" },
            ]}
          >
            {doctor.isActive ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: THEME.white,
  },
  headerText: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 14, color: THEME.textSecondary, marginTop: 3 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
  },
  searchBar: {
    flex: 1,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 999,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: THEME.textPrimary,
  },
  filterBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterPills: {
    paddingBottom: 14,
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
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statsCard: {
    width: "31%",
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statsIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statsLabel: {
    marginTop: 4,
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.primary,
  },
  cardHeaderCopy: {
    flex: 1,
    paddingRight: 10,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  specialization: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 6,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: THEME.background,
    marginVertical: 16,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.white,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  emptyState: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.success,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.success,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
