import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { pharmacyTheme } from "../../theme/pharmacyTheme";

export const PHARMACY_PANEL_THEME = {
  ...pharmacyTheme.colors,
  background: pharmacyTheme.colors.navy,
  backgroundSoft: pharmacyTheme.colors.indigo,
  surface: pharmacyTheme.colors.card,
  surfaceAlt: pharmacyTheme.colors.lightBlue,
  card: pharmacyTheme.colors.card,
  cardStrong: pharmacyTheme.colors.card,
  border: pharmacyTheme.colors.border,
  borderStrong: pharmacyTheme.colors.border,
  text: pharmacyTheme.colors.textPrimary,
  textMuted: pharmacyTheme.colors.mutedText,
  textDark: pharmacyTheme.colors.textPrimary,
  cyan: pharmacyTheme.colors.orange,
  sky: pharmacyTheme.colors.lightBlue,
  blue: pharmacyTheme.colors.indigo,
  emerald: pharmacyTheme.colors.success,
  amber: pharmacyTheme.colors.yellow,
  rose: pharmacyTheme.colors.danger,
  white: pharmacyTheme.colors.card,
} as const;

type SurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "light" | "dark";
};

type HeaderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "light" | "dark";
};

type HeroProps = HeaderProps;

type MetricCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  accent?: "yellow" | "orange" | "indigo" | "peach" | "success";
  style?: StyleProp<ViewStyle>;
};

type QuickActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent?: "yellow" | "orange" | "indigo" | "peach";
  onPress: () => void;
};

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  caption?: string;
  right?: React.ReactNode;
};

const accentStyles = {
  yellow: {
    iconBg: "#FFF0CC",
    iconColor: pharmacyTheme.colors.yellow,
    valueAccent: "#8A5700",
  },
  orange: {
    iconBg: "#FFE1D1",
    iconColor: pharmacyTheme.colors.orange,
    valueAccent: "#9A3F00",
  },
  indigo: {
    iconBg: "#E6E1FF",
    iconColor: pharmacyTheme.colors.indigo,
    valueAccent: "#2B1B7A",
  },
  peach: {
    iconBg: "#FFF2E6",
    iconColor: "#CC7A26",
    valueAccent: "#7D4A14",
  },
  success: {
    iconBg: "#DCF7EB",
    iconColor: pharmacyTheme.colors.success,
    valueAccent: "#1E7F59",
  },
} as const;

export function PharmacyScreenBackground({ children }: SurfaceProps) {
  return (
    <LinearGradient
      colors={[pharmacyTheme.colors.background, pharmacyTheme.colors.backgroundWarm]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screenBackground}
    >
      {children}
    </LinearGradient>
  );
}

export function PharmacyPanelHeader({
  eyebrow,
  footer,
  right,
  style,
  subtitle,
  title,
  variant,
}: HeaderProps) {
  void variant;
  return (
    <LinearGradient
      colors={[pharmacyTheme.colors.navy, pharmacyTheme.colors.indigo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerShell, style]}
    >
      <View style={styles.headerGlowWarm} />
      <View style={styles.headerGlowCool} />
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

export function PharmacyHeroCard(props: HeroProps) {
  return <PharmacyPanelHeader {...props} />;
}

export function PharmacyGlassCard({ children, style }: SurfaceProps) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

export function PharmacyMetricCard({
  accent = "yellow",
  detail,
  icon,
  label,
  style,
  value,
}: MetricCardProps) {
  const palette = accentStyles[accent];

  return (
    <View style={[styles.metricCard, style]}>
      <View style={[styles.metricIconWrap, { backgroundColor: palette.iconBg }]}>
        <Ionicons name={icon} size={19} color={palette.iconColor} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: palette.valueAccent }]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

export function PharmacyQuickActionCard({
  accent = "yellow",
  description,
  icon,
  onPress,
  title,
}: QuickActionCardProps) {
  const palette = accentStyles[accent];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.quickActionCard}
    >
      <View style={[styles.quickActionIconWrap, { backgroundColor: palette.iconBg }]}>
        <Ionicons name={icon} size={18} color={palette.iconColor} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionDescription}>{description}</Text>
      <View style={styles.quickActionFooter}>
        <Text style={styles.quickActionCta}>Open</Text>
        <Ionicons name="arrow-forward" size={16} color={pharmacyTheme.colors.navy} />
      </View>
    </TouchableOpacity>
  );
}

export function PharmacySectionHeader({
  caption,
  eyebrow,
  right,
  title,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
  },
  headerShell: {
    borderRadius: pharmacyTheme.radii.xlarge,
    padding: pharmacyTheme.spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...pharmacyTheme.shadows.card,
  },
  headerGlowWarm: {
    position: "absolute",
    top: -24,
    right: -10,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(255, 178, 26, 0.28)",
  },
  headerGlowCool: {
    position: "absolute",
    bottom: -36,
    left: -26,
    width: 190,
    height: 190,
    borderRadius: 999,
    backgroundColor: "rgba(220, 231, 250, 0.16)",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: pharmacyTheme.spacing.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: pharmacyTheme.spacing.sm,
  },
  eyebrow: {
    color: "#DCE7FA",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: pharmacyTheme.spacing.xs,
    color: pharmacyTheme.colors.textOnDark,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: pharmacyTheme.spacing.sm,
    color: "rgba(248, 250, 252, 0.86)",
    fontSize: 15,
    lineHeight: 22,
  },
  headerFooter: {
    marginTop: pharmacyTheme.spacing.lg,
  },
  glassCard: {
    borderRadius: pharmacyTheme.radii.large,
    backgroundColor: pharmacyTheme.colors.card,
    borderWidth: 1,
    borderColor: pharmacyTheme.colors.border,
    padding: pharmacyTheme.spacing.md,
    ...pharmacyTheme.shadows.soft,
  },
  metricCard: {
    backgroundColor: pharmacyTheme.colors.card,
    borderRadius: pharmacyTheme.radii.large,
    borderWidth: 1,
    borderColor: pharmacyTheme.colors.border,
    padding: pharmacyTheme.spacing.md,
    minHeight: 158,
    ...pharmacyTheme.shadows.soft,
  },
  metricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pharmacyTheme.spacing.md,
  },
  metricLabel: {
    color: pharmacyTheme.colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  metricValue: {
    marginTop: pharmacyTheme.spacing.sm,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
  },
  metricDetail: {
    marginTop: pharmacyTheme.spacing.xs,
    color: pharmacyTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  quickActionCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: pharmacyTheme.colors.card,
    borderWidth: 1,
    borderColor: pharmacyTheme.colors.border,
    borderRadius: pharmacyTheme.radii.large,
    padding: pharmacyTheme.spacing.md,
    minHeight: 156,
    ...pharmacyTheme.shadows.soft,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: pharmacyTheme.spacing.md,
  },
  quickActionTitle: {
    color: pharmacyTheme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
  },
  quickActionDescription: {
    marginTop: pharmacyTheme.spacing.xs,
    color: pharmacyTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  quickActionFooter: {
    marginTop: "auto",
    paddingTop: pharmacyTheme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickActionCta: {
    color: pharmacyTheme.colors.navy,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: pharmacyTheme.spacing.md,
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  sectionEyebrow: {
    color: pharmacyTheme.colors.orange,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    marginTop: 4,
    color: pharmacyTheme.colors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
  },
  sectionCaption: {
    marginTop: 6,
    color: pharmacyTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
