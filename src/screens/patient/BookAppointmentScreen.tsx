import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
} from "react-native";
import { Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import { apiFetch } from "../../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  shadow: "#000",
};

export default function BookAppointmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "BookAppointmentScreen">>();
  const {
    doctorId = 1,
    doctorName: doctorNameParam,
    specialty: specialtyParam,
    experienceYears: experienceYearsParam,
    rating: ratingParam,
    reviewCount: reviewCountParam,
  } = route.params ?? {};
  const [doctorInfo, setDoctorInfo] = useState({
    name: doctorNameParam ?? "Dr. Silva",
    specialization: specialtyParam ?? "General Physician",
    experienceYears: experienceYearsParam ?? null,
    rating: ratingParam ?? null,
    reviewCount: reviewCountParam ?? null,
  });
  const generateRollingDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: String(date.getDate()).padStart(2, "0"),
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }
    return dates;
  };

  const [dates] = useState(generateRollingDates());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedSlotRaw, setSelectedSlotRaw] = useState("");
  const [schedule, setSchedule] = useState<
    { day: string; start_time: string; end_time: string; max_patients?: number | null }[]
  >([]);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [selectedTodaySlot, setSelectedTodaySlot] = useState("");
  const [queueInfo, setQueueInfo] = useState<{
    status: string;
    waitingCount: number;
    currentToken: number | null;
    nextToken: number;
    isFull: boolean;
    estimatedWaitMinutes?: number;
    preBookedCount?: number;
    queueStartTime?: string | null;
  } | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);

  const isSameDay = (date1: Date, date2: Date) =>
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();

  const isToday = isSameDay(selectedDate, new Date());
  const { width } = Dimensions.get("window");

  const selectedDateKey = useMemo(() => {
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [selectedDate]);

  const selectedDayName = useMemo(
    () => selectedDate.toLocaleDateString("en-US", { weekday: "long" }),
    [selectedDate]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const availabilityRes = await apiFetch(`/api/patients/doctor/availability/${doctorId}`);
        if (availabilityRes.ok) {
          const data = await availabilityRes.json();
          setSchedule(Array.isArray(data) ? data : []);
        }
        const daysRes = await apiFetch(`/api/patients/doctor/working-days/${doctorId}`);
        if (daysRes.ok) {
          const data = await daysRes.json();
          setWorkingDays(Array.isArray(data) ? data : []);
        }
        if (!doctorNameParam || !specialtyParam || experienceYearsParam == null) {
          const doctorsRes = await apiFetch("/api/patients/doctors");
          if (doctorsRes.ok) {
            const data = await doctorsRes.json();
            if (Array.isArray(data)) {
              const match = data.find((doc) => Number(doc.doctor_id) === Number(doctorId));
              if (match) {
                setDoctorInfo((prev) => ({
                  ...prev,
                  name: match.name ?? prev.name,
                  specialization: match.specialization ?? prev.specialization,
                  experienceYears:
                    typeof match.experience_years === "number"
                      ? match.experience_years
                      : prev.experienceYears,
                }));
              }
            }
          }
        }
      } catch (err) {
        console.error("Load schedule error:", err);
      }
    };
    load();
  }, [doctorId, doctorNameParam, specialtyParam, experienceYearsParam]);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const bookedRes = await apiFetch(
          `/api/patients/doctor/bookings/${doctorId}?date=${selectedDateKey}`
        );
        if (!bookedRes.ok) return;
        const booked = await bookedRes.json();
        setBookedTimes(
          Array.isArray(booked)
            ? booked.map((b: any) => String(b.time).slice(0, 5))
            : []
        );
      } catch (err) {
        console.error("Load bookings error:", err);
      }
    };
    loadBookings();
  }, [doctorId, selectedDateKey]);

  const loadQueueStatus = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await apiFetch(`/api/patients/doctor/queue-status/${doctorId}`);
      if (!res.ok) return;
      const data = await res.json();
      setQueueInfo(data);
    } finally {
      setQueueLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!isToday) {
      setQueueInfo(null);
      setQueueLoading(false);
      return;
    }
    setQueueLoading(true);
    loadQueueStatus().catch((err) => {
      console.error("Load queue status error:", err);
    });
  }, [isToday, loadQueueStatus]);

  const generateSlots = (start: string, end: string, count: number) => {
    if (!count || count <= 0) return [];
    const startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return [];
    const interval = (endTime.getTime() - startTime.getTime()) / count;
    if (interval <= 0) return [];
    const slots: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const slotTime = new Date(startTime.getTime() + interval * i);
      const hours = String(slotTime.getHours()).padStart(2, "0");
      const minutes = String(slotTime.getMinutes()).padStart(2, "0");
      slots.push(`${hours}:${minutes}`);
    }
    return slots;
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

  const workingDaysNormalized = workingDays.map((d) => normalizeDay(d));
  const doctorAvailable =
    workingDaysNormalized.length === 0 ? true : workingDaysNormalized.includes(selectedDayName);

  const daySchedule = schedule.filter(
    (item) => normalizeDay(item.day) === selectedDayName
  );
  const rawSlots = daySchedule.flatMap((item) =>
    generateSlots(
      String(item.start_time).slice(0, 5),
      String(item.end_time).slice(0, 5),
      item.max_patients ?? 0
    )
  );
  const allSlots = rawSlots.reduce<string[]>((acc, slot) => {
    if (!acc.includes(slot)) acc.push(slot);
    return acc;
  }, []);
  const availableSlots = allSlots.filter((slot) => !bookedTimes.includes(slot));
  const slots = availableSlots.map((slot) => ({ raw: slot, label: formatTime(slot) }));
  const isQueueStarted =
    isToday && (queueInfo?.status === "LIVE" || queueInfo?.status === "PAUSED");
  const queueStatusReady = !isToday || !queueLoading;
  const queueFull = isToday
    ? !!queueInfo?.isFull
    : doctorAvailable && slots.length === 0;

  const bookedTodayCount = bookedTimes.filter((t) => allSlots.includes(t)).length;
  const totalCapacity =
    daySchedule.reduce((sum, item) => sum + (item.max_patients ?? 0), 0) ||
    allSlots.length;
  const availableTodayCount = Math.max(0, totalCapacity - bookedTodayCount);
  const nextAvailableTodaySlot = allSlots.find((t) => !bookedTimes.includes(t)) || "";
  const todayClinicStart = daySchedule
    .map((s) => String(s.start_time).slice(0, 5))
    .sort()[0];
  const todayClinicEnd = daySchedule
    .map((s) => String(s.end_time).slice(0, 5))
    .sort()
    .slice(-1)[0];

  useEffect(() => {
    if (slots.length === 0) {
      setSelectedSlot("");
      setSelectedSlotRaw("");
      return;
    }
    if (!selectedSlotRaw || !slots.some((slot) => slot.raw === selectedSlotRaw)) {
      setSelectedSlot(slots[0].label);
      setSelectedSlotRaw(slots[0].raw);
    }
  }, [slots, selectedSlotRaw]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const bookSlot = async (rawSlot: string) => {
    try {
      const res = await apiFetch("/api/patients/bookings", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: doctorId,
          date: selectedDateKey,
          time: rawSlot,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          throw new Error("This slot is already booked.");
        }
        throw new Error(err.message || "Failed to book slot");
      }
      const data = await res.json().catch(() => ({}));
      const booking = data?.booking;
      setBookedTimes((prev) => [...prev, rawSlot]);
      setShowConfirmModal(false);
      navigation.navigate("AppointmentSummaryScreen", {
        doctorName: doctorInfo.name,
        clinicName: "City Clinic",
        specialty: doctorInfo.specialization,
        date: booking?.date ? new Date(booking.date).toISOString() : selectedDate.toISOString(),
        clinicTime: booking?.time
          ? formatTime(String(booking.time).slice(0, 5))
          : formatTime(rawSlot) || "—",
        tokenNumber: "—",
        nowServing: "—",
        estimatedWait: "—",
        queueOpensAt: "8:45 AM",
        doctorId,
      });
    } catch (err) {
      setShowConfirmModal(false);
      Alert.alert("Booking Failed", err instanceof Error ? err.message : "Failed to book");
      console.error("Booking error:", err);
    }
  };

  const handleConfirm = async () => {
    try {
      if (isToday && isQueueStarted) {
        const res = await apiFetch("/api/patients/queue/join", {
          method: "POST",
          body: JSON.stringify({ doctor_id: doctorId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to join queue");
        }
        const data = await res.json().catch(() => ({}));
        await AsyncStorage.setItem("lastQueueDoctorId", String(doctorId));
        await loadQueueStatus();
        setShowConfirmModal(false);
        navigation.navigate("AppointmentSummaryScreen", {
          doctorName: doctorInfo.name,
          clinicName: "City Clinic",
          specialty: doctorInfo.specialization,
          date: new Date().toISOString(),
          clinicTime: todayClinicStart && todayClinicEnd
            ? `${formatTime(todayClinicStart)} - ${formatTime(todayClinicEnd)}`
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
        return;
      }

      if (!doctorAvailable) return;
      if (!selectedSlotRaw) {
        setShowConfirmModal(false);
        return;
      }
      await bookSlot(selectedSlotRaw);
    } catch (err) {
      setShowConfirmModal(false);
      Alert.alert("Booking Failed", err instanceof Error ? err.message : "Failed to book");
      console.error("Booking error:", err);
    }
  };

  const handleBookTodaySlot = async () => {
    const slotToBook = selectedTodaySlot || nextAvailableTodaySlot;
    if (!slotToBook) {
      Alert.alert("No Slots", "No available slots for today.");
      return;
    }
    await bookSlot(slotToBook);
  };


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book your appointment</Text>
        <TouchableOpacity style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color={THEME.textGray} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Summary */}
        <View style={styles.doctorCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={THEME.accentBlue} />
            </View>
            <View style={styles.onlineBadge} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName}>{doctorInfo.name}</Text>
            <Text style={styles.docSpec}>{doctorInfo.specialization}</Text>
            {doctorInfo.experienceYears != null && (
              <Text style={styles.docSpec}>
                {doctorInfo.experienceYears} years experience
              </Text>
            )}
            {doctorInfo.rating != null && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={THEME.accentAmber} />
                <Text style={styles.ratingText}>
                  {doctorInfo.rating}
                  {doctorInfo.reviewCount != null ? ` (${doctorInfo.reviewCount})` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Calendar Strip */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Select Date</Text>
            <Text style={styles.monthLabel}>March 2026</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {dates.map((item) => {
              const itemDate = new Date(item.year, item.month, Number(item.date));
              const isActive = isSameDay(selectedDate, itemDate);
              return (
                <TouchableOpacity
                  key={item.date}
                  onPress={() => setSelectedDate(itemDate)}
                  style={[styles.dateCard, isActive && styles.activeDateCard]}
                >
                  <Text style={[styles.dateDay, isActive && styles.activeText]}>{item.day}</Text>
                  <Text style={[styles.dateNumber, isActive && styles.activeText]}>{item.date}</Text>
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Availability Logic */}
        {isToday && queueLoading ? (
          <QueueLoadingCard />
        ) : isToday && (queueInfo?.status === "LIVE" || queueInfo?.status === "PAUSED") ? (
          queueFull ? <QueueFullCard /> : <QueueStatusCard queueInfo={queueInfo} />
        ) : !doctorAvailable ? (
          <DoctorNotAvailableCard />
        ) : !isToday ? (
          <View style={styles.futureCard}>
            <View style={styles.futureHeaderRow}>
              <Text style={styles.futureTitle}>Available Slots</Text>
              <Text style={styles.futureMonth}>
                {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
            </View>

            <View style={styles.futureExtraTop}>
              <Text style={styles.futureExtraLabel}>Expected Queue Opens At</Text>
              <Text style={styles.futureExtraValue}>8:45 AM</Text>
            </View>

            <View style={styles.futureSlotGrid}>
              {allSlots.map((slot) => {
                const isBooked = bookedTimes.includes(slot);
                const isSelected = selectedSlotRaw === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => {
                      if (isBooked) return;
                      const label = formatTime(slot);
                      setSelectedSlot(label);
                      setSelectedSlotRaw(slot);
                    }}
                    style={[
                      styles.futureSlotCard,
                      isSelected && styles.futureSlotCardActive,
                      isBooked && styles.futureSlotCardBooked,
                      { width: (width - 110) / 3 },
                    ]}
                    disabled={isBooked}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={isSelected ? THEME.white : isBooked ? THEME.textGray : THEME.accentBlue}
                    />
                    <Text style={[styles.futureSlotTimeText, isSelected && styles.futureTextWhite]}>
                      {formatTime(slot)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {slots.length === 0 && (
                <Text style={styles.noSlotsText}>No available slots</Text>
              )}
            </View>

            <View style={styles.futureFooter}>
              <View style={styles.futureSummaryInfo}>
                <Text style={styles.futureSummaryLabel}>Selected Slot</Text>
                <Text style={styles.futureSummaryValue}>
                  {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {selectedSlot}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.futureConfirmBtn}
                onPress={() => setShowConfirmModal(true)}
              >
                <Ionicons name="arrow-forward" size={24} color={THEME.white} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TodayScheduleCard
            startTime={todayClinicStart}
            endTime={todayClinicEnd}
            bookedCount={bookedTodayCount}
            availableCount={availableTodayCount}
            totalCount={totalCapacity}
            nextAvailable={nextAvailableTodaySlot}
            onBook={handleBookTodaySlot}
            previewSlots={allSlots}
            bookedSlots={bookedTimes}
            selectedSlot={selectedTodaySlot}
            onSelectSlot={setSelectedTodaySlot}
          />
        )}

        {/* Selection Summary */}
        <View style={styles.summaryBox}>
          <Ionicons name="calendar" size={20} color={THEME.accentBlue} />
          <Text style={styles.summaryText}>
            Booking for{" "}
            <Text style={styles.boldText}>
              {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          </Text>
        </View>

      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.mainActionBtn,
            (!doctorAvailable ||
              (!isToday && slots.length === 0) ||
              (isToday && !queueStatusReady) ||
              (isToday && !isQueueStarted && !nextAvailableTodaySlot)) &&
              styles.mainActionBtnDisabled,
          ]}
          onPress={() => {
            if (isToday && !queueStatusReady) return;
            if (isToday && !isQueueStarted) {
              handleBookTodaySlot();
              return;
            }
            setShowConfirmModal(true);
          }}
          disabled={
            !doctorAvailable ||
            (!isToday && slots.length === 0) ||
            (isToday && !queueStatusReady) ||
            (isToday && !isQueueStarted && !nextAvailableTodaySlot)
          }
        >
          <Text style={styles.actionBtnText}>
            {isToday
              ? !queueStatusReady
                ? "Checking Queue..."
                : !isQueueStarted
                  ? "Book Slot"
                  : "Join Queue"
              : "Book Token For This Day"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={THEME.white} />
        </TouchableOpacity>
        {!isToday && slots.length === 0 && (
          <Text style={styles.footerNoticeText}>
            No slots available for this day. Please choose another date.
          </Text>
        )}
      </View>

      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrapper}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="calendar-outline" size={32} color={THEME.accentBlue} />
              </View>
            </View>

            <Text style={styles.modalTitle}>
              {isToday ? "Confirm Queue Join" : "Confirm Appointment"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isToday
                ? "Your token and estimated wait will be confirmed."
                : "Please review your appointment details before confirming."}
            </Text>

            <View style={styles.modalInfoCard}>
              {isToday ? (
                <>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="ticket-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>
                      Your Token: {queueInfo?.nextToken ?? "—"}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="time-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>
                      Estimated Wait: {queueInfo?.estimatedWaitMinutes ?? "—"} min
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="calendar-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>
                      Date: {selectedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="time-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>Queue opens at 8:45 AM</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={[styles.modalBtn, styles.modalSecondaryBtn]}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[styles.modalBtn, styles.modalPrimaryBtn]}>
                <Text style={styles.modalPrimaryText}>Confirm</Text>
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
  scroll: { backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  infoBtn: { padding: 4 },

  scrollContent: { padding: 20 },
  
  doctorCard: {
    flexDirection: "row",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 24,
    marginBottom: 25,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarContainer: { position: "relative" },
  avatar: { 
    width: 60, 
    height: 60, 
    borderRadius: 18, 
    backgroundColor: THEME.softBlue, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  onlineBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.accentGreen,
    borderWidth: 2,
    borderColor: THEME.white,
  },
  docInfo: { marginLeft: 16, flex: 1 },
  docName: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  docSpec: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  ratingText: { fontSize: 12, color: THEME.textGray, marginLeft: 4 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  monthLabel: { fontSize: 14, color: THEME.accentBlue, fontWeight: "600" },

  dateScroll: { gap: 12 },
  dateCard: {
    width: 64,
    height: 88,
    borderRadius: 20,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeDateCard: { backgroundColor: THEME.accentBlue, borderColor: THEME.accentBlue },
  dateDay: { fontSize: 12, color: THEME.textGray, marginBottom: 4 },
  dateNumber: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  activeText: { color: THEME.white },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.white, marginTop: 6 },

  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softBlue,
    padding: 16,
    borderRadius: 18,
    gap: 12,
    marginTop: 16,
  },
  summaryText: { fontSize: 14, color: THEME.textDark },
  boldText: { fontWeight: "700", color: THEME.accentBlue },

  queueCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  futureCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 18,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  futureHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  futureTitle: { fontSize: 17, fontWeight: "700", color: THEME.textDark },
  futureMonth: { fontSize: 13, color: THEME.accentBlue, fontWeight: "600" },
  futureTextWhite: { color: THEME.white },
  futureSlotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  noSlotsText: { color: THEME.textGray, fontSize: 12, marginTop: 8 },
  futureSlotCard: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: THEME.white,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
  },
  futureSlotCardActive: {
    backgroundColor: THEME.textDark,
    borderColor: THEME.textDark,
  },
  futureSlotCardBooked: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  futureSlotTimeText: { fontSize: 11, fontWeight: "700", color: THEME.textDark },
  futureExtraTop: { marginBottom: 12 },
  futureExtraLabel: { fontSize: 12, color: THEME.textGray, marginBottom: 4 },
  futureExtraValue: { fontSize: 16, fontWeight: "700", color: THEME.textDark, marginBottom: 10 },
  futureFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F3F7",
  },
  futureSummaryInfo: { flex: 1 },
  futureSummaryLabel: { fontSize: 11, color: THEME.textGray, textTransform: "uppercase", letterSpacing: 0.5 },
  futureSummaryValue: { fontSize: 15, fontWeight: "700", color: THEME.textDark, marginTop: 2 },
  futureConfirmBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.accentBlue,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  queueStatusCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    marginTop: 4,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  queueTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  queueTitle: { fontSize: 16, fontWeight: "700", color: THEME.textDark },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.accentGreen },
  liveText: { fontSize: 10, fontWeight: "800", color: THEME.accentGreen },
  queueStatusContainer: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  statusBox: { flex: 1, alignItems: "center" },
  statusLabel: { fontSize: 12, color: THEME.textGray, marginBottom: 5 },
  servingNumber: { fontSize: 28, fontWeight: "800", color: THEME.textDark },
  verticalDivider: { width: 1, height: "60%", backgroundColor: "#DDE3EB" },
  visualQueueContainer: { marginTop: 20, marginBottom: 15 },
  queueInfoText: { fontSize: 13, color: THEME.textGray, textAlign: "center", marginBottom: 12 },
  boldTextDark: { fontWeight: "700", color: THEME.textDark },
  indicatorTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  patientDot: { width: 12, height: 12, borderRadius: 6 },
  servingDot: { backgroundColor: THEME.accentGreen, width: 14, height: 14 },
  waitingDot: { backgroundColor: "#CBD5E0" },
  youAreNext: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.accentBlue,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: THEME.softBlue,
  },
  youText: { color: THEME.white, fontSize: 9, fontWeight: "bold" },
  infoFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F0F3F7",
    paddingTop: 15,
  },
  estTimeText: { fontSize: 13, color: THEME.textGray },
  skeletonLine: {
    height: 18,
    width: 60,
    borderRadius: 9,
    backgroundColor: THEME.border,
  },
  skeletonLineWide: {
    height: 12,
    width: "80%",
    borderRadius: 6,
    backgroundColor: THEME.border,
    alignSelf: "center",
  },
  noticeCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  noticeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  noticeTitle: { fontSize: 14, fontWeight: "700", color: THEME.textDark },
  noticeText: { fontSize: 13, color: THEME.textGray, lineHeight: 18 },
  unavailableCard: {
    backgroundColor: THEME.white,
    borderRadius: 30,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  unavailableHeader: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  unavailableIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: THEME.softAmber,
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableTitle: { fontSize: 17, fontWeight: "700", color: THEME.textDark },
  unavailableSub: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  unavailableDivider: { height: 1, backgroundColor: "#F0F3F7", marginVertical: 12 },
  unavailableInfoBox: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    padding: 16,
    borderRadius: 18,
    gap: 10,
    marginBottom: 20,
  },
  unavailableInfoText: { flex: 1, fontSize: 13, color: THEME.textGray, lineHeight: 18 },
  unavailableBoldText: { fontWeight: "700", color: THEME.textDark },
  unavailableActions: { flexDirection: "row", gap: 12 },
  unavailableSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  unavailableSecondaryText: { fontSize: 14, fontWeight: "600", color: THEME.textDark },
  unavailablePrimaryBtn: {
    flex: 1.2,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.accentBlue,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
  },
  unavailablePrimaryText: { fontSize: 14, fontWeight: "700", color: THEME.white },
  unavailableLink: { marginTop: 20, alignItems: "center" },
  unavailableLinkText: { fontSize: 12, color: THEME.textGray },
  unavailableLinkAccent: { color: THEME.accentBlue, fontWeight: "700", textDecorationLine: "underline" },
  queueFullCard: {
    backgroundColor: THEME.white,
    borderRadius: 32,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  queueFullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  queueFullIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.softCoral,
    justifyContent: "center",
    alignItems: "center",
  },
  queueFullBadge: {
    backgroundColor: THEME.softCoral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  queueFullBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.accentCoral,
    textTransform: "uppercase",
  },
  queueFullContent: { marginBottom: 24 },
  queueFullTitle: { fontSize: 22, fontWeight: "bold", color: THEME.textDark, marginBottom: 8 },
  queueFullDesc: { fontSize: 14, color: THEME.textGray, lineHeight: 22 },
  queueFullBold: { fontWeight: "700", color: THEME.textDark },
  queueFullAltContainer: { gap: 12 },
  queueFullAltOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.background,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  queueFullAltIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  queueFullAltText: { flex: 1, marginLeft: 12 },
  queueFullAltTitle: { fontSize: 15, fontWeight: "700", color: THEME.textDark },
  queueFullAltSub: { fontSize: 12, color: THEME.textGray, marginTop: 2 },
  queueFullSupport: { marginTop: 24, alignItems: "center" },
  queueFullSupportText: { fontSize: 13, color: THEME.textGray },
  queueFullSupportLink: { color: THEME.accentBlue, fontWeight: "700" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  cardLine: { fontSize: 13, color: THEME.textGray, marginBottom: 4 },
  cardLineBold: { fontSize: 13, color: THEME.textDark, fontWeight: "700", marginBottom: 6 },
  cardDivider: { height: 1, backgroundColor: "#F0F3F7", marginVertical: 10 },
  primaryActionBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: THEME.textDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryActionText: { color: THEME.white, fontSize: 13, fontWeight: "700" },

  scheduleCard: {
    backgroundColor: THEME.white,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  scheduleHeaderText: { gap: 8 },
  scheduleHeaderTitle: { fontSize: 20, fontWeight: "800", color: THEME.textDark },
  scheduleTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scheduleTimeText: { fontSize: 12, fontWeight: "600", color: THEME.textGray },
  scheduleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  scheduleBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.accentGreen },
  scheduleBadgeText: { fontSize: 9, fontWeight: "900", color: THEME.accentGreen },
  scheduleStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: THEME.background,
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 24,
  },
  scheduleStatBox: { alignItems: "center" },
  scheduleStatNumber: { fontSize: 22, fontWeight: "800", color: THEME.textDark },
  scheduleStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textGray,
    textTransform: "uppercase",
    marginTop: 2,
  },
  scheduleDivider: { width: 1, height: 30, backgroundColor: THEME.border },
  scheduleAvailability: { marginBottom: 24 },
  scheduleAvailabilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  scheduleAvailabilityLabel: { fontSize: 13, fontWeight: "700", color: THEME.textDark },
  scheduleAvailabilityValue: { fontSize: 12, fontWeight: "600", color: THEME.textGray },
  scheduleAvailabilityAccent: { color: THEME.accentBlue },
  scheduleProgressBg: { height: 8, backgroundColor: THEME.border, borderRadius: 4, overflow: "hidden" },
  scheduleProgressFill: { height: "100%", backgroundColor: THEME.accentBlue, borderRadius: 4 },
  scheduleHint: { fontSize: 12, color: THEME.textGray, marginTop: 10, fontWeight: "500" },
  scheduleHintBold: { color: THEME.textDark, fontWeight: "700" },
  scheduleActionBtn: {
    backgroundColor: THEME.textDark,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  scheduleActionText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  todaySlotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  todaySlotCard: {
    width: "30%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: THEME.white,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: "center",
    gap: 6,
  },
  todaySlotCardActive: {
    backgroundColor: THEME.textDark,
    borderColor: THEME.textDark,
  },
  todaySlotCardBooked: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  todaySlotTime: { fontSize: 11, fontWeight: "700", color: THEME.textDark },
  todaySlotTimeActive: { color: THEME.white },
  todaySlotTimeBooked: { color: THEME.textGray },

  footer: {
    backgroundColor: THEME.white,
    padding: 20,
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
  mainActionBtnDisabled: {
    backgroundColor: THEME.border,
  },
  actionBtnText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  footerNoticeText: {
    marginTop: 10,
    textAlign: "center",
    color: THEME.textGray,
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: THEME.white,
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrapper: {
    marginTop: -55,
    backgroundColor: THEME.white,
    borderRadius: 30,
    padding: 8,
  },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: THEME.textDark, marginTop: 15 },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.textGray,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  modalInfoCard: {
    width: "100%",
    backgroundColor: THEME.background,
    borderRadius: 20,
    padding: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalInfoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalInfoText: { fontSize: 14, fontWeight: "600", color: THEME.textDark },
  modalDivider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalPrimaryBtn: {
    backgroundColor: THEME.accentBlue,
    shadowColor: THEME.accentBlue,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSecondaryBtn: {
    backgroundColor: THEME.white,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  modalPrimaryText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  modalSecondaryText: { color: THEME.textGray, fontSize: 16, fontWeight: "600" },
});

const QueueStatusCard = ({
  queueInfo,
}: {
  queueInfo: {
    status?: string;
    waitingCount?: number;
    currentToken?: number | null;
    nextToken?: number;
    estimatedWaitMinutes?: number;
  } | null;
}) => {
  const currentServing = queueInfo?.currentToken ?? 0;
  const queueLength = queueInfo?.waitingCount ?? 0;
  const nextToken = queueInfo?.nextToken ?? currentServing + queueLength + 1;
  const isLive = queueInfo?.status === "LIVE";
  const estWait = queueInfo?.estimatedWaitMinutes ?? 45;

  return (
    <View style={styles.queueStatusCard}>
      <View style={styles.queueHeader}>
        <View style={styles.queueTitleRow}>
          <Text style={styles.queueTitle}>Today's Queue</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{isLive ? "LIVE" : "PENDING"}</Text>
          </View>
        </View>
        <Ionicons name="people-outline" size={22} color={THEME.accentBlue} />
      </View>

      <View style={styles.queueStatusContainer}>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Now Serving</Text>
          <Text style={styles.servingNumber}>{currentServing}</Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Next Token</Text>
          <Text style={[styles.servingNumber, { color: THEME.accentBlue }]}>
            {nextToken}
          </Text>
        </View>
      </View>

      <View style={styles.visualQueueContainer}>
        <Text style={styles.queueInfoText}>
          There are <Text style={styles.boldTextDark}>{queueLength} patients</Text> currently waiting.
        </Text>

        <View style={styles.indicatorTrack}>
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.patientDot,
                i === 0 ? styles.servingDot : styles.waitingDot,
              ]}
            />
          ))}
          <View style={styles.youAreNext}>
            <Text style={styles.youText}>You</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoFooter}>
        <Ionicons name="time-outline" size={16} color={THEME.textGray} />
        <Text style={styles.estTimeText}>
          Estimated wait time:{" "}
          <Text style={styles.boldTextDark}>~{estWait} mins</Text>
        </Text>
      </View>
    </View>
  );
};

const QueueLoadingCard = () => (
  <View style={styles.queueStatusCard}>
    <View style={[styles.queueHeader, { opacity: 0.6 }]}>
      <View style={styles.queueTitleRow}>
        <Text style={styles.queueTitle}>Today&apos;s Queue</Text>
      </View>
    </View>
    <View style={[styles.queueStatusContainer, { opacity: 0.5 }]}>
      <View style={styles.statusBox}>
        <View style={styles.skeletonLine} />
      </View>
      <View style={styles.verticalDivider} />
      <View style={styles.statusBox}>
        <View style={styles.skeletonLine} />
      </View>
    </View>
    <View style={[styles.visualQueueContainer, { opacity: 0.5 }]}>
      <View style={styles.skeletonLineWide} />
      <View style={[styles.skeletonLineWide, { marginTop: 8 }]} />
    </View>
  </View>
);

const TodayScheduleCard = ({
  startTime,
  endTime,
  bookedCount,
  availableCount,
  totalCount,
  nextAvailable,
  onBook,
  previewSlots,
  bookedSlots,
  selectedSlot,
  onSelectSlot,
}: {
  startTime?: string;
  endTime?: string;
  bookedCount: number;
  availableCount: number;
  totalCount: number;
  nextAvailable: string;
  onBook: () => void;
  previewSlots: string[];
  bookedSlots: string[];
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
}) => {
  const formatTime = (value?: string) => {
    if (!value) return "—";
    const [h, m] = String(value).split(":").map(Number);
    if (Number.isNaN(h)) return String(value);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleHeader}>
        <View style={styles.scheduleHeaderText}>
          <Text style={styles.scheduleHeaderTitle}>Today's Schedule</Text>
          <View style={styles.scheduleTimeBadge}>
            <Ionicons name="time-outline" size={14} color={THEME.textGray} />
            <Text style={styles.scheduleTimeText}>
              {formatTime(startTime)} - {formatTime(endTime)}
            </Text>
          </View>
        </View>
        <View style={styles.scheduleBadge}>
          <View style={styles.scheduleBadgeDot} />
          <Text style={styles.scheduleBadgeText}>BOOKING OPEN</Text>
        </View>
      </View>

      <View style={styles.scheduleStats}>
        <View style={styles.scheduleStatBox}>
          <Text style={styles.scheduleStatNumber}>{bookedCount}</Text>
          <Text style={styles.scheduleStatLabel}>Booked</Text>
        </View>
        <View style={styles.scheduleDivider} />
        <View style={styles.scheduleStatBox}>
          <Text style={[styles.scheduleStatNumber, { color: THEME.accentBlue }]}>
            {availableCount}
          </Text>
          <Text style={styles.scheduleStatLabel}>Available</Text>
        </View>
      </View>

      <View style={styles.scheduleAvailability}>
        <View style={styles.scheduleAvailabilityHeader}>
          <Text style={styles.scheduleAvailabilityLabel}>Slot Occupancy</Text>
          <Text style={styles.scheduleAvailabilityValue}>
            {totalCount > 0 ? Math.round((bookedCount / totalCount) * 100) : 0}% Full
          </Text>
        </View>
        <View style={styles.scheduleProgressBg}>
          <View
            style={[
              styles.scheduleProgressFill,
              {
                width: `${
                  totalCount > 0 ? (bookedCount / totalCount) * 100 : 0
                }%`,
              },
            ]}
          />
        </View>
        <Text style={styles.scheduleHint}>
          <Ionicons name="sparkles" size={12} color={THEME.accentAmber} /> Next available slot:{" "}
          <Text style={styles.scheduleHintBold}>{formatTime(nextAvailable)}</Text>
        </Text>
      </View>

      <View style={styles.todaySlotGrid}>
        {previewSlots.map((slot) => {
          const isBooked = bookedSlots.includes(slot);
          const isActive = slot === selectedSlot || (!selectedSlot && slot === nextAvailable);
          return (
            <TouchableOpacity
              key={slot}
              style={[
                styles.todaySlotCard,
                isActive && styles.todaySlotCardActive,
                isBooked && styles.todaySlotCardBooked,
              ]}
              disabled={isBooked}
              onPress={() => {
                if (isBooked) return;
                onSelectSlot(slot);
              }}
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={
                  isActive ? THEME.white : isBooked ? THEME.textGray : THEME.accentBlue
                }
              />
              <Text
                style={[
                  styles.todaySlotTime,
                  isActive && styles.todaySlotTimeActive,
                  isBooked && styles.todaySlotTimeBooked,
                ]}
              >
                {formatTime(slot)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const DoctorNotAvailableCard = () => (
  <View style={styles.unavailableCard}>
    <View style={styles.unavailableHeader}>
      <View style={styles.unavailableIconBox}>
        <Ionicons name="alert-circle" size={24} color={THEME.accentAmber} />
      </View>
      <View>
        <Text style={styles.unavailableTitle}>Currently Unavailable</Text>
        <Text style={styles.unavailableSub}>Dr. Silva is not seeing patients today</Text>
      </View>
    </View>

    <View style={styles.unavailableDivider} />

    <View style={styles.unavailableInfoBox}>
      <Ionicons name="information-circle-outline" size={18} color={THEME.textGray} />
      <Text style={styles.unavailableInfoText}>
        The doctor is attending a medical conference and will return on
        <Text style={styles.unavailableBoldText}> Tuesday, March 17.</Text>
      </Text>
    </View>

    <View style={styles.unavailableActions}>
      <TouchableOpacity style={styles.unavailableSecondaryBtn}>
        <Ionicons name="notifications-outline" size={18} color={THEME.textDark} />
        <Text style={styles.unavailableSecondaryText}>Notify Me</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.unavailablePrimaryBtn}>
        <Text style={styles.unavailablePrimaryText}>View Others</Text>
        <Ionicons name="arrow-forward" size={18} color={THEME.white} />
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.unavailableLink}>
      <Text style={styles.unavailableLinkText}>
        Need urgent care? <Text style={styles.unavailableLinkAccent}>View Hospital ER</Text>
      </Text>
    </TouchableOpacity>
  </View>
);

const QueueFullCard = () => (
  <View style={styles.queueFullCard}>
    <View style={styles.queueFullHeader}>
      <View style={styles.queueFullIcon}>
        <Ionicons name="people" size={26} color={THEME.accentCoral} />
      </View>
      <View style={styles.queueFullBadge}>
        <Text style={styles.queueFullBadgeText}>Capacity Reached</Text>
      </View>
    </View>

    <View style={styles.queueFullContent}>
      <Text style={styles.queueFullTitle}>Queue is Full Today</Text>
      <Text style={styles.queueFullDesc}>
        The maximum limit of <Text style={styles.queueFullBold}>50 patients</Text> has been reached for
        walk-in tokens. No new tokens are being issued for today.
      </Text>
    </View>

    <View style={styles.queueFullAltContainer}>
      <TouchableOpacity style={styles.queueFullAltOption}>
        <View style={styles.queueFullAltIcon}>
          <Ionicons name="calendar-outline" size={20} color={THEME.accentBlue} />
        </View>
        <View style={styles.queueFullAltText}>
          <Text style={styles.queueFullAltTitle}>Book for Tomorrow</Text>
          <Text style={styles.queueFullAltSub}>Secure your spot early</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.queueFullAltOption}>
        <View style={styles.queueFullAltIcon}>
          <Ionicons name="notifications-outline" size={20} color={THEME.accentBlue} />
        </View>
        <View style={styles.queueFullAltText}>
          <Text style={styles.queueFullAltTitle}>Waiting List</Text>
          <Text style={styles.queueFullAltSub}>Get notified if a slot opens</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.queueFullSupport}>
      <Text style={styles.queueFullSupportText}>
        Need assistance? <Text style={styles.queueFullSupportLink}>Contact Reception</Text>
      </Text>
    </TouchableOpacity>
  </View>
);
