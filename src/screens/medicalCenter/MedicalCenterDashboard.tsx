import React, { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppointmentItem from "../../components/dashboard/AppointmentItem";
import QueueCard from "../../components/dashboard/QueueCard";
import StatCard from "../../components/dashboard/StatCard";

const THEME = {
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  fab: "#10B981",
  shadow: "#000000",
};

const DOCTORS = [
  {
    id: "1",
    name: "Dr. Aruna Silva",
    spec: "Cardiologist",
    status: "LIVE" as const,
    token: "A-12",
    waiting: 8,
    eta: "15m",
  },
  {
    id: "2",
    name: "Dr. Sarah Perera",
    spec: "Dermatologist",
    status: "UPCOMING" as const,
    token: "B-05",
    waiting: 3,
    eta: "45m",
  },
];

const APPOINTMENTS = [
  { id: "1", patient: "Nadun Perera", time: "10:30 AM", status: "Pending" as const },
  { id: "2", patient: "Anula Devi", time: "11:00 AM", status: "Completed" as const },
];

const GRID_CARDS = [
  {
    icon: "person-outline" as const,
    value: "12",
    label: "Total Doctors",
    color: "#DBEAFE",
    iconColor: "#2563EB",
  },
  {
    icon: "people-outline" as const,
    value: "84",
    label: "Today's Patients",
    color: "#DCFCE7",
    iconColor: "#059669",
  },
  {
    icon: "list-outline" as const,
    value: "04",
    label: "Active Queues",
    color: "#FEF3C7",
    iconColor: "#D97706",
  },
  {
    icon: "calendar-outline" as const,
    value: "102",
    label: "Appointments",
    color: "#EDE9FE",
    iconColor: "#7C3AED",
  },
];

export default function MedicalCenterDashboard() {
  const navigation = useNavigation<any>();

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Good Morning</Text>
          <Text style={styles.subtitle}>{currentDate}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="notifications-outline" size={24} color={THEME.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate("MedicalCenterSettings")}
          >
            <Ionicons name="settings-outline" size={24} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {GRID_CARDS.map((card) => (
            <StatCard
              key={card.label}
              icon={card.icon}
              value={card.value}
              label={card.label}
              color={card.color}
              iconColor={card.iconColor}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Live Queues</Text>
        {DOCTORS.map((doctor) => (
          <QueueCard key={doctor.id} {...doctor} />
        ))}

        <Text style={styles.sectionTitle}>Today Appointments</Text>
        {APPOINTMENTS.map((appointment) => (
          <AppointmentItem key={appointment.id} {...appointment} />
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={THEME.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginTop: 24,
    marginBottom: 14,
  },
  bottomSpacer: {
    height: 96,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.fab,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.fab,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
