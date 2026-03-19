import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";

const screenWidth = Dimensions.get("window").width;

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softIndigo: "#E8EAF6", 
  deepIndigo: "#3F51B5", // Main Sleep Card color
  softGreen: "#E8F5E9",
  accentIndigo: "#5C6BC0",
  accentAmber: "#FFC107",
  accentGreen: "#4CAF50",
  accentRed: "#F44336",
};

export default function SleepTrackerScreen() {
  const navigation = useNavigation();

  // Mock Data: Sleep hours over the last 5 days
  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [{ data: [6.5, 7.2, 8, 5.8, 7.5] }],
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sleep Tracker</Text>
        <TouchableOpacity style={styles.refreshBtn}>
          <Ionicons name="moon-outline" size={22} color={THEME.deepIndigo} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* 2. Current Sleep Card (Main Focus) */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="bed" size={28} color={THEME.deepIndigo} />
          </View>
          <View style={styles.row}>
            <Text style={styles.sleepValue}>7h 45m</Text>
          </View>
          <Text style={styles.sleepLabel}>Last Night's Sleep</Text>
        </View>

        {/* 3. Sleep Status Indicator */}
        <View style={styles.statusCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.statusTitle}>Sleep Quality</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Good ✨</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <SleepStat label="Deep Sleep" value="2h 15m" icon="Shield-checkmark" color={THEME.deepIndigo} />
            <SleepStat label="REM" value="1h 50m" icon="flash" color={THEME.accentAmber} />
          </View>
        </View>

        {/* 4. Weekly Bar Chart Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sleep Duration (Hours)</Text>
        </View>
        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            width={screenWidth - 72}
            height={200}
            yAxisLabel=""
            yAxisSuffix="h"
            chartConfig={{
              backgroundColor: THEME.white,
              backgroundGradientFrom: THEME.white,
              backgroundGradientTo: THEME.white,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
              labelColor: () => THEME.textGray,
              barPercentage: 0.6,
            }}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
          />
        </View>

        {/* 5. Sleep History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Past Records</Text>
        </View>
        <View style={styles.historyList}>
          <HistoryItem date="Mar 09, 2026" value="8h 05m" status="Excellent" />
          <HistoryItem date="Mar 08, 2026" value="5h 45m" status="Low" isLow />
          <HistoryItem date="Mar 07, 2026" value="7h 20m" status="Good" />
        </View>

        {/* 6. Health Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.row}>
            <Ionicons name="sunny-outline" size={20} color={THEME.accentAmber} />
            <Text style={styles.tipsTitle}>Sleep Hygiene Tip</Text>
          </View>
          <Text style={styles.tipsText}>
            Avoid screens 30 minutes before bed to help your brain produce melatonin.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
const SleepStat = ({ label, value, color }: any) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const HistoryItem = ({ date, value, status, isLow }: any) => (
  <View style={styles.historyItem}>
    <View>
      <Text style={styles.historyDate}>{date}</Text>
      <Text style={[styles.historyStatus, { color: isLow ? THEME.accentRed : THEME.accentGreen }]}>
        {status}
      </Text>
    </View>
    <Text style={styles.historyValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  scrollContent: { paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 20, fontWeight: "600", color: THEME.textDark },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  refreshBtn: { padding: 4 },

  mainCard: {
    backgroundColor: THEME.deepIndigo, // Premium deep Indigo for Sleep
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  sleepValue: { fontSize: 42, fontWeight: "bold", color: THEME.white },
  sleepLabel: { fontSize: 16, color: "rgba(255,255,255,0.7)", marginTop: 4 },

  statusCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTitle: { fontSize: 14, fontWeight: "bold", color: THEME.textGray, textTransform: "uppercase" },
  statusBadge: { backgroundColor: THEME.softIndigo, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { color: THEME.deepIndigo, fontWeight: "bold", fontSize: 12 },
  divider: { height: 1, backgroundColor: "#F0F3F7", marginVertical: 15 },
  statBox: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 12, color: THEME.textGray, marginTop: 2 },

  sectionHeader: { marginHorizontal: 24, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: THEME.textDark },
  
  chartContainer: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    alignItems: "center",
  },
  chart: { borderRadius: 16, marginTop: 8 },

  historyList: { marginHorizontal: 20 },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  historyDate: { fontSize: 15, fontWeight: "600", color: THEME.textDark },
  historyStatus: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  historyValue: { fontSize: 18, fontWeight: "bold", color: THEME.deepIndigo },

  tipsCard: {
    backgroundColor: THEME.softGreen,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipsTitle: { fontSize: 15, fontWeight: "bold", color: THEME.accentGreen },
  tipsText: { fontSize: 14, color: "#455A64", marginTop: 8, lineHeight: 20 },
});
