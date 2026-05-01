import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import { apiFetch } from "../../config/api";
import { getDailyReport, getQueueDashboard } from "../../services/doctorQueueService";
import { useAuth } from "../../utils/AuthContext";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import QueueCard, { type QueueStatus } from "../../components/doctor/QueueCard";
import ScheduleCard, {
  SCHEDULE_CARD_SPACING,
  SCHEDULE_CARD_WIDTH,
  type ScheduleCardProps,
} from "../../components/doctor/ScheduleCard";
import SectionHeader from "../../components/doctor/SectionHeader";
import StatCard from "../../components/doctor/StatCard";

type DoctorNavigation = NativeStackNavigationProp<any>;

type QueuePatient = {
  name?: string | null;
  token_number?: number | string | null;
};

type DoctorDashboardResponse = {
  doctor?: {
    name?: string;
    specialization?: string;
  };
  queue?: {
    status?: string | null;
    waitingCount?: number | null;
  } | null;
};

const COLORS = {
  background: "#F5F7FA",
  white: "#FFFFFF",
  textDark: "#1E293B",
  textGray: "#64748B",
  textSecondary: "#475569",
  border: "#E2E8F0",
  accentBlue: "#2563EB",
  accentGreen: "#22C55E",
  accentGreenSoft: "#E8F5E9",
  accentBlueSoft: "#E3F2FD",
  accentAmber: "#F59E0B",
  accentAmberSoft: "#FEF3C7",
};

const SPACING = {
  screen: 20,
  section: 24,
  gap: 16,
};

