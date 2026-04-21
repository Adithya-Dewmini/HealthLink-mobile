import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Reports() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F9FB" },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 90 },
  title: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  subtitle: { marginTop: 6, fontSize: 14, color: "#6B7280" },
});
