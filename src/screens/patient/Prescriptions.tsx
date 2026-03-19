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

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softBlue: "#E1EEF9",
  softGreen: "#E1F1E7",
  softRed: "#FEE2E2",
  softPurple: "#F3E5F5",
  accentBlue: "#2196F3",
  accentGreen: "#4CAF50",
  accentRed: "#FF5252",
  accentPurple: "#9C27B0",
};

export default function Prescriptions() {
  const prescriptions = [
    {
      id: "1",
      doctor: "Dr. Silva",
      specialty: "General Physician",
      date: "Mar 10, 2026",
      status: "Active",
      meds: [
        { name: "Amoxicillin", dose: "500mg", timing: "1-0-1", days: "5 Days" },
        { name: "Paracetamol", dose: "1g", timing: "When needed", days: "3 Days" },
      ],
    },
    {
      id: "2",
      doctor: "Dr. Fernando",
      specialty: "Dermatologist",
      date: "Feb 12, 2026",
      status: "Completed",
      meds: [
        { name: "Cetirizine", dose: "10mg", timing: "0-0-1", days: "10 Days" },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <Text style={styles.headerSub}>Digital medical records</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={22} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Prescription Cards */}
        {prescriptions.map((item) => (
          <View key={item.id} style={styles.card}>
            {/* Top Row: Doctor Info & Status */}
            <View style={styles.rowBetween}>
              <View style={styles.docInfo}>
                <View style={[styles.docIcon, { backgroundColor: THEME.softBlue }]}>
                  <Ionicons name="document-text" size={22} color={THEME.accentBlue} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.docName}>{item.doctor}</Text>
                  <Text style={styles.docSpec}>{item.specialty}</Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: item.status === "Active" ? THEME.softGreen : THEME.background }
              ]}>
                <Text style={[
                  styles.statusText, 
                  { color: item.status === "Active" ? THEME.accentGreen : THEME.textGray }
                ]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.dateLabel}>Prescribed on {item.date}</Text>

            <View style={styles.divider} />

            {/* Meds List */}
            <Text style={styles.medHeading}>Medications</Text>
            {item.meds.map((med, idx) => (
              <View key={idx} style={styles.medRow}>
                <View style={styles.medBullet} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{med.name} <Text style={styles.medDose}>{med.dose}</Text></Text>
                  <View style={styles.chipRow}>
                    <View style={styles.pillChip}>
                      <Ionicons name="repeat" size={12} color={THEME.accentPurple} />
                      <Text style={styles.pillText}>{med.timing}</Text>
                    </View>
                    <View style={[styles.pillChip, { backgroundColor: THEME.softBlue }]}>
                      <Ionicons name="calendar-outline" size={12} color={THEME.accentBlue} />
                      <Text style={styles.pillText}>{med.days}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.downloadBtn}>
                <Ionicons name="download-outline" size={18} color={THEME.white} />
                <Text style={styles.downloadText}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View pharmacy QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  container: { padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: THEME.textDark },
  headerSub: { fontSize: 14, color: THEME.textGray, marginTop: 2 },
  searchBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME.background, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docInfo: { flexDirection: 'row', alignItems: 'center' },
  docIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  docName: { fontSize: 16, fontWeight: 'bold', color: THEME.textDark },
  docSpec: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  
  dateLabel: { fontSize: 12, color: THEME.textGray, marginTop: 15, marginLeft: 5 },
  divider: { height: 1, backgroundColor: '#F0F3F7', marginVertical: 15 },
  
  medHeading: { fontSize: 13, fontWeight: 'bold', color: THEME.textGray, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  medRow: { flexDirection: 'row', marginBottom: 16 },
  medBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.accentBlue, marginTop: 8, marginRight: 12 },
  medName: { fontSize: 15, fontWeight: 'bold', color: THEME.textDark },
  medDose: { fontWeight: 'normal', color: THEME.textGray, fontSize: 14 },
  
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pillChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: THEME.softPurple, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8,
    gap: 4
  },
  pillText: { fontSize: 11, fontWeight: 'bold', color: THEME.textDark },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  downloadBtn: { 
    flex: 1.2, 
    backgroundColor: THEME.textDark, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 48, 
    borderRadius: 14,
    gap: 8
  },
  downloadText: { color: THEME.white, fontWeight: 'bold', fontSize: 13 },
  viewBtn: { 
    flex: 1, 
    borderWidth: 1.5, 
    borderColor: THEME.background, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 14 
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: THEME.textDark }
});
