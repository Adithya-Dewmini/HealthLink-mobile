import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Vibration,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { PatientStackParamList } from "../../types/navigation";
import { apiFetch } from "../../config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { useGlobalModal } from "../../context/GlobalModalContext";
import { connectSocket, getSocket, joinSessionRoom, leaveSessionRoom } from "../../services/socket";
import { patientTheme } from "../../constants/patientTheme";

type DoctorStatus = "active" | "break" | "paused";

const THEME = {
  ...patientTheme.colors,
  mint: patientTheme.colors.softGreen,
  lavender: patientTheme.colors.highlight,
  accentPurple: patientTheme.colors.navy,
  softRed: patientTheme.colors.dangerSoft,
};

export default function LiveQueue() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PatientStackParamList, "PatientQueue">>();
  const doctorId = route.params?.doctorId ?? 1;
  const clinicId = route.params?.clinicId;
  const [currentNumber, setCurrentNumber] = useState(0);
  const [yourNumber, setYourNumber] = useState<number | null>(null);
  const [status, setStatus] = useState<DoctorStatus>("paused");
  const [notify, setNotify] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const [estWaitMinutes, setEstWaitMinutes] = useState(0);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [patientStatus, setPatientStatus] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(route.params?.sessionId ?? null);
  const completionHandledRef = useRef(false);
  const { triggerConsultationFlow } = useGlobalModal();

  const remaining = useMemo(
    () => Math.max((yourNumber ?? currentNumber) - currentNumber, 0),
    [yourNumber, currentNumber]
  );
  const progressPct = useMemo(
    () => Math.min((currentNumber / Math.max(yourNumber ?? currentNumber, 1)) * 100, 100),
    [currentNumber, yourNumber]
  );

  const estimatedWait = useMemo(() => {
    const minutes = estWaitMinutes || remaining * 4;
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }, [remaining, estWaitMinutes]);

  const loadQueue = useCallback(async () => {
    try {
      const query = clinicId ? `?clinicId=${encodeURIComponent(clinicId)}` : "";
      const res = await apiFetch(`/api/patients/doctor/queue-status/${doctorId}${query}`);
      if (!res.ok) return;
      const data = await res.json();
      const nextSessionId = Number(data?.sessionId ?? 0) || null;
      setSessionId(nextSessionId);
      if (nextSessionId) {
        joinSessionRoom(nextSessionId);
      }
      setQueueStatus(data?.status ?? null);
      setPatientStatus(data?.patientStatus ?? null);
      setCurrentNumber(Number(data?.currentToken ?? 0));
      setQueueLength(Number(data?.waitingCount ?? 0));
      setEstWaitMinutes(Number(data?.estimatedWaitMinutes ?? 0));
      const patientToken = Number(data?.patientToken ?? 0);
      const nextToken = Number(data?.nextToken ?? 0);
      setYourNumber((prev) => prev ?? (patientToken > 0 ? patientToken : nextToken));
      setStatus(data?.status === "LIVE" ? "active" : data?.status === "PAUSED" ? "paused" : "break");
    } catch (err) {
      console.error("Load queue status error:", err);
    }
  }, [clinicId, doctorId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const socket = connectSocket();

    const handleQueueUpdate = (payload?: { sessionId?: number | string }) => {
      if (!payload?.sessionId) {
        return;
      }

      if (sessionId && String(payload.sessionId) !== String(sessionId)) {
        return;
      }

      void loadQueue();
    };

    const handleReconnect = () => {
      if (sessionId) {
        joinSessionRoom(sessionId);
      }
      void loadQueue();
    };

    socket.on("queue:update", handleQueueUpdate);
    socket.on("queue:next", handleQueueUpdate);
    socket.on("session:start", handleQueueUpdate);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("queue:update", handleQueueUpdate);
      socket.off("queue:next", handleQueueUpdate);
      socket.off("session:start", handleQueueUpdate);
      socket.off("connect", handleReconnect);
      if (sessionId) {
        leaveSessionRoom(sessionId);
      }
    };
  }, [loadQueue, sessionId]);

  const fetchLatestPrescription = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      let seenKey = "lastSeenPrescriptionId";
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          if (decoded?.id) {
            seenKey = `lastSeenPrescriptionId:${decoded.id}`;
          }
        } catch {
          // Fall back to the legacy key if token parsing fails.
        }
      }

      const stored =
        (await AsyncStorage.getItem(seenKey)) ||
        (await AsyncStorage.getItem("lastSeenPrescriptionId"));
      const storedId = stored ? Number(stored) : null;

      const res = await apiFetch("/api/patients/prescriptions?latest=true");
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.id || data.isSeen) return;

      const incomingId = Number(data.id);
      if (storedId && incomingId === storedId) return;

      triggerConsultationFlow(data);
    } catch (err) {
      console.error("Latest prescription fetch error:", err);
    }
  };

  useEffect(() => {
    const completed = queueStatus === "ENDED" && remaining === 0 && (yourNumber ?? 0) > 0;
    if (completed && !completionHandledRef.current) {
      completionHandledRef.current = true;
      Vibration.vibrate(150);
      void fetchLatestPrescription();
    }
  }, [queueStatus, remaining, yourNumber]);

  useEffect(() => {
    if (notify && remaining <= 2 && remaining > 0) Vibration.vibrate(500);
  }, [remaining, notify]);

  const rejoinQueue = async () => {
    try {
      const res = await apiFetch("/api/patients/queue/join", {
        method: "POST",
        body: JSON.stringify({ doctor_id: doctorId, clinic_id: clinicId }),
      });
      if (!res.ok) return;
      void loadQueue();
    } catch (err) {
      console.error("Rejoin queue error:", err);
    }
  };

  const statusConfig = {
    active: { label: "Seeing patients", color: THEME.accentGreen, bg: THEME.mint },
    break: { label: "On break", color: THEME.accentPurple, bg: THEME.lavender },
    paused: { label: "Paused", color: THEME.accentRed, bg: THEME.softRed },
  }[status];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.headerNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={THEME.textDark} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Live Queue</Text>
          <Text style={styles.headerSub}>Real-time clinic tracking</Text>
        </View>
        <TouchableOpacity 
          style={[styles.notifyToggle, notify ? { backgroundColor: THEME.mint } : { backgroundColor: THEME.background }]}
          onPress={() => setNotify(!notify)}
        >
          <Ionicons name={notify ? "notifications" : "notifications-off"} size={20} color={notify ? THEME.accentGreen : THEME.textGray} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        
        {/* 1. Main Queue Display */}
        <View style={styles.heroCard}>
          {patientStatus === "MISSED" && (
            <View style={styles.missedCard}>
              <Ionicons name="alert-circle" size={18} color={THEME.accentRed} />
              <Text style={styles.missedText}>
                You missed your turn. You can rejoin the live queue.
              </Text>
              <TouchableOpacity style={styles.missedBtn} onPress={rejoinQueue}>
                <Text style={styles.missedBtnText}>Rejoin Queue</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.labelCaps}>Now Serving</Text>
              <Text style={styles.bigNumber}>{currentNumber}</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusConfig.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
               <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressText}>Queue progress: {Math.round(progressPct)}%</Text>
          </View>
        </View>

        {/* 2. User Ticket Card */}
        <View style={styles.ticketCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.labelCaps}>Your Ticket</Text>
              <Text style={styles.ticketNumber}>{yourNumber ?? "—"}</Text>
            </View>
            <View style={styles.waitBox}>
               <Text style={styles.waitLabel}>EST. WAIT</Text>
               <Text style={styles.waitValue}>{estimatedWait}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color={THEME.accentBlue} />
            <Text style={styles.infoText}>
              There are <Text style={styles.boldText}>{remaining}</Text> patients ahead of you.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="Change ticket number..."
              keyboardType="number-pad"
              placeholderTextColor={THEME.textGray}
              onChangeText={(t) => {
                const parsed = parseInt(t, 10);
                if (!Number.isNaN(parsed)) {
                  setYourNumber(parsed);
                }
              }}
            />
            <TouchableOpacity style={styles.updateBtn}>
              <Text style={styles.updateBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Quick Tips */}
        <Text style={styles.sectionTitle}>Queue Guidelines</Text>
        <View style={styles.tipsCard}>
          <TipItem icon="walk" text="Be present when 3 patients are remaining." color={THEME.accentBlue} />
          <TipItem icon="megaphone" text="Keep notifications ON to get a vibration alert." color={THEME.accentPurple} />
          <TipItem icon="cafe" text="Let the desk know if you need a short break." color={THEME.accentGreen} isLast />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const TipItem = ({ icon, text, color, isLast }: any) => (
  <View style={[styles.tipItem, isLast && { borderBottomWidth: 0 }]}>
    <View style={[styles.tipIcon, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  container: { padding: 20 },
  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: THEME.textDark },
  headerSub: { fontSize: 13, color: THEME.textGray },
  notifyToggle: { width: 45, height: 45, borderRadius: 15, justifyContent: "center", alignItems: "center" },

  heroCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  missedCard: {
    backgroundColor: THEME.softRed,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  missedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: THEME.accentRed,
  },
  missedBtn: {
    backgroundColor: THEME.accentRed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  missedBtnText: { color: THEME.white, fontWeight: "700", fontSize: 12 },
  labelCaps: { fontSize: 11, fontWeight: "bold", color: THEME.textGray, textTransform: "uppercase", letterSpacing: 1 },
  bigNumber: { fontSize: 48, fontWeight: "bold", color: THEME.textDark, marginTop: 4 },
  
  statusChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "bold" },

  progressContainer: { marginTop: 24 },
  progressBarBg: { height: 8, backgroundColor: THEME.background, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: THEME.accentGreen, borderRadius: 4 },
  progressText: { fontSize: 11, color: THEME.textGray, marginTop: 8, fontWeight: '600' },

  ticketCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 24,
    marginBottom: 25,
  },
  ticketNumber: { fontSize: 32, fontWeight: "bold", color: THEME.accentBlue, marginTop: 4 },
  waitBox: { alignItems: 'flex-end' },
  waitLabel: { fontSize: 10, fontWeight: 'bold', color: THEME.textGray },
  waitValue: { fontSize: 18, fontWeight: 'bold', color: THEME.textDark },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: THEME.softBlue, padding: 12, borderRadius: 12 },
  infoText: { marginLeft: 10, fontSize: 14, color: THEME.textDark },
  boldText: { fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  
  inputSection: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: THEME.background, borderRadius: 12, paddingHorizontal: 15, height: 45, fontSize: 14 },
  updateBtn: { backgroundColor: THEME.textDark, borderRadius: 12, paddingHorizontal: 15, justifyContent: 'center' },
  updateBtnText: { color: THEME.white, fontWeight: 'bold', fontSize: 13 },

  sectionTitle: { fontSize: 16, fontWeight: "bold", color: THEME.textDark, marginBottom: 12 },
  tipsCard: { backgroundColor: THEME.white, borderRadius: 24, padding: 16 },
  tipItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tipIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tipText: { flex: 1, fontSize: 13, color: THEME.textGray, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }
});
