import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../../api/client";
import type { AuthStackParamList } from "../../types/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthCard from "../../components/auth/AuthCard";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
      });

      Alert.alert(
        "Check your email",
        typeof response.data?.message === "string" && response.data.message.trim().length > 0
          ? response.data.message
          : "Reset link sent to your email."
      );
      setEmail("");
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Unable to send reset link";
      Alert.alert("Reset failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <Text style={styles.backLinkText}>Back to sign in</Text>
      </TouchableOpacity>

      <AuthHeader
        icon="mail-open-outline"
        title="Reset Password"
        subtitle="We’ll send a secure reset link to the email associated with your account."
      />

      <AuthCard style={styles.card}>
            <AuthInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="name@healthlink.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.88}
              onPress={handleSendResetLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
      </AuthCard>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backLink: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backLinkText: {
    color: AUTH_COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    marginTop: 4,
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: AUTH_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: AUTH_COLORS.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
