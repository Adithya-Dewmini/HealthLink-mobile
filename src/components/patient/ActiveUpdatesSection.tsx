import React from "react";
import { StyleSheet, View } from "react-native";

export default function ActiveUpdatesSection({ children }: { children: React.ReactNode }) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 8,
  },
});
