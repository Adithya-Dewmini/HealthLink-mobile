import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
import { apiFetch } from "../../config/api";
import {
  fetchClinicDoctorBookedSlots,
  fetchClinicDoctorSchedule,
  generateSessionSlots,
  type ClinicDoctorScheduleResponse,
  type ClinicDoctorSession,
} from "../../services/patientClinicScheduleService";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E3F2FD",
  accentGreen: "#4CAF50",
  softGreen: "#E8F5E9",
  accentAmber: "#FF9800",
  softAmber: "#FFF3E0",
  accentCoral: "#FF5252",
  softCoral: "#FFEBEE",
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

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const getDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

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

  const [schedule, setSchedule] = useState<ClinicDoctorScheduleResponse | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueInfo, setQueueInfo] = useState<{
    status: string;
    waitingCount: number;
    currentToken: number | null;
    nextToken: number;
    isFull: boolean;
    estimatedWaitMinutes?: number;
    queueStartTime?: string | null;
  } | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const dates = useMemo(() => buildRollingDates(), []);
  const selectedDateKey = useMemo(() => getDateKey(selectedDate), [selectedDate]);
  const isToday = selectedDateKey === getDateKey(new Date());

  useEffect(() => {
    const loadSchedule = async () => {
      if (!doctorId || !clinicId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchClinicDoctorSchedule(clinicId, doctorId);
        setSchedule(data);
      } catch (err) {
        Alert.alert("Schedule Unavailable", err instanceof Error ? err.message : "Failed to load schedule");
        setSchedule(null);
      } finally {
        setLoading(false);
      }
    };

    void loadSchedule();
  }, [clinicId, doctorId]);

  useEffect(() => {
    const loadBookedTimes = async () => {
      if (!doctorId || !clinicId) {
        setBookedTimes([]);
        return;
      }

      try {
        setBookedTimes(await fetchClinicDoctorBookedSlots(clinicId, doctorId, selectedDateKey));
      } catch (err) {
        console.error("Load booked slots error:", err);
        setBookedTimes([]);
      }
    };

    void loadBookedTimes();
  }, [clinicId, doctorId, selectedDateKey]);

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
    } finally {
      setQueueLoading(false);
    }
  }, [clinicId, doctorId]);

  useEffect(() => {
    if (!isToday) {
      setQueueInfo(null);
      setQueueLoading(false);
      return;
    }
    void loadQueueStatus();
  }, [isToday, loadQueueStatus]);

  const sessionsForDay = useMemo(
    () => (schedule?.sessions ?? []).filter((session) => session.date === selectedDateKey),
    [schedule, selectedDateKey]
  );

  const nextSession = schedule?.next_session ?? null;
  const clinicName = schedule?.clinic_name || clinicNameParam || "Clinic";
  const doctorName = schedule?.doctor_name || doctorNameParam || "Doctor";
  const specialty = schedule?.specialization || specialtyParam || "General Physician";

  const slots = useMemo(() => {
    const unique = new Set<string>();
    sessionsForDay.forEach((session) => {
      generateSessionSlots(session).forEach((slot) => unique.add(slot));
    });
    return Array.from(unique).sort();
  }, [sessionsForDay]);

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

  const isClosed = useMemo(() => {
    if (!sessionsForDay.length) return false;
    return sessionsForDay.every((session) => session.status === "CLOSED");
  }, [sessionsForDay]);

  const isLive = useMemo(() => {
    if (!sessionsForDay.length) return false;
    return sessionsForDay.some((session) => session.status === "LIVE");
  }, [sessionsForDay]);

  const isNotStarted = useMemo(() => {
    if (!sessionsForDay.length) return false;
    return sessionsForDay.some((session) => session.status === "NOT_STARTED");
  }, [sessionsForDay]);

  const isFullyBooked = useMemo(() => {
    if (!sessionsForDay.length) return false;
    return sessionsForDay.every((session) => session.is_fully_booked) || availableSlots.length === 0;
  }, [availableSlots.length, sessionsForDay]);

  const submitBooking = async () => {
    if (!doctorId || !clinicId || !selectedSlot) {
      return;
    }

    try {
      const res = await apiFetch("/api/patients/bookings", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: doctorId,
          clinic_id: clinicId,
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
        specialty,
        date: new Date(`${selectedDateKey}T00:00:00`).toISOString(),
        clinicTime: formatTime(selectedSlot),
        doctorId,
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
      navigation.navigate("AppointmentSummaryScreen", {
        doctorName,
        clinicName,
        specialty,
        date: new Date().toISOString(),
        clinicTime:
          sessionsForDay[0]
            ? `${formatTime(sessionsForDay[0].start_time)} - ${formatTime(sessionsForDay[0].end_time)}`
            : "—",
        tokenNumber: String(data?.tokenNumber ?? queueInfo?.nextToken ?? "—"),
        nowServing: String(queueInfo?.currentToken ?? "—"),
        estimatedWait: queueInfo?.estimatedWaitMinutes
          ? `${queueInfo.estimatedWaitMinutes} min`
          : "—",
        queueOpensAt: queueInfo?.queueStartTime
          ? formatTime(String(queueInfo.queueStartTime).slice(0, 5))
          : "—",
        doctorId,
      });
    } catch (err) {
      Alert.alert("Queue Join Failed", err instanceof Error ? err.message : "Failed to join queue");
    }
  };

  const queueLive = isToday && isLive;

  if (!doctorId || !clinicId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Clinic Required</Text>
          <Text style={styles.emptyText}>Open booking from a clinic so we can use the clinic-defined schedule.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{doctorName}</Text>
          <Text style={styles.heroSubtitle}>{specialty}</Text>
          <Text style={styles.heroClinic}>Available at {clinicName}</Text>
        </View>

        {loading ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>Loading clinic schedule...</Text>
          </View>
        ) : !schedule || schedule.sessions.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Not available at this clinic</Text>
            <Text style={styles.feedbackText}>No clinic-defined sessions are open for booking.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Next session</Text>
              <Text style={styles.summaryTitle}>
                {nextSession ? formatDateLabel(new Date(`${nextSession.date}T00:00:00`)) : "No upcoming session"}
              </Text>
              {nextSession ? (
                <Text style={styles.summaryValue}>
                  {formatTime(nextSession.start_time)} - {formatTime(nextSession.end_time)}
                </Text>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Choose a date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
              {dates.map((date) => {
                const isSelected = getDateKey(date) === selectedDateKey;
                return (
                  <TouchableOpacity
                    key={getDateKey(date)}
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                      {formatDateLabel(date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {!sessionsForDay.length ? (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>Not available at this clinic</Text>
                <Text style={styles.feedbackText}>No schedule is set for this date.</Text>
              </View>
            ) : (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Working hours</Text>
                  <Text style={styles.infoValue}>
                    {formatTime(sessionsForDay[0].start_time)} - {formatTime(sessionsForDay[sessionsForDay.length - 1].end_time)}
                  </Text>
                  <Text style={styles.infoMeta}>Available slots: {availableSlots.length}</Text>
                </View>

                {isClosed ? (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningText}>Session Ended</Text>
                  </View>
                ) : queueLive ? (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningText}>Join Queue</Text>
                  </View>
                ) : isFullyBooked ? (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningText}>Fully booked</Text>
                  </View>
                ) : null}

                <Text style={styles.sectionTitle}>Available slots</Text>
                <View style={styles.slotWrap}>
                  {availableSlots.length === 0 ? (
                    <Text style={styles.emptyText}>No available slots for this session.</Text>
                  ) : (
                    availableSlots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[styles.slotChip, isSelected && styles.slotChipActive]}
                          onPress={() => setSelectedSlot(slot)}
                        >
                          <Text style={[styles.slotChipText, isSelected && styles.slotChipTextActive]}>
                            {formatTime(slot)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.mainActionBtn, (!schedule || (!queueLive && !selectedSlot)) && styles.disabledButton]}
          disabled={!schedule || (!queueLive && (!isNotStarted || !selectedSlot)) || queueLoading || isClosed}
          onPress={() => setShowConfirmModal(true)}
        >
          <Text style={styles.actionBtnText}>
            {isClosed ? "Session Ended" : queueLive ? "Join Queue" : "Book Slot"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{queueLive ? "Join Queue" : "Confirm Appointment"}</Text>
            <Text style={styles.modalText}>
              {queueLive
                ? `Join the live queue at ${clinicName}?`
                : `Book ${formatTime(selectedSlot)} at ${clinicName} on ${formatDateLabel(selectedDate)}?`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondary} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimary} onPress={queueLive ? joinQueue : submitBooking}>
                <Text style={styles.modalPrimaryText}>{queueLive ? "Join" : "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  headerSpacer: { width: 28 },
  scroll: { flex: 1, backgroundColor: THEME.background },
  scrollContent: { padding: 20, paddingBottom: 120 },
  heroCard: { backgroundColor: THEME.white, borderRadius: 24, padding: 20, marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: THEME.textDark },
  heroSubtitle: { fontSize: 14, color: THEME.textGray, marginTop: 6 },
  heroClinic: { fontSize: 15, color: THEME.accentBlue, fontWeight: "600", marginTop: 8 },
  feedbackCard: { backgroundColor: THEME.white, borderRadius: 20, padding: 18, marginBottom: 16 },
  feedbackTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  feedbackText: { fontSize: 14, color: THEME.textGray, lineHeight: 20 },
  summaryCard: { backgroundColor: THEME.white, borderRadius: 20, padding: 18, marginBottom: 16 },
  summaryLabel: { fontSize: 13, color: THEME.textGray },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginTop: 6 },
  summaryValue: { fontSize: 14, color: THEME.accentBlue, marginTop: 4, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 12 },
  dateRow: { gap: 10, paddingBottom: 4 },
  dateChip: {
    backgroundColor: THEME.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dateChipActive: { borderColor: THEME.accentBlue, backgroundColor: THEME.softBlue },
  dateChipText: { fontSize: 13, color: THEME.textDark, fontWeight: "600" },
  dateChipTextActive: { color: THEME.accentBlue },
  infoCard: { backgroundColor: THEME.white, borderRadius: 20, padding: 18, marginBottom: 14 },
  infoTitle: { fontSize: 13, color: THEME.textGray },
  infoValue: { fontSize: 17, fontWeight: "700", color: THEME.textDark, marginTop: 6 },
  infoMeta: { fontSize: 13, color: THEME.accentBlue, marginTop: 8, fontWeight: "600" },
  warningCard: {
    backgroundColor: THEME.softAmber,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  warningText: { color: THEME.accentAmber, fontWeight: "700" },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotChip: {
    backgroundColor: THEME.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  slotChipActive: { backgroundColor: THEME.softBlue, borderColor: THEME.accentBlue },
  slotChipText: { fontSize: 13, color: THEME.textDark, fontWeight: "600" },
  slotChipTextActive: { color: THEME.accentBlue },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  emptyText: { fontSize: 14, color: THEME.textGray, lineHeight: 20 },
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
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.45 },
  actionBtnText: { color: THEME.white, fontSize: 15, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { width: "100%", backgroundColor: THEME.white, borderRadius: 22, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  modalText: { fontSize: 14, color: THEME.textGray, lineHeight: 21 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalSecondary: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSecondaryText: { color: THEME.textGray, fontWeight: "700" },
  modalPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: THEME.accentBlue,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryText: { color: THEME.white, fontWeight: "700" },
});
