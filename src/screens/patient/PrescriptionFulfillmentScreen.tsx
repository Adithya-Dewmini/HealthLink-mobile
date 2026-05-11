import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import {
  buildPrescriptionCart,
  createPrescriptionOrder,
  type PrescriptionFulfillmentMatch,
  type PrescriptionFulfillmentResponse,
} from "../../services/patientPrescriptionService";
import { PatientEmptyState, PatientErrorState } from "../../components/patient/PatientFeedback";

const THEME = patientTheme.colors;

const formatPrice = (value: number) =>
  `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PrescriptionFulfillmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "PrescriptionFulfillment">>();
  const { prescriptionId, title } = route.params;

  const [result, setResult] = useState<PrescriptionFulfillmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null);
  const [acceptPartial, setAcceptPartial] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        const payload = await buildPrescriptionCart(prescriptionId);
        setResult(payload);
        setSelectedPharmacyId(payload.matches[0]?.pharmacy.id ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to analyze prescription");
      } finally {
        setLoading(false);
      }
    };

    void loadMatches();
  }, [prescriptionId]);

  const selectedMatch = useMemo(
    () => result?.matches.find((entry) => entry.pharmacy.id === selectedPharmacyId) ?? null,
    [result?.matches, selectedPharmacyId]
  );

  const handleCreateOrder = async (match: PrescriptionFulfillmentMatch) => {
    try {
      setSubmitting(true);
      setError(null);
      await createPrescriptionOrder(prescriptionId, {
        pharmacyId: match.pharmacy.id,
        acceptPartial,
        notes,
      });
      navigation.replace("Orders");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create prescription order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>Digital Fulfillment</Text>
          <Text style={styles.headerTitle}>{title || "Order Medicines"}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate("Orders")}>
          <Ionicons name="receipt-outline" size={22} color={THEME.navy} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Matching pharmacies by stock coverage</Text>
        </View>
      ) : error && !result ? (
        <PatientErrorState
          title="Prescription fulfillment unavailable"
          message={error}
          onRetry={() => navigation.replace("PrescriptionFulfillment", { prescriptionId, title })}
        />
      ) : !(result?.matches.length ?? 0) ? (
        <PatientEmptyState
          icon="medkit-outline"
          title="No pharmacies can fulfill this right now"
          message="None of the active storefront pharmacies currently match the remaining prescription items."
          actionLabel="Browse Pharmacies"
          onAction={() => navigation.navigate("PharmacyMarketplace")}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Prescription #{prescriptionId}</Text>
              <Text style={styles.heroTitle}>Smart fulfillment options</Text>
              <Text style={styles.heroText}>
                Ranked by stock coverage first, then estimated total. Prescription-linked checkout can include Rx-only products.
              </Text>
            </View>

            {error ? (
              <View style={styles.notice}>
                <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
                <Text style={styles.noticeText}>{error}</Text>
              </View>
            ) : null}

            {result?.matches.map((match) => {
              const selected = selectedPharmacyId === match.pharmacy.id;
              return (
                <TouchableOpacity
                  key={match.pharmacy.id}
                  style={[styles.matchCard, selected && styles.matchCardSelected]}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedPharmacyId(match.pharmacy.id);
                    if (match.fullyAvailable) {
                      setAcceptPartial(false);
                    }
                  }}
                >
                  <View style={styles.matchTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.matchTitle}>{match.pharmacy.name}</Text>
                      <Text style={styles.matchSub}>
                        {match.pharmacy.location || "Sri Lanka"} • {match.coveragePercentage}% coverage
                      </Text>
                    </View>
                    <View style={[styles.coveragePill, match.fullyAvailable ? styles.coveragePillFull : styles.coveragePillPartial]}>
                      <Text style={[styles.coverageText, match.fullyAvailable ? styles.coverageTextFull : styles.coverageTextPartial]}>
                        {match.fullyAvailable ? "Full Match" : "Partial"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricRow}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Available items</Text>
                      <Text style={styles.metricValue}>{match.availableItems.length}</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Missing items</Text>
                      <Text style={styles.metricValue}>{match.missingItems.length}</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Estimated total</Text>
                      <Text style={styles.metricValue}>{formatPrice(match.estimatedTotal)}</Text>
                    </View>
                  </View>

                  <View style={styles.listSection}>
                    <Text style={styles.listTitle}>Available</Text>
                    {match.availableItems.map((item) => (
                      <View key={`${match.pharmacy.id}-${item.prescriptionItemId}`} style={styles.itemRow}>
                        <Text style={styles.itemName}>
                          {item.medicineName} • {item.availableQuantity}/{item.requiredQuantity}
                        </Text>
                        <Text style={styles.itemPrice}>{formatPrice(item.totalPrice)}</Text>
                      </View>
                    ))}
                  </View>

                  {match.missingItems.length > 0 ? (
                    <View style={styles.listSection}>
                      <Text style={styles.listTitle}>Missing / partial</Text>
                      {match.missingItems.map((item) => (
                        <View key={`${match.pharmacy.id}-missing-${item.prescriptionItemId}`} style={styles.missingRow}>
                          <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
                          <Text style={styles.missingText}>
                            {item.medicineName} missing {item.missingQuantity} of {item.requiredQuantity}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {selectedMatch ? (
              <View style={styles.checkoutCard}>
                <Text style={styles.checkoutTitle}>Selected pharmacy</Text>
                <Text style={styles.checkoutSub}>{selectedMatch.pharmacy.name}</Text>

                {!selectedMatch.fullyAvailable ? (
                  <TouchableOpacity
                    style={styles.toggleRow}
                    activeOpacity={0.88}
                    onPress={() => setAcceptPartial((current) => !current)}
                  >
                    <View style={styles.toggleTextWrap}>
                      <Text style={styles.toggleTitle}>Accept partial fulfillment</Text>
                      <Text style={styles.toggleSub}>
                        Reserve only the available medicines and source the rest later.
                      </Text>
                    </View>
                    <View style={[styles.togglePill, acceptPartial && styles.togglePillActive]}>
                      <View style={[styles.toggleDot, acceptPartial && styles.toggleDotActive]} />
                    </View>
                  </TouchableOpacity>
                ) : null}

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a note for pickup or fulfillment"
                  placeholderTextColor={THEME.textMuted}
                  multiline
                  style={styles.notesInput}
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    ((!selectedMatch.fullyAvailable && !acceptPartial) || submitting) &&
                      styles.primaryButtonDisabled,
                  ]}
                  onPress={() => void handleCreateOrder(selectedMatch)}
                  disabled={(!selectedMatch.fullyAvailable && !acceptPartial) || submitting}
                >
                  <Text style={styles.primaryButtonText}>
                    {submitting
                      ? "Creating order..."
                      : selectedMatch.fullyAvailable
                        ? "Create Prescription Order"
                        : "Create Partial Order"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={{ height: 80 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { alignItems: "center" },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.textMuted,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  headerTitle: { marginTop: 4, fontSize: 18, fontWeight: "800", color: THEME.navy },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  helperText: { fontSize: 15, color: THEME.textSecondary, textAlign: "center" },
  content: { padding: 20 },
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 22,
  },
  heroEyebrow: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: { marginTop: 8, color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  heroText: { marginTop: 8, color: "#CBD5E1", fontSize: 14, lineHeight: 22 },
  notice: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, color: THEME.danger, fontSize: 14, lineHeight: 20 },
  matchCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  matchCardSelected: {
    borderColor: THEME.modernAccentDark,
    shadowColor: THEME.navy,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  matchTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  matchTitle: { fontSize: 18, fontWeight: "800", color: THEME.navy },
  matchSub: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  coveragePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  coveragePillFull: { backgroundColor: "#DCFCE7" },
  coveragePillPartial: { backgroundColor: "#FEF3C7" },
  coverageText: { fontSize: 12, fontWeight: "800" },
  coverageTextFull: { color: "#166534" },
  coverageTextPartial: { color: "#92400E" },
  metricRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 12,
  },
  metricLabel: { fontSize: 11, fontWeight: "700", color: THEME.textMuted, textTransform: "uppercase" },
  metricValue: { marginTop: 8, fontSize: 14, fontWeight: "800", color: THEME.navy },
  listSection: { marginTop: 16 },
  listTitle: { fontSize: 15, fontWeight: "800", color: THEME.navy, marginBottom: 8 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  itemName: { flex: 1, fontSize: 14, color: THEME.navy, paddingRight: 8 },
  itemPrice: { fontSize: 14, fontWeight: "800", color: THEME.navy },
  missingRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 6 },
  missingText: { flex: 1, fontSize: 13, color: "#92400E" },
  checkoutCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  checkoutTitle: { fontSize: 15, fontWeight: "800", color: THEME.textMuted, textTransform: "uppercase" },
  checkoutSub: { marginTop: 6, fontSize: 20, fontWeight: "800", color: THEME.navy },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
  },
  toggleTextWrap: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: "800", color: "#9A3412" },
  toggleSub: { marginTop: 4, fontSize: 13, lineHeight: 18, color: "#B45309" },
  togglePill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FED7AA",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  togglePillActive: { backgroundColor: "#FDBA74" },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  toggleDotActive: { alignSelf: "flex-end" },
  notesInput: {
    minHeight: 100,
    marginTop: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 14,
    fontSize: 15,
    color: THEME.navy,
    textAlignVertical: "top",
  },
  primaryButton: {
    marginTop: 16,
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.modernAccentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
