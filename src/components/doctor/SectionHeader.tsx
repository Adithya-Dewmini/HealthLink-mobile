import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

const COLORS = {
  textDark: "#1E293B",
  textGray: "#64748B",
};

function SectionHeaderComponent({
  title,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onActionPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View />
      )}
    </View>
  );
}

export default memo(SectionHeaderComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  action: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textGray,
  },
});
