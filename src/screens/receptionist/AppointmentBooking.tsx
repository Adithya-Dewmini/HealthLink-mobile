import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
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
  ReceptionistHeader,
  SurfaceCard,
  StatusBadge,
} from "../../components/receptionist/PanelUI";

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

const prettyDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
};

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

const buildSlots = (session: SessionItem | null) => {
  if (!session) return [];
  const [startHour, startMinute] = session.startTime.split(":").map(Number);
  const [endHour, endMinute] = session.endTime.split(":").map(Number);
  const slots: string[] = [];
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  for (
    let total = startTotal, index = 0;
    total + session.slotDuration <= endTotal && index < session.maxPatients;
    total += session.slotDuration, index += 1
  ) {
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }

  return slots;
};

const normalizeSession = (input: any): SessionItem => ({
  id: Number(input?.id || 0),
  doctorId: Number(input?.doctorId ?? input?.doctor_id ?? 0),
  doctorName: String(input?.doctorName || input?.doctor_name || DEFAULT_DOCTOR_NAME),
  specialty: String(input?.specialty || DEFAULT_SPECIALTY),
  date: String(input?.date || ""),
  startTime: String(input?.startTime || input?.start_time || "").slice(0, 5),
  endTime: String(input?.endTime || input?.end_time || "").slice(0, 5),
  slotDuration: Number(input?.slotDuration ?? input?.slot_duration ?? 0),
  maxPatients: Number(input?.maxPatients ?? input?.max_patients ?? 0),
  queueId: input?.queueId || input?.queue_id ? Number(input?.queueId ?? input?.queue_id) : null,
  queueStatus: input?.queueStatus || input?.queue_status ? String(input?.queueStatus ?? input?.queue_status).toUpperCase() : null,
});

const normalizeAppointment = (input: any): AppointmentItem => ({
  session_id: typeof input?.session_id === "number" ? input.session_id : null,
  time: String(input?.time || "").slice(0, 5),
  status: String(input?.status || ""),
});

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
  const navigation = useNavigation<any>();
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
      const nextSessions = Array.isArray((data as any).sessions)
        ? (data as any).sessions.map(normalizeSession)
        : [];
      const nextAppointments = Array.isArray((data as any).appointments)
        ? (data as any).appointments.map(normalizeAppointment)
        : [];
      setSessions(nextSessions);
      setAppointments(nextAppointments);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load bookable sessions");
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
        const slots = buildSlots(session);
        const bookedTimes = buildBookedTimesSet(appointments, session.id);
        const openSlots = slots.filter((slot) => !bookedTimes.has(slot));

        return {
          ...session,
          totalSlots: slots.length,
          bookedCount: bookedTimes.size,
          openSlots,
          availableSlots: openSlots.length,
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
      setNotice(bookingError instanceof Error ? bookingError.message : "Unable to book visit.");
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ReceptionistHeader
          eyebrow="Book Visit"
          title="Create Appointment"
          subtitle="Choose a doctor first, then book from that doctor’s real open clinic sessions."
          right={
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={18} color={RECEPTION_THEME.primary} />
            </TouchableOpacity>
          }
        />

        {loading ? (
          <LoadingState label="Loading doctors and open sessions..." />
        ) : error ? (
          <ErrorState title="Booking unavailable" message={error} onRetry={() => void loadBookingData()} />
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
                          {prettyDate(session.date)}
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
                    Queue is already live. Slots are shown for reference; joining will add the patient to the active queue.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 6,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorCardActive: {
    borderColor: RECEPTION_THEME.primary,
    backgroundColor: "#F1FAFE",
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: RECEPTION_THEME.lightAqua,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorAvatarText: {
    color: RECEPTION_THEME.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  doctorCopy: {
    marginTop: 14,
    alignItems: "center",
  },
  doctorName: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  doctorNameActive: {
    color: RECEPTION_THEME.navy,
  },
  doctorSpecialty: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    padding: 16,
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
    fontSize: 14,
    fontWeight: "700",
  },
  sessionDateActive: {
    color: "#DDEBFF",
  },
  sessionTime: {
    marginTop: 6,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  sessionTimeActive: {
    color: "#FFFFFF",
  },
  sessionMeta: {
    marginTop: 10,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
  },
  sessionMetaActive: {
    color: "#DDEBFF",
  },
  inlineHint: {
    marginBottom: 12,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    lineHeight: 18,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 13,
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
