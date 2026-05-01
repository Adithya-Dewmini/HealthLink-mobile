import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { useAuth } from "../../utils/AuthContext";
import { createReceptionAppointment, fetchReceptionAppointments } from "../../services/receptionService";

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  softBlue: "#E3F2FD",
};

type SessionItem = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  doctor_name: string;
};

type AppointmentItem = {
  session_id: number | null;
  time: string;
  status: string;
};

const buildSlots = (session: SessionItem | null) => {
  if (!session) return [];
  const [startHour, startMinute] = session.start_time.split(":").map(Number);
  const [endHour, endMinute] = session.end_time.split(":").map(Number);
  const slots: string[] = [];
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  for (
    let total = startTotal, index = 0;
    total + session.slot_duration <= endTotal && index < session.max_patients;
    total += session.slot_duration, index += 1
  ) {
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }

  return slots;
};

export default function AppointmentBooking() {
  useReceptionPermissionGuard("booking", "can_manage_appointments");
  const { receptionistPermissions } = useAuth();
  const canManageAppointments = receptionistPermissions.can_manage_appointments;
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookingData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReceptionAppointments();
      setSessions(Array.isArray((data as any).sessions) ? (data as any).sessions : []);
      setAppointments(Array.isArray((data as any).appointments) ? (data as any).appointments : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load booking data");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBookingData();
    }, [loadBookingData])
  );

  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );

  const slots = useMemo(() => buildSlots(selectedSession), [selectedSession]);
  const bookedTimes = useMemo(
    () =>
      new Set(
        appointments
          .filter((item) => item.session_id === selectedSessionId && String(item.status || "").toUpperCase() !== "CANCELLED")
          .map((item) => item.time)
      ),
    [appointments, selectedSessionId]
  );

  const availableSlots = useMemo(
    () => slots.filter((slot) => !bookedTimes.has(slot)),
    [bookedTimes, slots]
  );

  const handleBook = async () => {
    if (!selectedSessionId || !selectedTime || !patientName.trim()) {
      Alert.alert("Missing Info", "Select a session, a time, and enter a patient name.");
      return;
    }

    setSubmitting(true);
    try {
      await createReceptionAppointment({
        sessionId: selectedSessionId,
        time: selectedTime,
        patientName: patientName.trim(),
        phone: phone.trim() || undefined,
      });
      Alert.alert("Appointment Created", "The booking was created successfully.");
      setSelectedTime(null);
      setPatientName("");
      setPhone("");
      await loadBookingData();
    } catch (bookingError) {
      Alert.alert("Booking Failed", bookingError instanceof Error ? bookingError.message : "Unable to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Book Appointment</Text>
          <Text style={styles.subtitle}>Create a clinic booking with live session slots</Text>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Booking unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {!canManageAppointments ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Booking access removed</Text>
                <Text style={styles.infoText}>
                  You can review existing availability, but new booking actions are disabled.
                </Text>
              </View>
            ) : null}
            <Text style={styles.sectionLabel}>Select Session</Text>
            <FlatList
              horizontal
              data={sessions}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const active = selectedSessionId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.sessionCard, active && styles.sessionCardActive, !canManageAppointments && styles.disabledCard]}
                    onPress={() => setSelectedSessionId(item.id)}
                    disabled={!canManageAppointments}
                  >
                    <Text style={[styles.sessionDoctor, active && styles.sessionDoctorActive]}>{item.doctor_name}</Text>
                    <Text style={[styles.sessionMeta, active && styles.sessionMetaActive]}>{item.date}</Text>
                    <Text style={[styles.sessionMeta, active && styles.sessionMetaActive]}>{item.start_time}-{item.end_time}</Text>
                  </TouchableOpacity>
                );
              }}
            />

            <Text style={styles.sectionLabel}>Available Slots</Text>
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot) => {
                const active = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotChip, active && styles.slotChipActive, !canManageAppointments && styles.disabledCard]}
                    onPress={() => setSelectedTime(slot)}
                    disabled={!canManageAppointments}
                  >
                    <Text style={[styles.slotChipText, active && styles.slotChipTextActive]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
              {selectedSession && availableSlots.length === 0 ? (
                <Text style={styles.helperText}>No remaining slots for the selected session.</Text>
              ) : null}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Patient Name</Text>
              <TextInput
                value={patientName}
                onChangeText={setPatientName}
                placeholder="Enter patient name"
                placeholderTextColor={THEME.textSecondary}
                style={styles.input}
                editable={canManageAppointments}
              />
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={THEME.textSecondary}
                style={styles.input}
                keyboardType="phone-pad"
                editable={canManageAppointments}
              />
            </View>

            <TouchableOpacity
              style={[styles.bookButton, (submitting || !canManageAppointments) && styles.bookButtonDisabled]}
              onPress={() => void handleBook()}
              disabled={submitting || !canManageAppointments}
            >
              {submitting ? <ActivityIndicator color={THEME.white} /> : <Text style={styles.bookButtonText}>Book Appointment</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 18 },
  title: { fontSize: 26, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { marginTop: 6, fontSize: 14, color: THEME.textSecondary },
  centerState: { paddingVertical: 72, alignItems: "center" },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#B91C1C" },
  errorText: { marginTop: 8, fontSize: 13, color: "#991B1B" },
  infoCard: { backgroundColor: "#FFF7ED", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#FED7AA", marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: "800", color: "#9A3412" },
  infoText: { marginTop: 6, fontSize: 13, color: "#9A3412", lineHeight: 19 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: THEME.textSecondary, marginBottom: 10, textTransform: "uppercase" },
  horizontalList: { gap: 10, marginBottom: 18 },
  sessionCard: { width: 180, backgroundColor: THEME.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border },
  sessionCardActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  disabledCard: { opacity: 0.5 },
  sessionDoctor: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  sessionDoctorActive: { color: THEME.white },
  sessionMeta: { marginTop: 6, fontSize: 13, color: THEME.textSecondary },
  sessionMetaActive: { color: "#EAF1FF" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  slotChip: { paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  slotChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  slotChipText: { fontSize: 13, fontWeight: "700", color: THEME.textPrimary },
  slotChipTextActive: { color: THEME.white },
  helperText: { fontSize: 13, color: THEME.textSecondary },
  formCard: { backgroundColor: THEME.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border },
  inputLabel: { fontSize: 13, fontWeight: "800", color: THEME.textSecondary, marginBottom: 8, marginTop: 4 },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, fontSize: 15, color: THEME.textPrimary, backgroundColor: "#FAFCFF", marginBottom: 14 },
  bookButton: { height: 52, borderRadius: 18, backgroundColor: THEME.primary, alignItems: "center", justifyContent: "center", marginTop: 18 },
  bookButtonDisabled: { opacity: 0.7 },
  bookButtonText: { color: THEME.white, fontSize: 15, fontWeight: "800" },
});
