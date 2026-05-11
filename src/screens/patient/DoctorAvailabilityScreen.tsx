import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import type { PatientStackParamList } from "../../types/navigation";
import {
  fetchClinicDoctorSchedule,
  generateSessionSlots,
  type ClinicDoctorScheduleResponse,
} from "../../services/patientClinicScheduleService";
import {
  formatSessionDateLabel,
  formatSessionFullDateLabel,
  formatSessionTimeLabel,
} from "../../utils/sessionPresentation";
import {
  getSocket,
  joinClinicScheduleRoom,
  leaveClinicScheduleRoom,
} from "../../services/socket";
import { patientTheme } from "../../constants/patientTheme";
import PatientDoctorInfoCard from "../../components/patient/PatientDoctorInfoCard";

const THEME = patientTheme.colors;
const MODERN_THEME = {
  primary: patientTheme.colors.modernPrimary,
  white: patientTheme.colors.modernSurface,
};

const formatTime = (value: string) => formatSessionTimeLabel(value);
const formatDate = (value: string) => formatSessionFullDateLabel(value);
const formatDay = (value: string) => formatSessionDateLabel(value);

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

  useEffect(() => {
    joinClinicScheduleRoom(clinicId);
    const socket = getSocket();

    const reload = (payload?: { clinicId?: string }) => {
      if (payload?.clinicId && String(payload.clinicId) !== String(clinicId)) {
        return;
      }

      void fetchClinicDoctorSchedule(clinicId, doctorId)
        .then((data) => {
          setSchedule(data);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load clinic schedule");
        });
    };

    socket.on("clinic:schedule-update", reload);
    socket.on("clinic:queue-update", reload);

    return () => {
      socket.off("clinic:schedule-update", reload);
      socket.off("clinic:queue-update", reload);
      leaveClinicScheduleRoom(clinicId);
    };
  }, [clinicId, doctorId]);

  const upcomingSessions = useMemo(() => (schedule?.sessions ?? []).slice(0, 7), [schedule]);
  const clinicName = schedule?.clinic_name || clinicNameParam || "Clinic";
  const nextSession = schedule?.next_session ?? null;
  const totalAvailableSlots = useMemo(
    () => upcomingSessions.reduce((sum, session) => sum + Math.max(0, session.available_slots), 0),
    [upcomingSessions]
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[MODERN_THEME.primary, "#1E293B"]} style={styles.headerBackground} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.frozenHero}>
          <View style={styles.heroShell}>
            <View style={styles.navBar}>
              <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color={MODERN_THEME.white} />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Clinic Schedule</Text>
              <View style={styles.navSpacer} />
            </View>

            <PatientDoctorInfoCard
              name={doctorName || schedule?.doctor_name || "Doctor"}
              specialty={specialty || schedule?.specialization || "General Physician"}
              locationLabel={clinicName}
              compact
            />

            <View style={styles.heroStatsCard}>
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatPill}>
                  <Text style={styles.heroStatText}>{upcomingSessions.length} sessions</Text>
                </View>
                <View style={styles.heroStatPill}>
                  <Text style={styles.heroStatText}>{totalAvailableSlots} open slots</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <LinearGradient
              colors={["#DDEEFF", "#E6FBF7", "#F8FEFD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <View style={styles.summaryAccent} />
              <View style={styles.summaryHeaderRow}>
                <View>
                  <Text style={styles.summaryTitle}>Next session</Text>
                </View>
                {nextSession ? <Text style={styles.summaryHint}>Upcoming</Text> : null}
              </View>
              {nextSession ? (
                <>
                  <Text style={styles.summaryPrimary}>{formatDate(nextSession.date)}</Text>
                  <Text style={styles.summarySecondary}>
                    {formatTime(nextSession.start_time)} - {formatTime(nextSession.end_time)}
                  </Text>
                  <View style={styles.summaryMetaRow}>
                    <View style={styles.summaryMetaPill}>
                      <Ionicons name="people-outline" size={14} color={THEME.textGray} />
                      <Text style={styles.summaryMetaText}>{nextSession.available_slots} slots left</Text>
                    </View>
                    <View style={styles.summaryMetaPill}>
                      <Ionicons name="timer-outline" size={14} color={THEME.textGray} />
                      <Text style={styles.summaryMetaText}>{nextSession.slot_duration} min each</Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.summarySecondary}>No upcoming session</Text>
              )}
            </LinearGradient>

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Upcoming clinic sessions</Text>
                <Text style={styles.sectionSubtext}>Choose a session and continue to booking</Text>
              </View>
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountText}>{upcomingSessions.length}</Text>
              </View>
            </View>

            {upcomingSessions.map((session) => {
              const generatedSlots = generateSessionSlots(session);
              const isClosed = session.status === "CLOSED";
              const isLive = session.status === "LIVE";
              const isFull = session.is_fully_booked;
              const statusLabel = isClosed
                ? "Session Ended"
                : isLive
                  ? "Join Queue"
                  : isFull
                    ? "Fully Booked"
                    : "Book Slot";
              const slotCount = generatedSlots.length || session.max_patients;

              return (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionTopRow}>
                    <View style={styles.sessionMainCopy}>
                      <View style={styles.sessionDateRow}>
                        <View style={styles.sessionMiniBadge}>
                          <Text style={styles.sessionMiniBadgeText}>{formatDay(session.date)}</Text>
                        </View>
                      </View>
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
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sessionInfoGrid}>
                    <View style={styles.infoChip}>
                      <Ionicons name="time-outline" size={15} color={THEME.textGray} />
                      <Text style={styles.infoChipText}>
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </Text>
                    </View>
                    <View style={styles.infoChip}>
                      <Ionicons
                        name={isFull ? "close-circle-outline" : "checkmark-circle-outline"}
                        size={15}
                        color={isFull ? THEME.accentAmber : THEME.accentGreen}
                      />
                      <Text style={styles.infoChipText}>
                        {Math.max(0, session.available_slots)} / {slotCount} open
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sessionMeta}>
                    Working hours: {formatTime(session.start_time)} - {formatTime(session.end_time)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FCFE" },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 168,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
  frozenHero: {
    zIndex: 2,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  navTitle: { fontSize: 18, fontWeight: "700", color: MODERN_THEME.white },
  navSpacer: { width: 40 },
  content: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 132,
  },
  heroShell: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  heroStatsCard: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E6F0F5",
    backgroundColor: THEME.white,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginTop: 12,
  },
  heroStatsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  heroStatPill: {
    backgroundColor: "#F8FBFD",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#EAF2F6",
  },
  heroStatText: { fontSize: 11, color: THEME.textGray, fontWeight: "600" },
  feedbackCard: {
    backgroundColor: THEME.white,
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E6F0F5",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  feedbackTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  feedbackText: { fontSize: 14, color: THEME.textGray, textAlign: "center", lineHeight: 21, marginTop: 10 },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#BFD9F3",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    overflow: "hidden",
  },
  summaryAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: THEME.accentBlue,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
    paddingLeft: 8,
  },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: THEME.modernPrimary, textTransform: "uppercase", letterSpacing: 0.8 },
  summaryHint: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F766E",
    backgroundColor: "#C9F4EA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: THEME.textDark, marginBottom: 4 },
  sectionSubtext: { fontSize: 12, color: THEME.textGray, lineHeight: 18 },
  summaryPrimary: { fontSize: 21, fontWeight: "800", color: THEME.modernPrimary, lineHeight: 26, paddingLeft: 8 },
  summarySecondary: { fontSize: 15, color: THEME.textDark, marginTop: 6, paddingLeft: 8, fontWeight: "600" },
  summaryMetaRow: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap", paddingLeft: 8 },
  summaryMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#C7DCF4",
  },
  summaryMetaText: { fontSize: 11, color: THEME.modernPrimary, fontWeight: "700" },
  sectionHeaderRow: {
    marginHorizontal: 20,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionCountPill: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FBFD",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E6F0F5",
  },
  sectionCountText: { fontSize: 12, fontWeight: "700", color: THEME.textDark },
  sessionCard: {
    backgroundColor: THEME.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E6F0F5",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sessionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sessionMainCopy: { flex: 1 },
  sessionDateRow: { flexDirection: "row", marginBottom: 8 },
  sessionMiniBadge: {
    backgroundColor: "#F1F8FC",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  sessionMiniBadgeText: { fontSize: 10, color: THEME.accentBlue, fontWeight: "600" },
  sessionDate: { fontSize: 16, fontWeight: "700", color: THEME.textDark, lineHeight: 21 },
  sessionTime: { fontSize: 13, color: THEME.textGray, marginTop: 3 },
  sessionInfoGrid: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 12 },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F8FBFD",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#EAF2F6",
  },
  infoChipText: { fontSize: 11, color: THEME.textDark, fontWeight: "600" },
  sessionMeta: { fontSize: 12, color: THEME.textGray, marginTop: 10 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
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
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.06)",
  },
  mainActionBtn: {
    backgroundColor: THEME.accentBlue,
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: THEME.accentBlue,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  actionBtnText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
});
