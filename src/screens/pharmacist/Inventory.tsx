import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const stock = [
  { id: "MED-201", name: "Paracetamol 500mg", category: "Analgesic", qty: 120, expiry: "2026-01-15" },
  { id: "MED-155", name: "Amoxicillin 250mg", category: "Antibiotic", qty: 48, expiry: "2025-11-20" },
  { id: "MED-091", name: "Ibuprofen 200mg", category: "Analgesic", qty: 30, expiry: "2025-02-18" },
  { id: "MED-044", name: "Cough Syrup 100ml", category: "Respiratory", qty: 18, expiry: "2025-03-05" },
  { id: "MED-122", name: "Vitamin C 500mg", category: "Supplement", qty: 62, expiry: "2025-03-02" },
];

export default function Inventory() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 28 }}
        bounces={false}
      >
        <Text style={styles.heading}>Inventory</Text>
        <Text style={styles.subheading}>Stock list with category, quantity, and expiry</Text>

        <View style={styles.card}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableText, styles.headerCell, { flex: 1.4 }]}>Medicine</Text>
            <Text style={[styles.tableText, styles.headerCell, { flex: 1 }]}>Category</Text>
            <Text style={[styles.tableText, styles.headerCell, { width: 70, textAlign: "center" }]}>Qty</Text>
            <Text style={[styles.tableText, styles.headerCell, { width: 90 }]}>Expiry</Text>
          </View>

          {stock.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>{item.id}</Text>
              </View>
              <Text style={[styles.rowMeta, { flex: 1 }]} numberOfLines={1}>
                {item.category}
              </Text>
              <View style={{ width: 70, alignItems: "center" }}>
                <View
                  style={[
                    styles.qtyChip,
                    item.qty < 20 && styles.qtyLow,
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={12}
                    color={item.qty < 20 ? "#D14343" : "#0F1E2E"}
                  />
                  <Text
                    style={[
                      styles.qtyText,
                      item.qty < 20 && { color: "#D14343" },
                    ]}
                  >
                    {item.qty}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.rowMeta,
                  { width: 90, color: item.expiry <= "2025-03-31" ? "#D14343" : "#5A6676" },
                ]}
              >
                {item.expiry}
              </Text>
            </View>
          ))}
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F6",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F6",
    gap: 10,
  },
  tableText: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  headerCell: {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.5,
    color: "#5A6676",
    fontWeight: "800",
  },
  rowTitle: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  rowMeta: {
    color: "#5A6676",
    marginTop: 2,
  },
  qtyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: "#E4E9F2",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyLow: {
    backgroundColor: "#FEEAEA",
    borderColor: "#D14343",
  },
  qtyText: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
});
