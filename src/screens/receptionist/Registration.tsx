import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const samplePatients = [
  { id: "PT-201", name: "Amaya Perera", phone: "+94 71 123 4567" },
  { id: "PT-202", name: "Ruwan Jayasinghe", phone: "+94 77 444 8899" },
  { id: "PT-203", name: "Dilani Senanayake", phone: "+94 70 555 1122" },
];

export default function Registration() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");

  const filtered = samplePatients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }} bounces={false}>
        <Text style={styles.heading}>Patient Registration</Text>
        <Text style={styles.subheading}>Add new patients or update existing records</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Add new patient</Text>
            <View style={styles.badge}>
              <Ionicons name="person-add-outline" size={14} color="#1976D2" />
              <Text style={styles.badgeText}>New entry</Text>
            </View>
          </View>

          <LabeledInput label="Full name" value={name} onChangeText={setName} placeholder="e.g. Amaya Perera" />
          <LabeledInput label="Phone" value={phone} onChangeText={setPhone} placeholder="+94 7X XXX XXXX" keyboardType="phone-pad" />
          <LabeledInput label="Email" value={email} onChangeText={setEmail} placeholder="name@email.com" keyboardType="email-address" />
          <LabeledInput label="City" value={city} onChangeText={setCity} placeholder="Colombo" />

          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Save patient</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Update patient info</Text>
            <View style={styles.badge}>
              <Ionicons name="search-outline" size={14} color="#1976D2" />
              <Text style={styles.badgeText}>Lookup</Text>
            </View>
          </View>

          <LabeledInput
            label="Search by name or ID"
            value={search}
            onChangeText={setSearch}
            placeholder="Start typing to filter"
          />

          {filtered.map((patient) => (
            <View key={patient.id} style={styles.patientRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientMeta}>{patient.id} • {patient.phone}</Text>
              </View>
              <TouchableOpacity style={styles.editBtn}>
                <Ionicons name="create-outline" size={16} color="#1976D2" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 0,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  subheading: {
    color: "#5A6676",
    marginBottom: 14,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#1976D2",
    fontWeight: "700",
  },
  label: {
    fontWeight: "700",
    color: "#0F1E2E",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E4E9F2",
    color: "#0F1E2E",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#1976D2",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  patientRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  patientName: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  patientMeta: {
    color: "#5A6676",
    marginTop: 3,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EAF4FF",
    borderWidth: 1,
    borderColor: "#1976D2",
  },
  editText: {
    color: "#1976D2",
    fontWeight: "700",
  },
});
