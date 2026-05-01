import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import { useAuth } from "../../utils/AuthContext";
import { fetchReceptionDashboard, registerReceptionPatient } from "../../services/receptionService";

const THEME = {
  primary: "#2F80ED",
  background: "#F4F8FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
};

export default function WalkInRegistration() {
  useReceptionPermissionGuard("registration", "can_check_in");
  const { receptionistPermissions } = useAuth();
  const canCheckIn = receptionistPermissions.can_check_in;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addToQueue, setAddToQueue] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionLabel, setSessionLabel] = useState("No active session available");
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const dashboard = await fetchReceptionDashboard();
      const activeSession = (dashboard as any).activeSession;
      setSessionId(typeof activeSession?.id === "number" ? activeSession.id : null);
      setSessionLabel(
        activeSession
          ? `${activeSession.doctorName} • ${activeSession.startTime}-${activeSession.endTime}`
          : "No active session available"
      );
    } catch {
      setSessionId(null);
      setSessionLabel("No active session available");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSession();
    }, [loadSession])
  );

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Info", "Patient name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerReceptionPatient({
        name: name.trim(),
        phone: phone.trim() || undefined,
        sessionId,
        addToQueue: addToQueue && Boolean(sessionId),
      });

      Alert.alert(
        "Patient Registered",
        (result as any).queue
          ? "Patient was created and added to the active queue."
          : (result as any).booking
            ? "Patient was created and booked into the selected session."
            : "Patient profile was created successfully."
      );
      setName("");
      setPhone("");
    } catch (error) {
      Alert.alert("Registration Failed", error instanceof Error ? error.message : "Unable to register patient.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Walk-in Registration</Text>
            <Text style={styles.subtitle}>Create a patient and optionally add them to today’s queue.</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshButton, !canCheckIn && styles.buttonDisabled]}
            onPress={() => void loadSession()}
            disabled={!canCheckIn}
          >
            <Ionicons name="refresh-outline" size={20} color={THEME.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {!canCheckIn ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Registration access removed</Text>
              <Text style={styles.infoText}>
                This screen is now read-only until your responsibilities are updated again.
              </Text>
            </View>
          ) : null}
          <Text style={styles.inputLabel}>Patient Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={THEME.primary} />
            <TextInput
              style={styles.input}
              placeholder="Enter patient name"
              value={name}
              onChangeText={setName}
              placeholderTextColor={THEME.textSecondary}
              editable={canCheckIn}
            />
          </View>

          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color={THEME.primary} />
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor={THEME.textSecondary}
              keyboardType="phone-pad"
              editable={canCheckIn}
            />
          </View>

          <View style={styles.sessionCard}>
            <Text style={styles.sessionLabel}>Queue Session</Text>
            {loadingSession ? (
              <ActivityIndicator color={THEME.primary} />
            ) : (
              <Text style={styles.sessionValue}>{sessionLabel}</Text>
            )}
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.toggleTitle}>Add directly to queue</Text>
              <Text style={styles.toggleSubtitle}>
                {sessionId ? "Patient will be registered and queued for the active session." : "Queueing is unavailable until a clinic session becomes active."}
              </Text>
            </View>
            <Switch
              value={addToQueue && Boolean(sessionId)}
              disabled={!canCheckIn || !sessionId}
              onValueChange={setAddToQueue}
              trackColor={{ false: "#D7DEE8", true: "#BFD7FF" }}
              thumbColor={addToQueue && sessionId ? THEME.primary : "#FFFFFF"}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (submitting || !canCheckIn) && styles.buttonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting || !canCheckIn}
        >
          {submitting ? <ActivityIndicator color={THEME.white} /> : <Text style={styles.submitText}>Register Patient</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 26, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { marginTop: 6, fontSize: 14, color: THEME.textSecondary, lineHeight: 20 },
  refreshButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: THEME.white, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: THEME.border },
  infoCard: { backgroundColor: "#FFF7ED", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#FED7AA", marginBottom: 14 },
  infoTitle: { fontSize: 14, fontWeight: "800", color: "#9A3412" },
  infoText: { marginTop: 6, fontSize: 13, color: "#9A3412", lineHeight: 19 },
  inputLabel: { fontSize: 13, fontWeight: "800", color: THEME.textSecondary, marginBottom: 8, marginTop: 4 },
  inputWrap: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, backgroundColor: "#FAFCFF", paddingHorizontal: 14, alignItems: "center", flexDirection: "row", marginBottom: 14 },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: THEME.textPrimary },
  sessionCard: { marginTop: 8, padding: 14, borderRadius: 18, backgroundColor: "#EEF4FF", marginBottom: 16 },
  sessionLabel: { fontSize: 12, fontWeight: "800", color: THEME.textSecondary, textTransform: "uppercase" },
  sessionValue: { marginTop: 8, fontSize: 14, fontWeight: "700", color: THEME.textPrimary, lineHeight: 20 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  toggleTitle: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },
  toggleSubtitle: { marginTop: 4, fontSize: 12, color: THEME.textSecondary, lineHeight: 18 },
  submitButton: { height: 52, borderRadius: 18, backgroundColor: THEME.primary, alignItems: "center", justifyContent: "center", marginTop: 18 },
  submitText: { color: THEME.white, fontSize: 15, fontWeight: "800" },
  buttonDisabled: { opacity: 0.7 },
});
