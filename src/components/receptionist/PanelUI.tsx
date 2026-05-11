import React from "react";
import {
  ActivityIndicator,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const RECEPTION_THEME = {
  navy: "#03045E",
  primary: "#0077B6",
  aqua: "#00B4D8",
  softAqua: "#90E0EF",
  lightAqua: "#CAF0F8",
  background: "#F8FCFD",
  surface: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#0F9D74",
  warning: "#D97706",
  danger: "#DC2626",
  infoSurface: "#EAF8FD",
  successSurface: "#E9FBF6",
  warningSurface: "#FFF7E8",
  dangerSurface: "#FEF2F2",
} as const;

type HeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function ReceptionistHeader({ eyebrow, title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTextWrap}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger";
};

export function ReceptionistButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  tone = "primary",
}: ButtonProps) {
  const toneStyle =
    tone === "secondary"
      ? styles.buttonSecondary
      : tone === "danger"
        ? styles.buttonDanger
        : styles.buttonPrimary;
  const textStyle =
    tone === "secondary" ? styles.buttonSecondaryText : styles.buttonPrimaryText;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.buttonBase, toneStyle, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={tone === "secondary" ? RECEPTION_THEME.primary : "#FFFFFF"} />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? (
            <Ionicons
              name={icon}
              size={17}
              color={tone === "secondary" ? RECEPTION_THEME.primary : "#FFFFFF"}
            />
          ) : null}
          <Text style={textStyle}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function StatusBadge({
  label,
  tone = "info",
}: {
  label: string;
  tone?: "info" | "success" | "warning" | "danger" | "neutral";
}) {
  const toneStyle =
    tone === "success"
      ? styles.badgeSuccess
      : tone === "warning"
        ? styles.badgeWarning
        : tone === "danger"
          ? styles.badgeDanger
          : tone === "neutral"
            ? styles.badgeNeutral
          : styles.badgeInfo;

  const textStyle =
    tone === "success"
      ? styles.badgeSuccessText
      : tone === "warning"
        ? styles.badgeWarningText
        : tone === "danger"
          ? styles.badgeDangerText
          : tone === "neutral"
            ? styles.badgeNeutralText
          : styles.badgeInfoText;

  return (
    <View style={[styles.badgeBase, toneStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon = "sparkles-outline",
  action,
}: {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconWrap}>
        <Ionicons name={icon} size={24} color={RECEPTION_THEME.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.stateCard, styles.errorCard]}>
      <View style={[styles.stateIconWrap, styles.errorIconWrap]}>
        <Ionicons name="alert-circle-outline" size={24} color={RECEPTION_THEME.danger} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {onRetry ? (
        <View style={styles.stateAction}>
          <ReceptionistButton label="Try Again" tone="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={RECEPTION_THEME.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function PermissionUpdatedBanner({
  message = "Your responsibilities were updated.",
  actionLabel = "Review",
  onPress,
}: {
  message?: string;
  actionLabel?: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerIconWrap}>
        <Ionicons name="shield-checkmark-outline" size={18} color={RECEPTION_THEME.navy} />
      </View>
      <View style={styles.bannerTextWrap}>
        <Text style={styles.bannerTitle}>Responsibilities Updated</Text>
        <Text style={styles.bannerMessage}>{message}</Text>
      </View>
      <TouchableOpacity onPress={onPress} style={styles.bannerAction}>
        <Text style={styles.bannerActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.surfaceCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  headerTextWrap: {
    flex: 1,
  },
  eyebrow: {
    color: RECEPTION_THEME.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  headerSubtitle: {
    marginTop: 6,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonBase: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: RECEPTION_THEME.primary,
    borderColor: RECEPTION_THEME.primary,
  },
  buttonDanger: {
    backgroundColor: RECEPTION_THEME.danger,
    borderColor: RECEPTION_THEME.danger,
  },
  buttonSecondary: {
    backgroundColor: RECEPTION_THEME.surface,
    borderColor: RECEPTION_THEME.border,
  },
  buttonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonSecondaryText: {
    color: RECEPTION_THEME.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.52,
  },
  badgeBase: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeInfo: {
    backgroundColor: RECEPTION_THEME.lightAqua,
  },
  badgeSuccess: {
    backgroundColor: RECEPTION_THEME.successSurface,
  },
  badgeWarning: {
    backgroundColor: RECEPTION_THEME.warningSurface,
  },
  badgeDanger: {
    backgroundColor: RECEPTION_THEME.dangerSurface,
  },
  badgeNeutral: {
    backgroundColor: "#EEF2F7",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  badgeInfoText: {
    color: RECEPTION_THEME.navy,
  },
  badgeSuccessText: {
    color: RECEPTION_THEME.success,
  },
  badgeWarningText: {
    color: RECEPTION_THEME.warning,
  },
  badgeDangerText: {
    color: RECEPTION_THEME.danger,
  },
  badgeNeutralText: {
    color: "#475569",
  },
  stateCard: {
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  errorCard: {
    backgroundColor: "#FFF8F8",
  },
  stateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: RECEPTION_THEME.infoSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorIconWrap: {
    backgroundColor: RECEPTION_THEME.dangerSurface,
  },
  stateTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
    textAlign: "center",
  },
  stateMessage: {
    marginTop: 10,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  stateAction: {
    marginTop: 18,
    width: "100%",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 72,
  },
  loadingText: {
    marginTop: 12,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
  },
  banner: {
    backgroundColor: RECEPTION_THEME.lightAqua,
    borderColor: "#B7E5F0",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    color: RECEPTION_THEME.navy,
    fontWeight: "800",
    fontSize: 14,
  },
  bannerMessage: {
    marginTop: 2,
    color: RECEPTION_THEME.navy,
    fontSize: 12,
    lineHeight: 18,
  },
  bannerAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: RECEPTION_THEME.surface,
  },
  bannerActionText: {
    color: RECEPTION_THEME.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  surfaceCard: {
    backgroundColor: RECEPTION_THEME.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    padding: 18,
    shadowColor: "#03045E",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
