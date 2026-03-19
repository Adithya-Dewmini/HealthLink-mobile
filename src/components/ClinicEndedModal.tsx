import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Consistency with your existing Dashboard THEME
const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  mint: "#E1F1E7",
  lavender: "#E9E7F7",
  softBlue: "#E1EEF9",
  accentGreen: "#4CAF50",
  accentPurple: "#9C27B0",
  accentBlue: "#2196F3",
  accentRed: "#FF5252",
  softRed: "#FEE2E2",
};

type ClinicEndedModalProps = {
  onClose?: () => void;
};

export default function ClinicEndedModal({ onClose }: ClinicEndedModalProps) {
  const navigation = useNavigation<any>();

  // Mock data - replace with props or state if needed
  const summary = {
    processed: 18,
    missed: 3,
    avgConsultation: "7 min",
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Success Icon Section */}
        <View style={styles.headerSection}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark-sharp" size={40} color={THEME.white} />
          </View>
          <Text style={styles.title}>Clinic Completed</Text>
          <Text style={styles.subtitle}>
            Today's clinic session has been{"\n"}successfully completed.
          </Text>
        </View>

        {/* Results Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: THEME.mint }]}>
            <Text style={styles.statNumber}>{summary.processed}</Text>
            <Text style={styles.statLabel}>Patients Processed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: THEME.softRed }]}>
            <Text style={[styles.statNumber, { color: THEME.accentRed }]}>
              {summary.missed}
            </Text>
            <Text style={styles.statLabel}>Missed Patients</Text>
          </View>

          <View style={[styles.wideCard, { backgroundColor: THEME.softBlue }]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.statNumber}>{summary.avgConsultation}</Text>
                <Text style={styles.statLabel}>Average Consultation</Text>
              </View>
              <Ionicons
                name="time-outline"
                size={32}
                color={THEME.accentBlue}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("DoctorReport")}
          >
            <Text style={styles.primaryButtonText}>View Today's Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("QueueHistory")}
          >
            <Text style={styles.secondaryButtonText}>View Queue History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose ?? (() => navigation.goBack())}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  container: { flex: 1, padding: 24, justifyContent: "center" },

  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.accentGreen,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    // Soft shadow
    shadowColor: THEME.accentGreen,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: THEME.textDark,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textGray,
    textAlign: "center",
    lineHeight: 22,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  statCard: {
    width: "48%",
    padding: 20,
    borderRadius: 24,
    marginBottom: 15,
  },
  wideCard: {
    width: "100%",
    padding: 20,
    borderRadius: 24,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME.textDark,
  },
  statLabel: {
    fontSize: 13,
    color: THEME.textGray,
    marginTop: 4,
  },

  footer: {
    width: "100%",
  },
  primaryButton: {
    backgroundColor: THEME.textDark,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: THEME.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: THEME.white,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: THEME.textDark,
    fontWeight: "600",
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 15,
    alignItems: "center",
  },
  closeButtonText: {
    color: THEME.textGray,
    fontSize: 15,
    fontWeight: "500",
  },
});
