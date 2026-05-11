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
import { LineChart } from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";
import { patientTheme } from "../../constants/patientTheme";

const screenWidth = Dimensions.get("window").width;

const THEME = {
  background: patientTheme.colors.modernBackground,
  white: patientTheme.colors.modernSurface,
  textDark: patientTheme.colors.modernText,
  textGray: patientTheme.colors.modernMuted,
  softBlue: "#F0F9FF",
  softGreen: patientTheme.colors.softGreen,
  accentBlue: patientTheme.colors.modernAccent,
  accentRed: patientTheme.colors.accentRed,
  accentGreen: patientTheme.colors.accentGreen,
  border: patientTheme.colors.modernBorder,
  primary: patientTheme.colors.modernPrimary,
};

export default function HeartRateScreen() {
  const navigation = useNavigation();

  const chartData = {
    labels: ["8 AM", "12 PM", "4 PM", "8 PM"],
    datasets: [{ data: [72, 78, 85, 80] }],
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={THEME.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Heart Rate</Text>
        <TouchableOpacity style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={THEME.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Current Heart Rate Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={28} color={THEME.accentRed} />
          </View>
          <Text style={styles.heartValue}>
            80 <Text style={styles.bpmUnit}>bpm</Text>
          </Text>
          <Text style={styles.heartLabel}>Heart Rate</Text>
        </View>

        {/* 3. Status Indicator */}
        <View style={styles.statusCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.statusTitle}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Normal ❤️</Text>
            </View>
          </View>
          <Text style={styles.statusDesc}>
            Resting heart rate is within the healthy range.
          </Text>
        </View>

        {/* 4. Daily Chart Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Heart Rate Today</Text>
        </View>
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={screenWidth - 72}
            height={180}
            chartConfig={{
              backgroundColor: THEME.white,
              backgroundGradientFrom: THEME.white,
              backgroundGradientTo: THEME.white,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: () => THEME.textGray,
              propsForDots: { r: "5", strokeWidth: "2", stroke: THEME.accentBlue },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* 5. Heart Rate History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>History</Text>
        </View>
        <View style={styles.historyList}>
          <HistoryItem time="6:30 PM" value="80" date="Today" />
          <HistoryItem time="8:00 AM" value="76" date="Yesterday" />
          <HistoryItem time="7:15 PM" value="82" date="Yesterday" />
        </View>

        {/* 6. Health Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.row}>
            <Ionicons name="bulb" size={20} color={THEME.accentGreen} />
            <Text style={styles.tipsTitle}>Heart Health Tip</Text>
          </View>
          <Text style={styles.tipsText}>
            Regular exercise and good sleep help maintain a healthy heart rate.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const HistoryItem = ({ time, value, date }: any) => (
  <View style={styles.historyItem}>
    <View>
      <Text style={styles.historyTime}>{time}</Text>
      <Text style={styles.historyDate}>{date}</Text>
    </View>
    <Text style={styles.historyValue}>
      {value} <Text style={styles.bpmSmall}>bpm</Text>
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.primary },
  scroll: { backgroundColor: THEME.background },
  scrollContent: { paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.primary,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: THEME.white },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  refreshBtn: { padding: 4 },

  mainCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heartValue: { fontSize: 42, fontWeight: "bold", color: THEME.textDark },
  bpmUnit: { fontSize: 18, fontWeight: "500", color: THEME.textGray },
  heartLabel: { fontSize: 16, color: THEME.textGray, marginTop: 4 },

  statusCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTitle: { fontSize: 14, fontWeight: "bold", color: THEME.textGray, textTransform: "uppercase" },
  statusBadge: { backgroundColor: THEME.softGreen, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { color: THEME.accentGreen, fontWeight: "bold", fontSize: 12 },
  statusDesc: { fontSize: 14, color: THEME.textGray, marginTop: 8, lineHeight: 20 },

  sectionHeader: { marginHorizontal: 24, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: THEME.textDark },

  chartContainer: {
    backgroundColor: THEME.white,
    borderRadius: 24,
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
  },
  historyTime: { fontSize: 15, fontWeight: "600", color: THEME.textDark },
  historyDate: { fontSize: 12, color: THEME.textGray, marginTop: 2 },
  historyValue: { fontSize: 18, fontWeight: "bold", color: THEME.accentBlue },
  bpmSmall: { fontSize: 12, fontWeight: "normal", color: THEME.textGray },

  tipsCard: {
    backgroundColor: THEME.softGreen,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipsTitle: { fontSize: 15, fontWeight: "bold", color: THEME.accentGreen },
  tipsText: { fontSize: 14, color: "#455A64", marginTop: 8, lineHeight: 20 },
});
