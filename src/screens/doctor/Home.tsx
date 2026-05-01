import React, { useCallback, useMemo, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getDailyReport, getQueueDashboard, startQueue } from "../../services/doctorQueueService";
import { apiFetch } from "../../config/api";
import QueueCard from "./components/QueueCard";
import ScheduleCard, { type ScheduleCardItem } from "./components/ScheduleCard";
import StatCard from "./components/StatCard";

const THEME = {
  background: "#F5F7FC",
  white: "#FFFFFF",
  textDark: "#182033",
  textGray: "#6B7280",
  textMuted: "#94A3B8",
  accentBlue: "#2F6FED",
  accentBlueSoft: "#EAF1FF",
  accentGreen: "#18B67A",
  accentGreenSoft: "#E8FBF3",
  accentAmber: "#F59E0B",
  accentAmberSoft: "#FEF3C7",
  border: "#E2E8F0",
};

const MOCK_SCHEDULE: ScheduleCardItem[] = [
  {
    clinic: "HealthLink Kurunegala",
    start: "12:00",
    end: "15:00",
    label: "Today",
    patients: 12,
  },
  {
    clinic: "HealthLink Kandy",
    start: "09:00",
    end: "12:30",
    label: "Tomorrow",
    patients: 9,
  },
  {
    clinic: "City Specialist Center",
    start: "16:00",
    end: "19:00",
    label: "Thu",
    patients: 7,
  },
];

type DoctorDashboardResponse = {
  doctor?: {
    name?: string;
    specialization?: string;
  };
  queue?: {
    status?: string | null;
    waitingCount?: number | null;
  } | null;
};

type QueuePatient = {
  name?: string | null;
  token_number?: number | string | null;
};

export default function DoctorHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    waiting: 0,
  });
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<{ name?: string; specialization?: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueStarting, setQueueStarting] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const loadDashboard = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        return;
      }

      const [dashboard, report, doctorRes] = await Promise.all([
        getQueueDashboard(token),
        getDailyReport(token),
        apiFetch("/api/doctor/dashboard"),
      ]);

      const doctorDashboard = doctorRes.ok
        ? ((await doctorRes.json()) as DoctorDashboardResponse)
        : null;

      setPatients(Array.isArray(dashboard?.patients) ? dashboard.patients : []);
      setQueueStatus(
        typeof dashboard?.queue?.status === "string"
          ? dashboard.queue.status
          : doctorDashboard?.queue?.status || null
      );
      setStats({
        totalPatients: Number(report?.dailySummary?.totalPatients ?? 0),
        waiting: Number(dashboard?.queue?.waitingCount ?? doctorDashboard?.queue?.waitingCount ?? 0),
      });
      setDoctorProfile({
        name: doctorDashboard?.doctor?.name,
        specialization: doctorDashboard?.doctor?.specialization,
      });
    } catch (error) {
      console.log("Doctor home load error:", error);
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

  const nextPatient = patients[0];
  const isQueueLive = queueStatus === "LIVE";
  const queueButtonLabel = isQueueLive ? "Open Queue" : "Start Consultation";
  const queueHelperText = nextPatient
    ? "Patient is ready for consultation"
    : isQueueLive
      ? "Queue is active. Open the control panel to continue."
      : "Start the clinic to begin today’s consultation flow.";

  const handleQueueAction = async () => {
    if (isQueueLive) {
      navigation.navigate("DoctorQueueControl");
      return;
    }

    try {
      setQueueStarting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        return;
      }

      const response = await startQueue(token);
      Alert.alert("Clinic Status", response?.message ?? "Queue started");
      await loadDashboard("refresh");
      navigation.navigate("DoctorQueueControl");
    } catch (error: any) {
      const backendMessage = error?.response?.data?.message;
      if (backendMessage === "No active shift found for this time") {
        Alert.alert(
          "No Active Shift",
          "You don't have a shift scheduled for the current time. Please start the clinic during your shift hours."
        );
      } else {
        Alert.alert("Error", backendMessage || "Unable to start queue");
      }
    } finally {
      setQueueStarting(false);
    }
  };

  const openSchedule = () => {
    navigation.navigate("DoctorSchedule");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.userName}>{doctorProfile?.name ?? "Doctor"}</Text>
          <Text style={styles.specializationText}>
            {doctorProfile?.specialization || "Clinic dashboard"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate("DoctorSettings")}
        >
          <Ionicons name="settings-outline" size={22} color={THEME.accentBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard("refresh")} />}
      >
        <QueueCard
          queueStatus={queueStatus}
          patientName={nextPatient?.name || "No patient in queue"}
          patientToken={
            nextPatient?.token_number !== undefined && nextPatient?.token_number !== null
              ? String(nextPatient.token_number)
              : "--"
          }
          helperText={queueHelperText}
          buttonLabel={queueButtonLabel}
          loading={queueStarting}
          onPress={handleQueueAction}
        />

        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
            <Text style={styles.sectionSubtitle}>Your next clinic sessions at a glance</Text>
          </View>
          <TouchableOpacity onPress={openSchedule}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scheduleRow}
        >
          {MOCK_SCHEDULE.map((item, index) => (
            <ScheduleCard key={`${item.clinic}-${item.start}-${index}`} item={item} onPress={openSchedule} />
          ))}
        </ScrollView>

        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>Today’s Snapshot</Text>
            <Text style={styles.sectionSubtitle}>Live queue numbers and daily totals</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Total Patients"
            value={String(stats.totalPatients)}
            icon="people-outline"
            tint={THEME.accentBlueSoft}
            color={THEME.accentBlue}
          />
          <StatCard
            label="Waiting Now"
            value={String(stats.waiting)}
            icon="time-outline"
            tint={THEME.accentAmberSoft}
            color={THEME.accentAmber}
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Refreshing dashboard...</Text>
          </View>
        ) : null}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.white,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textGray,
  },
  userName: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "900",
    color: THEME.textDark,
  },
  specializationText: {
    marginTop: 6,
    fontSize: 14,
    color: THEME.textMuted,
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.accentBlueSoft,
  },
  scroll: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME.textDark,
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: THEME.textGray,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.accentBlue,
  },
  scheduleRow: {
    paddingTop: 2,
    gap: 14,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 14,
  },
  loadingState: {
    alignItems: "center",
    paddingTop: 6,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textGray,
  },
});
