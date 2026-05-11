import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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
  getPrescriptionById,
  type PharmacyPrescriptionDetails,
} from "../../services/pharmacyApi";
import PrescriptionMedicineCard from "../../components/pharmacist/PrescriptionMedicineCard";
import { mapPrescriptionDetailsToPreview } from "../../utils/pharmacyPrescription";

const THEME = {
  primary: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#122033",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  danger: "#EF4444",
  dangerTint: "#FEF2F2",
  successTint: "#E9F8F1",
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

export default function PrescriptionDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const prescriptionId = route.params?.prescriptionId;

  const [data, setData] = useState<PharmacyPrescriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadPrescription = useCallback(async (showSpinner = true) => {
    const normalizedPrescriptionId = String(prescriptionId ?? "").trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!normalizedPrescriptionId) {
      setData(null);
      setError("Invalid prescription ID");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!prescriptionId) {
      setData(null);
      setError("Missing prescription ID");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const response = await getPrescriptionById(normalizedPrescriptionId);
      if (requestId !== requestIdRef.current) return;
      setData(response);
    } catch (fetchError: any) {
      if (requestId !== requestIdRef.current) return;
      setData(null);
      setError(fetchError?.message || "Failed to load prescription");
    } finally {
      if (requestId !== requestIdRef.current) return;
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    loadPrescription();
  }, [loadPrescription]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrescription(false);
  }, [loadPrescription]);

  const hasInsufficientStock = useMemo(
    () =>
      (data?.items || []).some(
        (item) => item.currentStock < (item.remainingQuantity ?? item.requiredQuantity)
      ),
    [data]
  );
  const alreadyDispensed = Boolean(data?.prescription?.dispensedAt);
  const hasDispensableRemainder = useMemo(
    () =>
      (data?.items || []).some(
        (item) => (item.remainingQuantity ?? item.requiredQuantity) > 0 && item.currentStock > 0
      ),
    [data]
  );
  const canContinueToDispense = hasDispensableRemainder && !alreadyDispensed;

  const handleContinueToDispense = () => {
    if (!data) {
      Alert.alert("Prescription unavailable", "Reload the prescription details and try again.");
      return;
    }
    if (alreadyDispensed) {
      Alert.alert("Already dispensed", "This prescription has already been dispensed.");
      return;
    }
    if (!hasDispensableRemainder) {
      Alert.alert("No dispensable stock", "None of the remaining medicines are available in this pharmacy.");
      return;
    }

    navigation.navigate("PharmacyDispense", {
      prescription: mapPrescriptionDetailsToPreview(data),
    });
  };

  const prescription = data?.prescription;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Prescription Details</Text>
          <Text style={styles.headerSub}>Review stock before dispensing</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onRefresh}
          disabled={loading || refreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh prescription details"
        >
          <Ionicons name="refresh-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.centerText}>Loading prescription...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color={THEME.danger} />
          <Text style={styles.errorTitle}>Unable to load prescription</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPrescription()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />
          }
        >
          <View style={styles.flowCard}>
            <View style={styles.flowPill}>
              <Text style={styles.flowPillText}>Step 1 of 2</Text>
            </View>
            <Text style={styles.flowTitle}>Review prescription and stock</Text>
            <Text style={styles.flowText}>
              Confirm the patient, check medicine availability, and continue to dispensing.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Patient</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {prescription?.patientName || `Prescription #${prescription?.id ?? "-"}`}
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Doctor</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {prescription?.doctorName || "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Verification</Text>
              <Text style={styles.infoMeta} numberOfLines={1}>
                {alreadyDispensed ? "Already dispensed" : "QR verified"}
              </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Issued</Text>
                <Text style={styles.infoMeta} numberOfLines={1}>
                  {formatDate(prescription?.issuedAt)}
                </Text>
              </View>
            </View>
          </View>

          {alreadyDispensed && (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color={THEME.primary} />
              <Text style={styles.successCardText}>
                This prescription has already been dispensed.
              </Text>
            </View>
          )}

          {hasInsufficientStock && (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={18} color={THEME.danger} />
              <Text style={styles.warningText}>
                One or more medicines do not have enough stock. You can continue with available medicines and leave the remainder tracked.
              </Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Stock check</Text>
              <Text style={styles.sectionTitle}>Medicines</Text>
            </View>
            <Text style={styles.sectionCount}>{data?.items?.length ?? 0} items</Text>
          </View>

          {(data?.items || []).length ? (
            (data?.items || []).map((item) => (
              <PrescriptionMedicineCard
                key={item.id}
                item={{
                  medicineName: item.medicineName,
                  meta: [item.dosage, item.frequency].filter(Boolean).join(" • ") || "Dose unavailable",
                  instructions: item.instructions,
                  requiredQuantity: item.requiredQuantity,
                  dispensedQuantity: item.dispensedQuantity,
                  remainingQuantity: item.remainingQuantity,
                  currentStock: item.currentStock,
                  lowStockAlert: item.lowStockAlert,
                  demandCount: item.demandCount,
                  substitutions: item.substitutions,
                }}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={28} color={THEME.textSecondary} />
              <Text style={styles.emptyTitle}>No medicines found</Text>
              <Text style={styles.emptyText}>
                This prescription does not contain any mapped medicine items yet.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !canContinueToDispense && styles.confirmButtonDisabled,
          ]}
          disabled={!canContinueToDispense}
          onPress={handleContinueToDispense}
          accessibilityRole="button"
          accessibilityLabel={alreadyDispensed ? "Prescription already dispensed" : "Continue to dispense medicines"}
        >
          <>
            <Text style={styles.confirmButtonText}>
              {alreadyDispensed ? "Already Dispensed" : "Continue to Dispense"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={THEME.white} />
          </>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: THEME.white,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.background,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  centerText: {
    marginTop: 10,
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: THEME.primary,
  },
  retryText: { color: THEME.white, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
  flowCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
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
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  flowText: {
    marginTop: 6,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  infoRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  infoBlock: { flex: 1 },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  infoValue: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  infoMeta: { fontSize: 13, color: THEME.textSecondary, lineHeight: 18, flexShrink: 1 },
  warningCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: THEME.dangerTint,
    borderRadius: 16,
    padding: 14,
  },
  warningText: { flex: 1, color: THEME.danger, fontWeight: "600", lineHeight: 20 },
  successCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: THEME.successTint,
    borderRadius: 16,
    padding: 14,
  },
  successCardText: {
    flex: 1,
    color: THEME.primary,
    fontWeight: "600",
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  sectionCount: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    color: THEME.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  confirmButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: THEME.white, fontSize: 16, fontWeight: "800" },
});
