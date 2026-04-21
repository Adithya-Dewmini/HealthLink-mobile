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
  confirmDispense,
  getPrescriptionById,
  type PharmacyPrescriptionDetails,
} from "../../services/pharmacyApi";
import PrescriptionMedicineCard from "../../components/pharmacist/PrescriptionMedicineCard";

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
  const [dispensing, setDispensing] = useState(false);
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
    () => (data?.items || []).some((item) => item.currentStock < item.requiredQuantity),
    [data]
  );
  const canDispense = Boolean(data?.items?.length) && !hasInsufficientStock && !dispensing;

  const handleConfirmDispense = async () => {
    const normalizedPrescriptionId = String(prescriptionId ?? "").trim();
    if (!normalizedPrescriptionId) {
      Alert.alert("Invalid Prescription", "This prescription cannot be dispensed.");
      return;
    }
    if (hasInsufficientStock) {
      Alert.alert("Insufficient Stock", "Resolve stock shortages before dispensing.");
      return;
    }

    try {
      setDispensing(true);
      setError(null);
      await confirmDispense(normalizedPrescriptionId);
      Alert.alert("Success", "Prescription dispensed successfully.", [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (dispenseError: any) {
      setError(dispenseError?.message || "Failed to dispense prescription.");
      Alert.alert(
        "Dispense Failed",
        dispenseError?.message || "Failed to dispense prescription."
      );
    } finally {
      setDispensing(false);
    }
  };

  const prescription = data?.prescription;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Prescription Details</Text>
          <Text style={styles.headerSub}>Review stock before dispensing</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} disabled={loading || refreshing || dispensing}>
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
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Patient</Text>
                <Text style={styles.infoValue}>
                  {prescription?.patientName || `Prescription #${prescription?.id ?? "-"}`}
                </Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Doctor</Text>
                <Text style={styles.infoValue}>{prescription?.doctorName || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Token</Text>
                <Text style={styles.infoMeta}>{prescription?.token || prescription?.qrCode || "N/A"}</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Issued</Text>
                <Text style={styles.infoMeta}>{formatDate(prescription?.issuedAt)}</Text>
              </View>
            </View>
          </View>

          {hasInsufficientStock && (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={18} color={THEME.danger} />
              <Text style={styles.warningText}>
                One or more medicines do not have enough stock to complete dispensing.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Medicines</Text>

          {(data?.items || []).length ? (
            (data?.items || []).map((item) => (
              <PrescriptionMedicineCard key={item.id} item={item} />
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
            !canDispense && styles.confirmButtonDisabled,
          ]}
          disabled={!canDispense}
          onPress={handleConfirmDispense}
        >
          {dispensing ? (
            <ActivityIndicator color={THEME.white} />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm Dispense</Text>
              <Ionicons name="checkmark-circle-outline" size={18} color={THEME.white} />
            </>
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
  infoMeta: { fontSize: 13, color: THEME.textSecondary, lineHeight: 18 },
  warningCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: THEME.dangerTint,
    borderRadius: 16,
    padding: 14,
  },
  warningText: { flex: 1, color: THEME.danger, fontWeight: "600", lineHeight: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginTop: 4,
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
