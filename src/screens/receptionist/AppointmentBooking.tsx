import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import type { ReceptionistStackParamList } from "../../types/navigation";
import {
  createReceptionVisit,
  fetchReceptionAppointments,
  registerReceptionPatient,
} from "../../services/receptionService";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RECEPTION_THEME,
  ReceptionistButton,
  SurfaceCard,
  StatusBadge,
} from "../../components/receptionist/PanelUI";
import { formatShortDate } from "../../utils/dateUtils";
import { getFriendlyError } from "../../utils/friendlyErrors";

type SessionItem = {
  id: number;
  doctorId: number;
  doctorName: string;
  specialty: string;
  date: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
  queueId: number | null;
  queueStatus: string | null;
};

type AppointmentItem = {
  session_id: number | null;
  time: string;
  status: string;
};

type DoctorOption = {
  doctorId: number;
  doctorName: string;
  specialty: string;
  hasLiveQueue: boolean;
};

const DEFAULT_DOCTOR_NAME = "Doctor";
const DEFAULT_SPECIALTY = "Specialist";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const formatTimeLabel = (value: string) => {
  const [hours, minutes] = String(value || "").slice(0, 5).split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;
  const hour12 = hours % 12 || 12;
  const period = hours >= 12 ? "PM" : "AM";
  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

const formatSessionRange = (session: Pick<SessionItem, "startTime" | "endTime">) =>
  `${formatTimeLabel(session.startTime)} - ${formatTimeLabel(session.endTime)}`;

const isLiveQueueSession = (session: Pick<SessionItem, "queueStatus"> | null | undefined) =>
  ["LIVE", "PAUSED"].includes(String(session?.queueStatus || "").toUpperCase());

const timeToMinutes = (time: string): number | null => {
  if (!time || typeof time !== "string") return null;
  const normalized = time.trim();

  const twelveHourMatch = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  return null;
};

const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const getGeneratedSlots = (startTime: string, endTime: string, slotDuration: number) => {
  const slots: string[] = [];
  const startTotal = timeToMinutes(startTime);
  const endTotal = timeToMinutes(endTime);

  if (startTotal === null || endTotal === null || !Number.isFinite(slotDuration) || slotDuration <= 0) {
    return slots;
  }
  if (endTotal <= startTotal) return slots;

  for (let total = startTotal; total + slotDuration <= endTotal; total += slotDuration) {
    slots.push(minutesToTime(total));
  }

  return slots;
};

const getAvailableSlotsForSession = (session: SessionItem, appointments: AppointmentItem[]) => {
  // TODO: Confirm whether maxPatients represents booking capacity or generated slot count.
  const slots = getGeneratedSlots(session.startTime, session.endTime, Number(session.slotDuration || 0));
  const bookedTimes = buildBookedTimesSet(appointments, session.id);
  const openSlots = slots.filter((slot) => !bookedTimes.has(slot));

  return {
    totalSlots: slots.length,
    bookedCount: bookedTimes.size,
    openSlots,
    availableSlots: openSlots.length,
  };
};

const normalizeSession = (input: unknown): SessionItem => {
  const value = isRecord(input) ? input : {};
  return {
    id: Number(value.id || 0),
    doctorId: Number(value.doctorId ?? value.doctor_id ?? 0),
    doctorName: String(value.doctorName || value.doctor_name || DEFAULT_DOCTOR_NAME),
    specialty: String(value.specialty || DEFAULT_SPECIALTY),
    date: String(value.date || ""),
    startTime: String(value.startTime || value.start_time || "").slice(0, 5),
    endTime: String(value.endTime || value.end_time || "").slice(0, 5),
    slotDuration: Number(value.slotDuration ?? value.slot_duration ?? 0),
    maxPatients: Number(value.maxPatients ?? value.max_patients ?? 0),
    queueId: value.queueId || value.queue_id ? Number(value.queueId ?? value.queue_id) : null,
    queueStatus:
      value.queueStatus || value.queue_status
        ? String(value.queueStatus ?? value.queue_status).toUpperCase()
        : null,
  };
};

const normalizeAppointment = (input: unknown): AppointmentItem => {
  const value = isRecord(input) ? input : {};
  return {
    session_id: typeof value.session_id === "number" ? value.session_id : null,
    time: String(value.time || "").slice(0, 5),
    status: String(value.status || ""),
  };
};

const buildBookedTimesSet = (appointments: AppointmentItem[], sessionId: number) =>
  new Set(
    appointments
      .filter(
        (item) =>
          item.session_id === sessionId &&
          !["CANCELLED", "MISSED"].includes(String(item.status || "").toUpperCase())
      )
      .map((item) => item.time)
  );

export default function AppointmentBooking() {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const hasAccess = useReceptionPermissionGuard("appointments", "appointments");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBookingData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReceptionAppointments();
      const payload = isRecord(data) ? data : {};
      const nextSessions = Array.isArray(payload.sessions)
        ? payload.sessions.map(normalizeSession)
        : [];
      const nextAppointments = Array.isArray(payload.appointments)
        ? payload.appointments.map(normalizeAppointment)
        : [];
      setSessions(nextSessions);
      setAppointments(nextAppointments);
      setError(null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load bookable sessions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBookingData();
    }, [loadBookingData])
  );

  const enrichedSessions = useMemo(() => {
    return sessions
      .map((session) => {
        return {
          ...session,
          ...getAvailableSlotsForSession(session, appointments),
        };
      })
      .filter((session) => session.availableSlots > 0)
      .sort((left, right) => {
        const leftPriority = isLiveQueueSession(left) ? 0 : 1;
        const rightPriority = isLiveQueueSession(right) ? 0 : 1;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`);
      });
  }, [appointments, sessions]);

  const doctorOptions = useMemo<DoctorOption[]>(() => {
    const doctorMap = new Map<number, DoctorOption>();

    enrichedSessions.forEach((session) => {
      const existing = doctorMap.get(session.doctorId);
      if (!existing) {
        doctorMap.set(session.doctorId, {
          doctorId: session.doctorId,
          doctorName: session.doctorName || DEFAULT_DOCTOR_NAME,
          specialty: session.specialty || DEFAULT_SPECIALTY,
          hasLiveQueue: isLiveQueueSession(session),
        });
        return;
      }

      existing.hasLiveQueue = existing.hasLiveQueue || isLiveQueueSession(session);
    });

    return Array.from(doctorMap.values()).sort((a, b) => a.doctorName.localeCompare(b.doctorName));
  }, [enrichedSessions]);

  useEffect(() => {
    if (doctorOptions.length === 0) {
      setSelectedDoctorId(null);
      setSelectedSessionId(null);
      setSelectedTime(null);
      return;
    }

    if (!doctorOptions.some((doctor) => doctor.doctorId === selectedDoctorId)) {
      setSelectedDoctorId(doctorOptions[0].doctorId);
    }
  }, [doctorOptions, selectedDoctorId]);

  const doctorSessions = useMemo(
    () => enrichedSessions.filter((session) => session.doctorId === selectedDoctorId),
    [enrichedSessions, selectedDoctorId]
  );

  useEffect(() => {
    if (doctorSessions.length === 0) {
      setSelectedSessionId(null);
      setSelectedTime(null);
      return;
    }

    if (!doctorSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(doctorSessions[0].id);
      setSelectedTime(null);
    }
  }, [doctorSessions, selectedSessionId]);

  const selectedSession = useMemo(
    () => doctorSessions.find((session) => session.id === selectedSessionId) ?? null,
    [doctorSessions, selectedSessionId]
  );

  const availableSlots = useMemo(
    () => selectedSession?.openSlots || [],
    [selectedSession]
  );

  const selectedSessionIsLiveQueue = useMemo(
    () => isLiveQueueSession(selectedSession),
    [selectedSession]
  );

  const handleBook = useCallback(async () => {
    if (!selectedSessionId || !patientName.trim()) {
      setNotice("Select a doctor and session, then enter the patient name.");
      return;
    }

    if (!selectedSessionIsLiveQueue && !selectedTime) {
      setNotice("Select a booking time before creating the appointment.");
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      if (selectedSessionIsLiveQueue) {
        await registerReceptionPatient({
          name: patientName.trim(),
          phone: phone.trim() || undefined,
          sessionId: selectedSessionId,
          addToQueue: true,
        });
        setNotice("Patient added to the live queue.");
      } else {
        await createReceptionVisit({
          sessionId: selectedSessionId,
          time: selectedTime!,
          patientName: patientName.trim(),
          phone: phone.trim() || undefined,
        });
        setNotice("Visit booked successfully.");
      }
      setSelectedTime(null);
      setPatientName("");
      setPhone("");
      await loadBookingData();
    } catch (bookingError) {
      setNotice(getFriendlyError(bookingError, "Unable to book visit."));
    } finally {
      setSubmitting(false);
    }
  }, [
    loadBookingData,
    patientName,
    phone,
    selectedSessionId,
    selectedSessionIsLiveQueue,
    selectedTime,
  ]);

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Visits access has not been assigned to your account." />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={RECEPTION_THEME.navy} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Ionicons name="medical" size={18} color={RECEPTION_THEME.aqua} />
            <Text style={styles.headerBrandText}>HealthLink</Text>
          </View>
          <Text style={styles.headerTitle}>Book Visit</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Create Appointment</Text>
          <Text style={styles.screenSubtitle}>
            Choose a doctor first, then book from that doctor’s real open clinic sessions.
          </Text>

          {loading ? (
            <LoadingState label="Loading doctors and open sessions..." />
          ) : error ? (
            <ErrorState
              title="Booking unavailable"
              message={error}
              onRetry={() => void loadBookingData()}
            />
          ) : doctorOptions.length === 0 ? (
            <EmptyState
              title="No doctors with open sessions"
              message="Doctor cards will appear here when clinic sessions have bookable slots or an active queue."
              icon="calendar-clear-outline"
            />
          ) : (
            <>
              {notice ? (
                <SurfaceCard style={styles.noticeCard}>
                  <Text style={styles.noticeText}>{notice}</Text>
                </SurfaceCard>
              ) : null}

              <Text style={styles.sectionLabel}>Choose Doctor</Text>
              <View style={styles.doctorList}>
                {doctorOptions.map((doctor) => {
                  const active = selectedDoctorId === doctor.doctorId;
                  return (
                    <TouchableOpacity
                      key={doctor.doctorId}
                      activeOpacity={0.9}
                      style={[styles.doctorCard, active && styles.doctorCardActive]}
                      onPress={() => {
                        setSelectedDoctorId(doctor.doctorId);
                        setSelectedTime(null);
                      }}
                    >
                      <View style={styles.doctorAvatar}>
                        <Text style={styles.doctorAvatarText}>
                          {doctor.doctorName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.doctorCopy}>
                        <Text style={[styles.doctorName, active && styles.doctorNameActive]}>
                          {doctor.doctorName}
                        </Text>
                        <Text style={[styles.doctorSpecialty, active && styles.doctorSpecialtyActive]}>
                          {doctor.specialty}
                        </Text>
                      </View>
                      {doctor.hasLiveQueue ? <StatusBadge label="Live" tone="warning" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Choose Session</Text>
              <View style={styles.sessionList}>
                {doctorSessions.map((session) => {
                  const active = selectedSessionId === session.id;
                  return (
                    <TouchableOpacity
                      key={session.id}
                      activeOpacity={0.9}
                      style={[styles.sessionCard, active && styles.sessionCardActive]}
                      onPress={() => {
                        setSelectedSessionId(session.id);
                        setSelectedTime(null);
                      }}
                    >
                      <View style={styles.sessionCardTop}>
                      <View>
                        <Text style={[styles.sessionDate, active && styles.sessionDateActive]}>
                          {formatShortDate(session.date)}
                        </Text>
                          <Text style={[styles.sessionTime, active && styles.sessionTimeActive]}>
                            {formatSessionRange(session)}
                          </Text>
                        </View>
                        <View style={styles.sessionBadgeStack}>
                          {isLiveQueueSession(session) ? (
                            <StatusBadge
                              label={session.queueStatus === "PAUSED" ? "Queue paused" : "Queue live"}
                              tone="warning"
                            />
                          ) : null}
                          <StatusBadge
                            label={`${session.availableSlots} open`}
                            tone={session.availableSlots > 3 ? "success" : "warning"}
                          />
                        </View>
                      </View>
                      <Text style={[styles.sessionMeta, active && styles.sessionMetaActive]}>
                        {isLiveQueueSession(session)
                          ? "Queue is running. New patients will be added directly to the live queue."
                          : `${session.bookedCount}/${session.maxPatients} booked • ${session.slotDuration} min slots`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Available Slots</Text>
              {selectedSession ? (
                <>
                  {selectedSessionIsLiveQueue ? (
                    <Text style={styles.inlineHint}>
                      Queue is already live. Slots are shown for reference; joining will add the patient to the active
                      queue.
                    </Text>
                  ) : null}
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((slot) => {
                      const active = selectedTime === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          activeOpacity={selectedSessionIsLiveQueue ? 1 : 0.88}
                          style={[
                            styles.slotChip,
                            active && styles.slotChipActive,
                            selectedSessionIsLiveQueue && styles.slotChipDisabled,
                          ]}
                          disabled={selectedSessionIsLiveQueue}
                          onPress={() => setSelectedTime(slot)}
                        >
                          <Text
                            style={[
                              styles.slotChipText,
                              active && styles.slotChipTextActive,
                              selectedSessionIsLiveQueue && styles.slotChipTextDisabled,
                            ]}
                          >
                            {formatTimeLabel(slot)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text style={styles.inlineHint}>Select a session to see available slots.</Text>
              )}

              {selectedSession && availableSlots.length === 0 && !selectedSessionIsLiveQueue ? (
                <EmptyState
                  title="No open times left"
                  message="Choose another session for this doctor."
                  icon="time-outline"
                />
              ) : null}

              <SurfaceCard style={styles.formCard}>
                <Text style={styles.inputLabel}>Patient Name</Text>
                <TextInput
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder="Enter patient name"
                  placeholderTextColor={RECEPTION_THEME.textSecondary}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={RECEPTION_THEME.textSecondary}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </SurfaceCard>

              <ReceptionistButton
                label={selectedSessionIsLiveQueue ? "Join Live Queue" : "Book Visit"}
                icon={selectedSessionIsLiveQueue ? "people-outline" : "calendar-outline"}
                onPress={() => void handleBook()}
                loading={submitting}
                disabled={
                  submitting ||
                  !selectedSessionId ||
                  !patientName.trim() ||
                  (!selectedSessionIsLiveQueue && !selectedTime)
                }
              />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.navy,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  header: {
    backgroundColor: RECEPTION_THEME.navy,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: RECEPTION_THEME.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  headerLeft: {
    flexDirection: "column",
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  headerBrandText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.78)",
    marginLeft: 6,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  screenTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  screenSubtitle: {
    marginTop: 6,
    marginBottom: 14,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeCard: {
    marginBottom: 14,
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  noticeText: {
    color: RECEPTION_THEME.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionLabel: {
    marginBottom: 10,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: RECEPTION_THEME.primary,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  doctorList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  doctorCard: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: RECEPTION_THEME.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorCardActive: {
    borderColor: RECEPTION_THEME.primary,
    backgroundColor: "#F1FAFE",
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: RECEPTION_THEME.lightAqua,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorAvatarText: {
    color: RECEPTION_THEME.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  doctorCopy: {
    marginTop: 12,
    alignItems: "center",
  },
  doctorName: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  doctorNameActive: {
    color: RECEPTION_THEME.navy,
  },
  doctorSpecialty: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  doctorSpecialtyActive: {
    color: RECEPTION_THEME.navy,
  },
  sessionList: {
    gap: 12,
    marginBottom: 18,
  },
  sessionCard: {
    backgroundColor: RECEPTION_THEME.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    padding: 14,
  },
  sessionCardActive: {
    borderColor: RECEPTION_THEME.navy,
    backgroundColor: RECEPTION_THEME.navy,
  },
  sessionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  sessionBadgeStack: {
    alignItems: "flex-end",
    gap: 8,
  },
  sessionDate: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  sessionDateActive: {
    color: "#DDEBFF",
  },
  sessionTime: {
    marginTop: 6,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  sessionTimeActive: {
    color: "#FFFFFF",
  },
  sessionMeta: {
    marginTop: 8,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  sessionMetaActive: {
    color: "#DDEBFF",
  },
  inlineHint: {
    marginBottom: 12,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  slotChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: RECEPTION_THEME.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  slotChipActive: {
    backgroundColor: RECEPTION_THEME.primary,
    borderColor: RECEPTION_THEME.primary,
  },
  slotChipDisabled: {
    backgroundColor: "#EFF7FB",
    borderColor: RECEPTION_THEME.border,
  },
  slotChipText: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  slotChipTextActive: {
    color: "#FFFFFF",
  },
  slotChipTextDisabled: {
    color: RECEPTION_THEME.textSecondary,
  },
  formCard: {
    marginBottom: 16,
  },
  inputLabel: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: RECEPTION_THEME.surface,
    paddingHorizontal: 14,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 14,
    marginBottom: 14,
  },
});
