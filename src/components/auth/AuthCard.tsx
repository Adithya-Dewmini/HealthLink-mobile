import React, { type PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { AUTH_COLORS } from "./authTheme";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export default function AuthCard({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AUTH_COLORS.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: AUTH_COLORS.primaryDark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
