import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../../utils/AuthContext";
import { api } from "../../api/client";
import { pickSingleImage, type UploadableAsset } from "../../services/mediaUploadService";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";

export default function RegisterMedicalCenter({ navigation }: any) {
  const { login } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [centerName, setCenterName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [centerEmail, setCenterEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialtiesText, setSpecialtiesText] = useState("");
  const [verificationDocument, setVerificationDocument] = useState<UploadableAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const TOTAL_STEPS = 3;

  const parsedSpecialties = useMemo(
    () =>
      specialtiesText
        .split(",")
        .map((item) => item.trim())
        .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index),
    [specialtiesText]
  );

  const stepLabel = useMemo(() => {
    switch (step) {
      case 1:
        return "Center details";
      case 2:
        return "Owner account";
      default:
        return "Verification";
    }
  }, [step]);

  const validateStep = () => {
    if (step === 1) {
      if (!centerName || !location || !phone || !centerEmail) {
        setError("Please complete all required fields for this step.");
        return false;
      }
    }

    if (step === 2) {
      if (!adminName || !adminEmail || !password) {
        setError("Please complete all required fields for this step.");
        return false;
      }
    }

    if (step === 3 && !verificationDocument) {
      setError("Please upload a license or certification image.");
      return false;
    }

    setError("");
    return true;
  };

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

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
    }
  };

  const handleRegister = async () => {
    if (!validateStep()) {
      return;
    }

    if (!centerName || !location || !phone || !centerEmail || !adminName || !adminEmail || !password) {
      setError("Please complete all required fields.");
      return;
    }

    if (!verificationDocument) {
      setError("Please upload a license or certification image.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("center_name", centerName);
      formData.append("location", location);
      formData.append("address", address || location);
      formData.append("phone", phone);
      formData.append("center_email", centerEmail);
      formData.append("admin_name", adminName);
      formData.append("admin_email", adminEmail);
      formData.append("password", password);
      formData.append("specialties", parsedSpecialties.join(","));
      formData.append("verification_document", verificationDocument as any);

      const response = await api.post("/api/auth/register-medical-center", formData, {
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
            : "Unable to register medical center";
      setError(message);
      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeader
        icon="business-outline"
        title="Medical Center Registration"
        subtitle={`Step ${step} of ${TOTAL_STEPS} · ${stepLabel}`}
      />

      <AuthCard>
        {step === 1 ? (
          <>
            <AuthInput label="Medical Center Name" value={centerName} onChangeText={setCenterName} placeholder="Center name" icon="business-outline" />
            <AuthInput label="Location / City" value={location} onChangeText={setLocation} placeholder="Location" icon="location-outline" />
            <AuthInput label="Address" value={address} onChangeText={setAddress} placeholder="Address" icon="map-outline" />
            <AuthInput label="Contact Phone" value={phone} onChangeText={setPhone} placeholder="+94 77 123 4567" keyboardType="phone-pad" icon="call-outline" />
            <AuthInput label="Center Contact Email" value={centerEmail} onChangeText={setCenterEmail} placeholder="center@example.com" keyboardType="email-address" icon="mail-outline" />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AuthInput label="Admin Full Name" value={adminName} onChangeText={setAdminName} placeholder="Owner name" icon="person-outline" />
            <AuthInput label="Admin Email" value={adminEmail} onChangeText={setAdminEmail} placeholder="owner@example.com" keyboardType="email-address" icon="mail-outline" />
            <AuthInput label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry icon="lock-closed-outline" />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <AuthInput label="Specialties" value={specialtiesText} onChangeText={setSpecialtiesText} placeholder="Comma separated specialties (optional)" icon="list-outline" />

            <Pressable style={styles.uploadCard} onPress={() => void handlePickDocument()}>
              <Text style={styles.uploadTitle}>License / Certification</Text>
              <Text style={styles.uploadSubtitle}>
                {verificationDocument
                  ? verificationDocument.name
                  : "Upload your registration or certification document"}
              </Text>
            </Pressable>
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View key={index} style={[styles.dot, index + 1 === step && styles.dotActive]} />
          ))}
        </View>
      </AuthCard>

      <View style={styles.footerActions}>
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          activeOpacity={0.88}
          onPress={step === TOTAL_STEPS ? handleRegister : handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {step === TOTAL_STEPS ? "Submit Registration" : "Next"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => (step > 1 ? setStep((prev) => prev - 1) : navigation.goBack())}>
          <Text style={styles.footerLink}>{step > 1 ? "Back" : "Back to role selection"}</Text>
        </TouchableOpacity>
      </View>
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
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#B7C8D8",
  },
  dotActive: {
    backgroundColor: AUTH_COLORS.primary,
  },
  footerActions: {
    width: "100%",
    marginTop: 16,
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
