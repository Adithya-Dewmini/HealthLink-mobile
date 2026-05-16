import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DoctorAvatar from "../common/DoctorAvatar";
import {
  doctorColors,
  doctorRadius,
  doctorSpacing,
  doctorTypography,
  getDoctorHeaderStatusPalette,
  type DoctorHeaderStatusVariant,
} from "../../constants/doctorTheme";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  doctorName?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  profileImageUri?: string | null;
  rightAvatarUrl?: string | null;
  initials?: string;
  onRightPress?: () => void;
  onAvatarPress?: () => void;
  secondaryIcon?: keyof typeof Ionicons.glyphMap;
  onSecondaryPress?: () => void;
  secondaryAccessibilityLabel?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightAccessibilityLabel?: string;
  statusLabel?: string;
  statusVariant?: DoctorHeaderStatusVariant;
  variant?: "hero" | "screen";
  showAvatar?: boolean;
};

export default function DoctorPanelHeader({
  eyebrow,
  title,
  subtitle,
  doctorName,
  showBack = false,
  onBackPress,
  profileImageUri,
  rightAvatarUrl,
  initials = "DR",
  onRightPress,
  onAvatarPress,
  secondaryIcon,
  onSecondaryPress,
  secondaryAccessibilityLabel = "Open notifications",
  rightIcon = "person-circle-outline",
  rightAccessibilityLabel = "Open doctor profile",
  statusLabel,
  statusVariant = "idle",
  variant = "screen",
  showAvatar,
}: Props) {
  const navigation = useNavigation<any>();
  const statusPalette = getDoctorHeaderStatusPalette(statusVariant);
  const avatarImage = rightAvatarUrl ?? profileImageUri ?? null;
  const shouldShowAvatar =
    showAvatar ?? Boolean(onAvatarPress || avatarImage || (!showBack && !onRightPress));
  const showRightIcon = Boolean(!shouldShowAvatar && onRightPress);

  if (variant === "hero") {
    return (
      <View style={styles.heroShell}>
        <View style={styles.heroHeader}>
          <View style={styles.heroLeftRow}>
            {showBack ? (
              <TouchableOpacity
                style={styles.heroBackButton}
                onPress={onBackPress || navigation.goBack}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={20} color={doctorColors.surface} />
              </TouchableOpacity>
            ) : null}

            <View style={styles.heroLeft}>
              {doctorName ? (
                <>
                  <Text style={styles.heroEyebrow}>{title}</Text>
                  <Text style={styles.heroDoctorName}>{doctorName}</Text>
                </>
              ) : (
                <Text style={styles.heroTitle}>{title}</Text>
              )}
              {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.heroRight}>
            {statusLabel ? (
              <View style={[styles.heroStatusPill, { backgroundColor: statusPalette.backgroundColor }]}>
                <Text style={[styles.heroStatusText, { color: statusPalette.textColor }]}>{statusLabel}</Text>
              </View>
            ) : null}
            <View style={styles.heroActionsRow}>
              {secondaryIcon && onSecondaryPress ? (
                <TouchableOpacity
                  style={styles.heroSecondaryButton}
                  onPress={onSecondaryPress}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={secondaryAccessibilityLabel}
                >
                  <Ionicons name={secondaryIcon} size={20} color={doctorColors.surface} />
                </TouchableOpacity>
              ) : null}
              {shouldShowAvatar ? (
                <TouchableOpacity
                  style={styles.heroAvatarButton}
                  onPress={onAvatarPress || onRightPress}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={rightAccessibilityLabel}
                  disabled={!onAvatarPress && !onRightPress}
                >
                  <DoctorAvatar
                    name={doctorName || title}
                    imageUrl={avatarImage}
                    size={56}
                    fallbackLabel={initials}
                    backgroundColor="#1F9F96"
                  />
                </TouchableOpacity>
              ) : showRightIcon ? (
                <TouchableOpacity
                  style={styles.heroSecondaryButton}
                  onPress={onRightPress}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={rightAccessibilityLabel}
                >
                  <Ionicons name={rightIcon} size={20} color={doctorColors.surface} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View style={styles.leftGroup}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBackPress || navigation.goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color={doctorColors.deep} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightGroup}>
        {statusLabel ? (
          <View style={[styles.statusPill, { backgroundColor: statusPalette.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusPalette.textColor }]}>{statusLabel}</Text>
          </View>
        ) : null}

        {shouldShowAvatar ? (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onAvatarPress || onRightPress}
            accessibilityRole="button"
            accessibilityLabel={rightAccessibilityLabel}
            disabled={!onAvatarPress && !onRightPress}
          >
            <DoctorAvatar
              name={doctorName || title}
              imageUrl={avatarImage}
              size={44}
              fallbackLabel={initials}
              backgroundColor={doctorColors.primary}
            />
          </TouchableOpacity>
        ) : showRightIcon ? (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onRightPress}
            accessibilityRole="button"
            accessibilityLabel={rightAccessibilityLabel}
          >
            <Ionicons name={rightIcon} size={22} color={doctorColors.deep} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    backgroundColor: "#318B88",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: doctorSpacing.lg,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  heroLeftRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    minWidth: 0,
    marginRight: doctorSpacing.md,
  },
  heroBackButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: doctorSpacing.sm,
  },
  heroLeft: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    fontSize: 17,
    fontWeight: "700",
    color: "rgba(255,255,255,0.84)",
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "rgba(255,255,255,0.96)",
  },
  heroDoctorName: {
    marginTop: 6,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
    color: "rgba(255,255,255,0.96)",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  heroRight: {
    alignItems: "flex-end",
    gap: doctorSpacing.sm,
  },
  heroActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: doctorSpacing.sm,
  },
  heroSecondaryButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatusPill: {
    borderRadius: doctorRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroStatusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroAvatarButton: {
    borderRadius: doctorRadius.pill,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: doctorSpacing.lg,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: doctorColors.surface,
  },
  leftGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: doctorSpacing.sm,
    marginLeft: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EEF6F5",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: doctorTypography.eyebrow,
    lineHeight: 16,
    fontWeight: "700",
    color: doctorColors.textSecondary,
  },
  title: {
    marginTop: 2,
    fontSize: doctorTypography.title,
    lineHeight: 26,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: doctorTypography.subtitle,
    lineHeight: 18,
    color: doctorColors.textSecondary,
  },
  profileButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#EEF6F5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  statusPill: {
    borderRadius: doctorRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
