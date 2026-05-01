import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../utils/AuthContext";
import { apiFetch } from "../../config/api";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";

export default function RegisterPharmacist({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pharmacyId, setPharmacyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { refreshAuth } = useContext(AuthContext);
  const rootNavigation = navigation.getParent();

  const handleRegister = async () => {
    if (!fullName || !email || !password || !phone || !pharmacyId) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          phone,
          pharmacyId,
          role: "pharmacist",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = typeof data.message === "string" ? data.message : "Unable to register";
        setError(message);
        Alert.alert("Registration failed", message);
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      await refreshAuth();

      rootNavigation?.navigate("AuthSuccess", {
        icon: "shield-checkmark",
        title: "Registration submitted",
        subtitle: "Your pharmacist account has been created.",
        message: "Your account is under verification. You will be notified once approved.",
        actionLabel: "Go to Dashboard",
        target: "PharmacistStack",
      });
    } catch (caughtError) {
      setError("Unable to connect to server");
      Alert.alert("Registration failed", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon="flask-outline"
        title="Pharmacist Registration"
        subtitle="Create your account with your pharmacy assignment details."
      />

      <AuthCard>
        <AuthInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Full name" icon="person-outline" />
        <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="name@pharmacy.com" keyboardType="email-address" icon="mail-outline" />
        <AuthInput label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry icon="lock-closed-outline" />
        <AuthInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+94 77 123 4567" keyboardType="phone-pad" icon="call-outline" />
        <AuthInput label="Pharmacy ID" value={pharmacyId} onChangeText={setPharmacyId} placeholder="Assigned pharmacy ID" icon="business-outline" />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          activeOpacity={0.88}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Submit Registration</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.footerLink}>Back to role selection</Text>
        </TouchableOpacity>
      </AuthCard>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
  errorText: {
    color: AUTH_COLORS.danger,
    fontSize: 13,
    marginBottom: 14,
    textAlign: "center",
  },
  footerLink: {
    marginTop: 18,
    textAlign: "center",
    color: AUTH_COLORS.primaryDark,
    fontWeight: "600",
  },
});
