import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { getQueueDashboard, getDailyReport, startQueue } from "../../services/doctorQueueService";
import { apiFetch } from "../../config/api";

const { width } = Dimensions.get("window");

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentGreen: "#4CAF50",
  accentPurple: "#9C27B0",
  accentBlue: "#2196F3",
  softBlue: "#E3F2FD",
  softPurple: "#F3E5F5",
  softGreen: "#E8F5E9",
  border: "#E0E6ED",
};

export default function DoctorDashboard() {
  const navigation = useNavigation<any>();
  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    waiting: 0,
    completed: 0,
  });
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<{ name?: string; specialization?: string } | null>(null);

  const formatTime = (value?: string) => {
    if (!value) return "--:--";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "--:--"
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const [dashboard, report, doctorRes] = await Promise.all([
        getQueueDashboard(token),
        getDailyReport(token),
        apiFetch("/api/doctor/dashboard"),
      ]);

      setPatients(dashboard?.patients ?? []);
      setQueueStatus(dashboard?.queue?.status ?? null);
      setStats({
        totalPatients: report?.dailySummary?.totalPatients ?? 0,
        waiting: dashboard?.queue?.waitingCount ?? 0,
        completed: report?.dailySummary?.patientsCompleted ?? 0,
      });
      if (doctorRes.ok) {
        const data = await doctorRes.json();
        setDoctorProfile({
          name: data?.doctor?.name,
          specialization: data?.doctor?.specialization,
        });
      }
    } catch (error) {
      console.log("Doctor home load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await startQueue(token);
      Alert.alert("Clinic Status", res?.message ?? "Queue started");
      await loadDashboard();
      navigation.navigate("DoctorQueueControl");
    } catch (error: any) {
      console.log("Start consultation error:", error);
      console.log("Start consultation error status:", error?.response?.status);
      console.log("Start consultation error data:", error?.response?.data);
      const backendMessage = error?.response?.data?.message;
      if (backendMessage === "No active shift found for this time") {
        Alert.alert(
          "No Active Shift",
          "You don't have a shift scheduled for the current time. Please start the clinic during your shift hours."
        );
      } else {
        Alert.alert("Error", backendMessage || "Unable to start queue");
      }
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const nextPatient = patients[0];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={24} color={THEME.accentBlue} />
          </View>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.docName}>{doctorProfile?.name ?? "Doctor"}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate("DoctorSettings")}
        >
          <Ionicons name="settings-outline" size={22} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.focusCard}>
          <View style={styles.focusHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>NEXT PATIENT</Text>
            </View>
            <Text style={styles.tokenText}>
              {nextPatient ? `Token #${nextPatient?.token_number ?? "—"}` : "No Queue"}
            </Text>
          </View>
          <Text style={styles.patientName}>
            {nextPatient?.name ?? "No patient in queue"}
          </Text>
          <Text style={styles.patientCondition}>
            {nextPatient ? "Ready for consultation" : "Start the clinic to begin"}
          </Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStartConsultation}
            disabled={queueStatus === "LIVE" || queueStatus === "ENDED" || loading}
          >
            <Text style={styles.startBtnText}>Start Consultation</Text>
            <Ionicons name="play-circle" size={24} color={THEME.white} />
          </TouchableOpacity>
        </View>

          <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: THEME.softBlue }]}>
            <Text style={styles.statNum}>{stats.totalPatients}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
            <View style={styles.statGraphStub}>
              <View style={[styles.graphBar, { height: "40%", backgroundColor: THEME.accentBlue }]} />
              <View style={[styles.graphBar, { height: "70%", backgroundColor: THEME.accentBlue }]} />
              <View style={[styles.graphBar, { height: "50%", backgroundColor: THEME.accentBlue }]} />
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: THEME.softPurple }]}>
            <Text style={[styles.statNum, { color: THEME.accentPurple }]}>
              {stats.waiting.toString().padStart(2, "0")}
            </Text>
            <Text style={styles.statLabel}>Waiting Now</Text>
            <Ionicons name="people" size={24} color={THEME.accentPurple} style={styles.statIcon} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Command Center</Text>
        <View style={styles.actionGrid}>
          <ActionTile
            icon="calendar"
            label="My Schedule"
            color={THEME.accentBlue}
            sub="Add / Update"
            onPress={() => navigation.navigate("AddScheduleScreen")}
          />
          <ActionTile
            icon="list"
            label="View Queue"
            color={THEME.accentPurple}
            sub={`${stats.waiting} Waiting`}
            onPress={() => navigation.navigate("DoctorQueueControl")}
          />
          <ActionTile
            icon="search"
            label="Search Patient"
            color={THEME.textGray}
            sub="Records"
            onPress={() => navigation.navigate("DoctorPatients")}
          />
          <ActionTile
            icon="receipt"
            label="Prescriptions"
            color={THEME.accentGreen}
            sub="History"
            onPress={() => navigation.navigate("DoctorPrescriptions")}
          />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// Helper component for buttons
const ActionTile = ({ icon, label, color, sub, onPress }: any) => (
  <TouchableOpacity style={styles.tile} onPress={onPress}>
    <View style={[styles.tileIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={styles.tileSub}>{sub}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  container: { padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  body: { flex: 1, backgroundColor: THEME.background },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: { fontSize: 13, color: THEME.textGray },
  docName: { fontSize: 18, fontWeight: "800", color: THEME.textDark },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },

  statsGrid: { flexDirection: "row", gap: 15, marginBottom: 20 },
  statCard: { flex: 1, padding: 20, borderRadius: 28, height: 160, justifyContent: "space-between" },
  statNum: { fontSize: 32, fontWeight: "900", color: THEME.accentBlue },
  statLabel: { fontSize: 14, fontWeight: "700", color: THEME.textDark },
  statGraphStub: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 30 },
  graphBar: { width: 6, borderRadius: 3 },
  statIcon: { alignSelf: "flex-end" },

  focusCard: {
    backgroundColor: THEME.textDark,
    borderRadius: 32,
    padding: 24,
    marginBottom: 30,
    elevation: 2,
    shadowColor: THEME.textDark,
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  focusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.accentGreen },
  liveText: { fontSize: 10, fontWeight: "800", color: THEME.white },
  tokenText: { fontSize: 14, color: THEME.white, opacity: 0.7, fontWeight: "700" },
  patientName: { fontSize: 24, fontWeight: "bold", color: THEME.white },
  patientCondition: { fontSize: 14, color: THEME.white, opacity: 0.6, marginTop: 4, marginBottom: 20 },
  startBtn: {
    backgroundColor: THEME.accentBlue,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  startBtnText: { color: THEME.white, fontWeight: "bold", fontSize: 16 },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: THEME.textDark, marginBottom: 15 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 15 },
  tile: { width: (width - 55) / 2, backgroundColor: THEME.white, padding: 20, borderRadius: 24 },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  tileLabel: { fontSize: 15, fontWeight: "700", color: THEME.textDark },
  tileSub: { fontSize: 12, color: THEME.textGray, marginTop: 2 },
});
