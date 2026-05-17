import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
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
import { TabBar, TabView } from "react-native-tab-view";
import AppointmentCard from "../../components/patient/appointments/AppointmentCard";
import LiveQueueAppointmentCard from "../../components/patient/appointments/LiveQueueAppointmentCard";
import { cancelAppointment, fetchAppointments, rescheduleAppointment } from "../../services/appointmentsApi";
import type { PatientStackParamList } from "../../types/navigation";
import type { AppointmentItem, AppointmentStatus } from "../../types/appointments";
import { APPOINTMENT_TABS, getAppointmentCounts, validateRescheduleInput } from "../../utils/appointments";
import { patientTheme } from "../../constants/patientTheme";

const THEME = patientTheme.colors;

type AppointmentRoute = {
  key: string;
  title: string;
  status: AppointmentStatus;
};

type UpcomingPresentation = "live" | "check_in_required" | "today" | "default";

const buildTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const getUpcomingPresentation = (appointment: AppointmentItem): UpcomingPresentation => {
  if (appointment.status !== "UPCOMING") return "default";
  const queueStatus = String(appointment.queueStatus || "").toUpperCase();
  const queuePatientStatus = String(appointment.queuePatientStatus || "").toUpperCase();
  const hasLiveQueue = queueStatus === "LIVE" || queueStatus === "PAUSED";
  const hasActiveQueueEntry = queuePatientStatus === "WAITING" || queuePatientStatus === "WITH_DOCTOR";

  if (hasLiveQueue && hasActiveQueueEntry) {
    return "live";
  }
  if (hasLiveQueue) {
    return "check_in_required";
  }
  if (appointment.rawDate === buildTodayKey()) {
    return "today";
  }
  return "default";
};

const sortUpcomingAppointments = (items: AppointmentItem[]) => {
  const weight = (appointment: AppointmentItem) => {
    const state = getUpcomingPresentation(appointment);
    if (state === "live") return 0;
    if (state === "check_in_required") return 1;
    if (state === "today") return 2;
    return 3;
  };

  return [...items].sort((left, right) => {
    const leftWeight = weight(left);
    const rightWeight = weight(right);
    if (leftWeight !== rightWeight) return leftWeight - rightWeight;
    return `${left.rawDate} ${left.rawTime}`.localeCompare(`${right.rawDate} ${right.rawTime}`);
  });
};

const LooseTabBar = TabBar as any;

