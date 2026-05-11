import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../types/navigation";
import { registerDoctor } from "../../services/doctorRegistrationService";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";

interface FormData {
  fullName: string;
  nic: string;
  contact: string;
  email: string;
  slmc: string;
  qualification: string;
  specialization: string;
  experience: string;
  workplace: string;
  password: string;
  confirmPassword: string;
}

interface Documents {
  slmcCert: DocumentPicker.DocumentPickerAsset | null;
  degreeCert: DocumentPicker.DocumentPickerAsset | null;
  idProof: DocumentPicker.DocumentPickerAsset | null;
}

interface Errors {
  [key: string]: string;
}

const TOTAL_STEPS = 4;
const SRI_LANKA_NIC_REGEX = /^(?:\d{9}[VvXx]|\d{12})$/;

type Props = NativeStackScreenProps<AuthStackParamList, "RegisterDoctor">;

export default function DoctorRegistration({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    nic: "",
    contact: "",
    email: "",
    slmc: "",
    qualification: "",
    specialization: "",
    experience: "",
    workplace: "",
    password: "",
    confirmPassword: "",
  });
  const [documents, setDocuments] = useState<Documents>({
    slmcCert: null,
    degreeCert: null,
    idProof: null,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const stepLabel = useMemo(() => {
    switch (step) {
      case 1:
        return "Basic account details";
      case 2:
        return "Professional details";
      case 3:
        return "Verification documents";
      default:
        return "Create password";
    }
  }, [step]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitError) {
      setSubmitError("");
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const pickDocument = async (docType: keyof Documents) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setDocuments((prev) => ({ ...prev, [docType]: result.assets[0] }));
        setErrors((prev) => ({ ...prev, documents: "" }));
      }
    } catch {
      Alert.alert("Upload failed", "Unable to select the requested document.");
    }
  };

  const validateStep = () => {
    const nextErrors: Errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedNic = formData.nic.replace(/\s+/g, "").toUpperCase();

    if (step === 1) {
      if (!formData.fullName) nextErrors.fullName = "Full name is required";
      if (formData.nic && !SRI_LANKA_NIC_REGEX.test(normalizedNic)) {
        nextErrors.nic = "Enter a valid Sri Lankan NIC";
      }
      if (!formData.contact) nextErrors.contact = "Contact number is required";
      if (!formData.email) {
        nextErrors.email = "Email address is required";
      } else if (!emailRegex.test(formData.email)) {
        nextErrors.email = "Invalid email format";
      }
    }

    if (step === 2) {
      if (!formData.slmc) nextErrors.slmc = "SLMC registration number is required";
      if (!formData.qualification) nextErrors.qualification = "Qualification is required";
      if (!formData.specialization) nextErrors.specialization = "Specialization is required";
      if (!formData.experience) nextErrors.experience = "Years of experience is required";
      if (!formData.workplace) nextErrors.workplace = "Current workplace is required";
    }

    if (step === 3) {
      if (!documents.slmcCert || !documents.degreeCert || !documents.idProof) {
        nextErrors.documents = "All required documents must be uploaded.";
      }
    }

    if (step === 4) {
      if (!formData.password) {
        nextErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        nextErrors.password = "Password must be at least 6 characters";
      }

      if (!formData.confirmPassword) {
        nextErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) {
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
    }
  };

  const handleSubmit = () => {
    if (submitting || !validateStep()) {
      return;
    }

    const toUploadFile = (file: DocumentPicker.DocumentPickerAsset) => ({
      uri: file.uri,
      name: file.name || `upload-${Date.now()}`,
      type: file.mimeType || "application/octet-stream",
    });

    const normalizedNic = formData.nic.replace(/\s+/g, "").toUpperCase();
    const normalizedPhone = formData.contact.replace(/\s+/g, "").replace(/^\+94/, "0");
    const slmcCert = documents.slmcCert;
    const degreeCert = documents.degreeCert;
    const idProof = documents.idProof;

    if (!slmcCert || !degreeCert || !idProof) {
      const message = "All required documents must be uploaded.";
      setErrors((prev) => ({ ...prev, documents: message }));
      setSubmitError(message);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    registerDoctor({
      full_name: formData.fullName.trim(),
      nic: normalizedNic,
      email: formData.email.trim().toLowerCase(),
      phone: normalizedPhone,
      slmc_number: formData.slmc.trim(),
      qualification: formData.qualification.trim(),
      specialization: formData.specialization.trim(),
      experience_years: Number(formData.experience || 0),
      workplace: formData.workplace.trim(),
      password: formData.password,
      slmc_certificate: toUploadFile(slmcCert),
      degree_certificate: toUploadFile(degreeCert),
      id_proof: toUploadFile(idProof),
    })
      .then((result) => {
        setFormData({
          fullName: "",
          nic: "",
          contact: "",
          email: "",
          slmc: "",
          qualification: "",
          specialization: "",
          experience: "",
          workplace: "",
          password: "",
          confirmPassword: "",
        });
        setDocuments({
          slmcCert: null,
          degreeCert: null,
          idProof: null,
        });
        setErrors({});
        setSubmitError("");
        Toast.show({
          type: "success",
          text1: "Registration submitted",
        });

        navigation.replace("RegisterDoctorSuccess", {
          doctorId: result.doctorId,
          verificationStatus: result.verificationStatus,
          email: formData.email.trim().toLowerCase(),
          canLogin: result.canLogin,
        });
      })
      .catch((caughtError) => {
        const message =
          axios.isAxiosError(caughtError) && typeof caughtError.response?.data?.message === "string"
            ? caughtError.response.data.message
            : "Unable to submit registration right now";
        setSubmitError(message);
        Alert.alert("Registration failed", message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const renderDocumentCard = (label: string, value: DocumentPicker.DocumentPickerAsset | null, onPress: () => void) => (
    <Pressable style={styles.uploadCard} onPress={onPress}>
      <Text style={styles.uploadTitle}>{label}</Text>
      <Text style={styles.uploadSubtitle}>
        {value ? value.name : "Upload image or PDF"}
      </Text>
    </Pressable>
  );

  const isFinalStepSubmitDisabled =
    submitting ||
    !formData.password.trim() ||
    !formData.confirmPassword.trim() ||
    formData.password.length < 6 ||
    formData.password !== formData.confirmPassword;

  return (
    <AuthLayout>
      <AuthHeader
        icon="medkit-outline"
        title="Doctor Registration"
        subtitle={`Step ${step} of ${TOTAL_STEPS} · ${stepLabel}`}
      />

      <AuthCard>
        {step === 1 ? (
          <>
            <AuthInput label="Full Name" value={formData.fullName} onChangeText={(value) => handleInputChange("fullName", value)} placeholder="Dr. John Doe" icon="person-outline" error={errors.fullName} />
            <AuthInput label="NIC Number (Optional)" value={formData.nic} onChangeText={(value) => handleInputChange("nic", value)} placeholder="199012345678 or 901234567V" icon="card-outline" error={errors.nic} />
            <AuthInput label="Contact Number" value={formData.contact} onChangeText={(value) => handleInputChange("contact", value)} placeholder="+94 77 123 4567" keyboardType="phone-pad" icon="call-outline" error={errors.contact} />
            <AuthInput label="Email Address" value={formData.email} onChangeText={(value) => handleInputChange("email", value)} placeholder="doctor@example.com" keyboardType="email-address" icon="mail-outline" error={errors.email} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AuthInput label="SLMC Registration Number" value={formData.slmc} onChangeText={(value) => handleInputChange("slmc", value)} placeholder="Enter SLMC Number" icon="shield-checkmark-outline" error={errors.slmc} />
            <AuthInput label="Qualification" value={formData.qualification} onChangeText={(value) => handleInputChange("qualification", value)} placeholder="MBBS, MD" error={errors.qualification} />
            <AuthInput label="Specialization" value={formData.specialization} onChangeText={(value) => handleInputChange("specialization", value)} placeholder="Cardiology" error={errors.specialization} />
            <AuthInput label="Years of Experience" value={formData.experience} onChangeText={(value) => handleInputChange("experience", value)} placeholder="5" keyboardType="numeric" error={errors.experience} />
            <AuthInput label="Current Workplace" value={formData.workplace} onChangeText={(value) => handleInputChange("workplace", value)} placeholder="General Hospital" icon="business-outline" error={errors.workplace} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            {renderDocumentCard("SLMC Certificate", documents.slmcCert, () => void pickDocument("slmcCert"))}
            {renderDocumentCard("Degree Certificate", documents.degreeCert, () => void pickDocument("degreeCert"))}
            {renderDocumentCard("ID Proof", documents.idProof, () => void pickDocument("idProof"))}
            {errors.documents ? <Text style={styles.errorText}>{errors.documents}</Text> : null}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <AuthInput
              label="Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange("password", value)}
              placeholder="Create a password"
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
            />
            <AuthInput
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange("confirmPassword", value)}
              placeholder="Confirm your password"
              secureTextEntry
              icon="shield-checkmark-outline"
              error={errors.confirmPassword}
            />
            <Text style={styles.helperText}>Use at least 6 characters.</Text>
          </>
        ) : null}

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View key={index} style={[styles.dot, index + 1 === step && styles.dotActive]} />
          ))}
        </View>
      </AuthCard>

      <View style={styles.footerActions}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (step === TOTAL_STEPS ? isFinalStepSubmitDisabled : submitting) &&
              styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.88}
          onPress={step === TOTAL_STEPS ? handleSubmit : handleNext}
          disabled={step === TOTAL_STEPS ? isFinalStepSubmitDisabled : submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {step === TOTAL_STEPS ? "Submit Registration" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (step > 1 ? setStep((prev) => prev - 1) : navigation.goBack())}
        >
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
    marginBottom: 14,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_COLORS.textPrimary,
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: AUTH_COLORS.textSecondary,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
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
    marginTop: 6,
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
  helperText: {
    marginTop: -6,
    marginBottom: 12,
    color: AUTH_COLORS.textSecondary,
    fontSize: 13,
    textAlign: "left",
  },
  footerLink: {
    marginTop: 18,
    textAlign: "center",
    color: AUTH_COLORS.primaryDark,
    fontWeight: "600",
  },
});
