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

type Props = NativeStackScreenProps<RootStackParamList, "DoctorPendingApproval">;

const STATUS_COPY: Record<
  "pending" | "rejected" | "approved" | "suspended" | "verified",
  {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    pillBg: string;
    pillText: string;
  }
> = {
  pending: {
    title: "Your account is under review",
    subtitle: "You can log in, but full doctor features will be available after admin approval.",
    icon: "time-outline",
    iconColor: "#B45309",
    pillBg: "#FEF3C7",
    pillText: "#92400E",
  },
  rejected: {
    title: "Verification was not approved",
    subtitle: "Your submission was reviewed but not approved yet.",
    icon: "close-circle-outline",
    iconColor: "#B91C1C",
    pillBg: "#FEE2E2",
    pillText: "#991B1B",
  },
  approved: {
    title: "Your account is approved",
    subtitle: "Approval confirmed. Opening your doctor workspace...",
    icon: "checkmark-circle-outline",
    iconColor: "#15803D",
    pillBg: "#DCFCE7",
    pillText: "#166534",
  },
  suspended: {
    title: "Account access is suspended",
    subtitle: "Doctor access is restricted. Contact support or your administrator for help.",
    icon: "alert-circle-outline",
    iconColor: "#9A3412",
    pillBg: "#FFEDD5",
    pillText: "#9A3412",
  },
  verified: {
    title: "Your account is approved",
    subtitle: "Approval confirmed. Opening your doctor workspace...",
    icon: "checkmark-circle-outline",
    iconColor: "#15803D",
    pillBg: "#DCFCE7",
    pillText: "#166534",
  },
};

export default function DoctorPendingApprovalScreen({ navigation }: Props) {
  const route = useRoute<RouteProp<RootStackParamList, "DoctorPendingApproval">>();
  const { isAuthenticated, user, refreshAuth, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const hasRedirectedRef = useRef(false);

  const status =
    (String(
      user?.verification_status ||
        user?.status ||
        route.params?.verificationStatus ||
        "pending"
    ).trim().toLowerCase() as keyof typeof STATUS_COPY) || "pending";
  const isApproved = status === "approved" || status === "verified";
  const config = STATUS_COPY[status] ?? STATUS_COPY.pending;
  const notes = user?.verification_notes ?? route.params?.verificationNotes ?? null;

  useEffect(() => {
    if (!isAuthenticated || !isApproved || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    navigation.reset({
      index: 0,
      routes: [{ name: "Doctor" }],
    });
  }, [isApproved, isAuthenticated, navigation]);

  const actionLabel = useMemo(() => {
    if (!isAuthenticated) {
      return "Go to Login";
    }
    if (isApproved) {
      return "Open Doctor Workspace";
    }
    return "Refresh Status";
  }, [isApproved, isAuthenticated]);

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
        routes: [{ name: "Doctor" }],
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

      if (refreshedStatus === "approved" || refreshedStatus === "verified") {
        hasRedirectedRef.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: "Doctor" }],
        });
        return;
      }

      if (refreshedStatus === "pending") {
        setStatusMessage("Your account is still under review. Please check again shortly.");
        return;
      }

      if (refreshedStatus === "rejected") {
        setStatusMessage("Verification was not approved. Review the latest note below.");
        return;
      }

      if (refreshedStatus === "suspended") {
        setStatusMessage("Your account access is suspended. Please contact support.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader icon="shield-checkmark" title={config.title} subtitle={config.subtitle} />

      <AuthCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: config.pillBg }]}>
          <Ionicons name={config.icon} size={84} color={config.iconColor} />
        </View>

        <View style={[styles.statusPill, { backgroundColor: config.pillBg }]}>
          <Text style={[styles.statusPillText, { color: config.pillText }]}>
            {status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.message}>
          {status === "pending"
            ? "You can log in, but full doctor features will be available after admin approval."
            : status === "rejected"
              ? "Review the notes below, update your details if needed, and contact support before trying again."
              : status === "suspended"
                ? "If this looks incorrect, contact support or your administrator."
                : "Approval confirmed. Opening your doctor workspace..."}
        </Text>

        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}

        {notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Review note</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, refreshing && styles.primaryButtonDisabled]}
          activeOpacity={0.88}
          onPress={handlePrimaryAction}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{actionLabel}</Text>
          )}
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
