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
import PrescriptionMedicineCard from "../../components/pharmacist/PrescriptionMedicineCard";

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
  requiredQuantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
  availableStock: number;
  selected: boolean;
  unitPrice: number;
  demandCount?: number;
  lowStockAlert?: boolean;
  substitutions?: PharmacyPrescription["items"][number]["substitutions"];
};

const getInitialItems = (prescription: PharmacyPrescription | null): SelectedMedicine[] =>
  (prescription?.items || []).map((item) => {
    const requiredQuantity = Number(item.requiredQuantity ?? item.remainingQuantity ?? 1);
    const dispensedQuantity = Number(item.dispensedQuantity ?? 0);
    const remainingQuantity = Math.max(
      0,
      Number(item.remainingQuantity ?? requiredQuantity - dispensedQuantity)
    );
    const availableStock = Number(item.availableStock ?? 0);
    const quantity = Math.max(1, Math.min(remainingQuantity || 1, availableStock || 1));

    return {
      id: Number(item.id),
      medicineId: item.medicineId,
      name: item.medicineName,
      dosage: [item.dosage, item.frequency].filter(Boolean).join(" • ") || "Dose unavailable",
      quantity,
      requiredQuantity,
      dispensedQuantity,
      remainingQuantity,
      availableStock,
      selected: availableStock > 0 && remainingQuantity > 0,
      unitPrice: Number(item.unitPrice ?? 0),
      demandCount: item.demandCount,
      lowStockAlert: item.lowStockAlert,
      substitutions: item.substitutions,
    };
  });

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
  const [dispenseResult, setDispenseResult] = useState<{
    isPartial?: boolean;
    remainingItems?: Array<{
      prescription_item_id: number;
      medicine_name: string;
      remaining_quantity: number;
    }>;
    dispensedItems?: Array<{
      prescription_item_id: number;
      medicine_name: string;
      quantity: number;
      remaining_quantity?: number;
    }>;
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
  const selectableItems = useMemo(
    () => selectedItems.filter((item) => item.availableStock > 0),
    [selectedItems]
  );
  const unavailableItemsCount = useMemo(
    () => selectedItems.filter((item) => item.availableStock <= 0).length,
    [selectedItems]
  );
  const hasPartialSelection = useMemo(
    () =>
      activeItems.length > 0 &&
      (activeItems.length < selectableItems.length ||
        activeItems.some((item) => item.quantity < item.remainingQuantity)),
    [activeItems, selectableItems.length]
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
        if (nextQty > Math.min(item.availableStock, item.remainingQuantity)) return item;
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

      const response = await dispense({
        prescriptionId: prescription!.prescription.id,
        selectedItems: activeItems.map((item) => ({
          prescription_item_id: item.id,
          quantity: item.quantity,
        })),
      });

      setDispenseResult({
        isPartial: Boolean(response.is_partial),
        remainingItems: response.remaining_items,
        dispensedItems: response.dispensed_items,
      });
      setDispensed(true);
      Alert.alert(
        response.is_partial ? "Partial Dispense Recorded" : "Dispensed",
        response.is_partial
          ? "The selected medicines were dispensed and the remaining items are still tracked."
          : "Prescription marked as fully dispensed."
      );
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Dispense Medicines</Text>
          <Text style={styles.headerSub}>Review stock, bill, and complete dispensing</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.flowCard}>
          <View style={styles.flowPill}>
            <Text style={styles.flowPillText}>Step 2 of 2</Text>
          </View>
          <Text style={styles.flowTitle}>Confirm dispense and billing</Text>
          <Text style={styles.flowText}>
            Finalize quantities, generate the sale if needed, and complete the dispense record.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <View>
              <Text style={styles.infoLabel}>Patient</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {patientName}
              </Text>
            </View>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>
                {activeItems.length} selected
              </Text>
            </View>
          </View>
          <Text style={styles.infoMeta} numberOfLines={1}>
            Doctor: {doctorName}
          </Text>
          <Text style={styles.infoMeta}>Prescription ID: {prescription?.prescription?.id ?? "-"}</Text>
        </View>

        <View style={styles.helperCard}>
          <Ionicons name="information-circle-outline" size={18} color={THEME.primary} />
          <View style={styles.helperCopy}>
            <Text style={styles.helperTitle}>
              {hasPartialSelection ? "Partial dispense selected" : "Full dispense review"}
            </Text>
            <Text style={styles.helperText}>
              {hasPartialSelection
                ? "Only the medicines you keep selected will be included in this dispense record and sale."
                : "All in-stock selected medicines will be included in this dispense record and sale."}
            </Text>
            {unavailableItemsCount > 0 ? (
              <Text style={styles.helperSubtext}>
                {unavailableItemsCount} medicine{unavailableItemsCount > 1 ? "s are" : " is"} currently out of stock and cannot be dispensed.
              </Text>
            ) : null}
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={18} color={THEME.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Selection</Text>
            <Text style={styles.sectionTitle}>Medicines to Dispense</Text>
          </View>
          <Text style={styles.sectionCount}>{selectedItems.length} items</Text>
        </View>

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
          const warningMessage = outOfStock
            ? null
            : item.selected && item.availableStock <= 2
              ? `Limited stock. Only ${item.availableStock} unit${item.availableStock > 1 ? "s are" : " is"} available.`
              : item.selected && item.availableStock === item.quantity
                ? "Using all remaining stock."
                : null;
          const footerPill = outOfStock
            ? { label: "Out of stock", tone: "warning" as const }
            : !item.selected
              ? { label: "Excluded from this dispense", tone: "neutral" as const }
              : null;

          return (
            <PrescriptionMedicineCard
              key={item.id}
              item={{
                medicineName: item.name,
                meta: item.dosage,
                currentStock: item.availableStock,
                requiredQuantity: item.requiredQuantity,
                dispensedQuantity: item.dispensedQuantity,
                remainingQuantity: item.remainingQuantity,
                lowStockAlert: item.lowStockAlert,
                demandCount: item.demandCount,
                substitutions: item.substitutions,
              }}
              interactive={{
                selected: item.selected,
                disabled: outOfStock,
                quantity: item.quantity,
                maxQuantity: Math.min(item.availableStock, Math.max(1, item.remainingQuantity)),
                unitPrice: item.unitPrice,
                onToggle: () => toggleSelection(item.id),
                onDecrease: () => adjustQuantity(item.id, -1),
                onIncrease: () => adjustQuantity(item.id, 1),
              }}
              warningMessage={warningMessage}
              footerPill={footerPill}
            />
          );
        })}

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Summary</Text>
              <Text style={styles.summaryTitle}>Dispense Summary</Text>
            </View>
            {billResult ? (
              <View style={styles.summaryPill}>
                <Text style={styles.summaryPillText}>Bill ready</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected Items</Text>
            <Text style={styles.summaryValue}>{activeItems.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bill Total</Text>
            <Text style={styles.summaryValue}>LKR {total.toFixed(2)}</Text>
          </View>
          {billResult && (
            <View style={styles.successPanel}>
              <View style={styles.successPanelHeader}>
                <Ionicons name="receipt-outline" size={18} color={THEME.primary} />
                <Text style={styles.successPanelTitle}>Sale generated successfully</Text>
              </View>
              <Text style={styles.successPanelText}>
                Sale #{billResult.sale_id} is ready with a total of LKR {billResult.total_amount.toFixed(2)}.
              </Text>
            </View>
          )}
          {dispensed && (
            <View style={styles.successPanel}>
              <View style={styles.successPanelHeader}>
                <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />
                <Text style={styles.successPanelTitle}>
                  {dispenseResult?.isPartial ? "Partial dispense recorded" : "Dispense completed"}
                </Text>
              </View>
              <Text style={styles.successPanelText}>
                {dispenseResult?.isPartial
                  ? "The remaining medicines stay open for a later dispense."
                  : `${activeItems.length} medicine${activeItems.length > 1 ? "s were" : " was"} marked as dispensed for this prescription.`}
              </Text>
              {dispenseResult?.remainingItems?.length ? (
                <View style={styles.receiptRows}>
                  {dispenseResult.remainingItems.map((item) => (
                    <Text key={item.prescription_item_id} style={styles.receiptRowText} numberOfLines={1}>
                      {item.medicine_name}: {item.remaining_quantity} remaining
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.secondaryAction, isBusy && styles.disabledAction]}
          onPress={handleGenerateBill}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Generate sale bill"
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
          accessibilityRole="button"
          accessibilityLabel={dispensed ? "Prescription already dispensed" : "Complete dispensing"}
        >
          {dispenseLoading ? (
            <ActivityIndicator size="small" color={THEME.white} />
          ) : (
            <Text style={styles.primaryActionText}>
              {dispensed ? "Already Dispensed" : "Complete Dispense"}
            </Text>
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
  flowCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  flowPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E9F8F1",
  },
  flowPillText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  flowTitle: {
    marginTop: 12,
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  flowText: {
    marginTop: 6,
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
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
  helperCard: {
    backgroundColor: "#F1FBF8",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CDEFE3",
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  helperCopy: { flex: 1 },
  helperTitle: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  helperText: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  helperSubtext: {
    color: THEME.warningText,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionEyebrow: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  sectionTitle: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionCount: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EEF2F7",
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
  summaryCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 6,
  },
  summaryTitle: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  summaryPill: {
    backgroundColor: "#E9F8F1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryPillText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "800",
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
  successPanel: {
    marginTop: 12,
    backgroundColor: "#F1FBF8",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CDEFE3",
    gap: 6,
  },
  successPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successPanelTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  successPanelText: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  receiptRows: {
    marginTop: 8,
    gap: 4,
  },
  receiptRowText: {
    color: THEME.warningText,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  bottomActions: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  secondaryAction: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
