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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2563EB",
  background: "#F9FAFB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  softBlue: "#EFF6FF",
  success: "#10B981",
  border: "#E5E7EB",
};

export default function MyHealthDashboard() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Health</Text>
          <Text style={styles.headerSub}>Track your health and wellness</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreCard}>
          <View style={styles.chartWrapper}>
            <View style={styles.circularProgress}>
              <Text style={styles.scoreNumber}>78</Text>
              <Text style={styles.scoreLabel}>Health Score</Text>
            </View>
          </View>
          <View style={styles.scoreStatus}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: THEME.success }]} />
              <Text style={styles.statusText}>Good Condition</Text>
            </View>
            <Text style={styles.statusSub}>You're doing better than 65% of users</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="heart-pulse"
            value="72"
            unit="bpm"
            label="Heart Rate"
            color="#EF4444"
            onPress={() => navigation.navigate("HeartRateScreen")}
          />
          <MetricCard
            icon="bed-outline"
            value="7h 20m"
            unit=""
            label="Sleep"
            color="#8B5CF6"
            onPress={() => navigation.navigate("SleepTrackerScreen")}
          />
          <MetricCard
            icon="walk"
            value="6,540"
            unit="steps"
            label="Activity"
            color={THEME.primary}
          />
          <MetricCard
            icon="fire"
            value="1,840"
            unit="kcal"
            label="Calories"
            color="#F59E0B"
          />
        </View>

        <Text style={styles.sectionLabel}>Daily Insights</Text>
        <TouchableOpacity style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="sparkles" size={20} color={THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Better Sleep Trend</Text>
            <Text style={styles.insightDesc}>
              You slept 45 mins longer than yesterday. This improved your focus score.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.primary} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Recommendations</Text>
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <MaterialCommunityIcons name="water" size={24} color={THEME.primary} />
            <Text style={styles.tipTitle}>Hydration Goal</Text>
          </View>
          <Text style={styles.tipText}>
            Drink at least 8 glasses of water today to maintain peak energy levels.
          </Text>
          <TouchableOpacity style={styles.tipBtn}>
            <Text style={styles.tipBtnText}>Log Water Intake</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MetricCard = ({ icon, value, unit, label, color, onPress }: any) => (
  <TouchableOpacity style={styles.metricCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.metricIconBox, { backgroundColor: `${color}15` }]}>
      {icon.includes("outline") || icon === "walk" ? (
        <Ionicons name={icon as any} size={22} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      )}
    </View>
    <View style={styles.metricData}>
      <Text style={styles.metricValue}>
        {value}
        <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    backgroundColor: THEME.white,
    gap: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 4 },
  scrollContent: { paddingHorizontal: 20 },
  scoreCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  circularProgress: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: THEME.primary,
    borderTopColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNumber: { fontSize: 28, fontWeight: "900", color: THEME.textPrimary },
  scoreLabel: { fontSize: 10, fontWeight: "700", color: THEME.textSecondary, textTransform: "uppercase" },
  scoreStatus: { flex: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },
  statusSub: { fontSize: 12, color: THEME.textSecondary, lineHeight: 18 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 15, marginTop: 25 },
  metricCard: {
    width: (width - 55) / 2,
    backgroundColor: THEME.white,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  metricIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 15 },
  metricData: {},
  metricValue: { fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  metricUnit: { fontSize: 12, fontWeight: "600", color: THEME.textSecondary, marginLeft: 2 },
  metricLabel: { fontSize: 12, fontWeight: "600", color: THEME.textSecondary, marginTop: 2 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 30,
    marginBottom: 15,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softBlue,
    padding: 16,
    borderRadius: 20,
    gap: 15,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.1)",
  },
  insightIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME.white, justifyContent: "center", alignItems: "center" },
  insightTitle: { fontSize: 15, fontWeight: "800", color: THEME.primary },
  insightDesc: { fontSize: 13, color: THEME.textSecondary, marginTop: 2, lineHeight: 18 },
  tipCard: { backgroundColor: THEME.white, borderRadius: 24, padding: 24, elevation: 2, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10 },
  tipHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  tipTitle: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  tipText: { fontSize: 14, color: THEME.textSecondary, lineHeight: 22, marginBottom: 20 },
  tipBtn: { backgroundColor: THEME.softBlue, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  tipBtnText: { color: THEME.primary, fontWeight: "800", fontSize: 14 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
