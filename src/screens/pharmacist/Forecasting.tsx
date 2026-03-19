import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const forecastCards = [
  {
    label: "Expected fills (7d)",
    value: "642",
    note: "10% higher than last week",
    color: "#1976D2",
    icon: "receipt-outline",
  },
  {
    label: "Stockout risk",
    value: "6%",
    note: "Focus on antibiotics",
    color: "#F57C00",
    icon: "alert-circle-outline",
  },
  {
    label: "Slow movers",
    value: "14",
    note: "Review aging inventory",
    color: "#2E7D32",
    icon: "trending-down-outline",
  },
];

const forecastCategories = [
  { label: "Antibiotics", demand: 82, trend: "High", color: "#F57C00" },
  { label: "Pain relief", demand: 68, trend: "Moderate", color: "#42A5F5" },
  { label: "Diabetes care", demand: 56, trend: "Steady", color: "#1976D2" },
  { label: "Respiratory", demand: 74, trend: "High", color: "#F57C00" },
  { label: "Vitamins", demand: 38, trend: "Low", color: "#66BB6A" },
];

const drivers = [
  { label: "Post-visit prescriptions", intensity: 64 },
  { label: "Chronic refills", intensity: 52 },
  { label: "Seasonal demand", intensity: 71 },
];

const supplyPlan = [
  {
    title: "Reorder focus",
    detail: "Increase antibiotics stock by 18%",
    icon: "cube-outline",
  },
  {
    title: "Shelf optimization",
    detail: "Move top 12 items to front-line bins",
    icon: "grid-outline",
  },
  {
    title: "Expiry watch",
    detail: "Audit items expiring within 45 days",
    icon: "time-outline",
  },
];

export default function Forecasting() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        bounces={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heading}>AI Forecasting</Text>
          <Text style={styles.subheading}>
            Anticipate pharmacy demand and optimize inventory ahead of time.
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.statusPill}>
              <Ionicons name="sparkles-outline" size={14} color="#0F1E2E" />
              <Text style={styles.statusText}>Model status: Stable</Text>
            </View>
            <View style={styles.statusPill}>
              <Ionicons name="time-outline" size={14} color="#0F1E2E" />
              <Text style={styles.statusText}>Updated 1 hr ago</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRow}>
          {forecastCards.map((item) => (
            <View key={item.label} style={[styles.metricCard, { borderColor: item.color }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}1A` }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={styles.metricNote}>{item.note}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Category demand outlook</Text>
            <Text style={styles.cardMeta}>Next 7 days</Text>
          </View>
          {forecastCategories.map((item) => (
            <View key={item.label} style={styles.dayRow}>
              <View style={{ width: 110 }}>
                <Text style={styles.dayLabel}>{item.label}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${item.demand}%`, backgroundColor: item.color }]} />
              </View>
              <View style={styles.dayMeta}>
                <Text style={styles.dayValue}>{item.demand}</Text>
                <Text style={[styles.dayBadge, { color: item.color }]}>{item.trend}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Demand drivers</Text>
            <Text style={styles.cardMeta}>Confidence 0.79</Text>
          </View>
          {drivers.map((item) => (
            <View key={item.label} style={styles.driverRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverLabel}>{item.label}</Text>
                <Text style={styles.driverNote}>Projected impact</Text>
              </View>
              <View style={styles.driverGauge}>
                <View style={[styles.driverFill, { width: `${item.intensity}%` }]} />
              </View>
              <Text style={styles.driverValue}>{item.intensity}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Suggested supply plan</Text>
            <Text style={styles.cardMeta}>Auto-generated</Text>
          </View>
          {supplyPlan.map((item) => (
            <View key={item.title} style={styles.planRow}>
              <View style={styles.planIcon}>
                <Ionicons name={item.icon} size={18} color="#1976D2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{item.title}</Text>
                <Text style={styles.planDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next recommended actions</Text>
          <View style={styles.actionRow}>
            <Ionicons name="checkbox-outline" size={18} color="#1976D2" />
            <Text style={styles.actionText}>Lock supplier delivery slots for Thu</Text>
          </View>
          <View style={styles.actionRow}>
            <Ionicons name="checkbox-outline" size={18} color="#1976D2" />
            <Text style={styles.actionText}>Prioritize refills for chronic care patients</Text>
          </View>
          <View style={styles.actionRow}>
            <Ionicons name="checkbox-outline" size={18} color="#1976D2" />
            <Text style={styles.actionText}>Batch-label top 20 high-turn items</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  hero: {
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#E8F1FF",
    top: -120,
    right: -120,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  subheading: {
    color: "#5A6676",
    marginTop: 6,
    marginBottom: 12,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF4FF",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  statusText: {
    color: "#0F1E2E",
    fontWeight: "700",
    fontSize: 12,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E4E9F2",
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F1E2E",
  },
  metricLabel: {
    color: "#5A6676",
    marginTop: 4,
    fontWeight: "700",
    fontSize: 12,
  },
  metricNote: {
    color: "#8A96A6",
    marginTop: 6,
    fontSize: 11,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  cardMeta: {
    color: "#5A6676",
    fontSize: 12,
    fontWeight: "600",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  dayLabel: {
    fontWeight: "800",
    color: "#0F1E2E",
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#EEF1F6",
    borderRadius: 8,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 8,
  },
  dayMeta: {
    width: 72,
    alignItems: "flex-end",
  },
  dayValue: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  dayBadge: {
    fontSize: 11,
    fontWeight: "700",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  driverLabel: {
    fontWeight: "700",
    color: "#0F1E2E",
  },
  driverNote: {
    color: "#8A96A6",
    fontSize: 12,
    marginTop: 4,
  },
  driverGauge: {
    width: 90,
    height: 8,
    borderRadius: 6,
    backgroundColor: "#EEF1F6",
    overflow: "hidden",
    marginRight: 8,
  },
  driverFill: {
    height: "100%",
    backgroundColor: "#1976D2",
    borderRadius: 6,
  },
  driverValue: {
    fontWeight: "800",
    color: "#0F1E2E",
    width: 40,
    textAlign: "right",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  planDetail: {
    color: "#5A6676",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  actionText: {
    color: "#0F1E2E",
    fontWeight: "600",
  },
});
