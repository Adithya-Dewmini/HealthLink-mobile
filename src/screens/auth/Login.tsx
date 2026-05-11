import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { AuthContext } from "../../utils/AuthContext";
import { api } from "../../api/client";
import { getExpoPushToken } from "../../services/notifications";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthCard from "../../components/auth/AuthCard";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";
import type { AuthStackParamList } from "../../types/navigation";

export default function Login({ navigation }: any) {
  const route = useRoute<RouteProp<AuthStackParamList, "Login">>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  useEffect(() => {
    if (route.params?.initialEmail) {
      setEmail(route.params.initialEmail);
    }
  }, [route.params?.initialEmail]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Please enter both your email and password.");
      return;
    }

    setLoading(true);

    try {
      const expoPushToken = await getExpoPushToken();
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        expoPushToken,
      });

      await login(response.data.user ?? null, response.data.token);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Unable to connect to server";
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout contentContainerStyle={styles.layoutContent}>
      <LinearGradient colors={[AUTH_COLORS.background, "#FFFFFF"]} style={styles.hero}>
        <AuthHeader
          icon="pulse"
          title="Welcome back"
          subtitle="Sign in to continue with your HealthLink workspace."
        />
      </LinearGradient>

      <AuthCard style={styles.card}>
            {route.params?.flashMessage ? (
              <Text style={styles.flashMessage}>{route.params.flashMessage}</Text>
            ) : null}
            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@healthlink.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              editable={!loading}
            />

            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              icon="lock-closed-outline"
              editable={!loading}
            />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.88}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
      </AuthCard>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.footerLink}>Create an account</Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  layoutContent: {
    paddingTop: 20,
    paddingBottom: 28,
  },
  hero: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 14,
  },
  card: {
    marginBottom: 14,
  },
  flashMessage: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#ECFDF3",
    color: "#166534",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  linkRow: {
    alignSelf: "flex-end",
    marginBottom: 14,
  },
  linkText: {
    color: AUTH_COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
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
  footerLink: {
    textAlign: "center",
    color: AUTH_COLORS.primaryDark,
    fontSize: 15,
    fontWeight: "600",
  },
});
