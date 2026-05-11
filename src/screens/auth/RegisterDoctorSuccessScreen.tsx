import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../types/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import { AUTH_COLORS } from "../../components/auth/authTheme";

type Props = NativeStackScreenProps<AuthStackParamList, "RegisterDoctorSuccess">;

export default function RegisterDoctorSuccessScreen({ navigation, route }: Props) {
  return (
    <AuthLayout>
      <AuthHeader
        icon="checkmark-circle"
        title="Registration Submitted"
        subtitle="Your doctor account is created and pending admin approval."
      />

      <AuthCard style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={92} color={AUTH_COLORS.success} />
        </View>
        <Text style={styles.message}>
          Your documents were submitted successfully. Sign in with the password you created
          to track your approval status.
        </Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>
            Status: {route.params.verificationStatus.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={() =>
            navigation.replace("Login", {
              initialEmail: route.params.email,
              flashMessage: route.params.canLogin
                ? "Registration submitted successfully. Sign in to view your approval status."
                : "Registration submitted successfully.",
            })
          }
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
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
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: AUTH_COLORS.textSecondary,
    textAlign: "center",
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },
  statusPillText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: AUTH_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AUTH_COLORS.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
