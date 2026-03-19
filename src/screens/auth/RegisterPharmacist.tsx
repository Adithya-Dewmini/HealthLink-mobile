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

export default function RegisterPharmacist({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pharmacyId, setPharmacyId] = useState("");
  const [loading, setLoading] = useState(false);

  const { refreshAuth } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !phone || !pharmacyId) {
      Alert.alert("Error", "Please fill in all fields");
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
          pharmacyId,
          role: "pharmacist",
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
      Alert.alert(
        "Submitted",
        "Registration submitted. Admin approval may be required. Redirecting..."
      );
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Unable to connect to server");
      console.log("Register pharmacist error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pharmacist Registration</Text>
      <Text style={styles.subtitle}>Provide pharmacy details for admin approval.</Text>

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
        placeholder="Pharmacy ID"
        style={styles.input}
        value={pharmacyId}
        onChangeText={setPharmacyId}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register as Pharmacist</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.loginText}>Back to role selection</Text>
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
  loginText: {
    color: "#1976D2",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
