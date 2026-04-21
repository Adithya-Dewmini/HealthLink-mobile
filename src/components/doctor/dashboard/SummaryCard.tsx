import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function SummaryCard({ title, value }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  title: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
});
