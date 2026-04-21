import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useNavigation, useRoute } from "@react-navigation/native";

const THEME = {
  primaryGreen: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softShadow: "rgba(0, 0, 0, 0.04)",
};

export default function PrescriptionModalScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const payload = route.params?.prescription || {};
  const qrToken = route.params?.token || "RX-PATIENT-RAJESH-1004";

  const patientName = payload?.patient?.name || payload?.patient || payload?.patient_name || "Rajesh Kumar";
  const patientAge = payload?.patient?.age ?? payload?.patient_age ?? 45;
  const patientGender = payload?.patient?.gender || payload?.patient_gender || "Male";
  const doctorName = payload?.doctor || payload?.doctor_name || "Dr. Ananya Sharma, MD";
  const doctorReg = payload?.doctor_reg || "SL-123456";
  const specialty = payload?.specialty || payload?.doctor_specialty || "Neurologist";
  const tokenNumber = payload?.token_number || payload?.token || "08";
  const dateLabel = payload?.date || payload?.prescription?.date || "April 10, 2026";

  const medicines = Array.isArray(payload?.medicines) && payload.medicines.length > 0
    ? payload.medicines
    : [
        { medicine_name: "Amoxicillin 250mg", duration: "5 Days", dosage: "Morning (1), Night (1)", instruction: "Before meals" },
        { medicine_name: "Paracetamol 500mg", duration: "3 Days", dosage: "Morning (1), Night (1)", instruction: "After meals, as needed for fever" },
      ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={THEME.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Digital Prescription</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={THEME.textDark} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.prescriptionCard}>
            <Text style={styles.clinicName}>HealthLink Clinic</Text>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text style={styles.doctorSpec}>{`${specialty} | Reg: ${doctorReg}`}</Text>
            <View style={styles.divider} />

            <View style={styles.row}>
              <View>
                <Text style={styles.label}>PATIENT INFO</Text>
                <Text style={styles.value}>{patientName}</Text>
                <Text style={styles.subValue}>{`${patientAge} Yrs | ${patientGender}`}</Text>
              </View>
              <View style={styles.alignRight}>
                <Text style={styles.label}>DATE & TOKEN</Text>
                <Text style={styles.value}>{dateLabel}</Text>
                <Text style={styles.subValue}>{`Token #${tokenNumber}`}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <Text style={styles.rxLabel}>Rx</Text>

            {medicines.map((med: any, index: number) => (
              <View key={`${med.id ?? index}`} style={styles.medicineCard}>
                <View style={styles.medHeader}>
                  <Text style={styles.medicineName}>{med.medicine_name || med.name || "Medicine"}</Text>
                  <Text style={styles.tabletCount}>{med.duration || med.days || "-"}</Text>
                </View>
                <View style={styles.dosageViz}>
                  <View style={styles.dosageTimePill}>
                    <Text style={styles.timeText}>{med.dosage || med.dose || "Morning (1)"}</Text>
                  </View>
                </View>
                <Text style={styles.instruction}>{med.instruction || med.notes || "Follow instructions"}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <Text style={styles.label}>PHARMACY SCAN QR</Text>
            <View style={styles.qrContainer}>
              <QRCode value={qrToken} size={120} color={THEME.textDark} />
            </View>
            <Text style={styles.qrInfo}>Ref: RX-004-Rajesh-HealthLink</Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.alignLeftCenter}>
                <Ionicons name="shield-checkmark" size={20} color={THEME.primaryGreen} />
                <Text style={styles.signedLabel}>Digitally Signed</Text>
              </View>
              <View style={styles.alignRight}>
                <Text style={styles.doctorName}>Dr. A. Sharma</Text>
                <View style={styles.signatureLine} />
              </View>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate("PharmacyDispense", { prescription: payload })}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={THEME.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  container: { flex: 1, paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  iconButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },
  prescriptionCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: THEME.softShadow,
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 3,
  },
  clinicName: { fontSize: 22, fontWeight: "800", color: THEME.primaryGreen, textAlign: "center" },
  doctorName: { fontSize: 16, fontWeight: "700", color: THEME.textDark, textAlign: "center", marginTop: 4 },
  doctorSpec: { fontSize: 13, color: THEME.textGray, textAlign: "center", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F0F3F7", marginVertical: 20 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  alignRight: { alignItems: "flex-end" },
  alignLeftCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 11, fontWeight: "700", color: THEME.textGray, letterSpacing: 0.8 },
  value: { fontSize: 15, fontWeight: "700", color: THEME.textDark, marginTop: 2 },
  subValue: { fontSize: 13, color: THEME.textGray },
  rxLabel: { fontSize: 40, fontWeight: "800", color: THEME.textDark, opacity: 0.15, marginBottom: 15 },
  medicineCard: {
    backgroundColor: THEME.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  medHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  medicineName: { fontSize: 16, fontWeight: "700", color: THEME.textDark },
  tabletCount: { fontSize: 13, fontWeight: "600", color: THEME.textGray },
  dosageViz: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 10 },
  dosageTimePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F5EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  timeText: { fontSize: 12, fontWeight: "700", color: THEME.primaryGreen },
  instruction: { fontSize: 12, color: THEME.textGray, fontStyle: "italic" },
  qrContainer: { alignItems: "center", marginTop: 20, marginBottom: 10 },
  qrInfo: { fontSize: 12, color: THEME.textGray, textAlign: "center", fontWeight: "600" },
  signedLabel: { fontSize: 14, color: THEME.primaryGreen, fontWeight: "600" },
  signatureLine: { width: 100, height: 2, backgroundColor: THEME.textDark, marginTop: 4, opacity: 0.5 },
  continueButton: {
    position: "absolute",
    bottom: 24,
    width: "90%",
    alignSelf: "center",
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primaryGreen,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: THEME.primaryGreen,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  continueText: { color: THEME.white, fontWeight: "700", fontSize: 16 },
});
