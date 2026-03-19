import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

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

export default function QueueHistoryScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");

  const historyData = [
    {
      id: "1",
      date: "09 Mar 2026",
      total: 21,
      completed: 18,
      missed: 3,
      duration: "3h 10m",
    },
    {
      id: "2",
      date: "08 Mar 2026",
      total: 18,
      completed: 15,
      missed: 3,
      duration: "2h 45m",
    },
    {
      id: "3",
      date: "07 Mar 2026",
      total: 15,
      completed: 14,
      missed: 1,
      duration: "2h 20m",
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerNav}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue History</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="filter-outline" size={24} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={THEME.textGray}
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="Search by date..."
            placeholderTextColor={THEME.textGray}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Text style={styles.sectionTitle}>Previous Sessions</Text>

        {historyData.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.dateBadge}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={THEME.accentBlue}
                />
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.statLabel}>Patients</Text>
                <Text style={styles.statValue}>{item.total}</Text>
              </View>
              <View
                style={[
                  styles.miniStat,
                  {
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: "#F0F0F0",
                  },
                ]}
              >
                <Text style={[styles.statLabel, { color: THEME.accentGreen }]}>
                  Completed
                </Text>
                <Text style={styles.statValue}>{item.completed}</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.statLabel, { color: THEME.accentRed }]}>
                  Missed
                </Text>
                <Text style={styles.statValue}>{item.missed}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewReportBtn}
              onPress={() =>
                navigation.navigate("DoctorReport", { date: item.date })
              }
            >
              <Text style={styles.viewReportText}>View Detailed Report</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.white} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  container: { paddingHorizontal: 20 },
  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  backBtn: { padding: 5 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  searchInput: { flex: 1, color: THEME.textDark, fontSize: 15 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textGray,
    marginTop: 25,
    marginBottom: 15,
  },

  historyCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dateText: {
    marginLeft: 6,
    fontWeight: "bold",
    color: THEME.accentBlue,
    fontSize: 14,
  },
  durationBadge: {
    backgroundColor: THEME.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: { fontSize: 12, color: THEME.textGray, fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8F9FB",
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 20,
  },
  miniStat: { alignItems: "center", flex: 1 },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: THEME.textDark,
    marginTop: 4,
  },

  viewReportBtn: {
    backgroundColor: THEME.textDark,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 15,
  },
  viewReportText: {
    color: THEME.white,
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 5,
  },
});
