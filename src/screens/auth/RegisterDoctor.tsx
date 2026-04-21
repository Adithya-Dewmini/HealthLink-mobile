import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "../../utils/AuthContext";
import { apiFetch } from "../../config/api";

export default function RegisterDoctor({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [slmcNumber, setSlmcNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSpecializationPicker, setShowSpecializationPicker] = useState(false);

  const SPECIALIZATIONS = [
    "General Physician",
    "Cardiologist",
    "Dermatologist",
    "Pediatrician",
    "Orthopedic Surgeon",
    "Neurologist",
    "ENT Specialist",
    "Psychiatrist",
    "Gynecologist",
    "Oncologist",
    "Endocrinologist",
    "Gastroenterologist",
    "Nephrologist",
    "Pulmonologist",
    "Rheumatologist",
    "Urologist",
    "Ophthalmologist",
    "Dentist",
    "Radiologist",
    "Anesthesiologist",
    "Emergency Physician",
    "Family Medicine",
  ];

  const { refreshAuth } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !phone || !slmcNumber || !specialization) {
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
          slmcNumber,
          specialization,
          role: "doctor",
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
      console.log("Register doctor error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Doctor Registration</Text>
      <Text style={styles.subtitle}>Provide SLMC details for admin approval.</Text>

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
        placeholder="SLMC Number"
        style={styles.input}
        value={slmcNumber}
        onChangeText={setSlmcNumber}
      />

      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowSpecializationPicker(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownText, !specialization && styles.dropdownPlaceholder]}>
          {specialization || "Select Specialization"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register as Doctor</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.loginText}>Back to role selection</Text>
      </TouchableOpacity>

      <Modal
        visible={showSpecializationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpecializationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Specialization</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {SPECIALIZATIONS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.modalItem}
                  onPress={() => {
                    setSpecialization(item);
                    setShowSpecializationPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowSpecializationPicker(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  dropdown: {
    width: "100%",
    height: 50,
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    justifyContent: "center",
  },
  dropdownText: { fontSize: 15, color: "#1A1C1E" },
  dropdownPlaceholder: { color: "#999" },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemText: { fontSize: 14, color: "#1A1C1E" },
  modalClose: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseText: { color: "#1976D2", fontWeight: "700" },
});
