import React, { memo, useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants";
import { styles } from "../styles";
import { getPermissionBadges } from "../utils";
import type { Receptionist } from "../types";

export const ReceptionistCard = memo(function ReceptionistCard({
  receptionist,
  onOpenPermissions,
  onOpenMenu,
  onToggle,
  onResendInvite,
}: {
  receptionist: Receptionist;
  onOpenPermissions: () => void;
  onOpenMenu: () => void;
  onToggle: () => void;
  onResendInvite: () => void;
}) {
  const initials = useMemo(
    () =>
      receptionist.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase(),
    [receptionist.name]
  );

  const badgeStyles =
    receptionist.status === "PENDING"
      ? { bg: THEME.softYellow, text: THEME.warning, label: "Pending" }
      : receptionist.status === "DISABLED"
        ? { bg: THEME.softRed, text: THEME.danger, label: "Disabled" }
        : { bg: THEME.softGreen, text: THEME.success, label: "Active" };

  const permissionBadges = useMemo(
    () => getPermissionBadges(receptionist.permissions),
    [receptionist.permissions]
  );

  const getPermissionStyles = (permission: string) => {
    if (permission.toLowerCase().includes("queue")) {
      return { backgroundColor: "#E0F2FE", color: "#0369A1" };
    }
    if (permission.toLowerCase().includes("appointment")) {
      return { backgroundColor: "#EDE9FE", color: "#6D28D9" };
    }
    if (permission.toLowerCase().includes("check-in")) {
      return { backgroundColor: "#DCFCE7", color: "#15803D" };
    }
    return { backgroundColor: THEME.softBlue, color: THEME.primary };
  };

  return (
    <TouchableOpacity activeOpacity={0.96} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.name}>{receptionist.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeStyles.bg }]}>
              <Text style={[styles.statusText, { color: badgeStyles.text }]}>
                {badgeStyles.label}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={14} color={THEME.textSecondary} />
            <Text style={styles.infoText}>{receptionist.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color={THEME.textSecondary} />
            <Text style={styles.infoText}>{receptionist.phone}</Text>
          </View>
        </View>
      </View>

      <View style={styles.permissionsRow}>
        {permissionBadges.length > 0 ? (
          permissionBadges.map((permission) => {
            const permissionStyles = getPermissionStyles(permission);

            return (
              <View
                key={permission}
                style={[styles.permissionChip, { backgroundColor: permissionStyles.backgroundColor }]}
              >
                <Text style={[styles.permissionChipText, { color: permissionStyles.color }]}>
                  {permission}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={[styles.permissionChip, styles.noPermissionChip]}>
            <Text style={[styles.permissionChipText, styles.noPermissionText]}>
              {receptionist.status === "PENDING" ? "Invite Pending" : "No permissions assigned"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            styles.actionButton,
            receptionist.status === "PENDING" && styles.buttonDisabled,
          ]}
          disabled={receptionist.status === "PENDING"}
          onPress={onOpenPermissions}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={receptionist.status === "PENDING" ? THEME.textSecondary : THEME.white}
          />
          <Text
            style={[
              styles.primaryButtonText,
              styles.actionButtonText,
              receptionist.status === "PENDING" && styles.buttonDisabledText,
            ]}
            numberOfLines={1}
          >
            Permissions
          </Text>
        </TouchableOpacity>

        {receptionist.status === "PENDING" ? (
          <TouchableOpacity
            style={[styles.outlineButton, styles.actionButton, styles.resendButton]}
            onPress={onResendInvite}
          >
            <Ionicons name="mail-open-outline" size={15} color={THEME.warning} />
            <Text
              style={[styles.outlineButtonText, styles.actionButtonText, { color: THEME.warning }]}
              numberOfLines={1}
            >
              Resend Invite
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.outlineButton, styles.actionButton]}
            onPress={onToggle}
          >
            <Ionicons name="power-outline" size={15} color={THEME.textSecondary} />
            <Text style={[styles.neutralButtonText, styles.actionButtonText]} numberOfLines={1}>
              {receptionist.status === "DISABLED" ? "Enable" : "Disable"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.outlineButton, styles.actionButton, styles.moreButton]}
          onPress={onOpenMenu}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={THEME.textPrimary} />
          <Text style={[styles.neutralButtonText, styles.actionButtonText]} numberOfLines={1}>
            More
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});
