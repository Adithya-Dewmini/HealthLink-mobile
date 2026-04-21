import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  success: "#2BB673",
  danger: "#EF4444",
  warning: "#F59E0B",
  muted: "#E2E8F0",
  tabInactive: "#F1F5F9",
  softBlue: "#E3F2FD",
  softSuccess: "#E8F8EF",
  softDanger: "#FEF2F2",
  border: "#E2E8F0",
  cardRadius: 20,
};

type ApptStatus = "Upcoming" | "Completed" | "Missed" | "Cancelled";

interface Appointment {
  id: string;
  patientName: string;
  timeSlot: string;
  date: string;
  status: ApptStatus;
}

const DATA: Appointment[] = [
  { id: "1", patientName: "Nadun Perera", timeSlot: "10:30 AM – 10:45 AM", date: "Apr 17", status: "Upcoming" },
  { id: "2", patientName: "Saman Kumara", timeSlot: "11:00 AM – 11:15 AM", date: "Apr 17", status: "Upcoming" },
  { id: "3", patientName: "Anula Devi", timeSlot: "09:00 AM – 09:15 AM", date: "Apr 17", status: "Completed" },
  { id: "4", patientName: "Kamal Silva", timeSlot: "08:30 AM – 08:45 AM", date: "Apr 17", status: "Missed" },
  { id: "5", patientName: "Priyani Cooray", timeSlot: "02:00 PM – 02:15 PM", date: "Apr 17", status: "Cancelled" },
];

const TABS: ApptStatus[] = ["Upcoming", "Completed", "Missed", "Cancelled"];

export default function AppointmentManagement() {
  const [activeTab, setActiveTab] = useState<ApptStatus>("Upcoming");

  const filteredData = useMemo(
    () => DATA.filter((item) => item.status === activeTab),
    [activeTab]
  );

  const counts = useMemo(
    () => ({
      Upcoming: DATA.filter((item) => item.status === "Upcoming").length,
      Completed: DATA.filter((item) => item.status === "Completed").length,
      Missed: DATA.filter((item) => item.status === "Missed").length,
      Cancelled: DATA.filter((item) => item.status === "Cancelled").length,
    }),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Appointments</Text>
          <Text style={styles.subtitle}>Manage patient bookings</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabList}
          renderItem={({ item }) => {
            const active = activeTab === item;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item)}
                style={[
                  styles.tabPill,
                  active ? styles.tabPillActive : styles.tabPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    active ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {item}
                </Text>
                {counts[item] > 0 ? (
                  <View style={[styles.countBadge, item === "Missed" && styles.countBadgeDanger]}>
                    <Text style={styles.countText}>{counts[item]}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={72} color={THEME.muted} />
            <Text style={styles.emptyText}>No appointments found</Text>
          </View>
        }
        renderItem={({ item }) => <AppointmentCard item={item} />}
      />
    </SafeAreaView>
  );
}

function AppointmentCard({ item }: { item: Appointment }) {
  const statusColors = {
    Upcoming: THEME.primary,
    Completed: THEME.success,
    Missed: THEME.danger,
    Cancelled: THEME.textSecondary,
  };

  const statusBackgrounds = {
    Upcoming: THEME.softBlue,
    Completed: THEME.softSuccess,
    Missed: THEME.softDanger,
    Cancelled: THEME.tabInactive,
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.patientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.patientName.charAt(0)}</Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={THEME.textSecondary} />
              <Text style={styles.metaText}>{item.date}</Text>
              <View style={styles.metaDot} />
              <Ionicons name="time-outline" size={14} color={THEME.textSecondary} />
              <Text style={styles.metaText}>{item.timeSlot}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBackgrounds[item.status] }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
          <Ionicons name="checkmark-circle" size={18} color={THEME.white} />
          <Text style={styles.btnTextWhite}>Check-in</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnDanger]}>
          <Text style={styles.btnTextRed}>Missed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnSecondary]}>
          <Text style={styles.btnTextSecondary}>Reschedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: THEME.white,
  },
  title: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.tabInactive,
    justifyContent: "center",
    alignItems: "center",
  },
  tabWrapper: {
    backgroundColor: THEME.white,
    paddingBottom: 14,
  },
  tabList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 8,
  },
  tabPillActive: { backgroundColor: THEME.primary },
  tabPillInactive: { backgroundColor: THEME.tabInactive },
  tabLabel: { fontSize: 14, fontWeight: "700" },
  tabLabelActive: { color: THEME.white },
  tabLabelInactive: { color: THEME.textSecondary },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeDanger: {
    backgroundColor: THEME.danger,
  },
  countText: { color: THEME.white, fontSize: 10, fontWeight: "900" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  patientRow: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: THEME.primary },
  patientInfo: { marginLeft: 12, flex: 1 },
  patientName: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" },
  metaText: { fontSize: 12, color: THEME.textSecondary, fontWeight: "600" },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.muted, marginHorizontal: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  divider: { height: 1, backgroundColor: THEME.tabInactive, marginVertical: 16 },
  actionRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnPrimary: { backgroundColor: THEME.primary, flex: 1.35 },
  btnDanger: { backgroundColor: THEME.softDanger },
  btnSecondary: { backgroundColor: THEME.tabInactive },
  btnTextWhite: { color: THEME.white, fontWeight: "800", fontSize: 13 },
  btnTextRed: { color: THEME.danger, fontWeight: "800", fontSize: 13 },
  btnTextSecondary: { color: THEME.textSecondary, fontWeight: "800", fontSize: 13 },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: "600", color: THEME.textSecondary },
});
