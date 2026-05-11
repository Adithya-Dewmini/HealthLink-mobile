import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import { AUTH_COLORS } from "../../components/auth/authTheme";
import { useAuth } from "../../utils/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "PasswordSetupSuccess">;

export default function PasswordSetupSuccessScreen({ navigation, route }: Props) {
  const { logout } = useAuth();

  const handleGoToLogin = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "Login",
            params: {
              initialEmail: route.params?.email,
              flashMessage: "Password set successfully. Please log in.",
            },
          },
        },
      ],
    });
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon="checkmark-circle"
        title="Password Set Successfully"
        subtitle="Your account is now ready to use."
      />

      <AuthCard style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={88} color={AUTH_COLORS.success} />
        </View>
        <Text style={styles.message}>Your account is ready. Sign in with your new password.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={() => void handleGoToLogin()}
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
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF3",
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
