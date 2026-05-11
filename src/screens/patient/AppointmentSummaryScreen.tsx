import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import * as Calendar from "expo-calendar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import {
  formatLocalDateKey,
  parseSessionDate,
} from "../../utils/sessionPresentation";

const THEME = patientTheme.colors;

function parseTimePart(label: string) {
  const match = label.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

function buildCalendarRange(baseDate: Date, clinicTime: string) {
  const normalized = clinicTime.replace(/[–—]/g, "-");
  const [startLabelRaw, endLabelRaw] = normalized.split("-").map((part) => part.trim()).filter(Boolean);
  const startTime = parseTimePart(startLabelRaw);
  if (!startTime) return null;

  const start = new Date(baseDate);
  start.setHours(startTime.hours, startTime.minutes, 0, 0);

  const end = new Date(start);
  const endTime = endLabelRaw ? parseTimePart(endLabelRaw) : null;

  if (endTime) {
    end.setHours(endTime.hours, endTime.minutes, 0, 0);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
  } else {
    end.setHours(end.getHours() + 1);
  }

  return { start, end };
}

export default function AppointmentSummaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<PatientStackParamList, "AppointmentSummaryScreen">>();
  const {
    doctorName = "Dr. Silva",
    clinicName = "Family Care Clinic",
    clinicId,
    specialty = "General Physician",
    date = formatLocalDateKey(new Date()),
    clinicTime = "9:00 AM – 12:00 PM",
    tokenNumber = "13",
    nowServing = "08",
    estimatedWait = "25 min",
    queueOpensAt = "8:45 AM",
    doctorId,
    sessionId,
  } = route?.params ?? {};

  const selectedDate = parseSessionDate(String(date)) ?? new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  const showToken = typeof tokenNumber === "string" && tokenNumber !== "—";
  const isFuture =
    selectedDate.getFullYear() > today.getFullYear() ||
    (selectedDate.getFullYear() === today.getFullYear() &&
      (selectedDate.getMonth() > today.getMonth() ||
        (selectedDate.getMonth() === today.getMonth() && selectedDate.getDate() > today.getDate())));
  const appointmentRange = buildCalendarRange(selectedDate, clinicTime);

  const handleAddToCalendar = async () => {
    if (!appointmentRange) {
      Alert.alert("Unable to add event", "The appointment time is invalid.");
      return;
    }

    try {
      const isCalendarAvailable = await Calendar.isAvailableAsync();
      if (!isCalendarAvailable) {
        Alert.alert("Unable to open calendar", "Calendar is not available on this device.");
        return;
      }

      await Calendar.createEventInCalendarAsync({
        title: `Appointment with ${doctorName}`,
        startDate: appointmentRange.start,
        endDate: appointmentRange.end,
        location: "Floor 2, Room 204",
        notes: `Clinic: ${clinicName}\nSpecialty: ${specialty}\nReminder: 1 hour before`,
      });
    } catch (error) {
      console.log("Add to calendar error:", error);
      Alert.alert("Unable to add event", "The calendar dialog could not be opened.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.heroStart} />
      <View style={[styles.topBackdrop, { height: insets.top + 240 }]} />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={20} color={THEME.textDark} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successHeader}>
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark-circle" size={80} color={THEME.accentGreen} />
            </View>
            <Text style={styles.confirmTitle}>
              {isFuture ? "Appointment Reserved!" : "Appointment Confirmed!"}
            </Text>
            <Text style={styles.confirmSub}>
              {isFuture ? "Your slot is secured for next week" : `You're all set to see ${doctorName}`}
            </Text>
          </View>

          {isFuture ? (
          <View style={styles.ticketCard}>
            <View style={styles.ticketTop}>
              <View style={styles.docAvatar}>
                <Ionicons name="person" size={30} color={THEME.accentBlue} />
              </View>
              <View>
                <Text style={styles.docName}>{doctorName}</Text>
                <Text style={styles.docSpec}>{specialty}</Text>
                <Text style={styles.clinicName}>{clinicName}</Text>
              </View>
            </View>

            <View style={styles.dashedContainer}>
              <View style={[styles.cutout, { left: -15 }]} />
              <View style={styles.dashedLine} />
              <View style={[styles.cutout, { right: -15 }]} />
            </View>

            <View style={styles.ticketBottom}>
              <Text style={styles.sectionLabel}>APPOINTMENT DETAILS</Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{clinicTime}</Text>
                </View>
              </View>

              <View style={styles.metaInfo}>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={16} color={THEME.textGray} />
                  <Text style={styles.metaText}>Floor 2, Room 204</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="notifications-outline" size={16} color={THEME.textGray} />
                  <Text style={styles.metaText}>Reminder set for 1hr before</Text>
                </View>
              </View>
            </View>
          </View>
        ) : showToken ? (
          <View style={styles.ticketCard}>
            <View style={styles.ticketTop}>
              <View style={styles.docAvatar}>
                <Ionicons name="person" size={30} color={THEME.accentBlue} />
              </View>
              <View>
                <Text style={styles.docName}>{doctorName}</Text>
                <Text style={styles.docSpec}>{specialty}</Text>
                <Text style={styles.clinicName}>{clinicName}</Text>
              </View>
            </View>

            <View style={styles.dashedContainer}>
              <View style={[styles.cutout, { left: -20 }]} />
              <View style={styles.dashedLine} />
              <View style={[styles.cutout, { right: -20 }]} />
            </View>

            <View style={styles.ticketBottom}>
              <Text style={styles.tokenLabel}>YOUR TOKEN</Text>
              <Text style={styles.tokenNumber}>{tokenNumber}</Text>

              <View style={styles.queueStats}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Now Serving</Text>
                  <Text style={styles.statValue}>{nowServing}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Est. Wait</Text>
                  <Text style={[styles.statValue, { color: THEME.accentBlue }]}>{estimatedWait}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.ticketCard}>
            <View style={styles.ticketTop}>
              <View style={styles.docAvatar}>
                <Ionicons name="person" size={30} color={THEME.accentBlue} />
              </View>
              <View>
                <Text style={styles.docName}>{doctorName}</Text>
                <Text style={styles.docSpec}>{specialty}</Text>
                <Text style={styles.clinicName}>{clinicName}</Text>
              </View>
            </View>

            <View style={styles.dashedContainer}>
              <View style={[styles.cutout, { left: -20 }]} />
              <View style={styles.dashedLine} />
              <View style={[styles.cutout, { right: -20 }]} />
            </View>

            <View style={styles.ticketBottom}>
              <Text style={styles.tokenLabel}>APPOINTMENT TIME</Text>
              <View style={styles.appointmentTimeRow}>
                <Text style={styles.appointmentTimeText}>
                  {clinicTime.includes(" ") ? clinicTime.split(" ")[0] : clinicTime}
                </Text>
                {clinicTime.includes(" ") && (
                  <Text style={styles.appointmentPeriod}>
                    {clinicTime.split(" ").slice(1).join(" ")}
                  </Text>
                )}
              </View>
              <View style={styles.queueStats}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Date</Text>
                  <Text style={styles.statValue}>
                    {selectedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color={THEME.textGray} />
            <Text style={styles.infoText}>
              {selectedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color={THEME.textGray} />
            <Text style={styles.infoText}>{clinicTime}</Text>
          </View>
        </View>

          <View style={styles.actionGroup}>
            {isToday && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate("PatientQueue", { doctorId, clinicId, sessionId })}
                disabled={!doctorId}
              >
                <Ionicons name="notifications-outline" size={20} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Notify Me</Text>
              </TouchableOpacity>
            )}
            {isFuture && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleAddToCalendar()}>
                <Ionicons name="calendar-outline" size={20} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Add to Calendar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("Appointments")}
            >
              <Text style={styles.secondaryBtnText}>View Appointments</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.modernBackground },
  topBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.heroStart,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { padding: 24, paddingTop: 0, paddingBottom: 32, alignItems: "center" },
  closeBtn: {
    position: "absolute",
    top: 8,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 2,
    borderWidth: 1,
    borderColor: "rgba(3, 4, 94, 0.06)",
  },

  successHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 28,
    paddingBottom: 20,
    width: "100%",
  },
  checkIcon: { marginBottom: 15 },
  confirmTitle: { fontSize: 24, fontWeight: "800", color: THEME.textDark },
  confirmSub: { fontSize: 14, color: THEME.textGray, marginTop: 5 },

  ticketCard: {
    width: "100%",
    backgroundColor: THEME.white,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: THEME.modernBorder,
  },
  ticketTop: {
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  docAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  docName: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  docSpec: { fontSize: 14, color: THEME.textGray },
  clinicName: { fontSize: 12, color: THEME.accentBlue, fontWeight: "600", marginTop: 2 },

  dashedContainer: {
    height: 20,
    justifyContent: "center",
    overflow: "hidden",
  },
  dashedLine: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "dashed",
    borderRadius: 1,
    marginHorizontal: 20,
  },
  cutout: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.background,
  },

  ticketBottom: {
    padding: 24,
    alignItems: "center",
  },
  tokenLabel: { fontSize: 12, fontWeight: "800", color: THEME.textGray, letterSpacing: 1.5 },
  tokenNumber: { fontSize: 72, fontWeight: "900", color: THEME.textDark, marginVertical: 10 },
  appointmentTimeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 10,
  },
  appointmentTimeText: { fontSize: 56, fontWeight: "900", color: THEME.textDark },
  appointmentPeriod: { fontSize: 20, fontWeight: "800", color: THEME.textGray, marginBottom: 8 },

  sectionLabel: { fontSize: 12, fontWeight: "800", color: THEME.textGray, letterSpacing: 1.5 },
  detailGrid: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  detailItem: { flex: 1, alignItems: "center" },
  detailLabel: { fontSize: 11, color: THEME.textGray, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: "700", color: THEME.textDark },
  verticalDivider: { width: 1, height: "100%", backgroundColor: THEME.border },
  metaInfo: { marginTop: 14, width: "100%", gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13, color: THEME.textGray },

  queueStats: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    borderRadius: 20,
    width: "100%",
    padding: 15,
    marginTop: 10,
  },
  statBox: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 11, color: THEME.textGray, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "bold", color: THEME.textDark },
  statDivider: { width: 1, height: "100%", backgroundColor: THEME.border },

  infoRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    gap: 20,
    marginBottom: 40,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 14, fontWeight: "600", color: THEME.textDark },

  actionGroup: { width: "100%", gap: 15 },
  primaryBtn: {
    backgroundColor: THEME.modernAccent,
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    elevation: 8,
    shadowColor: THEME.modernAccent,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  primaryBtnText: { color: THEME.white, fontSize: 16, fontWeight: "bold" },
  secondaryBtn: {
    height: 50,
    backgroundColor: THEME.modernPrimary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: { color: THEME.white, fontSize: 16, fontWeight: "600" },
});
