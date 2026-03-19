import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Prescription = {
  patient: {
    name: string;
    age: number;
    id: string;
  };
  doctor: string;
  notes: string;
  medicines: { name: string; dosage: string; duration: string }[];
};

const mockPrescription: Prescription = {
  patient: { name: "Amaya Perera", age: 32, id: "PT-201" },
  doctor: "Dr. Silva",
  notes: "Hydrate well, follow up in 5 days if fever persists.",
  medicines: [
    { name: "Paracetamol 500mg", dosage: "1 tab • 8 hourly", duration: "3 days" },
    { name: "Vitamin C", dosage: "1 tab • daily", duration: "7 days" },
  ],
};

export default function Scanner() {
  const [loaded, setLoaded] = useState<Prescription | null>(null);
  const [status, setStatus] = useState<"idle" | "dispensed">("idle");

  const handleScan = () => {
    setStatus("idle");
    setLoaded(mockPrescription);
  };

  const handleDispense = () => setStatus("dispensed");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 28 }}
        bounces={false}
      >
        <Text style={styles.heading}>Prescription Scanner</Text>
        <Text style={styles.subheading}>Scan QR to fetch and dispense prescriptions</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>QR Scanner</Text>
          <View style={styles.scannerBox}>
            <Ionicons name="qr-code-outline" size={42} color="#0F1E2E" />
            <Text style={styles.scannerText}>
              Align the QR code within the frame to load prescription
            </Text>
            <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>Start scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loaded && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Prescription details</Text>
              <View
                style={[
                  styles.statusPill,
                  status === "dispensed" ? styles.statusDone : styles.statusPending,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: status === "dispensed" ? "#2E7D32" : "#FFA000" },
                  ]}
                />
                <Text
                  style={{
                    color: status === "dispensed" ? "#2E7D32" : "#FFA000",
                    fontWeight: "800",
                  }}
                >
                  {status === "dispensed" ? "Dispensed" : "Pending"}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{loaded.patient.name}</Text>
                <Text style={styles.rowMeta}>
                  {loaded.patient.id} • {loaded.patient.age} yrs • {loaded.doctor}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Medicines</Text>
            {loaded.medicines.map((med) => (
              <View key={med.name} style={styles.medRow}>
                <View>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medMeta}>
                    {med.dosage} • {med.duration}
                  </Text>
                </View>
              </View>
            ))}

            <Text style={styles.sectionLabel}>Doctor notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{loaded.notes}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                status === "dispensed" && { backgroundColor: "#2E7D32" },
              ]}
              onPress={handleDispense}
            >
              <Ionicons
                name={status === "dispensed" ? "checkmark-circle-outline" : "bag-check-outline"}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>
                {status === "dispensed" ? "Marked as dispensed" : "Mark as dispensed"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 0,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  subheading: {
    color: "#5A6676",
    marginBottom: 14,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  scannerBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E9F2",
    backgroundColor: "#F7F9FC",
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  scannerText: {
    color: "#5A6676",
    textAlign: "center",
  },
  scanButton: {
    marginTop: 4,
    backgroundColor: "#1976D2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  rowTitle: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  rowMeta: {
    color: "#5A6676",
    marginTop: 2,
  },
  sectionLabel: {
    fontWeight: "800",
    color: "#0F1E2E",
    marginTop: 10,
    marginBottom: 6,
  },
  medRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F6",
  },
  medName: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  medMeta: {
    color: "#5A6676",
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E4E9F2",
  },
  notesText: {
    color: "#0F1E2E",
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: "#1976D2",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPending: {
    borderColor: "#FFA000",
    backgroundColor: "#FFF6E5",
  },
  statusDone: {
    borderColor: "#2E7D32",
    backgroundColor: "#E7F5EA",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
