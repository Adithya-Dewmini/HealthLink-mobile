import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  createSale,
  dispense,
  type PharmacyPrescription,
} from "../../services/pharmacyApi";

const THEME = {
  primary: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#122033",
  textSecondary: "#64748B",
  danger: "#EF4444",
  border: "#E2E8F0",
  warningBg: "#FFF7ED",
  warningText: "#C2410C",
};

type SelectedMedicine = {
  id: number;
  medicineId: number | null;
  name: string;
  dosage: string;
  quantity: number;
  availableStock: number;
  selected: boolean;
  unitPrice: number;
};

const getInitialItems = (prescription: PharmacyPrescription | null): SelectedMedicine[] =>
  (prescription?.items || []).map((item) => ({
    id: Number(item.id),
    medicineId: item.medicineId,
    name: item.medicineName,
    dosage: [item.dosage, item.frequency].filter(Boolean).join(" • ") || "Dose unavailable",
    quantity: 1,
    availableStock: Number(item.availableStock ?? 0),
    selected: Number(item.availableStock ?? 0) > 0,
    unitPrice: Number(item.unitPrice ?? 0),
  }));

export default function DispenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const prescription: PharmacyPrescription | null = route.params?.prescription ?? null;

  const [selectedItems, setSelectedItems] = useState<SelectedMedicine[]>(() =>
    getInitialItems(prescription)
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [dispenseLoading, setDispenseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billResult, setBillResult] = useState<{
    sale_id: number | string;
    total_amount: number;
  } | null>(null);
  const [dispensed, setDispensed] = useState(false);

  const patientName =
    prescription?.prescription?.patientName || `Prescription #${prescription?.prescription?.id ?? "-"}`;
  const doctorName = prescription?.prescription?.doctorName || "Doctor details unavailable";
  const isBusy = billingLoading || dispenseLoading;

  const activeItems = useMemo(
    () => selectedItems.filter((item) => item.selected),
    [selectedItems]
  );
  const total = useMemo(
    () => activeItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [activeItems]
  );

  const toggleSelection = (id: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.availableStock <= 0) return item;
        return { ...item, selected: !item.selected };
      })
    );
  };

  const adjustQuantity = (id: number, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextQty = Math.max(1, item.quantity + delta);
        if (nextQty > item.availableStock) return item;
        return { ...item, quantity: nextQty };
      })
    );
  };

  const validateSelection = () => {
    if (!prescription?.prescription?.id) {
      throw new Error("Missing prescription context");
    }
    if (!activeItems.length) {
      throw new Error("Select at least one medicine");
    }
    const invalid = activeItems.find(
      (item) => item.availableStock <= 0 || item.quantity > item.availableStock
    );
    if (invalid) {
      throw new Error(`Stock not available for ${invalid.name}`);
    }
  };

  const handleGenerateBill = async () => {
    try {
      validateSelection();
      setBillingLoading(true);
      setError(null);

      const response = await createSale({
        prescriptionId: prescription!.prescription.id,
        items: activeItems.map((item) => ({
          prescription_item_id: item.id,
          medicine_id: item.medicineId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });

      setBillResult({
        sale_id: response.sale_id,
        total_amount: response.total_amount,
      });
      Alert.alert("Bill Generated", `Sale #${response.sale_id} created successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate bill";
      setError(message);
      Alert.alert("Billing Failed", message);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleDispense = async () => {
    try {
      validateSelection();
      setDispenseLoading(true);
      setError(null);

      await dispense({
        prescriptionId: prescription!.prescription.id,
        selectedItems: activeItems.map((item) => ({
          prescription_item_id: item.id,
          quantity: item.quantity,
        })),
      });

      setDispensed(true);
      Alert.alert("Dispensed", "Prescription marked as dispensed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark as dispensed";
      setError(message);
      Alert.alert("Dispense Failed", message);
    } finally {
      setDispenseLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Dispense Medicines</Text>
          <Text style={styles.headerSub}>Review stock, bill, and complete dispensing</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <View>
              <Text style={styles.infoLabel}>Patient</Text>
              <Text style={styles.infoValue}>{patientName}</Text>
            </View>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>
                {activeItems.length} selected
              </Text>
            </View>
          </View>
          <Text style={styles.infoMeta}>Doctor: {doctorName}</Text>
          <Text style={styles.infoMeta}>Prescription ID: {prescription?.prescription?.id ?? "-"}</Text>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color={THEME.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {selectedItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={22} color={THEME.textSecondary} />
            <Text style={styles.emptyTitle}>No medicines available</Text>
            <Text style={styles.emptyText}>
              This prescription does not contain any mapped medicine items yet.
            </Text>
          </View>
        ) : selectedItems.map((item) => {
          const outOfStock = item.availableStock <= 0;
          const selectedTooHigh = item.quantity > item.availableStock && item.selected;

          return (
            <View
              key={item.id}
              style={[
                styles.medicineCard,
                (outOfStock || selectedTooHigh) && styles.medicineCardAlert,
              ]}
            >
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  style={styles.checkboxWrap}
                  onPress={() => toggleSelection(item.id)}
                  disabled={outOfStock}
                >
                  <Ionicons
                    name={item.selected ? "checkbox" : "square-outline"}
                    size={24}
                    color={item.selected ? THEME.primary : THEME.textSecondary}
                  />
                </TouchableOpacity>
                <View style={styles.medicineMain}>
                  <Text style={styles.medicineName}>{item.name}</Text>
                  <Text style={styles.medicineDose}>{item.dosage}</Text>
                </View>
                <Text style={styles.priceText}>LKR {item.unitPrice.toFixed(2)}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.stockSection}>
                  <Text style={styles.stockLabel}>Available Stock</Text>
                  <Text style={[styles.stockValue, outOfStock && styles.stockValueDanger]}>
                    {item.availableStock}
                  </Text>
                </View>

                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      (!item.selected || item.quantity <= 1) && styles.qtyBtnDisabled,
                    ]}
                    onPress={() => adjustQuantity(item.id, -1)}
                    disabled={!item.selected || item.quantity <= 1}
                  >
                    <Ionicons name="remove" size={16} color={THEME.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      (!item.selected || item.quantity >= item.availableStock) &&
                        styles.qtyBtnDisabled,
                    ]}
                    onPress={() => adjustQuantity(item.id, 1)}
                    disabled={!item.selected || item.quantity >= item.availableStock}
                  >
                    <Ionicons name="add" size={16} color={THEME.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {outOfStock && (
                <View style={styles.warningPill}>
                  <Text style={styles.warningText}>Out of stock</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected Items</Text>
            <Text style={styles.summaryValue}>{activeItems.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bill Total</Text>
            <Text style={styles.summaryValue}>LKR {total.toFixed(2)}</Text>
          </View>
          {billResult && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sale ID</Text>
              <Text style={styles.summaryValue}>#{billResult.sale_id}</Text>
            </View>
          )}
          {dispensed && (
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />
              <Text style={styles.successText}>Prescription dispensed successfully</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.secondaryAction, isBusy && styles.disabledAction]}
          onPress={handleGenerateBill}
          disabled={isBusy}
        >
          {billingLoading ? (
            <ActivityIndicator size="small" color={THEME.primary} />
          ) : (
            <Text style={styles.secondaryActionText}>Generate Bill</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryAction, (isBusy || dispensed) && styles.disabledAction]}
          onPress={handleDispense}
          disabled={isBusy || dispensed}
        >
          {dispenseLoading ? (
            <ActivityIndicator size="small" color={THEME.white} />
          ) : (
            <Text style={styles.primaryActionText}>Mark as Dispensed</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: {
    color: THEME.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  headerSub: {
    color: THEME.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 14,
  },
  infoCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  infoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 6,
  },
  infoLabel: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  infoValue: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoMeta: {
    color: THEME.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  infoPill: {
    backgroundColor: "#E9F8F1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoPillText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  errorText: {
    flex: 1,
    color: THEME.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  medicineCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: THEME.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  medicineCardAlert: {
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFFDF8",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkboxWrap: {
    paddingTop: 2,
  },
  medicineMain: {
    flex: 1,
  },
  medicineName: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  medicineDose: {
    color: THEME.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  priceText: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  cardFooter: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockSection: {
    gap: 4,
  },
  stockLabel: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  stockValue: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  stockValueDanger: {
    color: THEME.danger,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.45,
  },
  qtyText: {
    minWidth: 18,
    textAlign: "center",
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  warningPill: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: THEME.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  warningText: {
    color: THEME.warningText,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    color: THEME.textSecondary,
    fontSize: 13,
  },
  summaryValue: {
    color: THEME.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  successBadge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E9F8F1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  successText: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  bottomActions: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    flexDirection: "row",
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: THEME.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryAction: {
    flex: 1.2,
    height: 54,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledAction: {
    opacity: 0.6,
  },
});
