import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Header() {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>Good Morning</Text>
        <Text style={styles.title}>PharmaCare</Text>
        <Text style={styles.subtitle}>Here is your overview</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
});
