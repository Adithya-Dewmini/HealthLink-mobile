import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";

const screenWidth = Dimensions.get("window").width;

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

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.6,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  labelColor: () => THEME.textGray,
};

export default function ReportScreen() {
  const navigation = useNavigation<any>();

  const pieData = [
    {
      name: "Completed",
      population: 18,
      color: THEME.accentGreen,
      legendFontColor: THEME.textGray,
      legendFontSize: 12,
    },
    {
      name: "Missed",
      population: 3,
      color: THEME.accentRed,
      legendFontColor: THEME.textGray,
      legendFontSize: 12,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerNav}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Clinic Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateText}>Tuesday, 09 March 2026</Text>

        <View style={styles.statsGrid}>
          <SummaryCard
            label="Total Patients"
            value="21"
            color={THEME.softBlue}
            icon="people"
            iconColor={THEME.accentBlue}
          />
          <SummaryCard
            label="Completed"
            value="18"
            color={THEME.mint}
            icon="checkmark-circle"
            iconColor={THEME.accentGreen}
          />
          <SummaryCard
            label="Missed"
            value="3"
            color={THEME.softRed}
            icon="close-circle"
            iconColor={THEME.accentRed}
          />
          <SummaryCard
            label="Avg. Time"
            value="7 min"
            color={THEME.lavender}
            icon="time"
            iconColor={THEME.accentPurple}
          />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Patients Served Over Time</Text>
          <LineChart
            data={{
              labels: ["10am", "11am", "12pm", "1pm"],
              datasets: [{ data: [3, 7, 12, 18] }],
            }}
            width={screenWidth - 40}
            height={200}
            chartConfig={{ ...chartConfig, color: () => THEME.accentBlue }}
            bezier
            style={styles.chartStyle}
          />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Consultation Outcomes</Text>
          <PieChart
            data={pieData}
            width={screenWidth - 40}
            height={180}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
          />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Peak Consultation Hours</Text>
          <BarChart
            data={{
              labels: ["9am", "10am", "11am", "12pm"],
              datasets: [{ data: [3, 5, 7, 2] }],
            }}
            width={screenWidth - 40}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{ ...chartConfig, color: () => THEME.accentPurple }}
            style={styles.chartStyle}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons
              name="download-outline"
              size={20}
              color={THEME.white}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.primaryButtonText}>Download PDF Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("DoctorHome")}
          >
            <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const SummaryCard = ({ label, value, color, icon, iconColor }: any) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Ionicons name={icon} size={20} color={iconColor} />
    <Text style={styles.statNumber}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  container: { padding: 20 },
  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  backBtn: { padding: 8 },
  dateText: {
    fontSize: 14,
    color: THEME.textGray,
    marginBottom: 20,
    textAlign: "center",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: THEME.textDark,
    marginTop: 8,
  },
  statLabel: { fontSize: 12, color: THEME.textGray, marginTop: 2 },

  chartSection: {
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 24,
    marginTop: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: THEME.textDark,
    marginBottom: 15,
  },
  chartStyle: { borderRadius: 16, paddingRight: 40, marginTop: 10 },

  footer: { marginTop: 30, gap: 10 },
  primaryButton: {
    backgroundColor: THEME.textDark,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { color: THEME.white, fontWeight: "bold", fontSize: 16 },
  secondaryButton: {
    backgroundColor: THEME.white,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  secondaryButtonText: {
    color: THEME.textDark,
    fontWeight: "600",
    fontSize: 16,
  },
});
