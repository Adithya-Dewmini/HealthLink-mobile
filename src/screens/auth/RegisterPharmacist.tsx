import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { AuthContext } from "../../utils/AuthContext";
import { api } from "../../api/client";
import { pickSingleImage, type UploadableAsset } from "../../services/mediaUploadService";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";

export default function RegisterPharmacist({ navigation }: any) {
  const [pharmacyName, setPharmacyName] = useState("");
  const [location, setLocation] = useState("");
  const [pharmacyEmail, setPharmacyEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationDocument, setVerificationDocument] = useState<UploadableAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);

  const handlePickDocument = async () => {
    try {
      const asset = await pickSingleImage();
      if (asset) {
        setVerificationDocument(asset);
      }
    } catch (caughtError) {
      Alert.alert(
        "Upload unavailable",
        caughtError instanceof Error ? caughtError.message : "Unable to select a document"
      );
    }
  };

  const handleRegister = async () => {
    if (
      !pharmacyName ||
      !location ||
      !ownerName ||
      !ownerEmail ||
      !password ||
      !phone ||
      !verificationDocument
    ) {
      setError("Please fill in all required fields and upload a license or certification image.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("pharmacy_name", pharmacyName);
      formData.append("location", location);
      formData.append("phone", phone);
      formData.append("pharmacy_email", pharmacyEmail);
      formData.append("owner_name", ownerName);
      formData.append("owner_email", ownerEmail);
      formData.append("password", password);
      formData.append("verification_document", verificationDocument as any);

      const response = await api.post("/api/auth/register-pharmacy", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const token = String(response.data?.token || "");
      if (!token) {
        throw new Error("Registration succeeded without a token");
      }

      await login(response.data?.user ?? null, token);
    } catch (caughtError: any) {
      const message =
        typeof caughtError?.response?.data?.message === "string"
          ? caughtError.response.data.message
          : caughtError instanceof Error
            ? caughtError.message
            : "Unable to register pharmacy";
      setError(message);
      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon="flask-outline"
        title="Pharmacy Registration"
        subtitle="Create your pharmacy account and submit it for approval."
      />

      <AuthCard>
        <AuthInput label="Pharmacy Name" value={pharmacyName} onChangeText={setPharmacyName} placeholder="Pharmacy name" icon="business-outline" />
        <AuthInput label="Location" value={location} onChangeText={setLocation} placeholder="City or address" icon="location-outline" />
        <AuthInput label="Pharmacy Email" value={pharmacyEmail} onChangeText={setPharmacyEmail} placeholder="contact@pharmacy.com" keyboardType="email-address" icon="mail-outline" />
        <AuthInput label="Owner Full Name" value={ownerName} onChangeText={setOwnerName} placeholder="Owner name" icon="person-outline" />
        <AuthInput label="Owner Email" value={ownerEmail} onChangeText={setOwnerEmail} placeholder="owner@pharmacy.com" keyboardType="email-address" icon="mail-outline" />
        <AuthInput label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry icon="lock-closed-outline" />
        <AuthInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+94 77 123 4567" keyboardType="phone-pad" icon="call-outline" />

        <Pressable style={styles.uploadCard} onPress={() => void handlePickDocument()}>
          <Text style={styles.uploadTitle}>License / Certification</Text>
          <Text style={styles.uploadSubtitle}>
            {verificationDocument
              ? verificationDocument.name
              : "Upload your pharmacy registration or certification document"}
          </Text>
        </Pressable>

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
  uploadCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_COLORS.textPrimary,
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: AUTH_COLORS.textSecondary,
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
