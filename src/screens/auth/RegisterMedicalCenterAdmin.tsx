import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "../../utils/AuthContext";
import { apiFetch } from "../../config/api";

export default function RegisterMedicalCenterAdmin({ navigation }: any) {
  const { refreshAuth } = useContext(AuthContext);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [medicalCenterName, setMedicalCenterName] = useState("");
  const [medicalCenterAddress, setMedicalCenterAddress] = useState("");
  const [medicalCenterPhone, setMedicalCenterPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !medicalCenterName) {
      Alert.alert("Error", "Please fill in the required fields");
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
          role: "medical_center_admin",
          medicalCenterName,
          medicalCenterAddress,
          medicalCenterPhone,
          medicalCenterEmail: email,
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
      console.log("Registered as:", decoded.role, decoded.medicalCenterId);
      await refreshAuth();

      setLoading(false);
      Alert.alert("Success", "Medical center admin created successfully.");
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Unable to connect to server");
      console.log("Register medical center admin error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medical Center Admin</Text>
      <Text style={styles.subtitle}>Create a clinic-level admin and center workspace.</Text>

      <TextInput placeholder="Full Name" style={styles.input} value={fullName} onChangeText={setFullName} />
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
        placeholder="Medical Center Name"
        style={styles.input}
        value={medicalCenterName}
        onChangeText={setMedicalCenterName}
      />
      <TextInput
        placeholder="Medical Center Address"
        style={styles.input}
        value={medicalCenterAddress}
        onChangeText={setMedicalCenterAddress}
      />
      <TextInput
        placeholder="Medical Center Phone"
        style={styles.input}
        value={medicalCenterPhone}
        onChangeText={setMedicalCenterPhone}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Medical Center</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back to role selection</Text>
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
  backText: {
    color: "#1976D2",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
