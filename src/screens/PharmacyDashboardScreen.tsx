import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import Header from "../components/doctor/dashboard/Header";
import SummaryCard from "../components/doctor/dashboard/SummaryCard";
import SalesChart from "../components/doctor/dashboard/SalesChart";
import AlertCard from "../components/doctor/dashboard/AlertCard";
import QuickAction from "../components/doctor/dashboard/QuickAction";
import ActivityItem from "../components/doctor/dashboard/ActivityItem";

export default function PharmacyDashboardScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Header />

      <View style={styles.grid}>
        <SummaryCard title="Sales" value="LKR 45,200" />
        <SummaryCard title="Prescriptions" value="120" />
        <SummaryCard title="Low Stock" value="8" />
        <SummaryCard title="Expiring" value="5" />
      </View>

      <SalesChart />

      <View style={styles.section}>
        <AlertCard text="Paracetamol is low in stock" type="warning" />
        <AlertCard text="Amoxicillin expiring soon" type="danger" />
      </View>

      <View style={styles.actions}>
        <QuickAction label="Scan QR" />
        <QuickAction label="Add Medicine" />
        <QuickAction label="Inventory" />
      </View>

      <View style={styles.section}>
        <ActivityItem text="Prescription dispensed for John" />
        <ActivityItem text="Stock updated for Panadol" />
        <ActivityItem text="New medicine added" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FB",
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  section: {
    marginTop: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
});
