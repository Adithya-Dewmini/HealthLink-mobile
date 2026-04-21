import React, { useState } from "react";
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
import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2BB673",
  secondary: "#4A90E2",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textMuted: "#6B7280",
  warning: "#F59E0B",
  border: "#E0E6ED",
};

export default function AIForecastScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState("30 Days");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>AI Forecast</Text>
          <Text style={styles.headerSub}>Predict future medicine demand</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <MaterialCommunityIcons name="robot-outline" size={24} color={THEME.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {["7 Days", "30 Days", "90 Days"].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterPill, activeFilter === filter && styles.activeFilterPill]}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: THEME.textMuted }]} />
              <Text style={styles.legendText}>Past</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.dashedLine]} />
              <Text style={styles.legendText}>Predicted</Text>
            </View>
          </View>

          <LineChart
            data={{
              labels: ["W1", "W2", "W3", "W4", "W5", "W6"],
              datasets: [
                {
                  data: [30, 45, 35, 55, 60, 85],
                  color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        </View>

        <Text style={styles.sectionLabel}>Top Demand Medicines</Text>
        <View style={styles.whiteCard}>
          <DemandItem name="Paracetamol" trend="up" level="High Demand" />
          <DemandItem name="Amoxicillin" trend="up" level="Increasing" />
          <DemandItem name="Vitamin C" trend="stable" level="Stable" />
        </View>

        <Text style={styles.sectionLabel}>Restock Suggestions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll}>
          <SuggestionCard name="Paracetamol" qty="50" urgency="High" />
          <SuggestionCard name="Ibuprofen" qty="30" urgency="Medium" />
        </ScrollView>

        <Text style={styles.sectionLabel}>AI Insights</Text>
        <View style={styles.insightCard}>
          <Ionicons name="bulb-outline" size={20} color={THEME.warning} />
          <Text style={styles.insightText}>
            Demand for fever medicines is expected to rise by 25% over the next 14 days due to seasonal flu patterns.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const DemandItem = ({ name, trend, level }: any) => (
  <View style={styles.demandRow}>
    <Text style={styles.medName}>{name}</Text>
    <View style={styles.trendGroup}>
      <Text style={styles.levelText}>{level}</Text>
      <Ionicons
        name={trend === "up" ? "trending-up" : "trending-down-outline"}
        size={18}
        color={trend === "up" ? THEME.primary : THEME.textMuted}
      />
    </View>
  </View>
);

const SuggestionCard = ({ name, qty, urgency }: any) => (
  <View style={styles.suggestionCard}>
    <Text style={styles.suggestLabel}>Suggest reorder</Text>
    <Text style={styles.suggestMed}>{name}</Text>
    <View style={styles.qtyRow}>
      <Text style={styles.qtyNum}>{qty}</Text>
      <Text style={styles.qtyUnit}>Units</Text>
    </View>
    <View style={[styles.urgencyBadge, { backgroundColor: urgency === "High" ? "#FEE2E2" : "#FEF3C7" }]}>
      <Text style={[styles.urgencyText, { color: urgency === "High" ? "#EF4444" : "#F59E0B" }]}>{urgency} Priority</Text>
    </View>
  </View>
);

const chartConfig = {
  backgroundColor: "#FFFFFF",
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: "4", strokeWidth: "2", stroke: "#4A90E2" },
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: THEME.white, gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },

  scrollContent: { paddingBottom: 120 },
  filterRow: { flexDirection: "row", padding: 20, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border },
  activeFilterPill: { backgroundColor: THEME.textPrimary, borderColor: THEME.textPrimary },
  filterText: { fontSize: 13, fontWeight: "700", color: THEME.textMuted },
  activeFilterText: { color: THEME.white },

  chartCard: { backgroundColor: THEME.white, marginHorizontal: 20, borderRadius: 24, padding: 15, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10 },
  chartLegend: { flexDirection: "row", justifyContent: "flex-end", gap: 15, marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLine: { width: 12, height: 3, borderRadius: 2 },
  dashedLine: { backgroundColor: THEME.secondary, borderStyle: "dashed", borderWidth: 1 },
  legendText: { fontSize: 11, fontWeight: "700", color: THEME.textMuted },
  chartStyle: { marginVertical: 8, borderRadius: 16, paddingRight: 40 },

  sectionLabel: { fontSize: 14, fontWeight: "800", color: THEME.textMuted, textTransform: "uppercase", marginLeft: 20, marginTop: 25, marginBottom: 15, letterSpacing: 0.8 },
  whiteCard: { backgroundColor: THEME.white, marginHorizontal: 20, borderRadius: 20, padding: 16 },
  demandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.background },
  medName: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  trendGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelText: { fontSize: 12, fontWeight: "600", color: THEME.textMuted },

  suggestionScroll: { paddingLeft: 20 },
  suggestionCard: { backgroundColor: THEME.white, width: width * 0.45, padding: 20, borderRadius: 24, marginRight: 15, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10 },
  suggestLabel: { fontSize: 11, fontWeight: "700", color: THEME.textMuted, textTransform: "uppercase" },
  suggestMed: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary, marginTop: 4 },
  qtyRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginVertical: 12 },
  qtyNum: { fontSize: 24, fontWeight: "900", color: THEME.secondary },
  qtyUnit: { fontSize: 12, fontWeight: "700", color: THEME.textMuted },
  urgencyBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  urgencyText: { fontSize: 10, fontWeight: "800" },

  insightCard: { flexDirection: "row", gap: 12, backgroundColor: "#FEF9C3", marginHorizontal: 20, padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: THEME.warning },
  insightText: { flex: 1, fontSize: 13, color: "#854D0E", fontWeight: "600", lineHeight: 20 },
});
