import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import { apiFetch } from "../../config/api";

const { width } = Dimensions.get("window");

const THEME = {
  primaryBlue: "#2196F3",
  lightBlueBg: "#E3F2FD",
  background: "#F2F5F9",
  accentBlue: "#2196F3",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6A6D7C",
  border: "#E0E0E0",
  cardRadius: 20,
};

type QueueStatus = {
  sessionId?: number | null;
  status?: string;
  queueStarted?: boolean;
  currentToken?: number | null;
  nowServing?: number | null;
  patientToken?: number | null;
  estimatedWaitMinutes?: number | null;
  patientStatus?: string | null;
};

export default function BluePatientDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const [profileName, setProfileName] = useState<string>("Patient");
  const [latestPrescription, setLatestPrescription] = useState<any | null>(null);
  const [nextBooking, setNextBooking] = useState<any | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profileResult, bookingResult, prescriptionResult] = await Promise.allSettled([
        apiFetch("/api/patients/me"),
        apiFetch("/api/patients/bookings"),
        apiFetch("/api/patients/prescriptions?latest=true"),
      ]);

      if (profileResult.status === "fulfilled" && profileResult.value.ok) {
        const profile = await profileResult.value.json();
        setProfileName(profile?.name ?? "Patient");
      }

      let selectedBooking: any | null = null;
      if (bookingResult.status === "fulfilled" && bookingResult.value.ok) {
        const bookingData = await bookingResult.value.json();
        const upcoming = (Array.isArray(bookingData) ? bookingData : [])
          .filter((item: any) => String(item?.status ?? "booked") !== "cancelled")
          .map((item: any) => {
            const date = String(item?.date ?? "");
            const time = String(item?.time ?? "00:00");
            const combined = new Date(`${date}T${time}`);
            return { ...item, combined };
          })
          .filter((item: any) => !Number.isNaN(item.combined.getTime()))
          .filter((item: any) => item.combined >= new Date())
          .sort((a: any, b: any) => a.combined.getTime() - b.combined.getTime());
        selectedBooking = upcoming[0] ?? null;
        setNextBooking(selectedBooking);
      } else {
        setNextBooking(null);
      }

      if (prescriptionResult.status === "fulfilled" && prescriptionResult.value.ok) {
        const data = await prescriptionResult.value.json();
        setLatestPrescription(data ?? null);
      } else {
        setLatestPrescription(null);
      }

      if (selectedBooking?.doctor_id) {
        const selectedClinicId =
          selectedBooking?.medical_center_id ?? selectedBooking?.clinic_id ?? null;
        const queueRes = await apiFetch(
          `/api/patients/doctor/queue-status/${selectedBooking.doctor_id}${
            selectedClinicId ? `?clinicId=${encodeURIComponent(selectedClinicId)}` : ""
          }`
        );
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          setQueueStatus(queueData ?? null);
        } else {
          setQueueStatus(null);
        }
      } else {
        setQueueStatus(null);
      }

      const failedRequests = [profileResult, bookingResult, prescriptionResult].filter(
        (result) => result.status === "rejected"
      );

      if (failedRequests.length > 0) {
        const firstError = failedRequests[0] as PromiseRejectedResult;
        const message =
          firstError.reason instanceof Error
            ? firstError.reason.message
            : "Some dashboard data could not be loaded";
        setLoadError(message);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const currentStatus = useMemo(() => {
    if (queueStatus?.patientToken && ["WAITING", "WITH_DOCTOR"].includes(String(queueStatus?.patientStatus))) {
      return "queue";
    }
    if (nextBooking) return "appointment";
    return "empty";
  }, [queueStatus, nextBooking]);

  const nowServing = Number(queueStatus?.currentToken ?? queueStatus?.nowServing ?? 0);
  const yourNumber = Number(queueStatus?.patientToken ?? 0);
  const progressPct = useMemo(() => {
    if (!yourNumber) return 0;
    return Math.min((nowServing / Math.max(yourNumber, 1)) * 100, 100);
  }, [nowServing, yourNumber]);

  const reminderMedicine = useMemo(() => {
    const meds = Array.isArray(latestPrescription?.medicines)
      ? latestPrescription.medicines
      : [];
    return meds[0] ?? null;
  }, [latestPrescription]);

  const recentDoctor =
    latestPrescription?.doctor?.name ??
    latestPrescription?.doctor_name ??
    latestPrescription?.doctorName ??
    "Doctor";

  const recentDate = latestPrescription?.issuedAt
    ? new Date(latestPrescription.issuedAt).toLocaleDateString()
    : latestPrescription?.createdAt
      ? new Date(latestPrescription.createdAt).toLocaleDateString()
      : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. Header Section */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.userName}>{profileName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={24} color={THEME.primaryBlue} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        ) : null}
        
        {/* 2. Dynamic Main Card (Blue Gradient) */}
        {currentStatus === "queue" && (
          <LinearGradient 
            colors={[THEME.lightBlueBg, "#DBEAFE"]} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={styles.mainCard}
          >
            <View style={styles.mainCardHeader}>
              <Text style={styles.mainCardLabel}>Live Queue</Text>
              <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
            </View>
            <View style={styles.queueContent}>
              <View>
                <Text style={styles.queueNumber}>{yourNumber || "—"}</Text>
                <Text style={styles.queueSub}>Your Number</Text>
              </View>
              <View style={styles.queueDivider} />
              <View>
                <Text style={styles.queueNumberSmall}>{nowServing || "—"}</Text>
                <Text style={styles.queueSub}>Now Serving</Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
               <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.waitText}>
              Estimated wait:{" "}
              <Text style={{ fontWeight: "800" }}>
                {queueStatus?.estimatedWaitMinutes ?? 0} mins
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.mainCardBtn}
              onPress={() =>
                navigation.navigate("PatientQueue", {
                  doctorId: nextBooking?.doctor_id,
                  clinicId: nextBooking?.medical_center_id ?? nextBooking?.clinic_id,
                  sessionId: queueStatus?.sessionId ? Number(queueStatus.sessionId) : undefined,
                })
              }
            >
              <Text style={styles.mainCardBtnText}>Check Details</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
        {currentStatus === "appointment" && (
          <View style={styles.appointmentCard}>
            <View style={styles.appointmentRow}>
              <View>
                <Text style={styles.mainCardLabelDark}>Upcoming Appointment</Text>
                <Text style={styles.appointmentDoctor}>
                  {nextBooking?.doctor_name ?? "Doctor"}
                </Text>
                <Text style={styles.appointmentMeta}>
                  {nextBooking?.date ?? "—"} • {formatBookingTime(nextBooking?.time)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.appointmentBtn}
                onPress={() =>
                  navigation.navigate("PatientTabs", { screen: "PatientAppointments" })
                }
              >
                <Text style={styles.appointmentBtnText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {currentStatus === "empty" && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyRow}>
              <Ionicons name="calendar-outline" size={24} color={THEME.primaryBlue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>No upcoming appointments</Text>
                <Text style={styles.emptySub}>Book a doctor to get started.</Text>
              </View>
              <TouchableOpacity
                style={styles.appointmentBtn}
                onPress={() => navigation.navigate("DoctorSearchScreen")}
              >
                <Text style={styles.appointmentBtnText}>Book</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 3. Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          <ActionTile
            icon="calendar-outline"
            label="Book Appt"
            onPress={() => navigation.navigate("DoctorSearchScreen")}
          />
          <ActionTile
            icon="document-text-outline"
            label="Lab Reports"
            onPress={() => navigation.navigate("MedicalHistoryScreen")}
          />
          <ActionTile
            icon="medkit-outline"
            label="Pharmacy"
            onPress={() =>
              navigation.navigate("PatientPrescriptions")
            }
          />
          <ActionTile
            icon="search-outline"
            label="Find Doctor"
            onPress={() => navigation.navigate("DoctorSearchScreen")}
          />
        </View>

        {/* 4. Reminder Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
        {reminderMedicine ? (
          <View style={styles.reminderCard}>
            <View style={styles.reminderIconBox}>
              <MaterialCommunityIcons name="pill" size={26} color={THEME.primaryBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderName}>
                {reminderMedicine.name ?? reminderMedicine.medicine_name ?? "Medicine"}
              </Text>
              <Text style={styles.reminderTime}>
                {reminderMedicine.instructions ??
                  reminderMedicine.frequency ??
                  "Follow prescription instructions"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.takeNowBtn}
              onPress={() => navigation.navigate("MedicineTracker")}
            >
              <Text style={styles.takeNowText}>Track</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyReminder}>
            <Text style={styles.emptyReminderText}>
              {loading ? "Loading reminders..." : "No reminders yet."}
            </Text>
          </View>
        )}

        {/* 5. Recent Activity Section */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {latestPrescription ? (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="medical-outline" size={22} color={THEME.primaryBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>Consultation Completed</Text>
              <Text style={styles.activitySub}>
                {recentDoctor} • {recentDate}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
          </View>
        ) : (
          <View style={styles.emptyReminder}>
            <Text style={styles.emptyReminderText}>
              {loading ? "Loading activity..." : "No recent activity yet."}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
const ActionTile = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={styles.tile} onPress={onPress}>
    <View style={styles.tileIconBox}>
      <Ionicons name={icon} size={28} color={THEME.primaryBlue} />
    </View>
    <Text style={styles.tileLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.white,
    gap: 12,
  },
  headerText: { flex: 1, alignItems: "flex-start" },
  greetingText: { fontSize: 14, color: THEME.textSecondary, fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '800', color: THEME.textPrimary },
  headerActions: { flexDirection: 'row', gap: 12, alignItems: "center" },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME.lightBlueBg, justifyContent: 'center', alignItems: 'center' },
  notifDot: { position: 'absolute', top: 14, right: 15, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: THEME.white },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
  },
  
  // Main Status Card
  mainCard: {
    padding: 20,
    borderRadius: THEME.cardRadius,
    marginTop: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainCardLabel: { color: THEME.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  liveBadge: { backgroundColor: THEME.white, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveText: { color: THEME.primaryBlue, fontSize: 10, fontWeight: '900' },
  queueContent: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 24 },
  queueNumber: { fontSize: 52, fontWeight: '900', color: THEME.textPrimary },
  queueNumberSmall: { fontSize: 34, fontWeight: '800', color: THEME.textSecondary },
  queueSub: { color: THEME.textSecondary, fontSize: 13, fontWeight: '600' },
  queueDivider: { width: 1, height: 45, backgroundColor: THEME.border },
  progressBarBg: { height: 8, backgroundColor: THEME.white, borderRadius: 4, marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: THEME.primaryBlue, borderRadius: 4 },
  waitText: { color: THEME.textSecondary, fontSize: 14 },
  mainCardBtn: { backgroundColor: THEME.lightBlueBg, paddingVertical: 12, borderRadius: 999, marginTop: 18, alignItems: 'center' },
  mainCardBtnText: { color: THEME.primaryBlue, fontWeight: '800', fontSize: 14 },
  appointmentCard: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  appointmentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  appointmentDoctor: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary, marginTop: 6 },
  appointmentMeta: { fontSize: 13, color: THEME.textSecondary, marginTop: 6 },
  appointmentBtn: {
    backgroundColor: THEME.lightBlueBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  appointmentBtnText: { color: THEME.primaryBlue, fontWeight: "800", fontSize: 12 },
  mainCardLabelDark: {
    color: THEME.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  emptySub: { fontSize: 13, color: THEME.textSecondary, marginTop: 4 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, marginBottom: 14, marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { color: THEME.primaryBlue, fontWeight: '700', fontSize: 14 },

  // Quick Actions Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 24 },
  tile: { width: (width - 55) / 2, backgroundColor: THEME.white, padding: 18, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  tileIconBox: { width: 54, height: 54, borderRadius: 16, backgroundColor: THEME.lightBlueBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  tileLabel: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },

  // Reminders
  reminderCard: { backgroundColor: THEME.white, padding: 18, borderRadius: THEME.cardRadius, flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  reminderIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: THEME.lightBlueBg, justifyContent: 'center', alignItems: 'center' },
  reminderName: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary },
  reminderTime: { fontSize: 14, color: THEME.textSecondary, marginTop: 2 },
  takeNowBtn: { backgroundColor: THEME.lightBlueBg, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  takeNowText: { color: THEME.primaryBlue, fontWeight: '800', fontSize: 12 },

  // Activity
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: THEME.white, padding: 18, borderRadius: THEME.cardRadius, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  activityIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: THEME.lightBlueBg, justifyContent: 'center', alignItems: 'center' },
  activityTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  activitySub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  emptyReminder: {
    backgroundColor: THEME.white,
    padding: 18,
    borderRadius: THEME.cardRadius,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    alignItems: "center",
  },
  emptyReminderText: { fontSize: 13, color: THEME.textSecondary, fontWeight: "600" },
});
  const formatBookingTime = (value?: string) => {
    if (!value) return "—";
    const parts = value.split(":");
    if (parts.length < 2) return value;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return value;
    const hour12 = h % 12 || 12;
    const period = h >= 12 ? "PM" : "AM";
    return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
  };
