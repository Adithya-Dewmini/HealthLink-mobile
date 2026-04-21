import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SalesChart() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sales Overview</Text>
      <View style={styles.chartPlaceholder}>
        <Text>Chart goes here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  chartPlaceholder: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
});
