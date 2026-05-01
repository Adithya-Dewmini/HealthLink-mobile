import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AUTH_COLORS } from "./authTheme";

type Props = {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AuthHeader({
  title,
  subtitle,
  icon = "pulse-outline",
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={AUTH_COLORS.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 22,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6F7FB",
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: AUTH_COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: AUTH_COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
});
