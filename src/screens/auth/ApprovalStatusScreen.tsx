import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import { AUTH_COLORS } from "../../components/auth/authTheme";
import type { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../utils/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "ApprovalStatus">;
type ApprovalRole = "pharmacist" | "medical_center_admin";
type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

const STATUS_STYLES: Record<
  ApprovalStatus,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    pillBg: string;
    pillText: string;
  }
> = {
  pending: {
    icon: "time-outline",
    iconColor: "#B45309",
    pillBg: "#FEF3C7",
    pillText: "#92400E",
  },
  approved: {
    icon: "checkmark-circle-outline",
    iconColor: "#15803D",
    pillBg: "#DCFCE7",
    pillText: "#166534",
  },
  rejected: {
    icon: "close-circle-outline",
    iconColor: "#B91C1C",
    pillBg: "#FEE2E2",
    pillText: "#991B1B",
  },
  suspended: {
    icon: "alert-circle-outline",
    iconColor: "#9A3412",
    pillBg: "#FFEDD5",
    pillText: "#9A3412",
  },
};

const COPY: Record<
  ApprovalRole,
  Record<ApprovalStatus, { title: string; subtitle: string; message: string }>
> = {
  pharmacist: {
    pending: {
      title: "Your pharmacy registration is under review",
      subtitle: "Approval is required before full workspace access.",
      message: "You can log in, but pharmacy tools will unlock only after admin approval.",
    },
    approved: {
      title: "Your pharmacy account is approved",
      subtitle: "Opening your pharmacy workspace...",
      message: "Approval confirmed.",
    },
    rejected: {
      title: "Your pharmacy registration was not approved",
      subtitle: "Approval is required before full workspace access.",
      message: "Review the latest note below and contact support if you need help.",
    },
    suspended: {
      title: "Your pharmacy access is suspended",
      subtitle: "Approval is required before full workspace access.",
      message: "Your pharmacy workspace is currently unavailable.",
    },
  },
  medical_center_admin: {
    pending: {
      title: "Your medical center registration is under review",
      subtitle: "Approval is required before full workspace access.",
      message: "You can log in, but center management tools will unlock only after admin approval.",
    },
    approved: {
      title: "Your medical center account is approved",
      subtitle: "Opening your medical center workspace...",
      message: "Approval confirmed.",
    },
    rejected: {
      title: "Your medical center registration was not approved",
      subtitle: "Approval is required before full workspace access.",
      message: "Review the latest note below and contact support if you need help.",
    },
    suspended: {
      title: "Your medical center access is suspended",
      subtitle: "Approval is required before full workspace access.",
      message: "Your medical center workspace is currently unavailable.",
    },
  },
};

export default function ApprovalStatusScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, "ApprovalStatus">>();
  const { isAuthenticated, user, refreshAuth, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const hasRedirectedRef = useRef(false);

  const role = (String(user?.role || route.params?.role || "pharmacist").trim().toLowerCase() ||
    "pharmacist") as ApprovalRole;
  const status = (String(
    user?.verification_status ||
      user?.status ||
      route.params?.verificationStatus ||
      "pending"
  ).trim().toLowerCase() || "pending") as ApprovalStatus;
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const copy = COPY[role]?.[status] ?? COPY.pharmacist.pending;
  const isApproved = status === "approved";
  const notes = user?.verification_notes ?? route.params?.verificationNotes ?? null;
  const workspaceTarget = role === "medical_center_admin" ? "MedicalCenterTabs" : "PharmacistStack";

  useEffect(() => {
    if (!isAuthenticated || !isApproved || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    navigation.reset({
      index: 0,
      routes: [{ name: workspaceTarget as "MedicalCenterTabs" | "PharmacistStack" }],
    });
  }, [isApproved, isAuthenticated, navigation, workspaceTarget]);

  const actionLabel = useMemo(() => {
    if (!isAuthenticated) {
      return "Go to Login";
    }
    if (isApproved) {
      return role === "medical_center_admin" ? "Open Medical Center Workspace" : "Open Pharmacy Workspace";
    }
    return "Refresh Status";
  }, [isApproved, isAuthenticated, role]);

  const handlePrimaryAction = async () => {
    if (!isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "AuthStack",
            params: {
              screen: "Login",
              params: {
                initialEmail: route.params?.email,
              },
            },
          },
        ],
      });
      return;
    }

    if (isApproved) {
      hasRedirectedRef.current = true;
      navigation.reset({
        index: 0,
        routes: [{ name: workspaceTarget as "MedicalCenterTabs" | "PharmacistStack" }],
      });
      return;
    }

    setRefreshing(true);
    setStatusMessage("");
    try {
      const refreshedUser = await refreshAuth();
      const refreshedStatus = String(
        refreshedUser?.verification_status || refreshedUser?.status || status
      )
        .trim()
        .toLowerCase();

      if (refreshedStatus === "approved") {
        hasRedirectedRef.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: workspaceTarget as "MedicalCenterTabs" | "PharmacistStack" }],
        });
        return;
      }

      if (refreshedStatus === "pending") {
        setStatusMessage("Your account is still under review. Please check again shortly.");
      } else if (refreshedStatus === "rejected") {
        setStatusMessage("Your registration was not approved. Review the latest note below.");
      } else if (refreshedStatus === "suspended") {
        setStatusMessage("Your access is suspended. Please contact support.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader icon="shield-checkmark" title={copy.title} subtitle={copy.subtitle} />

      <AuthCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: config.pillBg }]}>
          <Ionicons name={config.icon} size={84} color={config.iconColor} />
        </View>

        <View style={[styles.statusPill, { backgroundColor: config.pillBg }]}>
          <Text style={[styles.statusPillText, { color: config.pillText }]}>{status.toUpperCase()}</Text>
        </View>

        <Text style={styles.message}>{copy.message}</Text>
        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}

        {notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Latest note</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, refreshing && styles.primaryButtonDisabled]}
          activeOpacity={0.88}
          onPress={handlePrimaryAction}
          disabled={refreshing}
        >
          {refreshing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{actionLabel}</Text>}
        </TouchableOpacity>

        {isAuthenticated ? (
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => void logout()}>
            <Text style={styles.secondaryButtonText}>Log Out</Text>
          </TouchableOpacity>
        ) : null}
      </AuthCard>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 16,
  },
  iconWrap: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  message: {
    textAlign: "center",
    color: AUTH_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  statusMessage: {
    textAlign: "center",
    color: AUTH_COLORS.primaryDark,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  notesCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 6,
  },
  notesLabel: {
    color: AUTH_COLORS.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  notesText: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: AUTH_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: AUTH_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: "600",
  },
});
