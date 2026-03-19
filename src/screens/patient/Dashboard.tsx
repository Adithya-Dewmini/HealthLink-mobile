import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { PatientStackParamList, PatientTabParamList } from "../../types/navigation";

// Using the exact same Soft-UI theme 
const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  mint: "#E1F1E7",
  lavender: "#E9E7F7",
  softBlue: "#E1EEF9",
  softRed: "#FFE5E5",
  accentGreen: "#4CAF50",
  accentPurple: "#9C27B0",
  accentBlue: "#2196F3",
  accentRed: "#FF5252",
};

export default function PatientDashboard() {
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<PatientTabParamList, "PatientDashboard">,
      NativeStackNavigationProp<PatientStackParamList>
    >
  >();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const REQUEST_TIMEOUT_MS = 12000;

  const fetchProfile = useCallback(async (isRefresh = false) => {
    setError(null);
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { setError("Not logged in"); return; }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await apiFetch("/api/patients/me", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setProfile(data);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Request timed out. Please check your connection and try again.");
      } else {
        setError(err.message || "Server Error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.accentBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Unable to load dashboard</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProfile()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning 👋</Text>
          <Text style={styles.profileName}>{profile?.name || "Patient"}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={20} color={THEME.textDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => navigation.navigate("PatientSettings")}
          >
            <Ionicons name="settings-outline" size={20} color={THEME.textDark} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileCircle}
            onPress={() => navigation.navigate("PatientProfile")}
          >
            <Ionicons name="person" size={22} color={THEME.textGray} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} />}
      >
        
        {/* 2. Active Appointment Card */}
        <View style={styles.appointmentCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTag}>Next Appointment</Text>
            <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <Text style={styles.docName}>Dr. Silva</Text>
          <Text style={styles.apptTime}>Today • 10:30 AM</Text>
          
          <View style={styles.queueInfoBox}>
            <View style={styles.queueItem}>
              <Text style={styles.queueLabel}>Your Token</Text>
              <Text style={styles.queueValue}>14</Text>
            </View>
            <View style={[styles.queueItem, { borderLeftWidth: 1, borderColor: '#DDD' }]}>
              <Text style={styles.queueLabel}>Now Serving</Text>
              <Text style={[styles.queueValue, { color: THEME.accentGreen }]}>10</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewQueueBtn}
            onPress={() => navigation.navigate("PatientQueue")}
          >
            <Text style={styles.viewQueueText}>View Queue Status</Text>
            <Ionicons name="arrow-forward" size={18} color={THEME.white} />
          </TouchableOpacity>
        </View>

        {/* 3. Health Tracking Section */}
        <Text style={styles.sectionTitle}>Health Tracking</Text>
        <View style={styles.grid}>
          <MetricCard 
            title="Heart Rate" 
            value="80" 
            unit="bpm" 
            icon="heart" 
            color={THEME.softBlue} 
            iconColor={THEME.accentBlue}
            onPress={() => navigation.navigate("HeartRateScreen")}
          />
          <MetricCard 
            title="Sleep" 
            value="7.5" 
            unit="hrs" 
            icon="moon" 
            color={THEME.lavender} 
            iconColor={THEME.accentPurple}
            onPress={() => navigation.navigate("SleepTrackerScreen")}
          />
        </View>

        {/* 4. Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionList}>
          <ActionItem 
            icon="calendar" 
            label="Book Appointment" 
            onPress={() => navigation.navigate("DoctorSearchScreen")} 
          />
          <ActionItem 
            icon="medical" 
            label="My Prescriptions" 
            onPress={() => navigation.navigate("PatientPrescriptions")} 
          />
          <ActionItem 
            icon="document-text" 
            label="Medical History" 
            onPress={() => navigation.navigate("MedicalHistoryScreen")} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
const MetricCard = ({ title, value, unit, icon, color, iconColor, onPress }: any) => (
  <TouchableOpacity style={[styles.metricCard, { backgroundColor: color }]} onPress={onPress}>
    <Ionicons name={icon} size={24} color={iconColor} />
    <View style={{ marginTop: 12 }}>
      <Text style={styles.metricValue}>{value} <Text style={styles.metricUnit}>{unit}</Text></Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const ActionItem = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={styles.actionIconCircle}>
      <Ionicons name={icon} size={20} color={THEME.accentBlue} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  scrollContent: { padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 6 },
  errorText: { fontSize: 13, color: THEME.textGray, textAlign: "center", marginBottom: 12 },
  retryBtn: {
    backgroundColor: THEME.textDark,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  retryText: { color: THEME.white, fontWeight: "700" },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  rowBetween: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
  greeting: { fontSize: 14, color: THEME.textGray },
  profileName: { fontSize: 20, fontWeight: "bold", color: THEME.textDark },
  headerIcons: { flexDirection: "row", gap: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  profileCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.lavender, justifyContent: "center", alignItems: "center", overflow: 'hidden' },

  appointmentCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  cardTag: { fontSize: 12, fontWeight: "bold", color: THEME.accentBlue, textTransform: 'uppercase' },
  liveBadge: { backgroundColor: THEME.softRed || '#FFE5E5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  liveText: { fontSize: 10, fontWeight: "bold", color: THEME.accentRed },
  docName: { fontSize: 22, fontWeight: "bold", color: THEME.textDark, marginTop: 8 },
  apptTime: { fontSize: 14, color: THEME.textGray, marginTop: 4 },
  
  queueInfoBox: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    borderRadius: 16,
    padding: 15,
    marginTop: 20,
  },
  queueItem: { flex: 1, alignItems: "center" },
  queueLabel: { fontSize: 11, color: THEME.textGray, textTransform: 'uppercase' },
  queueValue: { fontSize: 20, fontWeight: "bold", color: THEME.textDark, marginTop: 4 },

  viewQueueBtn: {
    backgroundColor: THEME.textDark,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 15,
  },
  viewQueueText: { color: THEME.white, fontWeight: "bold", marginRight: 8 },

  sectionTitle: { fontSize: 18, fontWeight: "bold", color: THEME.textDark, marginBottom: 15, marginTop: 5 },
  grid: { flexDirection: "row", gap: 15, marginBottom: 25 },
  metricCard: { flex: 1, padding: 20, borderRadius: 24 },
  metricValue: { fontSize: 22, fontWeight: "bold", color: THEME.textDark },
  metricUnit: { fontSize: 12, fontWeight: "normal", color: THEME.textGray },
  metricTitle: { fontSize: 14, color: THEME.textGray, marginTop: 4 },

  actionList: { gap: 10 },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
  },
  actionIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME.softBlue, justifyContent: "center", alignItems: "center", marginRight: 15 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: THEME.textDark },
});
