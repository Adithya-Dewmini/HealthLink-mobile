import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../utils/AuthContext";
import { api } from "../../api/client";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import { AUTH_COLORS } from "../../components/auth/authTheme";

const steps = ["Personal", "Medical", "Emergency"] as const;

export default function RegisterPatient({ navigation }: any) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [nic, setNic] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { refreshAuth } = useContext(AuthContext);
  const rootNavigation = navigation.getParent();

  const stepTitle = useMemo(() => steps[step], [step]);

  const validateStep = () => {
    if (step === 0) {
      return (
        fullName &&
        email &&
        password &&
        phone &&
        dob &&
        gender &&
        nic &&
        address &&
        city
      );
    }
    if (step === 1) {
      return bloodGroup && allergies !== undefined && conditions !== undefined;
    }
    return emergencyName && emergencyPhone;
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      setError("Please complete all fields for this step.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/register", {
        name: fullName,
        email,
        password,
        phone,
        dob,
        gender,
        nic,
        address,
        city,
        bloodGroup,
        allergies,
        conditions,
        emergencyName,
        emergencyPhone,
        role: "patient",
      });

      await AsyncStorage.setItem("token", response.data.token);
      await refreshAuth();

      rootNavigation?.navigate("AuthSuccess", {
        icon: "checkmark-circle",
        title: "Account created",
        subtitle: "Your HealthLink patient account is ready.",
        message: "You can now continue to your dashboard and start using the platform.",
        actionLabel: "Go to Dashboard",
        target: "PatientStack",
      });
    } catch (caughtError: any) {
      const message =
        typeof caughtError?.response?.data?.message === "string"
          ? caughtError.response.data.message
          : "Unable to register right now";
      setError(message);
      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!validateStep()) {
      setError("Please complete all fields for this step.");
      return;
    }
    setError("");
    if (step < 2) {
      setStep((prev) => (prev + 1) as 0 | 1 | 2);
    } else {
      void handleSubmit();
    }
  };

  const GenderButton = ({
    value,
    label,
  }: {
    value: "male" | "female" | "other";
    label: string;
  }) => (
    <TouchableOpacity
      onPress={() => setGender(value)}
      style={[styles.pill, gender === value && styles.pillActive]}
    >
      <Text style={[styles.pillText, gender === value && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <AuthLayout>
      <AuthHeader
        icon="person-add-outline"
        title="Patient Registration"
        subtitle={`Step ${step + 1} of 3 · ${stepTitle}`}
      />

      <AuthCard>
        {step === 0 ? (
          <>
            <AuthInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Jane Doe" icon="person-outline" />
            <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" icon="mail-outline" />
            <AuthInput label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry icon="lock-closed-outline" />
            <AuthInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+94 77 123 4567" keyboardType="phone-pad" icon="call-outline" />
            <AuthInput label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" icon="calendar-outline" />
            <Text style={styles.groupLabel}>Gender</Text>
            <View style={styles.row}>
              <GenderButton value="male" label="Male" />
              <GenderButton value="female" label="Female" />
              <GenderButton value="other" label="Other" />
            </View>
            <AuthInput label="NIC" value={nic} onChangeText={setNic} placeholder="NIC number" icon="card-outline" />
            <AuthInput label="Address" value={address} onChangeText={setAddress} placeholder="Street address" icon="location-outline" />
            <AuthInput label="City" value={city} onChangeText={setCity} placeholder="City" icon="business-outline" />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <AuthInput label="Blood Group" value={bloodGroup} onChangeText={setBloodGroup} placeholder="A+, O-, B+" />
            <AuthInput label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="List allergies if any" />
            <AuthInput label="Existing Conditions" value={conditions} onChangeText={setConditions} placeholder="Medical conditions" />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AuthInput label="Emergency Contact Name" value={emergencyName} onChangeText={setEmergencyName} placeholder="Contact name" icon="person-outline" />
            <AuthInput label="Emergency Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="+94 77 123 4567" keyboardType="phone-pad" icon="call-outline" />
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.progressRow}>
          {steps.map((_, index) => (
            <View key={index} style={[styles.dot, index === step && styles.dotActive]} />
          ))}
        </View>
      </AuthCard>

      <View style={styles.footerActions}>
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          activeOpacity={0.88}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{step === 2 ? "Submit" : "Next"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            step === 0 ? navigation.goBack() : setStep((prev) => (prev - 1) as 0 | 1 | 2)
          }
        >
          <Text style={styles.footerLink}>{step === 0 ? "Back to role selection" : "Back"}</Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_COLORS.textPrimary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  pillActive: {
    borderColor: AUTH_COLORS.accent,
    backgroundColor: "#E6F7FB",
  },
  pillText: {
    color: AUTH_COLORS.textSecondary,
    fontWeight: "600",
  },
  pillTextActive: {
    color: AUTH_COLORS.primaryDark,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
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
