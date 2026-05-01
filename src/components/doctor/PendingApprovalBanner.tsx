import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PendingApprovalBanner() {
  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={18} color="#B45309" />
      <Text style={styles.text}>
        Your account is under review. Some features are restricted until approval.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
});
