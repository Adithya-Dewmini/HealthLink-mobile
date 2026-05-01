import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import {
  fetchClinicDoctorSchedule,
  generateSessionSlots,
  type ClinicDoctorScheduleResponse,
} from "../../services/patientClinicScheduleService";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E3F2FD",
  accentAmber: "#FF9800",
  softAmber: "#FFF3E0",
  accentGreen: "#16A34A",
  softGreen: "#E8F5E9",
  border: "#E0E6ED",
};

const formatTime = (value: string) => {
  const [hourStr, minute] = String(value).slice(0, 5).split(":");
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${String(normalized).padStart(2, "0")}:${minute} ${period}`;
};

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

export default function DoctorAvailabilityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "DoctorAvailabilityScreen">>();
  const { doctorId, clinicId, clinicName: clinicNameParam, doctorName, specialty } = route.params;

  const [schedule, setSchedule] = useState<ClinicDoctorScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSchedule(await fetchClinicDoctorSchedule(clinicId, doctorId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clinic schedule");
        setSchedule(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [clinicId, doctorId]);

  const upcomingSessions = useMemo(() => (schedule?.sessions ?? []).slice(0, 7), [schedule]);
  const clinicName = schedule?.clinic_name || clinicNameParam || "Clinic";
  const nextSession = schedule?.next_session ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinic Schedule</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Ionicons name="medkit-outline" size={24} color={THEME.accentBlue} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.doctorName}>{doctorName || schedule?.doctor_name || "Doctor"}</Text>
            <Text style={styles.specialty}>{specialty || schedule?.specialization || "General Physician"}</Text>
            <Text style={styles.clinicLabel}>Available at {clinicName}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator size="small" color={THEME.accentBlue} />
            <Text style={styles.feedbackText}>Loading clinic schedule</Text>
          </View>
        ) : error ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Not available at this clinic</Text>
            <Text style={styles.feedbackText}>{error}</Text>
          </View>
        ) : !schedule || schedule.sessions.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Not available at this clinic</Text>
            <Text style={styles.feedbackText}>No clinic-defined sessions are open for booking right now.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Next session</Text>
              {nextSession ? (
                <>
                  <Text style={styles.summaryPrimary}>{formatDate(nextSession.date)}</Text>
                  <Text style={styles.summarySecondary}>
                    {formatTime(nextSession.start_time)} - {formatTime(nextSession.end_time)}
                  </Text>
                  <Text style={styles.summaryMeta}>
                    {nextSession.available_slots} slots left • {nextSession.slot_duration} min slots
                  </Text>
                </>
              ) : (
                <Text style={styles.summarySecondary}>No upcoming session</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Upcoming clinic sessions</Text>

            {upcomingSessions.map((session) => {
              const generatedSlots = generateSessionSlots(session);
              const isClosed = session.status === "CLOSED";
              const isLive = session.status === "LIVE";
              const isFull = session.is_fully_booked;

              return (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionTopRow}>
                    <View>
                      <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                      <Text style={styles.sessionTime}>
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </Text>
                    </View>
                    <View
                        style={[
                        styles.statusBadge,
                        isClosed
                          ? styles.closedBadge
                          : isLive
                            ? styles.openBadge
                          : isFull
                            ? styles.fullBadge
                            : styles.openBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isClosed
                            ? styles.closedBadgeText
                            : isLive
                              ? styles.openBadgeText
                            : isFull
                              ? styles.fullBadgeText
                              : styles.openBadgeText,
                        ]}
                      >
                        {isClosed ? "Session Ended" : isLive ? "Join Queue" : isFull ? "Fully booked" : "Book Slot"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sessionMeta}>
                    Working hours: {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    Available slots: {Math.max(0, session.available_slots)} / {generatedSlots.length || session.max_patients}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.mainActionBtn}
          onPress={() =>
            navigation.navigate("BookAppointmentScreen", {
              doctorId,
              clinicId,
              clinicName,
              doctorName: doctorName || schedule?.doctor_name,
              specialty: specialty || schedule?.specialization,
            })
          }
        >
          <Text style={styles.actionBtnText}>Book at {clinicName}</Text>
          <Ionicons name="arrow-forward" size={18} color={THEME.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  headerSpacer: { width: 32 },
  content: {
    padding: 20,
    backgroundColor: THEME.background,
    paddingBottom: 120,
  },
  heroCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  doctorName: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  specialty: { fontSize: 13, color: THEME.textGray, marginTop: 4 },
  clinicLabel: { fontSize: 14, color: THEME.accentBlue, fontWeight: "600", marginTop: 6 },
  feedbackCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
  },
  feedbackTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  feedbackText: { fontSize: 14, color: THEME.textGray, textAlign: "center", lineHeight: 21, marginTop: 10 },
  summaryCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 12 },
  summaryPrimary: { fontSize: 16, fontWeight: "700", color: THEME.textDark },
  summarySecondary: { fontSize: 14, color: THEME.textGray, marginTop: 4 },
  summaryMeta: { fontSize: 13, color: THEME.accentBlue, marginTop: 8, fontWeight: "600" },
  sessionCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  sessionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sessionDate: { fontSize: 16, fontWeight: "700", color: THEME.textDark },
  sessionTime: { fontSize: 14, color: THEME.textGray, marginTop: 5 },
  sessionMeta: { fontSize: 13, color: THEME.textGray, marginTop: 8 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  openBadge: { backgroundColor: THEME.softGreen },
  openBadgeText: { color: THEME.accentGreen },
  fullBadge: { backgroundColor: THEME.softAmber },
  fullBadgeText: { color: THEME.accentAmber },
  closedBadge: { backgroundColor: "#EEF2F7" },
  closedBadgeText: { color: THEME.textGray },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.white,
    padding: 20,
    paddingBottom: 32,
  },
  mainActionBtn: {
    backgroundColor: THEME.accentBlue,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: { color: THEME.white, fontSize: 15, fontWeight: "700" },
});