export default function Appointments() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleBooking, setRescheduleBooking] = useState<AppointmentItem | null>(null);
  const routes = useMemo<AppointmentRoute[]>(
    () => [
      { key: "upcoming", title: "Upcoming", status: "UPCOMING" as AppointmentStatus },
      { key: "completed", title: "Completed", status: "COMPLETED" as AppointmentStatus },
      { key: "cancelled", title: "Cancelled", status: "CANCELLED" as AppointmentStatus },
      { key: "missed", title: "Missed", status: "MISSED" as AppointmentStatus },
    ],
    []
  );

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAppointments(await fetchAppointments());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load appointments";
      setError(message);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAppointments();
    }, [loadAppointments])
  );

  const counts = useMemo(() => getAppointmentCounts(appointments), [appointments]);
  const appointmentsByStatus = useMemo(
    () =>
      APPOINTMENT_TABS.reduce<Record<AppointmentStatus, AppointmentItem[]>>(
        (accumulator, status) => {
          const items = appointments.filter((appointment) => appointment.status === status);
          accumulator[status] = status === "UPCOMING" ? sortUpcomingAppointments(items) : items;
          return accumulator;
        },
        {
          UPCOMING: [],
          COMPLETED: [],
          CANCELLED: [],
          MISSED: [],
        }
      ),
    [appointments]
  );

  const cancelBooking = useCallback(
    (bookingId: string) => {
      Alert.alert("Cancel Appointment", "Are you sure you want to cancel this booking?", [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelAppointment(bookingId);
              await loadAppointments();
            } catch (err) {
              Alert.alert(
                "Cancel Failed",
                err instanceof Error ? err.message : "Failed to cancel appointment"
              );
            }
          },
        },
      ]);
    },
    [loadAppointments]
  );

  const openReschedule = useCallback((appointment: AppointmentItem) => {
    setRescheduleBooking(appointment);
    setRescheduleDate(appointment.rawDate);
    setRescheduleTime(appointment.rawTime);
    setRescheduleOpen(true);
  }, []);

  const closeReschedule = useCallback(() => {
    setRescheduleOpen(false);
    setRescheduleBooking(null);
    setRescheduleDate("");
    setRescheduleTime("");
  }, []);

  const submitReschedule = useCallback(async () => {
    if (!rescheduleBooking) return;

    const validation = validateRescheduleInput(rescheduleDate, rescheduleTime);
    if (!validation.ok) {
      Alert.alert("Invalid Schedule", validation.message);
      return;
    }

    try {
      await rescheduleAppointment(
        rescheduleBooking.id,
        rescheduleDate.trim(),
        rescheduleTime.trim()
      );
      closeReschedule();
      await loadAppointments();
    } catch (err) {
      Alert.alert(
        "Reschedule Failed",
        err instanceof Error ? err.message : "Failed to reschedule appointment"
      );
    }
  }, [closeReschedule, loadAppointments, rescheduleBooking, rescheduleDate, rescheduleTime]);

  const handleGoToQueue = useCallback(
    (appointment: AppointmentItem) => {
      if (!appointment.doctorId && !appointment.sessionId && !appointment.id) {
        Alert.alert("Queue Unavailable", "Queue details are missing for this appointment.");
        return;
      }
      navigation.navigate("PatientQueue", {
        doctorId: appointment.doctorId ?? undefined,
        clinicId: appointment.clinicId ?? undefined,
        sessionId: appointment.sessionId ?? undefined,
        appointmentId: appointment.id,
        queueId: appointment.queueId ? String(appointment.queueId) : undefined,
      });
    },
    [navigation]
  );

  const handleRebook = useCallback(
    (appointment: AppointmentItem) => {
      Alert.alert(
        "Clinic Required",
        "Rebooking now requires a clinic context. Open the doctor from a clinic to rebook."
      );
    },
    []
  );

  const handleViewSummary = useCallback((appointment: AppointmentItem) => {
    Alert.alert(
      "Appointment Summary",
      `${appointment.doctor}\n${appointment.displayDate} at ${appointment.displayTime}\nStatus: ${appointment.status.replaceAll(
        "_",
        " "
      )}`
    );
  }, []);

  const renderAppointmentList = useCallback(
    (status: AppointmentStatus) => {
      const items = appointmentsByStatus[status];

      return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {loading ? (
            <EmptyState text="Loading appointments..." icon="time-outline" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void loadAppointments()} />
          ) : items.length === 0 ? (
            <EmptyState
              text={getEmptyStateText(status)}
              icon={status === "UPCOMING" ? "calendar-outline" : "file-tray-outline"}
            />
          ) : (
            items.map((appointment) => (
              <AppointmentListItem
                key={appointment.id}
                appointment={appointment}
                onCancel={() => cancelBooking(appointment.id)}
                onReschedule={() => openReschedule(appointment)}
                onGoToQueue={() => handleGoToQueue(appointment)}
                onViewSummary={() => handleViewSummary(appointment)}
                onRebook={() => handleRebook(appointment)}
              />
            ))
          )}
        </ScrollView>
      );
    },
    [
      appointmentsByStatus,
      cancelBooking,
      error,
      handleGoToQueue,
      handleRebook,
      handleViewSummary,
      loadAppointments,
      loading,
      openReschedule,
    ]
  );

  const renderScene = useCallback(
    ({ route }: { route: AppointmentRoute }) => renderAppointmentList(route.status),
    [renderAppointmentList]
  );

  const renderTabBar = useCallback(
    (props: Parameters<typeof TabBar>[0]) => (
      <LooseTabBar
        {...props}
        scrollEnabled
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
        tabStyle={styles.tabBarItem}
        indicatorStyle={styles.tabIndicator}
        activeColor={THEME.primary}
        inactiveColor={THEME.textMuted}
        pressColor="transparent"
        renderLabel={({ route, focused }: any) => (
          <View style={styles.tabInner}>
            <Text style={[styles.tabText, focused && styles.tabTextActive]}>{route.title}</Text>
            <View style={[styles.countBadge, focused && styles.countBadgeActive]}>
              <Text style={[styles.countText, focused && styles.countTextActive]}>{counts[(route as AppointmentRoute).status]}</Text>
            </View>
          </View>
        )}
      />
    ),
    [counts, routes]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={THEME.textDark} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSub}>Manage your healthcare visits</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("DoctorSearchScreen")}
        >
          <Ionicons name="add" size={24} color={THEME.white} />
        </TouchableOpacity>
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene as any}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        initialLayout={{ width: Dimensions.get("window").width }}
        lazy
      />

      <Modal visible={rescheduleOpen} transparent animationType="fade" onRequestClose={closeReschedule}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.modalSubtitle}>This is only allowed before the scheduled time.</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              value={rescheduleDate}
              onChangeText={setRescheduleDate}
              style={styles.modalInput}
              placeholderTextColor={THEME.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              placeholder="HH:MM"
              value={rescheduleTime}
              onChangeText={setRescheduleTime}
              style={styles.modalInput}
              placeholderTextColor={THEME.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSecondary]}
                onPress={closeReschedule}
              >
                <Text style={styles.modalSecondaryText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={() => void submitReschedule()}
              >
                <Text style={styles.modalPrimaryText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AppointmentListItem({
  appointment,
  onCancel,
  onReschedule,
  onGoToQueue,
  onViewSummary,
  onRebook,
}: {
  appointment: AppointmentItem;
  onCancel: () => void;
  onReschedule: () => void;
  onGoToQueue: () => void;
  onViewSummary: () => void;
  onRebook: () => void;
}) {
  const presentation = getUpcomingPresentation(appointment);

  if (presentation === "live" || presentation === "check_in_required") {
    return (
      <LiveQueueAppointmentCard
        doctorName={appointment.doctor}
        clinicName={appointment.clinicName}
        sessionTime={
          appointment.sessionStartTime && appointment.sessionEndTime
            ? `${appointment.sessionStartTime} - ${appointment.sessionEndTime}`
            : appointment.displayTime
        }
        queueNumber={appointment.queueTokenNumber}
        currentServingNumber={appointment.currentServingToken}
        badgeLabel={presentation === "live" ? "Queue Live" : "Check-In Required"}
        badgeTone={presentation === "live" ? "live" : "warning"}
        message={
          presentation === "live"
            ? appointment.queueTokenNumber
              ? "Your appointment is already part of the live queue."
              : "Queue is live for this session."
            : appointment.backendStatus === "CONFIRMED"
              ? "Waiting for receptionist queue check-in."
              : "Please check in at reception to join the queue."
        }
        onPress={onGoToQueue}
      />
    );
  }

  if (presentation === "today") {
    return (
      <TodayAppointmentCard
        appointment={appointment}
        onPress={onGoToQueue}
        onCancel={onCancel}
      />
    );
  }

  return (
    <AppointmentCard
      appointment={appointment}
      onCancel={onCancel}
      onReschedule={onReschedule}
      onGoToQueue={onGoToQueue}
      onViewSummary={onViewSummary}
      onRebook={onRebook}
    />
  );
}

function TodayAppointmentCard({
  appointment,
  onPress,
  onCancel,
}: {
  appointment: AppointmentItem;
  onPress: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.todayCard}>
      <View style={styles.todayTopRow}>
        <View style={styles.todayIconWrap}>
          <Ionicons name="today-outline" size={20} color={THEME.primary} />
        </View>
        <View style={styles.todayCopy}>
          <Text style={styles.todayEyebrow}>Today's Appointment</Text>
          <Text style={styles.todayDoctor}>{appointment.doctor}</Text>
          <Text style={styles.todayClinic}>{appointment.clinicName}</Text>
        </View>
        <View style={styles.todayBadge}>
          <Text style={styles.todayBadgeText}>Session Today</Text>
        </View>
      </View>

      <View style={styles.todayMetaRow}>
        <View style={styles.todayMetaPill}>
          <Ionicons name="time-outline" size={14} color={THEME.textDark} />
          <Text style={styles.todayMetaText}>
            {appointment.sessionStartTime && appointment.sessionEndTime
              ? `${appointment.sessionStartTime} - ${appointment.sessionEndTime}`
              : appointment.displayTime}
          </Text>
        </View>
        <View style={styles.todayMetaPill}>
          <Ionicons name="calendar-outline" size={14} color={THEME.textDark} />
          <Text style={styles.todayMetaText}>{appointment.displayDate}</Text>
        </View>
      </View>

      <Text style={styles.todayMessage}>
        Your appointment is booked for today. Queue progress will appear once the session starts.
      </Text>

      <View style={styles.todayActionRow}>
        <TouchableOpacity style={styles.todayPrimaryButton} activeOpacity={0.88} onPress={onPress}>
          <Text style={styles.todayPrimaryButtonText}>View Queue Status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.todaySecondaryButton} activeOpacity={0.88} onPress={onCancel}>
          <Text style={styles.todaySecondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getEmptyStateText(activeTab: AppointmentStatus) {
  switch (activeTab) {
    case "COMPLETED":
      return "No completed visits";
    case "CANCELLED":
      return "No cancelled appointments";
    case "MISSED":
      return "No missed appointments";
    case "UPCOMING":
    default:
      return "No upcoming appointments";
  }
}

function EmptyState({ text, icon }: { text: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={42} color="#C6D3E1" />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={44} color={THEME.danger} />
      <Text style={styles.errorTitle}>Unable to load appointments</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: THEME.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F4F8",
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: THEME.textDark },
  headerSub: { marginTop: 2, fontSize: 13, color: THEME.textMuted, fontWeight: "400" },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C1C1E",
  },
  tabBar: {
    marginTop: 12,
    backgroundColor: THEME.white,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  tabBarContent: {
    paddingHorizontal: 16,
  },
  tabBarItem: {
    width: "auto",
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  tabLabelBase: {
    textTransform: "none",
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    minHeight: 40,
  },
  tabText: { fontSize: 14, fontWeight: "600", color: "#8E8E93" },
  tabTextActive: { color: THEME.primary },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E5F0FF",
    alignItems: "center",
  },
  countBadgeActive: {
    backgroundColor: "#E5F0FF",
  },
  countText: { fontSize: 12, fontWeight: "600", color: "#2196F3" },
  countTextActive: { color: "#2196F3" },
  tabIndicator: {
    backgroundColor: THEME.primary,
    height: 2,
    borderRadius: 2,
  },
  scroll: { flex: 1, backgroundColor: THEME.background },
  content: { paddingTop: 16, gap: 0, paddingBottom: 40 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 15,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textDark,
  },
  errorMessage: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textMuted,
  },
  retryBtn: {
    marginTop: 16,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: THEME.primary,
  },
  retryBtnText: {
    color: THEME.white,
    fontWeight: "800",
    fontSize: 14,
  },
  todayCard: {
    backgroundColor: THEME.white,
    borderRadius: 26,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    ...patientTheme.shadows.soft,
  },
  todayTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  todayCopy: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 12,
  },
  todayEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  todayDoctor: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textDark,
  },
  todayClinic: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  todayBadge: {
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  todayBadgeText: {
    color: "#075985",
    fontSize: 11,
    fontWeight: "800",
  },
  todayMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  todayMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    backgroundColor: THEME.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todayMetaText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textDark,
  },
  todayMessage: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  todayActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  todayPrimaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  todayPrimaryButtonText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "800",
  },
  todaySecondaryButton: {
    minWidth: 92,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F3F7FB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  todaySecondaryButtonText: {
    color: THEME.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 22,
    padding: 20,
    backgroundColor: THEME.white,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: THEME.textDark },
  modalSubtitle: { marginTop: 6, fontSize: 13, color: THEME.textMuted },
  modalInput: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: THEME.textDark,
    fontSize: 14,
    backgroundColor: "#FBFDFF",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  modalPrimary: { backgroundColor: "#0F172A" },
  modalPrimaryText: { color: THEME.white, fontWeight: "800" },
  modalSecondary: { backgroundColor: "#F3F7FB" },
  modalSecondaryText: { color: THEME.textDark, fontWeight: "700" },
});
