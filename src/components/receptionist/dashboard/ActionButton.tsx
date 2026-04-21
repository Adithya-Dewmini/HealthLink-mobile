import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  title: string;
  isPrimary?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
};

function ActionButtonComponent({ title, isPrimary, icon, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.container} onPress={onPress}>
      {isPrimary ? (
        <View style={styles.primaryButton}>
          {icon ? <Feather name={icon} size={18} color="#FFF" style={styles.primaryButtonIcon} /> : null}
          <Text style={styles.primaryButtonText}>{title}</Text>
        </View>
      ) : (
        <View style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default memo(ActionButtonComponent);

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  primaryButton: {
    flexDirection: "row",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2196F3",
  },
  primaryButtonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryButtonText: {
    color: "#2196F3",
    fontSize: 15,
    fontWeight: "600",
  },
});
