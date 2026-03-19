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

export default function AddMedicine() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 28 }}
        bounces={false}
      >
        <Text style={styles.heading}>Add Medicine</Text>
        <Text style={styles.subheading}>Capture stock details for a new item</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Medicine details</Text>
            <View style={styles.badge}>
              <Ionicons name="cube-outline" size={14} color="#1976D2" />
              <Text style={styles.badgeText}>New stock</Text>
            </View>
          </View>

          <LabeledInput label="Medicine name" value={name} onChangeText={setName} placeholder="e.g. Paracetamol 500mg" />
          <LabeledInput label="Category" value={category} onChangeText={setCategory} placeholder="Analgesic" />
          <LabeledInput label="SKU / Code" value={sku} onChangeText={setSku} placeholder="MED-201" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <LabeledInput label="Available quantity" value={qty} onChangeText={setQty} placeholder="e.g. 120" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <LabeledInput label="Expiry date" value={expiry} onChangeText={setExpiry} placeholder="YYYY-MM-DD" />
            </View>
          </View>

          <LabeledInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Storage, batch, supplier info"
            multiline
          />

          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Save medicine</Text>
          </TouchableOpacity>
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
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && { height: 90, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
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
  row: {
    flexDirection: "row",
    gap: 12,
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
});
