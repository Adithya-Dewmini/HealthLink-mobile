import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AlertCard({ text, type }: any) {
  return (
    <View style={[styles.card, type === "danger" && styles.danger]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  danger: {
    backgroundColor: "#FEE2E2",
  },
  text: {
    fontSize: 14,
  },
});
