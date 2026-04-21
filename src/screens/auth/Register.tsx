import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Register({ navigation }: any) {
  const roles = [
    { key: "patient", label: "Patient", icon: "person-circle-outline" as const },
    { key: "doctor", label: "Doctor", icon: "medkit-outline" as const },
    { key: "pharmacist", label: "Pharmacist", icon: "flask-outline" as const },
    { key: "receptionist", label: "Receptionist", icon: "people-outline" as const },
    { key: "medical_center_admin", label: "Medical Center Admin", icon: "business-outline" as const },
  ];

  const goToForm = (role: string) => {
    switch (role) {
      case "patient":
        navigation.navigate("RegisterPatient");
        break;
      case "doctor":
        navigation.navigate("RegisterDoctor");
        break;
      case "pharmacist":
        navigation.navigate("RegisterPharmacist");
        break;
      case "receptionist":
        navigation.navigate("RegisterReceptionist");
        break;
      case "medical_center_admin":
        navigation.navigate("RegisterMedicalCenterAdmin");
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your role</Text>
      <Text style={styles.subtitle}>
        Pick a role to continue.
      </Text>

      {roles.map((role) => (
        <TouchableOpacity
          key={role.key}
          style={styles.card}
          onPress={() => goToForm(role.key)}
        >
          <View style={styles.cardLeft}>
            <Ionicons name={role.icon} size={26} color="#1976D2" />
            <Text style={styles.cardText}>{role.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.loginText}>Already registered? Log in</Text>
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
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    color: "#1976D2",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e3e3e3",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  loginText: {
    color: "#1976D2",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
