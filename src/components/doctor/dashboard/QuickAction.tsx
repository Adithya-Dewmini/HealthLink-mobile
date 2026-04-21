import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function QuickAction({ label }: any) {
  return (
    <TouchableOpacity style={styles.btn}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#2BB673",
    padding: 12,
    borderRadius: 12,
    width: "30%",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
});
