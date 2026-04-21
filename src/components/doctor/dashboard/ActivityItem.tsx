import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ActivityItem({ text }: any) {
  return (
    <View style={styles.item}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
  },
});
