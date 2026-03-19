import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "../../utils/AuthContext";
import { apiFetch } from "../../config/api";

const steps = ["Personal", "Medical", "Emergency"];

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

  const { refreshAuth } = useContext(AuthContext);

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
    if (step === 2) {
      return emergencyName && emergencyPhone;
    }
    return false;
  };

  const handleNext = () => {
    if (!validateStep()) {
      Alert.alert("Missing info", "Please complete all fields for this step.");
      return;
    }
    if (step < 2) {
      setStep((prev) => (prev + 1) as 0 | 1 | 2);
    } else {
      handleRegister();
    }
  };

  const handleRegister = async () => {
    if (!validateStep()) {
      Alert.alert("Missing info", "Please complete all fields for this step.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        Alert.alert("Registration Failed", data.message || "Unable to register");
        return;
      }

      await AsyncStorage.setItem("token", data.token);

      const decoded: any = jwtDecode(data.token);
      console.log("Registered as:", decoded.role);

      await refreshAuth();

      setLoading(false);
      Alert.alert("Success", "Account created! Redirecting to your dashboard.");
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Unable to connect to server");
      console.log("Register patient error:", error);
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
      style={[
        styles.pill,
        gender === value && styles.pillActive,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          gender === value && styles.pillTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <Text style={styles.label}>Personal info</Text>
          <TextInput
            placeholder="Full Name"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            placeholder="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            placeholder="Password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            placeholder="Phone"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            placeholder="Date of Birth (YYYY-MM-DD)"
            style={styles.input}
            value={dob}
            onChangeText={setDob}
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.row}>
            <GenderButton value="male" label="Male" />
            <GenderButton value="female" label="Female" />
            <GenderButton value="other" label="Other" />
          </View>

          <TextInput
            placeholder="NIC"
            style={styles.input}
            value={nic}
            onChangeText={setNic}
          />

          <TextInput
            placeholder="Address"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
          />

          <TextInput
            placeholder="City"
            style={styles.input}
            value={city}
            onChangeText={setCity}
          />
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <Text style={styles.label}>Medical info</Text>
          <TextInput
            placeholder="Blood Group (e.g., A+, O-)"
            style={styles.input}
            value={bloodGroup}
            onChangeText={setBloodGroup}
          />

          <TextInput
            placeholder="Allergies"
            style={styles.input}
            value={allergies}
            onChangeText={setAllergies}
          />

          <TextInput
            placeholder="Existing conditions"
            style={styles.input}
            value={conditions}
            onChangeText={setConditions}
          />
        </>
      );
    }

    return (
      <>
        <Text style={styles.label}>Emergency contact</Text>
        <TextInput
          placeholder="Contact Name"
          style={styles.input}
          value={emergencyName}
          onChangeText={setEmergencyName}
        />

        <TextInput
          placeholder="Contact Phone"
          style={styles.input}
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          keyboardType="phone-pad"
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient Registration</Text>
      <Text style={styles.subtitle}>
        Step {step + 1} of 3 — {steps[step]}
      </Text>

      {renderStep()}

      <View style={styles.progressRow}>
        {steps.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              idx === step && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleNext}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {step === 2 ? "Submit" : "Next"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          step === 0 ? navigation.goBack() : setStep((prev) => (prev - 1) as 0 | 1 | 2)
        }
      >
        <Text style={styles.loginText}>
          {step === 0 ? "Back to role selection" : "Back"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#F5F7FA",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    color: "#1976D2",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d9d9d9",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#d0d0d0",
  },
  dotActive: {
    backgroundColor: "#1976D2",
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    backgroundColor: "white",
    alignItems: "center",
  },
  pillActive: {
    borderColor: "#1976D2",
    backgroundColor: "#E3F2FD",
  },
  pillText: {
    color: "#555",
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#1976D2",
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#1976D2",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  loginText: {
    color: "#1976D2",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
