import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList, RootStackParamList } from "../../types/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import { AUTH_COLORS } from "../../components/auth/authTheme";

type Props = NativeStackScreenProps<AuthStackParamList, "RegisterDoctorSuccess">;
type RootNav = any;

export default function RegisterDoctorSuccessScreen({ navigation, route }: Props) {
  const rootNavigation = navigation.getParent<RootNav>();

  return (
    <AuthLayout>
      <AuthHeader
        icon="checkmark-circle"
        title="Registration Submitted"
        subtitle="Set your password next to complete the doctor onboarding flow."
      />

      <AuthCard style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={92} color={AUTH_COLORS.success} />
        </View>
        <Text style={styles.message}>
          Your account is under verification. You will be notified once approved.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={() => {
            rootNavigation?.navigate("SetPassword" as keyof RootStackParamList, {
              token: route.params.setupToken,
              email: route.params.email,
              role: "doctor",
              autoLogin: true,
            });
          }}
        >
          <Text style={styles.primaryButtonText}>Set Password</Text>
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
