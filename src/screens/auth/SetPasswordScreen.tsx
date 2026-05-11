import React, { useContext, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import * as Linking from "expo-linking";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthCard from "../../components/auth/AuthCard";
import AuthHeader from "../../components/auth/AuthHeader";
import PasswordInput from "../../components/auth/PasswordInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";
import { apiFetch } from "../../config/api";
import type { RootStackParamList } from "../../types/navigation";
import { AuthContext } from "../../utils/AuthContext";

type SetPasswordRouteProp = RouteProp<RootStackParamList, "SetPassword">;
type SetPasswordNavigationProp = NativeStackNavigationProp<RootStackParamList, "SetPassword">;
type TokenState = "validating" | "valid" | "missing" | "invalid" | "expired" | "used";

export default function SetPasswordScreen({
  navigation,
}: {
  navigation: SetPasswordNavigationProp;
}) {
  const route = useRoute<SetPasswordRouteProp>();
  const { logout } = useContext(AuthContext);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenState, setTokenState] = useState<TokenState>("validating");
  const url = Linking.useURL();

  const setupToken = useMemo(() => {
    const routeToken = route.params?.token?.trim() || "";
    if (routeToken) {
      return routeToken;
    }

    if (url) {
      const parsed = Linking.parse(url);
      const value = parsed.queryParams?.token;
      if (typeof value === "string") {
        return value.trim();
      }
      if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0].trim();
      }
    }

    return "";
  }, [route.params?.token, url]);

  const registrationEmail = route.params?.email?.trim() || "";
  const goToLogin = async (flashMessage?: string) => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "AuthStack",
          params: {
            screen: "Login",
            params: {
              initialEmail: registrationEmail || undefined,
              flashMessage,
            },
          },
        },
      ],
    });
  };

  React.useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!setupToken) {
        if (active) {
          setTokenState("missing");
          setError("Missing setup token.");
        }
        return;
      }

      setTokenState("validating");
      setError("");

      try {
        const response = await apiFetch("/api/auth/validate-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: setupToken }),
        });

        const data = await response.json().catch(() => ({}));
        const message =
          typeof data.message === "string" && data.message.trim().length > 0
            ? data.message.trim()
            : "";

        if (!response.ok) {
          if (!active) {
            return;
          }

          if (message === "Token already used") {
            setTokenState("used");
            setError("This setup link has already been used.");
            return;
          }

          if (message === "Token expired") {
            setTokenState("expired");
            setError("This setup link has expired.");
            return;
          }

          if (message === "Token missing") {
            setTokenState("missing");
            setError("Missing setup token.");
            return;
          }

          setTokenState("invalid");
          setError("Invalid setup link.");
          return;
        }

        if (active) {
          setTokenState("valid");
        }
      } catch {
        if (active) {
          setTokenState("invalid");
          setError("Unable to validate this setup link.");
        }
      }
    };

    void validateToken();

    return () => {
      active = false;
    };
  }, [setupToken]);

  const goToRecoveryDestination = () => {
    void goToLogin();
  };

  const validateForm = () => {
    if (tokenState !== "valid") {
      return error || "Invalid setup link.";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters.";
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

    setLoading(true);
    setError("");

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
        const message =
          typeof data.message === "string" && data.message.trim().length > 0
            ? data.message.trim()
            : "Failed to set password.";

        if (message === "Setup token has already been used") {
          setTokenState("used");
          setError("This setup link has already been used.");
        } else if (message === "Setup token has expired") {
          setTokenState("expired");
          setError("This setup link has expired.");
        } else if (message === "Invalid setup token") {
          setTokenState("invalid");
          setError("Invalid setup link.");
        } else {
          setError(message);
        }
        return;
      }

      await goToLogin("Password set successfully. Please log in.");
    } catch (requestError: any) {
      const responseMessage =
        typeof requestError?.response?.data?.message === "string"
          ? requestError.response.data.message.trim()
          : "";
      setError(responseMessage || "Unable to complete password setup.");
    } finally {
      setLoading(false);
    }
  };

  const renderRecoveryCard = () => {
    const isUsed = tokenState === "used";

    return (
      <View style={styles.recoveryState}>
        <View style={styles.recoveryRow}>
          <Ionicons
            name={isUsed ? "checkmark-circle" : "alert-circle"}
            size={22}
            color={isUsed ? AUTH_COLORS.success : AUTH_COLORS.danger}
          />
          <Text style={styles.recoveryTitle}>
            {isUsed ? "Account already activated" : "Link unavailable"}
          </Text>
        </View>

        <Text style={styles.recoveryText}>
          {isUsed
            ? "Your password is already set. Continue with your credentials."
            : error || "This setup link is no longer available."}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={goToRecoveryDestination}
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon="shield-checkmark-outline"
        title="Set Your Password"
        subtitle="Create a secure password to finish activating your account."
      />

      <AuthCard>
        {tokenState === "validating" ? (
          <View style={styles.validationState}>
            <ActivityIndicator color={AUTH_COLORS.primary} />
            <Text style={styles.validationText}>Validating setup link...</Text>
          </View>
        ) : null}

        {tokenState === "used" ||
        tokenState === "expired" ||
        tokenState === "invalid" ||
        tokenState === "missing" ? (
          renderRecoveryCard()
        ) : null}

        {tokenState === "valid" ? (
          <>
            <PasswordInput label="New Password" value={password} onChange={setPassword} />
            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={0.88}
              onPress={handleSetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Set Password</Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </AuthCard>

      {tokenState === "valid" ? (
        <Text style={styles.helperText}>Password must be at least 6 characters.</Text>
      ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  validationState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  validationText: {
    marginTop: 10,
    fontSize: 14,
    color: AUTH_COLORS.textSecondary,
  },
  recoveryState: {
    gap: 18,
  },
  recoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recoveryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AUTH_COLORS.primaryDark,
  },
  recoveryText: {
    fontSize: 15,
    lineHeight: 24,
    color: AUTH_COLORS.textSecondary,
  },
  errorText: {
    color: AUTH_COLORS.danger,
    fontSize: 14,
    marginBottom: 8,
    marginTop: 2,
    textAlign: "center",
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
  helperText: {
    marginTop: 22,
    textAlign: "center",
    color: AUTH_COLORS.textSecondary,
    fontSize: 14,
  },
});
