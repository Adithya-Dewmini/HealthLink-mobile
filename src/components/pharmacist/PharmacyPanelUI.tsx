import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export const PHARMACY_PANEL_THEME = {
  background: "#07111F",
  backgroundSoft: "#0C1729",
  surface: "#F4F8FF",
  surfaceAlt: "#EAF2FF",
  card: "rgba(255,255,255,0.08)",
  cardStrong: "rgba(255,255,255,0.12)",
  border: "rgba(148, 163, 184, 0.22)",
  borderStrong: "rgba(125, 211, 252, 0.22)",
  text: "#E2E8F0",
  textMuted: "#94A3B8",
  textDark: "#0F172A",
  cyan: "#67E8F9",
  sky: "#38BDF8",
  blue: "#2563EB",
  emerald: "#34D399",
  amber: "#FB923C",
  rose: "#FB7185",
  white: "#FFFFFF",
} as const;

type HeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PharmacyPanelHeader({
  eyebrow,
  footer,
  right,
  style,
  subtitle,
  title,
}: HeaderProps) {
  return (
    <LinearGradient
      colors={["#091A2F", "#0D233C", "#12304E"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerShell, style]}
    >
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />
      <View style={styles.headerTopRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
      {footer ? <View style={styles.headerFooter}>{footer}</View> : null}
    </LinearGradient>
  );
}

export function PharmacyGlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  headerShell: {
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.16)",
    padding: 20,
    shadowColor: "#020617",
    shadowOpacity: 0.42,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  headerGlowOne: {
    position: "absolute",
    top: -20,
    right: -18,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  headerGlowTwo: {
    position: "absolute",
    bottom: -36,
    left: -26,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: "rgba(52, 211, 153, 0.12)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  eyebrow: {
    color: "#B6E6FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 8,
    color: "#B7C7DB",
    fontSize: 14,
    lineHeight: 20,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 10,
  },
  headerFooter: {
    marginTop: 18,
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PHARMACY_PANEL_THEME.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 16,
  },
});
