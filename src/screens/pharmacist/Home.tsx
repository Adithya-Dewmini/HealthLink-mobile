import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const lowStock = [
  { id: "MED-201", name: "Paracetamol 500mg", qty: 12 },
  { id: "MED-155", name: "Amoxicillin 250mg", qty: 8 },
  { id: "MED-044", name: "Cough Syrup 100ml", qty: 5 },
];

const expiring = [
  { id: "MED-091", name: "Ibuprofen 200mg", expiry: "2025-02-18" },
  { id: "MED-122", name: "Vitamin C 500mg", expiry: "2025-03-02" },
];

const prescriptions = [
  { id: "RX-801", patient: "Amaya Perera", doctor: "Dr. Silva", time: "09:40" },
  { id: "RX-802", patient: "Ruwan Jayasinghe", doctor: "Dr. Fernando", time: "10:05" },
  { id: "RX-803", patient: "Ishara Fernando", doctor: "Dr. Perera", time: "10:20" },
];

export default function Home() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 28 }}
        bounces={false}
      >
        <Text style={styles.heading}>Pharmacist Dashboard</Text>
        <Text style={styles.subheading}>Daily overview and alerts</Text>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Daily sales"
            value="LKR 132,500"
            icon="cash-outline"
            color="#1976D2"
          />
          <MetricCard
            label="Pending prescriptions"
            value={prescriptions.length.toString()}
            icon="document-text-outline"
            color="#7B1FA2"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Low stock alerts</Text>
            <Text style={styles.cardCount}>{lowStock.length} items</Text>
          </View>
          {lowStock.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>{item.id}</Text>
              </View>
              <View style={styles.chipWarning}>
                <Ionicons name="cube-outline" size={14} color="#D14343" />
                <Text style={styles.chipTextWarning}>{item.qty} left</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Expiry alerts</Text>
            <Text style={styles.cardCount}>{expiring.length} soon</Text>
          </View>
          {expiring.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>{item.id}</Text>
              </View>
              <View style={styles.chipInfo}>
                <Ionicons name="alert-circle-outline" size={14} color="#FFA000" />
                <Text style={styles.chipTextInfo}>Expires {item.expiry}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pending digital prescriptions</Text>
            <Text style={styles.cardCount}>{prescriptions.length} pending</Text>
          </View>
          {prescriptions.map((rx) => (
            <View key={rx.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{rx.patient}</Text>
                <Text style={styles.rowMeta}>{rx.id} • {rx.doctor}</Text>
              </View>
              <View style={styles.chipPrimary}>
                <Ionicons name="time-outline" size={14} color="#1976D2" />
                <Text style={styles.chipTextPrimary}>{rx.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  color: string;
};

function MetricCard({ label, value, icon, color }: MetricCardProps) {
  return (
    <View style={[styles.metricCard, { borderColor: `${color}55` }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
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
    paddingTop: 0,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  subheading: {
    color: "#5A6676",
    marginBottom: 14,
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E4E9F2",
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F1E2E",
  },
  metricLabel: {
    color: "#5A6676",
    marginTop: 2,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  cardCount: {
    color: "#5A6676",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F6",
  },
  rowTitle: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  rowMeta: {
    color: "#5A6676",
    marginTop: 2,
  },
  chipWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FEEAEA",
    borderWidth: 1,
    borderColor: "#D14343",
  },
  chipTextWarning: {
    color: "#D14343",
    fontWeight: "800",
  },
  chipInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FFF6E5",
    borderWidth: 1,
    borderColor: "#FFA000",
  },
  chipTextInfo: {
    color: "#A86B00",
    fontWeight: "800",
  },
  chipPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EAF4FF",
    borderWidth: 1,
    borderColor: "#1976D2",
  },
  chipTextPrimary: {
    color: "#0F1E2E",
    fontWeight: "800",
  },
});
