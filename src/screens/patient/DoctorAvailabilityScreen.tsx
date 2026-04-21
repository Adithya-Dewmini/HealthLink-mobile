import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { PatientStackParamList } from "../../types/navigation";
import { apiFetch } from "../../config/api";
import { Alert } from "react-native";

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
  border: "#E0E6ED",
};

export default function DoctorAvailabilityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "DoctorAvailabilityScreen">>();
  const { doctorId } = route.params;

  const [schedule, setSchedule] = useState<
    { day: string; start_time: string; end_time: string; max_patients?: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/api/patients/doctor/availability/${doctorId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load availability");
        }
        const data = await res.json();
        setSchedule(Array.isArray(data) ? data : []);
        const daysRes = await apiFetch(`/api/patients/doctor/working-days/${doctorId}`);
        if (daysRes.ok) {
          const daysData = await daysRes.json();
          setWorkingDays(Array.isArray(daysData) ? daysData : []);
        }
        const bookedRes = await apiFetch(
          `/api/patients/doctor/bookings/${doctorId}?date=${today}`
        );
        if (bookedRes.ok) {
          const booked = await bookedRes.json();
          setBookedTimes(
            Array.isArray(booked)
              ? booked.map((b: any) => String(b.time).slice(0, 5))
              : []
          );
        }
      } catch (err) {
        console.error("Failed to load availability:", err);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [doctorId]);

  const generateSlots = (start: string, end: string, count: number) => {
    if (!count || count <= 0) return [];
    const startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return [];
    const interval = (endTime.getTime() - startTime.getTime()) / count;
    if (interval <= 0) return [];
    const slots: string[] = [];
    for (let i = 0; i < count; i++) {
      const slotTime = new Date(startTime.getTime() + interval * i);
      const hours = String(slotTime.getHours()).padStart(2, "0");
      const minutes = String(slotTime.getMinutes()).padStart(2, "0");
      slots.push(`${hours}:${minutes}`);
    }
    return slots;
  };

  const handleBook = async (time: string) => {
    try {
      const res = await apiFetch("/api/patients/bookings", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: doctorId,
          date: today,
          time,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to book slot");
      }
      Alert.alert("Booked", "Slot booked successfully");
      setBookedTimes((prev) => [...prev, time]);
    } catch (err) {
      Alert.alert("Booking Failed", err instanceof Error ? err.message : "Failed to book");
    }
  };

  const formatTime = (value: string) => {
    if (!value) return "";
    const [hourStr, minute] = value.split(":");
    const hour = Number(hourStr);
    if (Number.isNaN(hour)) return value;
    const period = hour >= 12 ? "PM" : "AM";
    const normalized = hour % 12 || 12;
    return `${normalized.toString().padStart(2, "0")}:${minute} ${period}`;
  };

  const normalizeDay = (value?: string | null) => {
    if (!value) return "";
    const map: Record<string, string> = {
      Mon: "Monday",
      Tue: "Tuesday",
      Wed: "Wednesday",
      Thu: "Thursday",
      Fri: "Friday",
      Sat: "Saturday",
      Sun: "Sunday",
    };
    return map[value] || value;
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const dayName = getDayName(today);
  const workingDaysNormalized = workingDays.map((d) => normalizeDay(d));
  const isWorkingToday =
    workingDaysNormalized.length === 0 ? true : workingDaysNormalized.includes(dayName);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor's Schedule</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.docProfile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={THEME.accentBlue} />
          </View>
          <View>
            <Text style={styles.docName}>Dr. Silva</Text>
            <Text style={styles.docSpec}>General Physician • Cardiologist</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Weekly Availability</Text>
        <Text style={styles.sectionSub}>Join the queue during these hours</Text>

        {!loading && !isWorkingToday && dayName ? (
          <View style={styles.offDayBanner}>
            <Ionicons name="information-circle" size={18} color={THEME.accentAmber} />
            <Text style={styles.offDayText}>
              Doctor does not operate on {dayName}s.
            </Text>
          </View>
        ) : null}

        {!loading && schedule.length === 0 && (
          <Text style={styles.sectionSub}>No availability set for this doctor.</Text>
        )}

        {schedule.map((item, index) => {
          const slotCount = item.max_patients ?? 0;
          const timeRange = `${formatTime(item.start_time)} - ${formatTime(
            item.end_time
          )}`;
          const slots = generateSlots(
            String(item.start_time).slice(0, 5),
            String(item.end_time).slice(0, 5),
            slotCount
          );
          const bookedCount =
            item.day === dayName
              ? slots.filter((slot) => bookedTimes.includes(slot)).length
              : 0;
          const isFull = slotCount > 0 && bookedCount >= slotCount;
          const slotsLeft = Math.max(0, slotCount - bookedCount);

          return (
            <View key={index} style={[styles.scheduleCard, isFull && styles.fullCard]}>
              <View style={styles.cardMain}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayText}>{item.day}</Text>
                </View>

                <View style={styles.timeInfo}>
                  <View style={styles.row}>
                    <Ionicons name="time-outline" size={16} color={THEME.textGray} />
                    <Text style={styles.timeText}>{timeRange}</Text>
                  </View>
                  <Text style={styles.limitText}>
                    Max Patients: {item.max_patients ?? "Not set"}
                  </Text>

                  <Text style={styles.capacityText}>
                    {slotCount === 0
                      ? "Slots not set"
                      : isFull
                        ? "No slots left"
                        : ""}
                  </Text>
              </View>
            </View>

            {/* Slots are shown in the booking screen; keep this view as schedule-only. */}

          </View>
        );
      })}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={THEME.accentBlue} />
          <Text style={styles.infoText}>
            Patients are served on a first-come, first-served basis within the clinic hours.
          </Text>
        </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.mainActionBtn}
          onPress={() => navigation.navigate("BookAppointmentScreen", { doctorId })}
        >
          <Text style={styles.actionBtnText}>Book This Doctor</Text>
          <Ionicons name="arrow-forward" size={20} color={THEME.white} />
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
  body: { flex: 1, backgroundColor: THEME.background },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  backBtn: { padding: 4 },
  container: { padding: 20 },

  docProfile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 25,
    gap: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  docName: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  docSpec: { fontSize: 13, color: THEME.textGray },

  sectionTitle: { fontSize: 20, fontWeight: "bold", color: THEME.textDark },
  sectionSub: { fontSize: 14, color: THEME.textGray, marginTop: 4, marginBottom: 20 },
  offDayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.softAmber,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  offDayText: { color: THEME.accentAmber, fontSize: 13, fontWeight: "600" },

  scheduleCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  fullCard: { opacity: 0.7, backgroundColor: "#F8FAFC" },
  cardMain: { flexDirection: "row", gap: 15, marginBottom: 20 },

  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
    alignSelf: "flex-start",
  },
  dayText: { fontWeight: "700", color: THEME.accentBlue, fontSize: 13 },

  timeInfo: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontSize: 15, fontWeight: "600", color: THEME.textDark },
  limitText: { marginTop: 4, color: "#999", fontSize: 13 },

  capacityContainer: { marginTop: 12 },
  capacityText: { fontSize: 12, color: THEME.textGray, fontWeight: "500" },
  actionBtnText: { color: THEME.white, fontWeight: "bold", fontSize: 14 },
  footer: {
    backgroundColor: THEME.white,
    padding: 20,
    paddingBottom: 34,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  mainActionBtn: {
    backgroundColor: THEME.accentBlue,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  infoBox: {
    flexDirection: "row",
    backgroundColor: THEME.softBlue,
    padding: 16,
    borderRadius: 18,
    gap: 12,
    marginTop: 10,
    alignItems: "center",
  },
  infoText: { flex: 1, fontSize: 13, color: THEME.textGray, lineHeight: 18 },
});
