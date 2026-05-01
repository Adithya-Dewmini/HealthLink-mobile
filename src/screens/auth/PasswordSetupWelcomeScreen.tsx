import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthContext } from "../../utils/AuthContext";
import type { RootStackParamList } from "../../types/navigation";
import { getDashboardRouteForRole, getWelcomeMessageForRole } from "./passwordSetupFlow";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import { AUTH_COLORS } from "../../components/auth/authTheme";

type Props = NativeStackScreenProps<RootStackParamList, "PasswordSetupWelcome">;

export default function PasswordSetupWelcomeScreen({ navigation, route }: Props) {
  const { role: authenticatedRole } = useContext(AuthContext);
  const resolvedRole = route.params?.role ?? authenticatedRole;

  const handleGoToDashboard = () => {
    const target = getDashboardRouteForRole(resolvedRole);
    navigation.reset({
      index: 0,
      routes: [{ name: target as any }],
    });
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon="sparkles"
        title="Welcome to HealthLink"
        subtitle="Your account has been activated successfully."
      />

      <AuthCard style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={72} color={AUTH_COLORS.primary} />
        </View>
        <Text style={styles.info}>{getWelcomeMessageForRole(resolvedRole)}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={handleGoToDashboard}
        >
          <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
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
    backgroundColor: "#E6F7FB",
  },
  info: {
    fontSize: 15,
    lineHeight: 24,
    color: AUTH_COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 330,
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
