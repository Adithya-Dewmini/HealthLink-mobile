import React, { memo } from "react";
import { StyleSheet, View } from "react-native";

const THEME = {
  primary: "#2563EB",
};

function ProgressBarComponent({ progress }: { progress: number }) {
  const normalized = Math.max(0, Math.min(progress, 1));

  return (
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${normalized * 100}%` }]} />
    </View>
  );
}

export default memo(ProgressBarComponent);

const styles = StyleSheet.create({
  progressBarBg: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    marginBottom: 20,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: THEME.primary,
    borderRadius: 3,
  },
});
