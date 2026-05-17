import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from 'expo-linear-gradient';

// Project imports - verify paths match your project structure
import type { PatientStackParamList } from "../../types/navigation";
import { apiFetch } from "../../config/api";
import {
  fetchClinicDoctorBookedSlots,
  fetchClinicDoctorSchedule,
  generateSessionSlots,
  type ClinicDoctorScheduleResponse,
} from "../../services/patientClinicScheduleService";
import { formatLocalDateKey } from "../../utils/sessionPresentation";
import {
  getSocket,
  joinClinicScheduleRoom,
  leaveClinicScheduleRoom,
} from "../../services/socket";
import { patientTheme } from "../../constants/patientTheme";
import PatientDoctorInfoCard from "../../components/patient/PatientDoctorInfoCard";

const { width } = Dimensions.get('window');

// Futuristic Theme Palette
const MODERN_THEME = {
  primary: patientTheme.colors.modernPrimary,
  primaryAlt: patientTheme.colors.modernPrimaryAlt,
  accent: patientTheme.colors.modernAccent,
  accentDark: patientTheme.colors.modernAccentDark,
  success: patientTheme.colors.accentGreen,
  warning: patientTheme.colors.accentAmber,
  danger: patientTheme.colors.accentRed,
  bg: patientTheme.colors.modernBackground,
  white: patientTheme.colors.modernSurface,
  glass: "rgba(255, 255, 255, 0.8)",
  border: patientTheme.colors.modernBorder,
  textMain: patientTheme.colors.modernText,
  textMuted: patientTheme.colors.modernMuted,
};

