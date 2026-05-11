import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants";
import { styles } from "../styles";
import type { Receptionist, ReceptionistPermissions } from "../types";

export function PermissionsModal({
  visible,
  receptionist,
  loading,
  saving,
  draft,
  onClose,
  onSave,
  onToggle,
}: {
  visible: boolean;
  receptionist: Receptionist | null;
  loading: boolean;
  saving: boolean;
  draft: ReceptionistPermissions;
  onClose: () => void;
  onSave: () => void;
  onToggle: (key: keyof ReceptionistPermissions) => void;
}) {
  const permissionItems: Array<{
    key: Extract<keyof ReceptionistPermissions, string>;
    label: string;
    description: string;
  }> = [
    {
      key: "queue_access",
      label: "Queue Access",
      description: "Allow managing queue flow and token progress.",
    },
    {
      key: "appointments",
      label: "Appointments",
      description: "Allow creating and managing appointments.",
    },
    {
      key: "check_in",
      label: "Check-in",
      description: "Allow patient check-in and registration actions.",
    },
    {
      key: "schedule_management",
      label: "Schedule Management",
      description: "Allow creating and managing doctor clinic sessions.",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Receptionist Permissions</Text>
              <Text style={styles.modalSubtitle}>
                {receptionist ? receptionist.name : "Loading"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Ionicons name="close" size={22} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : (
            <>
              <View style={styles.permissionList}>
                {permissionItems.map((item) => (
                  <View key={item.key} style={styles.permissionItem}>
                    <View style={styles.permissionTextWrap}>
                      <Text style={styles.permissionTitle}>{item.label}</Text>
                      <Text style={styles.permissionDescription}>{item.description}</Text>
                    </View>
                    <Switch
                      value={draft[item.key]}
                      onValueChange={() => onToggle(item.key)}
                      trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                      thumbColor={draft[item.key] ? THEME.primary : "#F9FAFB"}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalPrimaryButton, saving && styles.buttonDisabled]}
                  onPress={onSave}
                  disabled={saving}
                >
                  <Text style={styles.modalPrimaryButtonText}>
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
