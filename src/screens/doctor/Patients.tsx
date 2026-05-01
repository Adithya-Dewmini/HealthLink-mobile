import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E3F2FD",
  accentPurple: "#9C27B0",
  softPurple: "#F3E5F5",
  accentGreen: "#4CAF50",
  softGreen: "#E8F5E9",
  border: "#E0E6ED",
};

export default function PatientsScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState("All");

  const patients = [
    {
      id: "P-5021",
      name: "Kamal Perera",
      lastVisit: "2 days ago",
      color: THEME.softBlue,
      iconColor: THEME.accentBlue,
      initial: "K",
    },
    {
      id: "P-5022",
      name: "Nadeesha Silva",
      lastVisit: "1 week ago",
      color: THEME.softPurple,
      iconColor: THEME.accentPurple,
      initial: "N",
    },
    {
      id: "P-5023",
      name: "Amal Fernando",
      lastVisit: "3 days ago",
      color: THEME.softGreen,
      iconColor: THEME.accentGreen,
      initial: "A",
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <Ionicons name="arrow-back" size={22} color={THEME.textDark} />
          </TouchableOpacity>
          <View>
          <Text style={styles.headerTitle}>Patient Records</Text>
          <Text style={styles.headerSub}>Search and manage history</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={THEME.textGray} />
          <TextInput
            placeholder="Search by Name, NIC, or ID..."
            style={styles.searchInput}
            placeholderTextColor={THEME.textGray}
          />
          <TouchableOpacity style={styles.micBtn}>
            <Ionicons name="mic-outline" size={20} color={THEME.accentBlue} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {["All", "Recently Visited", "Chronic Care"].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterPill, filter === item && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === item && styles.textWhite]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Patient List</Text>

        {patients.map((patient) => (
          <TouchableOpacity key={patient.id} style={styles.patientCard}>
            <View style={[styles.avatar, { backgroundColor: patient.color }]}>
              <Text style={[styles.avatarText, { color: patient.iconColor }]}>
                {patient.initial}
              </Text>
            </View>

            <View style={styles.patientInfo}>
              <View style={styles.rowBetween}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={THEME.border} />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>{patient.id}</Text>
                </View>
                <View style={styles.dot} />
                <Text style={styles.visitText}>Visited {patient.lastVisit}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: THEME.white,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textDark },
  headerSub: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },

  container: { padding: 20 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: "500" },
  micBtn: { padding: 4 },

  filterContainer: { flexDirection: "row", gap: 10, marginBottom: 25 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterPillActive: { backgroundColor: THEME.accentBlue, borderColor: THEME.accentBlue },
  filterText: { fontSize: 13, fontWeight: "700", color: THEME.textGray },
  textWhite: { color: THEME.white },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textDark,
    marginBottom: 15,
    marginLeft: 5,
  },

  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "bold" },

  patientInfo: { flex: 1, marginLeft: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 17, fontWeight: "800", color: THEME.textDark },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  idBadge: {
    backgroundColor: THEME.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: { fontSize: 11, fontWeight: "700", color: THEME.textGray },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.border,
    marginHorizontal: 8,
  },
  visitText: { fontSize: 12, color: THEME.textGray, fontWeight: "500" },
});
