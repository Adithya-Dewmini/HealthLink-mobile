import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PasswordInput from "../../components/auth/PasswordInput";
import { apiFetch } from "../../config/api";
import type { AuthStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "SetPassword">;

const THEME = {
  primary: "#10B981",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  danger: "#EF4444",
};

export default function SetPasswordScreen({ navigation, route }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setupToken = useMemo(() => route.params?.token?.trim() || "", [route.params?.token]);

  useEffect(() => {
    console.log("SET PASSWORD TOKEN:", setupToken || "<missing>");
  }, [setupToken]);

  const validateForm = () => {
    if (!setupToken) {
      return "Setup token is missing. Open the invite link again.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return "";
  };

  const handleSetPassword = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: setupToken,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLoading(false);
        setError(data.message || "Failed to set password.");
        return;
      }

      setLoading(false);
      Alert.alert("Success", "Password has been set successfully.", [
        {
          text: "Go to Login",
          onPress: () => navigation.replace("Login"),
        },
      ]);
    } catch (requestError) {
      setLoading(false);
      setError("Unable to connect to server.");
      console.log("Set password error:", requestError);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Ionicons name="medkit" size={40} color={THEME.primary} />
            </View>
            <Text style={styles.title}>Set Your Password</Text>
            <Text style={styles.subtitle}>
              Welcome to HealthLink Clinic. Please set your password to continue.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tokenDebugBox}>
              <Text style={styles.tokenDebugLabel}>Debug Token</Text>
              <Text style={styles.tokenDebugValue}>{setupToken || "No token received"}</Text>
            </View>

            <PasswordInput label="New Password" value={password} onChange={setPassword} />
            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={THEME.white} />
              ) : (
                <Text style={styles.buttonText}>Set Password</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>Password must be at least 8 characters.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  tokenDebugBox: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  tokenDebugLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.primary,
    textTransform: "uppercase",
  },
  tokenDebugValue: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textPrimary,
  },
  button: {
    backgroundColor: THEME.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: THEME.white,
    fontSize: 18,
    fontWeight: "800",
  },
  errorText: {
    color: THEME.danger,
    fontSize: 14,
    marginBottom: 15,
    textAlign: "center",
  },
  helperText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
});
