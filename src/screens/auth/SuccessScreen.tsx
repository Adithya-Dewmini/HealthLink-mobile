import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthCard from "../../components/auth/AuthCard";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthLayout from "../../components/auth/AuthLayout";
import { AUTH_COLORS } from "../../components/auth/authTheme";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "AuthSuccess">;

export default function SuccessScreen({ navigation, route }: Props) {
  const params = route.params;

  if (!params) {
    return <SafeAreaView style={styles.container} />;
  }

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: params.target as any }],
    });
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon={params.icon === "sparkles" ? "sparkles" : "checkmark-circle"}
        title={params.title}
        subtitle={params.subtitle}
      />
      <AuthCard style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={params.icon ?? "checkmark-circle"} size={74} color={AUTH_COLORS.success} />
        </View>
        {params.message ? <Text style={styles.message}>{params.message}</Text> : null}
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>{params.actionLabel}</Text>
        </TouchableOpacity>
      </AuthCard>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  card: {
    alignItems: "center",
    gap: 16,
  },
  iconWrap: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF3",
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
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
