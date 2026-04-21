import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  background: "#F8FAFC",
  white: "#FFFFFF",
  textDark: "#0F172A",
  textGray: "#64748B",
  accentBlue: "#3B82F6",
  softBlue: "#EFF6FF",
  border: "#E2E8F0",
  success: "#10B981",
  softSuccess: "#ECFDF5",
  purple: "#8B5CF6",
  softPurple: "#F5F3FF",
};

export default function PatientMedicalHistory() {
  const navigation = useNavigation();
  const history = [
    {
      id: 1,
      date: "20 Mar, 2026",
      type: "Consultation",
      title: "Routine Check-up",
      doctor: "Dr. Kamal Perera",
      icon: "medical-outline",
      color: THEME.softBlue,
      iconColor: THEME.accentBlue,
      note: "Patient reported minor chest discomfort. ECG was normal.",
    },
    {
      id: 2,
      date: "12 Feb, 2026",
      type: "Prescription",
      title: "Amoxicillin & Paracetamol",
      doctor: "Dr. Kamal Perera",
      icon: "pill-outline",
      color: THEME.softSuccess,
      iconColor: THEME.success,
      note: "Treatment for acute tonsillitis. 7-day course.",
    },
    {
      id: 3,
      date: "05 Jan, 2026",
      type: "Lab Report",
      title: "Full Blood Count (FBC)",
      doctor: "City Lab Services",
      icon: "flask-outline",
      color: THEME.softPurple,
      iconColor: THEME.purple,
      note: "All parameters within normal range.",
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <View style={styles.patientBrief}>
          <Text style={styles.patientName}>Nadun Peiris</Text>
          <Text style={styles.patientMeta}>ID: P-8820 • Male, 28y</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* --- Quick Stats Row --- */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>12</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.vLine} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>04</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.vLine} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: THEME.success }]}>None</Text>
            <Text style={styles.statLabel}>Allergies</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>

        {/* --- History Timeline --- */}
        {history.map((item, index) => (
          <View key={item.id} style={styles.timelineRow}>
            {/* Timeline Visuals */}
            <View style={styles.timelineSidebar}>
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
              </View>
              {index !== history.length - 1 && <View style={styles.connector} />}
            </View>

            {/* Content Card */}
            <TouchableOpacity style={styles.historyCard} activeOpacity={0.8}>
              <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{item.date}</Text>
                <View style={[styles.typeBadge, { backgroundColor: item.color }]}>
                  <Text style={[styles.typeText, { color: item.iconColor }]}>{item.type}</Text>
                </View>
              </View>

              <Text style={styles.entryTitle}>{item.title}</Text>
              <Text style={styles.doctorName}>{item.doctor}</Text>

              <View style={styles.noteBox}>
                <Text style={styles.noteText} numberOfLines={2}>
                  {item.note}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.viewDetails}>Tap to view full record</Text>
                <Ionicons name="arrow-forward" size={14} color={THEME.accentBlue} />
              </View>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  patientBrief: { flex: 1, alignItems: "center" },
  patientName: { fontSize: 17, fontWeight: "800", color: THEME.textDark },
  patientMeta: { fontSize: 12, color: THEME.textGray, fontWeight: "600", marginTop: 2 },
  filterBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" },

  container: { padding: 20 },

  statsRow: {
    flexDirection: "row",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800", color: THEME.textDark },
  statLabel: {
    fontSize: 11,
    color: THEME.textGray,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 2,
  },
  vLine: { width: 1, height: "100%", backgroundColor: THEME.border },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textDark,
    marginBottom: 20,
    marginLeft: 10,
  },

  timelineRow: { flexDirection: "row" },
  timelineSidebar: { width: 40, alignItems: "center" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  connector: { width: 2, flex: 1, backgroundColor: THEME.border, marginVertical: 4 },

  historyCard: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.5)",
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dateText: { fontSize: 12, fontWeight: "700", color: THEME.textGray },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

  entryTitle: { fontSize: 16, fontWeight: "800", color: THEME.textDark },
  doctorName: { fontSize: 13, color: THEME.textGray, marginTop: 2, fontWeight: "500" },

  noteBox: { backgroundColor: THEME.background, padding: 12, borderRadius: 12, marginTop: 12 },
  noteText: { fontSize: 13, color: THEME.textGray, lineHeight: 18 },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 15,
    gap: 4,
  },
  viewDetails: { fontSize: 12, fontWeight: "700", color: THEME.accentBlue },
});
