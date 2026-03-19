import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softBlue: "#E1EEF9",
  softGreen: "#E1F1E7",
  softPurple: "#E9E7F7",
  accentBlue: "#2196F3",
  accentGreen: "#4CAF50",
  accentRed: "#FF5252",
};

export default function ConsultationScreen({ queueId }: any) {
  const navigation = useNavigation<any>();
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={THEME.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Consultation</Text>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>12:04</Text>
          </View>
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={[styles.panel, { backgroundColor: THEME.softGreen }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>Patient Details</Text>
              <Ionicons
                name="person-circle-outline"
                size={20}
                color={THEME.textDark}
              />
            </View>
            <View style={styles.detailsGrid}>
              <DetailItem label="Name" value="Kamal Perera" />
              <DetailItem label="Age/Sex" value="45 / Male" />
              <DetailItem label="Blood" value="A+" />
              <DetailItem label="Phone" value="077 123 4567" />
            </View>
            <View style={styles.allergyBox}>
              <Text style={styles.allergyLabel}>Allergies:</Text>
              <Text style={styles.allergyValue}>Penicillin, Dust</Text>
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: THEME.softPurple }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>Medical History</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>View Full</Text>
              </TouchableOpacity>
            </View>
            <HistoryItem date="12 Oct 2025" issue="Viral Fever" />
            <HistoryItem date="05 Sep 2025" issue="Hypertension Follow-up" />
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Symptoms</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter patient symptoms..."
              multiline
              value={symptoms}
              onChangeText={setSymptoms}
            />

            <Text style={styles.inputLabel}>Diagnosis</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Primary diagnosis..."
              value={diagnosis}
              onChangeText={setDiagnosis}
            />

            <Text style={styles.inputLabel}>Clinical Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Internal notes, observations..."
              multiline
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: THEME.white,
                  borderWidth: 1,
                  borderColor: THEME.accentBlue,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: THEME.accentBlue }]}>
                Save Notes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: THEME.accentBlue }]}
            >
              <Text style={[styles.btnText, { color: THEME.white }]}>
                Generate Prescription
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.completeBtn}>
            <Ionicons name="checkmark-circle" size={20} color={THEME.white} />
            <Text style={styles.completeBtnText}>Complete Consultation</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const HistoryItem = ({ date, issue }: { date: string; issue: string }) => (
  <View style={styles.historyRow}>
    <Text style={styles.historyDate}>{date}</Text>
    <Text style={styles.historyIssue}>{issue}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  timerBadge: { backgroundColor: "#FFEBEB", padding: 6, borderRadius: 8 },
  timerText: { color: THEME.accentRed, fontWeight: "bold", fontSize: 12 },

  panel: { borderRadius: 20, padding: 16, marginBottom: 12 },
  panelTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textDark,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  detailItem: { width: "48%", marginBottom: 8 },
  detailLabel: {
    fontSize: 11,
    color: THEME.textGray,
    textTransform: "uppercase",
  },
  detailValue: { fontSize: 14, fontWeight: "600", color: THEME.textDark },

  allergyBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 10,
  },
  allergyLabel: { color: THEME.accentRed, fontWeight: "bold", fontSize: 12 },
  allergyValue: { color: THEME.textDark, fontWeight: "600" },

  historyRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  historyDate: { fontSize: 11, color: THEME.textGray },
  historyIssue: { fontSize: 13, fontWeight: "600", color: THEME.textDark },
  linkText: { fontSize: 12, color: THEME.accentBlue, fontWeight: "700" },

  inputCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textDark,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    backgroundColor: THEME.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    height: 80,
    textAlignVertical: "top",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionBtn: {
    flex: 0.48,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: { fontWeight: "700", fontSize: 14 },

  completeBtn: {
    backgroundColor: THEME.accentGreen,
    height: 60,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  completeBtnText: {
    color: THEME.white,
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
});
