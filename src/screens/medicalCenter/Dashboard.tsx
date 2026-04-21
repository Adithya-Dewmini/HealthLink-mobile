import React from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  SafeAreaView, Dimensions, StatusBar, FlatList 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// --- THEME & COLORS ---
const THEME = {
  primary: "#2F6FED",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "#E5E7EB",
};

// --- DUMMY DATA ---
const DOCTORS = [
  { id: '1', name: 'Dr. Aruna Silva', spec: 'Cardiologist', status: 'Live', token: '12', waiting: '8', waitTime: '15m' },
  { id: '2', name: 'Dr. Sarah Perera', spec: 'Dermatologist', status: 'Upcoming', token: '5', waiting: '3', waitTime: '45m' },
];

const APPOINTMENTS = [
  { id: '1', patient: 'Nadun Perera', time: '10:30 AM', status: 'Pending' },
  { id: '2', patient: 'Anula Devi', time: '11:00 AM', status: 'Completed' },
];

export default function AdminDashboard() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. HEADER */}
      <SafeAreaView style={styles.header}>
        <View>
          <Text style={styles.clinicName}>HealthLink Medical Center</Text>
          <Text style={styles.dateText}>Saturday, April 18, 2026</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("MedicalCenterSettings")}
          >
            <Ionicons name="settings-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={36} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 2. STATS GRID */}
        <View style={styles.statsGrid}>
          <StatCard color="#DBEAFE" icon="account-tie" value="12" label="Doctors" />
          <StatCard color="#DCFCE7" icon="account-group" value="84" label="Patients" />
          <StatCard color="#FEF3C7" icon="format-list-checkbox" value="04" label="Queues" />
          <StatCard color="#F3E8FF" icon="calendar-check" value="102" label="Appointments" />
        </View>

        {/* 3. QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsRow}>
          {['Add Doctor', 'Add Receptionist', 'Create Queue'].map((action, idx) => (
            <TouchableOpacity key={idx} style={styles.actionBtn}>
              <Ionicons name="add-circle-outline" size={20} color={THEME.primary} />
              <Text style={styles.actionBtnText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 4. LIVE QUEUE OVERVIEW */}
        <Text style={styles.sectionTitle}>Live Queue Overview</Text>
        {DOCTORS.map((doc) => <DoctorQueueCard key={doc.id} doctor={doc} />)}

        {/* 5. APPOINTMENTS PREVIEW */}
        <Text style={styles.sectionTitle}>Today's Appointments</Text>
        {APPOINTMENTS.map((appt) => <AppointmentItem key={appt.id} appt={appt} />)}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// --- SUB-COMPONENTS ---

const StatCard = ({ color, icon, value, label }: any) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <MaterialCommunityIcons name={icon} size={24} color={THEME.textPrimary} />
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const DoctorQueueCard = ({ doctor }: any) => {
  const getStatus = (status: string) => {
    if (status === 'Live') return { color: THEME.success, label: 'LIVE' };
    if (status === 'Upcoming') return { color: THEME.warning, label: 'UPCOMING' };
    return { color: THEME.danger, label: 'ENDED' };
  };

  return (
    <View style={styles.queueCard}>
      <View style={styles.queueHeader}>
        <View>
          <Text style={styles.docName}>{doctor.name}</Text>
          <Text style={styles.docSpec}>{doctor.spec}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatus(doctor.status).color + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatus(doctor.status).color }]}>{getStatus(doctor.status).label}</Text>
        </View>
      </View>
      <View style={styles.queueStats}>
        <View style={styles.statCol}><Text style={styles.statVal}>{doctor.token}</Text><Text style={styles.statLabel}>Current</Text></View>
        <View style={styles.statCol}><Text style={styles.statVal}>{doctor.waiting}</Text><Text style={styles.statLabel}>Waiting</Text></View>
        <View style={styles.statCol}><Text style={styles.statVal}>{doctor.waitTime}</Text><Text style={styles.statLabel}>Wait Time</Text></View>
      </View>
    </View>
  );
};

const AppointmentItem = ({ appt }: any) => (
  <View style={styles.apptItem}>
    <Text style={styles.apptTime}>{appt.time}</Text>
    <Text style={styles.apptPatient}>{appt.patient}</Text>
    <View style={[styles.apptStatus, { backgroundColor: appt.status === 'Completed' ? '#DCFCE7' : '#EFF6FF' }]}>
      <Text style={{ color: appt.status === 'Completed' ? THEME.success : THEME.primary, fontWeight: '700', fontSize: 12 }}>{appt.status}</Text>
    </View>
  </View>
);

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: THEME.white },
  clinicName: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary },
  dateText: { fontSize: 13, color: THEME.textSecondary, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtn: { padding: 5 },
  
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: THEME.textPrimary, marginTop: 25, marginBottom: 15 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  statCard: { width: (width - 55) / 2, padding: 16, borderRadius: 20, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800', marginTop: 10 },
  statLabel: { fontSize: 12, color: THEME.textSecondary, marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.white, padding: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: THEME.border },
  actionBtnText: { fontWeight: '700', color: THEME.textPrimary },

  queueCard: { backgroundColor: THEME.white, borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  docName: { fontSize: 16, fontWeight: '800' },
  docSpec: { fontSize: 13, color: THEME.textSecondary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  queueStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  statCol: { alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800' },

  apptItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.white, padding: 15, borderRadius: 16, marginBottom: 10 },
  apptTime: { fontSize: 14, fontWeight: '700', width: 80 },
  apptPatient: { flex: 1, fontSize: 14 },
  apptStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }
});
