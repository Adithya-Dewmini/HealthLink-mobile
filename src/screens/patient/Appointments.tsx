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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softBlue: "#E1EEF9",
  softPurple: "#E9E7F7",
  accentBlue: "#2196F3",
  accentPurple: "#9C27B0",
  accentGreen: "#4CAF50",
};

export default function Appointments() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const upcoming = [
    {
      id: "1",
      doctor: "Dr. Silva",
      type: "General Checkup",
      date: "Tue, 12 Mar",
      time: "10:30 AM",
      location: "Room 203, City Clinic",
    },
  ];

  const past = [
    {
      id: "2",
      doctor: "Dr. Fernando",
      type: "Dermatology",
      date: "Mon, 12 Feb",
      time: "2:00 PM",
      location: "Skin Care Center",
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={THEME.textDark} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <Text style={styles.headerSub}>Manage your healthcare visits</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("DoctorSearchScreen")}
        >
          <Ionicons name="add" size={28} color={THEME.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Section: Upcoming */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <View style={styles.countBadge}><Text style={styles.countText}>{upcoming.length}</Text></View>
        </View>

        {upcoming.length === 0 ? (
          <EmptyState text="No upcoming appointments" icon="calendar-outline" />
        ) : (
          upcoming.map((appt) => <UpcomingCard key={appt.id} appointment={appt} />)
        )}

        {/* Section: Past */}
        <View style={[styles.sectionHeader, { marginTop: 30 }]}>
          <Text style={styles.sectionTitle}>History</Text>
        </View>

        <View style={styles.historyContainer}>
          {past.length === 0 ? (
            <EmptyState text="No past appointments" icon="time-outline" />
          ) : (
            past.map((appt, index) => (
              <HistoryRow 
                key={appt.id} 
                appointment={appt} 
                isLast={index === past.length - 1} 
              />
            ))
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
const UpcomingCard = ({ appointment }: any) => (
  <View style={styles.upCard}>
    <View style={styles.upHeader}>
      <View style={styles.iconCircle}>
        <Ionicons name="medical" size={20} color={THEME.accentBlue} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.upType}>{appointment.type}</Text>
        <Text style={styles.upDoc}>{appointment.doctor}</Text>
      </View>
      <TouchableOpacity style={styles.moreBtn}>
        <Ionicons name="ellipsis-horizontal" size={20} color={THEME.textGray} />
      </TouchableOpacity>
    </View>

    <View style={styles.timeInfoRow}>
      <View style={styles.timeChip}>
        <Ionicons name="calendar" size={14} color={THEME.textDark} />
        <Text style={styles.chipText}>{appointment.date}</Text>
      </View>
      <View style={styles.timeChip}>
        <Ionicons name="time" size={14} color={THEME.textDark} />
        <Text style={styles.chipText}>{appointment.time}</Text>
      </View>
    </View>

    <View style={styles.locRow}>
      <Ionicons name="location-outline" size={16} color={THEME.textGray} />
      <Text style={styles.locText}>{appointment.location}</Text>
    </View>
  </View>
);

const HistoryRow = ({ appointment, isLast }: any) => (
  <TouchableOpacity style={[styles.histRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.histIcon}>
      <Ionicons name="checkmark-circle" size={22} color={THEME.accentGreen} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.histType}>{appointment.type}</Text>
      <Text style={styles.histMeta}>{appointment.doctor} • {appointment.date}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
  </TouchableOpacity>
);

const EmptyState = ({ text, icon }: any) => (
  <View style={styles.emptyContainer}>
    <Ionicons name={icon} size={40} color="#D1D9E6" />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: THEME.textDark },
  headerSub: { fontSize: 14, color: THEME.textGray, marginTop: 2 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.textDark,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.textDark, marginRight: 8 },
  countBadge: { backgroundColor: THEME.softBlue, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: 'bold', color: THEME.accentBlue },

  upCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  upHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME.softBlue, justifyContent: 'center', alignItems: 'center' },
  upType: { fontSize: 16, fontWeight: 'bold', color: THEME.textDark },
  upDoc: { fontSize: 14, color: THEME.textGray, marginTop: 2 },
  moreBtn: { padding: 5 },

  timeInfoRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  timeChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: THEME.background, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12,
    gap: 6
  },
  chipText: { fontSize: 13, fontWeight: '600', color: THEME.textDark },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingLeft: 5 },
  locText: { fontSize: 13, color: THEME.textGray, marginLeft: 8 },

  historyContainer: { backgroundColor: THEME.white, borderRadius: 24, paddingHorizontal: 16 },
  histRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5' 
  },
  histIcon: { marginRight: 15 },
  histType: { fontSize: 15, fontWeight: '600', color: THEME.textDark },
  histMeta: { fontSize: 13, color: THEME.textGray, marginTop: 3 },

  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 10, color: THEME.textGray, fontSize: 14 }
});
