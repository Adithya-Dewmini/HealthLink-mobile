import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import ClinicEndedModal from "../../components/ClinicEndedModal";
import {
  getQueueDashboard,
  startQueue,
  callNextPatient,
  skipPatient,
  endClinic,
} from "../../services/doctorQueueService";
import { socket } from "../../services/socket";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softBlue: "#E1EEF9",  // 🔵 In Consultation
  softGreen: "#E1F1E7", // 🟢 Completed
  softYellow: "#FFF4E1",// 🟡 Waiting
  accentBlue: "#2196F3",
  accentGreen: "#4CAF50",
  accentOrange: "#FF9800",
  accentRed: "#F44336",
};

export default function QueueScreen() {
  const navigation = useNavigation<any>();
  const [queue, setQueue] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [doctorId, setDoctorId] = useState<number | string | null>(null);
  const [showClinicEndedModal, setShowClinicEndedModal] = useState(false);

  const loadDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem("token"); // Ensure token is retrieved before API call
      console.log("Stored token:", token);
      if (!token) return;
      const data = await getQueueDashboard(token);
      setQueue(data.queue ?? null);
      setPatients(data.patients ?? []);
      setCurrentPatient(data.currentPatient ?? null);
      setDoctorId(data?.doctor?.id ?? null);
    } catch (error) {
      console.log("Dashboard load error:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadDashboard();
    };
    void init();
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    socket.emit("joinDoctorRoom", { doctorId });

    const handleQueueUpdated = async (data: any) => {
      if (data?.doctorId !== doctorId) return;
      if (!data?.queueId) return;

      console.log("Queue update:", data);

      if (data?.type === "QUEUE_STARTED") {
        Toast.show({
          type: "success",
          text1: "Queue Started",
          text2: "The clinic queue is now active",
        });
      }

      if (data?.type === "PATIENT_ADDED") {
        Toast.show({
          type: "info",
          text1: "New Patient",
          text2: "A patient joined the queue",
        });
      }

      if (data?.type === "CLINIC_ENDED") {
        Toast.show({
          type: "info",
          text1: "Clinic Ended",
          text2: "Today's clinic session has ended",
        });
      }

      await loadDashboard();
    };

    socket.on("queueUpdated", handleQueueUpdated);
    return () => {
      socket.off("queueUpdated", handleQueueUpdated);
    };
  }, [doctorId]);

  const queueStatus = queue?.status || "NOT_STARTED";
  const isQueueEnded = queueStatus === "ENDED";
  const isQueueLive = queueStatus === "LIVE";
  const queueStatusLabel =
    queueStatus === "LIVE"
      ? "LIVE"
      : queueStatus === "ENDED"
        ? "ENDED"
        : "NOT STARTED";
  const queueStatusColor =
    queueStatus === "LIVE"
      ? THEME.accentRed
      : THEME.textGray;
  const queueStatusBg =
    queueStatus === "LIVE"
      ? "#FFE5E5"
      : "#EEF1F5";
  const activeTitle =
    queueStatus === "LIVE"
      ? (currentPatient?.name ?? "Clinic Running")
      : queueStatus === "ENDED"
        ? "Clinic Ended"
        : "Ready to Start";
  const activeSubtitle =
    queueStatus === "LIVE"
      ? (currentPatient?.patient_id
        ? `ID: ${currentPatient.patient_id} • Token: ${currentPatient.token_number}`
        : "Serving patients")
      : queueStatus === "ENDED"
        ? "This clinic session has ended"
        : "Call a patient to begin";

  // API Action Handlers
  const handleStartQueue = async () => {
    console.log("START BUTTON CLICKED");
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    try {
      console.log("Calling start queue API");
      const res = await startQueue(token);
      console.log("API response:", res);
      Alert.alert("Clinic Status", res?.message ?? "Queue started");
      await loadDashboard();
    } catch (err) {
      console.log("Start queue error:", err);
      Alert.alert("Error", "Unable to start queue");
    }
  };

  const handleNextPatient = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await callNextPatient(token);
      if (res?.queueId) {
        navigation.navigate("ConsultationPage", { queueId: res.queueId });
      }
      await loadDashboard();
    } catch (error) {
      console.log("Failed to call next patient", error);
    }
  };

  const handleSkipPatient = async () => {
    Alert.alert(
      "Skip Patient",
      "Are you sure you want to skip the current patient?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: async () => {
            const token = await AsyncStorage.getItem("token");
            if (token) {
              await skipPatient(token);
              await loadDashboard();
            }
          },
        },
      ]
    );
  };

  const handleEndClinic = async () => {
    Alert.alert(
      "End Clinic",
      "Are you sure you want to end today's clinic? This will mark remaining patients as MISSED.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Clinic",
          style: "destructive",
          onPress: async () => {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            try {
              const res = await endClinic(token);
              setShowClinicEndedModal(true);
              await loadDashboard();
            } catch (error) {
              console.log("End clinic error:", error);
            }
          },
        },
      ]
    );
  };

  const formatTime = (value?: string | null) => {
    if (!value) return "--:--";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "--:--" : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (showClinicEndedModal) {
    return (
      <ClinicEndedModal onClose={() => setShowClinicEndedModal(false)} />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Patient Queue</Text>
          <Text style={styles.subtitle}>{queue?.name || "Daily Clinic"}</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: queueStatusBg }]}>
          <View style={[styles.liveDot, { backgroundColor: queueStatusColor }]} />
          <Text style={[styles.liveText, { color: queueStatusColor }]}>
            {queueStatusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.container}>

        {/* --- CURRENT CONSULTATION (Pastel Blue) --- */}
        <View style={[styles.currentCard, { backgroundColor: THEME.softBlue }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>
              {isQueueEnded ? "CLINIC ENDED" : "ACTIVE NOW"}
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {queueStatus === "ENDED"
                  ? "⚪ Ended"
                  : queueStatus === "NOT_STARTED"
                    ? "⚪ Not started"
                    : `🔵 ${currentPatient ? "With Doctor" : "Idle"}`}
              </Text>
            </View>
          </View>
          
          <Text style={styles.currentName}>{activeTitle}</Text>
          <Text style={styles.currentDetails}>{activeSubtitle}</Text>
          
          <View style={styles.actionGrid}>
            <MainAction icon="play-circle" label="Start" color={THEME.accentBlue} onPress={handleStartQueue} disabled={isQueueEnded} />
            <MainAction icon="play-forward" label="Next" color={THEME.textDark} onPress={handleNextPatient} disabled={!isQueueLive} />
            <MainAction icon="refresh-circle" label="Skip" color={THEME.accentOrange} onPress={handleSkipPatient} disabled={!isQueueLive} />
            <MainAction icon="stop-circle" label="End" color={THEME.accentRed} onPress={handleEndClinic} disabled={isQueueEnded} />
          </View>
        </View>

        {/* --- QUEUE LIST (Styled Items) --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Waiting List</Text>
          <Text style={styles.countText}>{patients.length} total</Text>
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {patients.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={THEME.textGray} />
                <Text style={styles.emptyText}>The queue is currently empty</Text>
            </View>
          ) : (
            patients.map((p) => (
              <QueueItem 
                key={p.id}
                number={String(p.token_number || "")}
                name={p.name || `Patient ${p.patient_id}`}
                time={formatTime(p.created_at)}
                status={p.status}
                isDone={p.status === "COMPLETED"}
              />
            ))
          )}
        </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Internal Components
const MainAction = ({ icon, label, color, onPress, disabled }: any) => (
  <TouchableOpacity
    style={[styles.mainActionButton, disabled && styles.mainActionButtonDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    <View style={[styles.iconBg, { backgroundColor: color + "10" }]}>
        <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.mainActionText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const QueueItem = ({ number, name, time, status, isDone }: any) => (
  <View style={[styles.queueItem, isDone && { opacity: 0.5 }]}>
    <View style={[styles.numberBox, { backgroundColor: isDone ? THEME.softGreen : THEME.softYellow }]}>
      <Text style={styles.numberText}>{number}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.patientName}>{name}</Text>
      <Text style={styles.patientTime}>{time} • {status}</Text>
    </View>
    <Ionicons 
        name={isDone ? "checkmark-circle" : "chevron-forward"} 
        size={20} 
        color={isDone ? THEME.accentGreen : "#D1D5DB"} 
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: THEME.white,
  },
  body: { flex: 1, backgroundColor: THEME.background },
  title: { fontSize: 24, fontWeight: 'bold', color: THEME.textDark },
  subtitle: { fontSize: 13, color: THEME.textGray },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE5E5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.accentRed, marginRight: 6 },
  liveText: { fontSize: 10, fontWeight: '800', color: THEME.accentRed },
  
  currentCard: { borderRadius: 28, padding: 20, marginBottom: 25, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: THEME.accentBlue, letterSpacing: 1 },
  statusPill: { backgroundColor: THEME.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '700', color: THEME.accentBlue },
  currentName: { fontSize: 26, fontWeight: 'bold', color: THEME.textDark, marginTop: 8 },
  currentDetails: { fontSize: 14, color: THEME.textGray, marginBottom: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  mainActionButton: { backgroundColor: THEME.white, paddingVertical: 12, borderRadius: 20, alignItems: 'center', width: '23%' },
  mainActionButtonDisabled: { opacity: 0.5 },
  iconBg: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  mainActionText: { fontSize: 10, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: THEME.textDark },
  countText: { fontSize: 12, color: THEME.textGray, fontWeight: '600' },
  
  queueItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.white, padding: 12, borderRadius: 20, marginBottom: 10 },
  numberBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  numberText: { fontWeight: 'bold', fontSize: 16, color: THEME.textDark },
  patientName: { fontSize: 16, fontWeight: '700', color: THEME.textDark },
  patientTime: { fontSize: 12, color: THEME.textGray, marginTop: 2 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 10, color: THEME.textGray, fontSize: 14 },
});