// --- Helper Functions ---
const formatTime = (value: string) => {
  const [hourStr, minute] = String(value).slice(0, 5).split(":");
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${String(normalized).padStart(2, "0")}:${minute} ${period}`;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const buildRollingDates = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
};

export default function BookAppointmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "BookAppointmentScreen">>();
  
  const {
    doctorId,
    clinicId,
    clinicName: clinicNameParam,
    doctorName: doctorNameParam,
    specialty: specialtyParam,
  } = route.params ?? {};

  // --- State ---
  const [schedule, setSchedule] = useState<ClinicDoctorScheduleResponse | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const dates = useMemo(() => buildRollingDates(), []);
  const selectedDateKey = useMemo(() => formatLocalDateKey(selectedDate), [selectedDate]);
  const isToday = selectedDateKey === formatLocalDateKey(new Date());

  // --- Logic Hooks ---
  const loadSchedule = useCallback(async () => {
    if (!doctorId || !clinicId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchClinicDoctorSchedule(clinicId, doctorId);
      setSchedule(data);
    } catch (err) {
      Alert.alert("Schedule Unavailable", err instanceof Error ? err.message : "Failed to load clinic schedule");
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [clinicId, doctorId]);

  const loadBookedTimes = useCallback(async () => {
    if (!doctorId || !clinicId) {
      setBookedTimes([]);
      return;
    }
    try {
      const slots = await fetchClinicDoctorBookedSlots(clinicId, doctorId, selectedDateKey);
      setBookedTimes(slots);
    } catch {
      setBookedTimes([]);
    }
  }, [clinicId, doctorId, selectedDateKey]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    void loadBookedTimes();
  }, [loadBookedTimes]);

  const loadQueueStatus = useCallback(async () => {
    if (!doctorId || !clinicId) {
      setQueueInfo(null);
      return;
    }

    try {
      setQueueLoading(true);
      const res = await apiFetch(
        `/api/patients/doctor/queue-status/${doctorId}?clinicId=${encodeURIComponent(clinicId)}`
      );
      if (!res.ok) {
        setQueueInfo(null);
        return;
      }
      setQueueInfo(await res.json());
    } catch {
      setQueueInfo(null);
    } finally {
      setQueueLoading(false);
    }
  }, [clinicId, doctorId]);

  // --- Memos for UI ---
  const sessionsForDay = useMemo(
    () => (schedule?.sessions ?? []).filter((session) => session.date === selectedDateKey),
    [schedule, selectedDateKey]
  );

  const bookableSessionsForDay = useMemo(
    () => sessionsForDay.filter((session) => session.status === "NOT_STARTED"),
    [sessionsForDay]
  );

  const slots = useMemo(() => {
    const unique = new Set<string>();
    bookableSessionsForDay.forEach((session) => {
      generateSessionSlots(session).forEach((slot) => unique.add(slot));
    });
    return Array.from(unique).sort();
  }, [bookableSessionsForDay]);

  const availableSlots = useMemo(
    () => slots.filter((slot) => !bookedTimes.includes(slot)),
    [bookedTimes, slots]
  );

  useEffect(() => {
    if (!availableSlots.length) {
      setSelectedSlot("");
      return;
    }

    if (!selectedSlot || !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(availableSlots[0]);
    }
  }, [availableSlots, selectedSlot]);

  useEffect(() => {
    if (!isToday) {
      setQueueInfo(null);
      setQueueLoading(false);
      return;
    }
    void loadQueueStatus();
  }, [isToday, loadQueueStatus]);

  useEffect(() => {
    if (!clinicId) {
      return;
    }

    joinClinicScheduleRoom(clinicId);
    const socket = getSocket();

    const reload = (payload?: { clinicId?: string }) => {
      if (payload?.clinicId && String(payload.clinicId) !== String(clinicId)) {
        return;
      }

      void loadSchedule();
      void loadBookedTimes();
      if (selectedDateKey === formatLocalDateKey(new Date())) {
        void loadQueueStatus();
      }
    };

    socket.on("clinic:schedule-update", reload);
    socket.on("clinic:queue-update", reload);

    return () => {
      socket.off("clinic:schedule-update", reload);
      socket.off("clinic:queue-update", reload);
      leaveClinicScheduleRoom(clinicId);
    };
  }, [clinicId, loadBookedTimes, loadQueueStatus, loadSchedule, selectedDateKey]);

  const clinicName = schedule?.clinic_name || clinicNameParam || "Clinic";
  const doctorName = schedule?.doctor_name || doctorNameParam || "Doctor";
  const specialty = schedule?.specialization || specialtyParam || "General Physician";

  const dayStatus = useMemo(() => {
    if (!sessionsForDay.length) return "no_session";
    if (sessionsForDay.some((s) => s.status === "LIVE") && isToday) return "live";
    if (bookableSessionsForDay.length > 0) return availableSlots.length > 0 ? "bookable" : "full";
    if (sessionsForDay.every((s) => s.status === "CLOSED")) return "closed";
    return "no_session";
  }, [availableSlots.length, bookableSessionsForDay.length, isToday, sessionsForDay]);

  const isBookable = dayStatus === "bookable";
  const isLive = dayStatus === "live";
  const hasNoSession = dayStatus === "no_session";
  const showSlots = isBookable;

  const dayRangeLabel = useMemo(() => {
    if (!sessionsForDay.length) return "No sessions scheduled";
    return `${formatTime(sessionsForDay[0].start_time)} - ${formatTime(
      sessionsForDay[sessionsForDay.length - 1].end_time
    )}`;
  }, [sessionsForDay]);

  const selectedDateStatusCopy = useMemo(() => {
    switch (dayStatus) {
      case "live": return { title: "Live queue is running", message: "Join the current live queue instead." };
      case "closed": return { title: "Session ended", message: "Choose another date for future slots." };
      case "full": return { title: "No slots left", message: "All time slots for this date are booked." };
      case "no_session": return { title: "No sessions on this date", message: "Choose another day to see available appointments." };
      default: return { title: "Slots available", message: `${availableSlots.length} time slots are open.` };
    }
  }, [availableSlots.length, dayStatus]);

  // --- Actions ---
  const handlePrimaryAction = async () => {
    if ((isLive || (isBookable && selectedSlot)) && !queueLoading) {
      setShowConfirmModal(true);
    }
  };

  const submitBooking = async () => {
    if (!doctorId || !clinicId || !selectedSlot) return;

    try {
      const selectedSession =
        bookableSessionsForDay.find((session) => generateSessionSlots(session).includes(selectedSlot)) ?? null;

      if (!selectedSession) {
        throw new Error("No clinic session matches the selected time");
      }

      if (selectedSession.medical_center_id !== clinicId) {
        throw new Error("Selected session does not belong to this clinic.");
      }

      const res = await apiFetch("/api/patients/bookings", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: doctorId,
          clinic_id: clinicId,
          session_id: selectedSession.id,
          date: selectedDateKey,
          time: selectedSlot,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to book slot");
      }

      setShowConfirmModal(false);
      navigation.navigate("AppointmentSummaryScreen", {
        doctorName,
        clinicName,
        clinicId,
        specialty,
        date: selectedDateKey,
        clinicTime: formatTime(selectedSlot),
        doctorId,
        sessionId: selectedSession.id,
      });
    } catch (err) {
      Alert.alert("Booking Failed", err instanceof Error ? err.message : "Failed to book");
    }
  };

  const joinQueue = async () => {
    if (!doctorId || !clinicId) return;

    try {
      const res = await apiFetch("/api/patients/queue/join", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: doctorId,
          clinic_id: clinicId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to join queue");
      }

      const data = await res.json().catch(() => ({}));
      setShowConfirmModal(false);
      navigation.replace("PatientQueue", {
        doctorId,
        clinicId,
        sessionId:
          data?.sessionId && Number(data.sessionId) > 0
            ? Number(data.sessionId)
            : queueInfo?.sessionId
              ? Number(queueInfo.sessionId)
              : undefined,
      });
    } catch (err) {
      Alert.alert("Queue Join Failed", err instanceof Error ? err.message : "Failed to join queue");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={MODERN_THEME.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[MODERN_THEME.primary, '#1E293B']} style={styles.headerBackground} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Nav Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
            <Ionicons name="arrow-back" size={20} color={MODERN_THEME.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Book Appointment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Doctor Hero */}
          <PatientDoctorInfoCard
            name={doctorName}
            specialty={specialty}
            locationLabel={clinicName}
          />

          {/* Date Selector */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
              {dates.map((date: Date) => {
                const isSelected = formatLocalDateKey(date) === selectedDateKey;
                return (
                  <TouchableOpacity
                    key={formatLocalDateKey(date)}
                    onPress={() => setSelectedDate(date)}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                  >
                    <Text style={[styles.dateMonth, isSelected && styles.textWhite]}>
                      {date.toLocaleDateString("en-US", { month: "short" })}
                    </Text>
                    <Text style={[styles.dateDay, isSelected && styles.textWhite]}>
                      {date.getDate()}
                    </Text>
                    <Text style={[styles.dateWeek, isSelected && styles.textWhite]}>
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </Text>
                    {isSelected && <View style={styles.activeDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Status Representation */}
          <View style={[styles.sessionBox, hasNoSession && styles.sessionBoxEmpty]}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionHeaderCopy}>
                <Text style={styles.sessionStatusLabel}>
                  {hasNoSession ? "Appointment availability" : "Availability Status"}
                </Text>
                <Text style={styles.sessionTimeRange}>{dayRangeLabel}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  hasNoSession
                    ? styles.badgeNeutral
                    : { backgroundColor: isLive ? MODERN_THEME.success : MODERN_THEME.accent },
                ]}
              >
                {isLive && <View style={styles.pulseDot} />}
                {!isLive && hasNoSession ? (
                  <Ionicons name="calendar-outline" size={13} color={MODERN_THEME.textMuted} />
                ) : null}
                <Text style={[styles.badgeText, hasNoSession && styles.badgeTextNeutral]}>
                  {hasNoSession ? "NO SESSIONS" : dayStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            {hasNoSession ? (
              <View style={styles.emptyAvailabilityCard}>
                <View style={styles.emptyAvailabilityIcon}>
                  <Ionicons name="calendar-clear-outline" size={20} color={MODERN_THEME.accent} />
                </View>
                <View style={styles.emptyAvailabilityCopy}>
                  <Text style={styles.emptyAvailabilityTitle}>{selectedDateStatusCopy.title}</Text>
                  <Text style={styles.helperText}>{selectedDateStatusCopy.message}</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: showSlots ? '100%' : '30%',
                        backgroundColor: showSlots ? MODERN_THEME.accent : MODERN_THEME.danger,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.helperText}>{selectedDateStatusCopy.message}</Text>
              </>
            )}
          </View>

          {/* Slots Grid */}
          {showSlots && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionLabel}>Available Slots</Text>
              <View style={styles.slotsGrid}>
                {availableSlots.map((slot: string) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => setSelectedSlot(slot)}
                      style={[styles.slotItem, isSelected && styles.slotItemActive]}
                    >
                      <Text style={[styles.slotText, isSelected && styles.textWhite]}>
                        {formatTime(slot)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isBookable && !isLive) && styles.btnDisabled]}
            disabled={queueLoading || ((!isBookable || !selectedSlot) && !isLive)}
            onPress={handlePrimaryAction}
          >
            <LinearGradient
              colors={
                isBookable || isLive
                  ? [MODERN_THEME.accent, '#0284C7']
                  : ['#CBD5E1', '#94A3B8']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnText}>
                {isLive
                  ? 'Join Live Queue'
                  : isBookable
                    ? 'Confirm Appointment'
                    : hasNoSession
                      ? 'Choose another date'
                      : 'Unavailable'}
              </Text>
              <Ionicons name={hasNoSession ? "calendar-outline" : "chevron-forward"} size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
           <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{isLive ? "Join Live Queue" : "Confirm Booking"}</Text>
              <Text style={styles.modalBody}>
                {isLive
                  ? `Join the live queue at ${clinicName}?`
                  : `Book the ${formatTime(selectedSlot)} slot for ${formatDateLabel(selectedDate)}?`}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={styles.modalBtnSec}>
                  <Text style={styles.modalBtnSecText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={isLive ? joinQueue : submitBooking} style={styles.modalBtnPrim}>
                  <Text style={styles.modalBtnPrimText}>{isLive ? "Join" : "Confirm"}</Text>
                </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MODERN_THEME.bg },
  headerBackground: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 200,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
  },
  navTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionContainer: { marginTop: 25 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: MODERN_THEME.textMain, marginBottom: 15 },
  dateList: { gap: 12 },
  dateCard: {
    width: 65,
    height: 90,
    backgroundColor: MODERN_THEME.white,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MODERN_THEME.border,
  },
  dateCardActive: { backgroundColor: MODERN_THEME.primary, borderColor: MODERN_THEME.primary },
  dateMonth: { fontSize: 11, color: MODERN_THEME.textMuted, textTransform: 'uppercase' },
  dateDay: { fontSize: 22, fontWeight: '800', color: MODERN_THEME.textMain, marginVertical: 2 },
  dateWeek: { fontSize: 11, color: MODERN_THEME.textMuted },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: MODERN_THEME.accent, marginTop: 4 },
  sessionBox: {
    marginTop: 25,
    backgroundColor: MODERN_THEME.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: MODERN_THEME.border,
  },
  sessionBoxEmpty: {
    backgroundColor: '#FCFEFF',
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionHeaderCopy: { flex: 1, paddingRight: 12 },
  sessionStatusLabel: { fontSize: 12, color: MODERN_THEME.textMuted },
  sessionTimeRange: { fontSize: 18, fontWeight: '700', color: MODERN_THEME.textMain, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeNeutral: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  badgeTextNeutral: { color: MODERN_THEME.textMuted },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', marginRight: 5 },
  emptyAvailabilityCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D9EAF8',
    borderRadius: 18,
    padding: 14,
  },
  emptyAvailabilityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6FF',
  },
  emptyAvailabilityCopy: {
    flex: 1,
  },
  emptyAvailabilityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: MODERN_THEME.textMain,
    marginBottom: 4,
  },
  progressBarBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginVertical: 15, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  helperText: { fontSize: 13, color: MODERN_THEME.textMuted, lineHeight: 18 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotItem: {
    width: (width - 70) / 3,
    paddingVertical: 12,
    backgroundColor: MODERN_THEME.white,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MODERN_THEME.border,
  },
  slotItemActive: { backgroundColor: MODERN_THEME.accent, borderColor: MODERN_THEME.accent },
  slotText: { fontSize: 14, fontWeight: '600', color: MODERN_THEME.textMain },
  footerContainer: {
    padding: 20,
    backgroundColor: MODERN_THEME.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  primaryBtn: { borderRadius: 18, overflow: 'hidden' },
  btnGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  textWhite: { color: 'white' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 24, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  modalBody: { color: MODERN_THEME.textMuted, marginBottom: 20, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtnSec: { flex: 1, padding: 15, alignItems: 'center' },
  modalBtnSecText: { color: MODERN_THEME.textMuted, fontWeight: '600' },
  modalBtnPrim: { flex: 2, backgroundColor: MODERN_THEME.accent, padding: 15, borderRadius: 12, alignItems: 'center' },
  modalBtnPrimText: { color: 'white', fontWeight: '700' },
});
