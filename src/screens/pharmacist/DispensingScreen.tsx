import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { apiFetch } from "../../config/api";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2BB673",
  secondary: "#4A90E2",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textMuted: "#6B7280",
  danger: "#EF4444",
  border: "#E0E6ED",
  cardRadius: 16,
};

type MedicineItem = {
  id: string | number;
  name: string;
  dose: string;
  qty: number;
  availableStock?: number;
  available: boolean;
  selected: boolean;
  price: number;
};

const toDoseText = (med: any) => {
  const parts: string[] = [];
  if (med.dosage) parts.push(String(med.dosage));
  if (med.frequency) parts.push(String(med.frequency));
  if (med.duration) parts.push(String(med.duration));
  if (parts.length > 0) return parts.join(" - ");
  if (med.dose) return String(med.dose);
  return "-";
};

export default function DispensingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const prescription = route.params?.prescription || {};

  const initialMedicines: MedicineItem[] = useMemo(() => {
    const meds = Array.isArray(prescription.medicines)
      ? prescription.medicines
      : Array.isArray(prescription.items)
        ? prescription.items
        : [];

    if (meds.length === 0) {
      return [
        {
          id: 1,
          name: "Amoxicillin 250mg",
          dose: "1-1-1 - Before Meal",
          qty: 1,
          availableStock: 15,
          available: true,
          selected: true,
          price: 450,
        },
        {
          id: 2,
          name: "Paracetamol 500mg",
          dose: "1-0-1 - After Meal",
          qty: 1,
          availableStock: 10,
          available: true,
          selected: true,
          price: 150,
        },
        {
          id: 3,
          name: "Cetirizine 10mg",
          dose: "0-0-1 - Night",
          qty: 1,
          availableStock: 0,
          available: false,
          selected: false,
          price: 100,
        },
      ];
    }

    return meds.map((med: any, index: number) => {
      const quantity = Number(med.availableStock ?? med.quantity ?? 0);
      const available = med.available !== undefined ? !!med.available : quantity > 0;
      return {
        id: med.id ?? index,
        name: med.medicine_name || med.name || "Medicine",
        dose: toDoseText(med),
        qty: Number(med.qty ?? 1),
        availableStock: Number.isNaN(quantity) ? undefined : quantity,
        available,
        selected: available,
        price: Number(med.price ?? 0),
      };
    });
  }, [prescription]);

  const [medicines, setMedicines] = useState<MedicineItem[]>(initialMedicines);

  const toggleItem = (id: string | number) => {
    setMedicines((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (!item.available) {
          Alert.alert("Not available", `${item.name} is not available.`);
          return item;
        }
        return { ...item, selected: !item.selected };
      })
    );
  };

  const updateQty = (id: string | number, delta: number) => {
    setMedicines((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextQty = Math.max(1, item.qty + delta);
        return { ...item, qty: nextQty };
      })
    );
  };

  const selectedItems = medicines.filter((item) => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal;

  const handleDispense = async () => {
    if (selectedItems.length === 0) {
      Alert.alert("No items", "Select at least one item to dispense.");
      return;
    }

    for (const item of selectedItems) {
      if (item.availableStock !== undefined && item.qty > item.availableStock) {
        Alert.alert("Not enough stock", `${item.name} not enough stock`);
        return;
      }
    }

    try {
      const res = await apiFetch("/api/pharmacy/dispense", {
        method: "POST",
        body: JSON.stringify({
          prescriptionId: prescription.id || prescription.prescriptionId,
          items: selectedItems.map((item) => ({
            id: item.id,
            qty: item.qty,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error dispensing");
      }

      Alert.alert("Dispensed successfully");
    } catch (err: any) {
      Alert.alert(err?.message || "Error dispensing");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Dispense Prescription</Text>
          <Text style={styles.headerSub}>Review and complete dispensing</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.patientName}>{prescription.patient?.name || prescription.patient || "Rajesh Kumar"}</Text>
              <Text style={styles.patientSub}>
                {`${prescription.patient?.age ?? prescription.patient_age ?? 45} Yrs - ${prescription.patient?.gender || prescription.patient_gender || "Male"}`}
              </Text>
            </View>
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenText}>Token #{prescription.token || "08"}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.doctorName}>{prescription.doctor || prescription.doctor_name || "Dr. Ananya Sharma"}</Text>
              <Text style={styles.doctorSpec}>{`${prescription.specialty || "Neurologist"} - ${prescription.date || "12 Apr 2026"}`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prescribed Medicines</Text>
          <Text style={styles.itemCount}>{medicines.length} Items</Text>
        </View>

        {medicines.map((med) => (
          <View key={med.id} style={[styles.medItem, !med.available && styles.unavailableItem]}>
            <View style={styles.medTopRow}>
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleItem(med.id)}>
                <Ionicons
                  name={med.selected ? "checkbox" : "square-outline"}
                  size={24}
                  color={med.selected ? THEME.primary : THEME.textMuted}
                />
              </TouchableOpacity>
              <View style={styles.medMainInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDose}>{med.dose}</Text>
              </View>
              <Text style={styles.priceText}>LKR {med.price}</Text>
            </View>

            <View style={styles.medActionRow}>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => updateQty(med.id, -1)}>
                  <Ionicons name="remove" size={18} color={THEME.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{med.qty}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => updateQty(med.id, 1)}>
                  <Ionicons name="add" size={18} color={THEME.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleGroup}>
                <TouchableOpacity style={[styles.toggleBtn, med.available && styles.activeToggle]}>
                  <Text style={[styles.toggleText, med.available && styles.activeToggleText]}>Available</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, !med.available && styles.dangerToggle]}>
                  <Text style={[styles.toggleText, !med.available && styles.activeToggleText]}>N/A</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>LKR {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>LKR 0.00</Text>
          </View>
          <View style={[styles.divider, { marginVertical: 12 }]} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>LKR {total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Generate Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleDispense}>
          <Text style={styles.primaryBtnText}>Mark as Dispensed</Text>
          <Ionicons name="checkmark-done" size={20} color={THEME.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: THEME.white },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textMuted },

  scrollContent: { padding: 16, paddingBottom: 140 },
  infoCard: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  patientSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  tokenBadge: { backgroundColor: "#E0F5EB", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  tokenText: { color: THEME.primary, fontWeight: "800", fontSize: 12 },
  divider: { height: 1, backgroundColor: THEME.background, marginVertical: 15 },
  doctorName: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  doctorSpec: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
    alignItems: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: THEME.textPrimary },
  itemCount: { fontSize: 12, fontWeight: "700", color: THEME.primary },

  medItem: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.white,
  },
  unavailableItem: { opacity: 0.6, borderColor: "#FEE2E2" },
  medTopRow: { flexDirection: "row", alignItems: "flex-start" },
  checkbox: { marginRight: 12, marginTop: 2 },
  medMainInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  medDose: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  priceText: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },

  medActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: THEME.background, borderRadius: 10, padding: 4 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValue: { paddingHorizontal: 15, fontSize: 15, fontWeight: "800", color: THEME.textPrimary },

  toggleGroup: { flexDirection: "row", backgroundColor: THEME.background, borderRadius: 10, padding: 3 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  activeToggle: { backgroundColor: THEME.primary },
  dangerToggle: { backgroundColor: THEME.danger },
  toggleText: { fontSize: 11, fontWeight: "700", color: THEME.textMuted },
  activeToggleText: { color: THEME.white },

  summaryCard: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, padding: 16, marginTop: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: THEME.textMuted },
  summaryValue: { fontSize: 14, fontWeight: "700", color: THEME.textPrimary },
  totalLabel: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  totalValue: { fontSize: 18, fontWeight: "900", color: THEME.primary },

  footer: {
    position: "absolute",
    bottom: 0,
    width,
    padding: 16,
    backgroundColor: THEME.white,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  primaryBtn: {
    backgroundColor: THEME.primary,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  primaryBtnText: { color: THEME.white, fontWeight: "800", fontSize: 16 },
  outlineBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  outlineBtnText: { color: THEME.textPrimary, fontWeight: "700", fontSize: 15 },
});
