import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../config/api";
import PrescriptionCard, {
  type PrescriptionCardData,
} from "../../components/patient/prescriptions/PrescriptionCard";

const THEME = {
  primary: "#2563EB",
  background: "#F8FAFC",
  white: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  skeleton: "#E2E8F0",
  danger: "#DC2626",
};

type PrescriptionApiResponse = {
  id?: string | number;
  title?: string | null;
  doctorName?: string | null;
  specialization?: string | null;
  prescribedAt?: string | null;
  status?: "ACTIVE" | "COMPLETED" | string | null;
  medicines?: Array<{
    name?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: number | string | null;
  }> | null;
};

const normalizeDuration = (value: unknown) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }

  const matched = String(value ?? "").match(/\d+/);
  return matched ? Number(matched[0]) : 0;
};

const normalizePrescription = (
  data: PrescriptionApiResponse | null | undefined
): PrescriptionCardData | null => {
  if (!data?.id) return null;

  return {
    id: String(data.id),
    title: data.title?.trim() || "General Treatment",
    doctorName: data.doctorName?.trim() || "Doctor",
    specialization: data.specialization?.trim() || "General Physician",
    prescribedAt: data.prescribedAt ?? null,
    status: data.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
    medicines: (data.medicines ?? []).map((medicine, index) => ({
      name: medicine?.name?.trim() || `Medicine ${index + 1}`,
      dosage: medicine?.dosage?.trim() || "Not specified",
      frequency: medicine?.frequency?.trim() || "No schedule specified",
      duration: normalizeDuration(medicine?.duration),
    })),
  };
};

function PrescriptionSkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonHeaderContent}>
          <View style={styles.skeletonTitleRow}>
            <View style={[styles.skeletonLine, styles.skeletonTitle]} />
            <View style={styles.skeletonBadge} />
          </View>
          <View style={[styles.skeletonLine, styles.skeletonMeta]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, styles.skeletonDate]} />
      <View style={styles.skeletonDivider} />
      <View style={styles.skeletonMedicineRow}>
        <View style={styles.skeletonMedicineText}>
          <View style={[styles.skeletonLine, styles.skeletonMedicineTitle]} />
          <View style={[styles.skeletonLine, styles.skeletonMedicineMeta]} />
        </View>
        <View style={styles.skeletonChipRow}>
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonChip} />
        </View>
      </View>
      <View style={styles.skeletonProgress} />
      <View style={styles.skeletonActionRow}>
        <View style={[styles.skeletonButton, styles.skeletonButtonSecondary]} />
        <View style={[styles.skeletonButton, styles.skeletonButtonPrimary]} />
      </View>
      <View style={[styles.skeletonButton, styles.skeletonWideButton]} />
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📄</Text>
      <Text style={styles.emptyTitle}>{label}</Text>
    </View>
  );
}

export default function PrescriptionScreen({ route, navigation }: any) {
  const { token } = route.params ?? {};
  const [prescription, setPrescription] = useState<PrescriptionCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"Active" | "Past">("Active");

  const fetchPrescription = useCallback(
    async (isRefresh = false) => {
      try {
        if (!token) {
          setError("Missing prescription token");
          setPrescription(null);
          return;
        }

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const verifyRes = await apiFetch(`/api/prescriptions/verify/${token}`);
        if (!verifyRes.ok) {
          const err = await verifyRes.json().catch(() => ({}));
          throw new Error(err.error || err.message || "Invalid prescription");
        }

        const verifyData = await verifyRes.json();
        const id = verifyData?.prescriptionId;
        if (!id) {
          throw new Error("Invalid prescription");
        }

        const detailsRes = await apiFetch(`/api/prescriptions/${id}`);
        if (!detailsRes.ok) {
          const err = await detailsRes.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load prescription");
        }

        const details = (await detailsRes.json()) as PrescriptionApiResponse;
        setPrescription(normalizePrescription(details));
      } catch (err: any) {
        setPrescription(null);
        setError(err?.message || "Failed to load prescription");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void fetchPrescription();
  }, [fetchPrescription]);

  const activePrescriptions = useMemo(
    () => (prescription && prescription.status === "ACTIVE" ? [prescription] : []),
    [prescription]
  );

  const pastPrescriptions = useMemo(
    () => (prescription && prescription.status === "COMPLETED" ? [prescription] : []),
    [prescription]
  );

  const listData = activeTab === "Active" ? activePrescriptions : pastPrescriptions;

  const renderItem = useCallback(
    ({ item }: { item: PrescriptionCardData }) => <PrescriptionCard item={item} />,
    []
  );

  const keyExtractor = useCallback((item: PrescriptionCardData) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerCircle} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Prescriptions</Text>
          <Text style={styles.subtitle}>Digital medical records</Text>
        </View>
        <TouchableOpacity style={styles.headerCircle}>
          <Ionicons name="search" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabTrack}>
          {(["Active", "Past"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <PrescriptionSkeletonCard />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={56} color={THEME.danger} />
          <Text style={styles.errorTitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void fetchPrescription()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void fetchPrescription(true)}
              tintColor={THEME.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              label={
                activeTab === "Active"
                  ? "📄 No prescriptions yet"
                  : "📄 No past prescriptions yet"
              }
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: THEME.white,
  },
  headerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: { flex: 1, marginLeft: 15 },
  title: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  tabContainer: { paddingHorizontal: 20, marginVertical: 15 },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTabItem: {
    backgroundColor: THEME.white,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabLabel: { fontWeight: "700", color: THEME.textSecondary },
  activeTabLabel: { color: THEME.primary },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: THEME.white,
    fontWeight: "800",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 96,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textSecondary,
    textAlign: "center",
  },
  skeletonCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  skeletonHeader: { flexDirection: "row", alignItems: "center" },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.skeleton,
  },
  skeletonHeaderContent: { flex: 1, marginLeft: 12 },
  skeletonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonLine: {
    backgroundColor: THEME.skeleton,
    borderRadius: 8,
  },
  skeletonTitle: { width: "58%", height: 18 },
  skeletonBadge: {
    width: 62,
    height: 20,
    borderRadius: 8,
    backgroundColor: THEME.skeleton,
  },
  skeletonMeta: { width: "48%", height: 14, marginTop: 10 },
  skeletonDate: { width: "52%", height: 14, marginTop: 18 },
  skeletonDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  skeletonMedicineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  skeletonMedicineText: { flex: 1 },
  skeletonMedicineTitle: { width: "42%", height: 16 },
  skeletonMedicineMeta: { width: "34%", height: 12, marginTop: 8 },
  skeletonChipRow: { flexDirection: "row", gap: 8 },
  skeletonChip: {
    width: 64,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.skeleton,
  },
  skeletonProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.skeleton,
    marginVertical: 12,
  },
  skeletonActionRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 12 },
  skeletonButton: { borderRadius: 14, backgroundColor: THEME.skeleton, height: 48 },
  skeletonButtonSecondary: { flex: 1 },
  skeletonButtonPrimary: { flex: 1.5 },
  skeletonWideButton: { width: "100%" },
});