const MOCK_SCHEDULES: Array<ScheduleCardProps & { id: string }> = [
  {
    id: "1",
    clinicName: "HealthLink Kurunegala",
    startTime: "12:00",
    endTime: "15:00",
    dayLabel: "Today",
    patientsCount: 12,
    status: "Upcoming",
    onPress: () => undefined,
  },
  {
    id: "2",
    clinicName: "HealthLink Colombo",
    startTime: "09:00",
    endTime: "11:30",
    dayLabel: "Tomorrow",
    patientsCount: 8,
    status: "Upcoming",
    onPress: () => undefined,
  },
  {
    id: "3",
    clinicName: "HealthLink Galle",
    startTime: "16:00",
    endTime: "19:00",
    dayLabel: "Fri",
    patientsCount: 6,
    status: "Upcoming",
    onPress: () => undefined,
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<DoctorNavigation>();
  const { user } = useAuth();
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("IDLE");
  const [stats, setStats] = useState({
    totalPatients: 0,
    waitingNow: 0,
    avgTime: 0,
  });
  const [doctorProfile, setDoctorProfile] = useState<{
    name?: string;
    specialization?: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  const showApprovalRequiredToast = useCallback(() => {
    Toast.show({
      type: "info",
      text1: "Approval required",
      text2: "Your account must be verified before using this feature",
    });
  }, []);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      if (!isVerifiedDoctor) {
        setPatients([]);
        setQueueStatus("IDLE");
        setStats({
          totalPatients: 0,
          waitingNow: 0,
          avgTime: 0,
        });
        setDoctorProfile({
          name: user?.name,
          specialization: user?.specialization || undefined,
        });
        return;
      }

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        return;
      }

      const [dashboard, report, doctorResponse] = await Promise.all([
        getQueueDashboard(token),
        getDailyReport(token),
        apiFetch("/api/doctor/dashboard"),
      ]);

      const doctorData = doctorResponse.ok
        ? ((await doctorResponse.json()) as DoctorDashboardResponse)
        : null;

      setPatients(Array.isArray(dashboard?.patients) ? dashboard.patients : []);
      setQueueStatus(
        String(dashboard?.queue?.status || doctorData?.queue?.status || "IDLE").toUpperCase() ===
          "LIVE"
          ? "LIVE"
          : "IDLE"
      );
      setStats({
        totalPatients: Number(report?.dailySummary?.totalPatients ?? 0),
        waitingNow: Number(dashboard?.queue?.waitingCount ?? doctorData?.queue?.waitingCount ?? 0),
        avgTime: Number(report?.dailySummary?.averageConsultationMinutes ?? 0),
      });
      setDoctorProfile({
        name: doctorData?.doctor?.name,
        specialization: doctorData?.doctor?.specialization,
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message || "");
      if (status === 403 && message.toLowerCase().includes("not verified")) {
        showApprovalRequiredToast();
        return;
      }
      Alert.alert("Unable to load dashboard", "Please try again in a moment.");
    } finally {
      setRefreshing(false);
    }
  }, [isVerifiedDoctor, showApprovalRequiredToast, user?.name, user?.specialization]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const currentPatient = patients[0];
  const currentToken =
    currentPatient?.token_number !== undefined && currentPatient?.token_number !== null
      ? String(currentPatient.token_number)
      : "--";

  const queueSubtitle =
    queueStatus === "LIVE"
      ? currentPatient?.name
        ? `${currentPatient.name} is ready for consultation`
        : "Queue is live and ready for the next patient"
      : "No patients waiting in queue";

  const handleStartPress = useCallback(() => {
    if (!isVerifiedDoctor) {
      showApprovalRequiredToast();
      return;
    }
    navigation.navigate("QueueControl");
  }, [isVerifiedDoctor, navigation, showApprovalRequiredToast]);

  const handleViewAllPress = useCallback(() => {
    navigation.navigate("DoctorSchedule");
  }, [navigation]);

  const handleSchedulePress = useCallback(() => {
    navigation.navigate("DoctorSchedule");
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.doctorName}>{doctorProfile?.name ?? "Doctor"}</Text>
            <Text style={styles.specialization}>
              {doctorProfile?.specialization ?? "General Practitioner"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("DoctorSettings")}
          >
            <Ionicons name="settings-outline" size={22} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>

        {!isVerifiedDoctor ? <PendingApprovalBanner /> : null}

        {!isVerifiedDoctor ? (
          <View style={styles.pendingInfoCard}>
            <Text style={styles.pendingInfoTitle}>Limited access</Text>
            <Text style={styles.pendingInfoText}>
              Your account is under review. You can explore your profile while waiting
              for approval.
            </Text>
          </View>
        ) : null}

        <QueueCard
          status={queueStatus}
          currentToken={currentToken}
          estimatedWait={stats.waitingNow > 0 ? `${Math.max(stats.waitingNow * 6, 6)} min` : "--"}
          subtitle={queueSubtitle}
          buttonLabel={isVerifiedDoctor ? "Start Consultation" : "Approval Required"}
          disabled={false}
          onStartPress={handleStartPress}
        />

        <View style={styles.sectionBlock}>
          <SectionHeader
            title="Upcoming Schedule"
            actionLabel="View All"
            onActionPress={handleViewAllPress}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scheduleList}
            contentContainerStyle={styles.scheduleListContent}
            snapToInterval={SCHEDULE_CARD_WIDTH + SCHEDULE_CARD_SPACING}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            {MOCK_SCHEDULES.map((item) => (
              <ScheduleCard
                key={item.id}
                clinicName={item.clinicName}
                startTime={item.startTime}
                endTime={item.endTime}
                dayLabel={item.dayLabel}
                patientsCount={item.patientsCount}
                status={item.status}
                onPress={handleSchedulePress}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="Stats" />

          <View style={styles.statsRow}>
            <StatCard
              label="Total Patients"
              value={stats.totalPatients}
              icon="people-outline"
              tintColor={COLORS.accentBlueSoft}
              iconColor={COLORS.accentBlue}
            />
            <StatCard
              label="Waiting Now"
              value={stats.waitingNow}
              icon="time-outline"
              tintColor={COLORS.accentAmberSoft}
              iconColor={COLORS.accentAmber}
            />
            <StatCard
              label="Avg Time"
              value={stats.avgTime > 0 ? `${stats.avgTime}m` : "--"}
              icon="pulse-outline"
              tintColor="#E8F5E9"
              iconColor={COLORS.accentGreen}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.screen,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 18,
    gap: 16,
  },
  headerCopy: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textGray,
    fontWeight: "500",
  },
  doctorName: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textDark,
    marginTop: 4,
  },
  specialization: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingsButton: {
    padding: 10,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingInfoCard: {
    marginBottom: 18,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.accentAmberSoft,
    padding: 16,
  },
  pendingInfoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.accentAmber,
    marginBottom: 6,
  },
  pendingInfoText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  sectionBlock: {
    marginTop: SPACING.section,
  },
  scheduleList: {
    marginTop: 16,
  },
  scheduleListContent: {
    paddingHorizontal: 16,
    paddingRight: 28,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
});
