import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DoctorPanelHeader from "../../components/doctor/DoctorPanelHeader";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import DoctorAvatar from "../../components/common/DoctorAvatar";
import { useAuth } from "../../utils/AuthContext";
import { doctorColors } from "../../constants/doctorTheme";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";
import {
  fetchDoctorPrescriptions,
  type DoctorPrescriptionListItem,
} from "../../services/doctorPrescriptionService";
import { getFriendlyError } from "../../utils/friendlyErrors";
import { getDisplayInitials, resolveDoctorImage } from "../../utils/imageUtils";

const THEME = {
  background: doctorColors.background,
  white: doctorColors.surface,
  textDark: doctorColors.textPrimary,
  textGray: doctorColors.textSecondary,
  primary: doctorColors.primary,
  deep: doctorColors.deep,
  border: doctorColors.border,
  warning: doctorColors.warningText,
  warningBg: doctorColors.warningBg,
  badgeBg: doctorColors.badgeBg,
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "issued", label: "Issued" },
  { key: "dispensed", label: "Dispensed" },
] as const;

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const getIssuedTodayCount = (items: DoctorPrescriptionListItem[]) => {
  const todayKey = new Intl.DateTimeFormat("en-CA").format(new Date());
  return items.filter((item) => {
    if (!item.issuedAt) return false;
    const parsed = new Date(item.issuedAt);
    if (Number.isNaN(parsed.getTime())) return false;
    return new Intl.DateTimeFormat("en-CA").format(parsed) === todayKey;
  }).length;
};

export default function DoctorPrescriptionsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";
  const [prescriptions, setPrescriptions] = useState<DoctorPrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadPrescriptions = React.useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!isVerifiedDoctor) {
      setPrescriptions([]);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      const response = await fetchDoctorPrescriptions({
        search,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      setPrescriptions(response);
    } catch (loadError: any) {
      setError(getFriendlyError(loadError, "Failed to load prescriptions"));
      setPrescriptions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isVerifiedDoctor, search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPrescriptions("initial");
    }, 250);
    return () => clearTimeout(timeout);
  }, [loadPrescriptions]);

  const summary = useMemo(() => ({
    issuedToday: getIssuedTodayCount(prescriptions),
    recent: prescriptions.length,
    dispensed: prescriptions.filter((item) => item.dispensed).length,
  }), [prescriptions]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <DoctorPanelHeader
        showBack
        eyebrow="Patient Care"
        title="Prescription Hub"
        subtitle="Review and track issued prescriptions"
        rightAvatarUrl={resolveDoctorImage(user?.profile_image ?? null)}
        onAvatarPress={() => navigation.navigate("ProfileEdit")}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPrescriptions("refresh")} />}
      >
        {!isVerifiedDoctor ? <PendingApprovalBanner /> : null}

        {!isVerifiedDoctor ? (
          <View style={styles.pendingInfoCard}>
            <Text style={styles.pendingInfoTitle}>Limited access</Text>
            <Text style={styles.pendingInfoText}>
              Your account is under review. Prescription history will be available after doctor approval.
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{summary.issuedToday}</Text>
            <Text style={styles.summaryLabel}>Issued Today</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{summary.recent}</Text>
            <Text style={styles.summaryLabel}>Recent</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{summary.dispensed}</Text>
            <Text style={styles.summaryLabel}>Dispensed</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <Ionicons name="search" size={18} color={THEME.textGray} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by patient name"
            placeholderTextColor={THEME.textGray}
            style={styles.searchInput}
            autoCapitalize="words"
            returnKeyType="search"
            accessibilityLabel="Search prescriptions by patient name"
          />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter prescriptions by ${filter.label}`}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.stateTitle}>Loading prescriptions</Text>
            <Text style={styles.stateText}>Recent prescriptions issued from consultations will appear here.</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={28} color={doctorColors.dangerText} />
            <Text style={styles.stateTitle}>Could not load prescriptions</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadPrescriptions("initial")}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : prescriptions.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="document-text-outline" size={28} color={THEME.textGray} />
            <Text style={styles.stateTitle}>No prescriptions created yet</Text>
            <Text style={styles.stateText}>
              Prescriptions you issue from completed consultations will appear here.
            </Text>
          </View>
        ) : (
          prescriptions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.prescriptionCard}
              activeOpacity={0.92}
              onPress={() =>
                navigation.navigate("DoctorPrescriptionDetails", {
                  prescriptionId: item.id,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open prescription for ${item.patient.name}`}
            >
              <View style={styles.cardTopRow}>
                <DoctorAvatar
                  name={item.patient.name}
                  imageUrl={resolveDoctorImage(item.patient.profile_image ?? null)}
                  size={46}
                  fallbackLabel={getDisplayInitials(item.patient.name, "PT")}
                />
                <View style={styles.cardIdentity}>
                  <Text style={styles.patientName} numberOfLines={1}>
                    {item.patient.name}
                  </Text>
                  <Text style={styles.patientMeta} numberOfLines={1}>
                    {[item.patient.age ? `${item.patient.age} yrs` : null, item.patient.gender]
                      .filter(Boolean)
                      .join(" • ") || "Patient"}
                  </Text>
                </View>
                <ScheduleStatusBadge
                  label={item.status}
                  tone={item.dispensed ? "completed" : "upcoming"}
                />
              </View>

              <Text style={styles.issuedText}>{formatDateTime(item.issuedAt)}</Text>
              <Text style={styles.centerText} numberOfLines={1}>
                {item.medicalCenter?.name ?? "Medical Center not linked"}
              </Text>
              <Text style={styles.linkedText} numberOfLines={1}>
                {item.consultationId ? `Consultation #${item.consultationId}` : "Consultation not linked"}
              </Text>

              <View style={styles.cardFooterRow}>
                <View style={styles.metricPill}>
                  <Ionicons name="medkit-outline" size={14} color={THEME.primary} />
                  <Text style={styles.metricText}>
                    {item.medicineCount} {item.medicineCount === 1 ? "medicine" : "medicines"}
                  </Text>
                </View>
                {item.dispensed ? (
                  <View style={[styles.metricPill, styles.metricPillSuccess]}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={doctorColors.successText} />
                    <Text style={[styles.metricText, styles.metricTextSuccess]}>Dispensed</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  container: {
    padding: 20,
    gap: 16,
  },
  pendingInfoCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F2D7A0",
    padding: 16,
  },
  pendingInfoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.warning,
    marginBottom: 6,
  },
  pendingInfoText: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textGray,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryChip: {
    flex: 1,
    minHeight: 88,
    borderRadius: 22,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  summaryValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: THEME.deep,
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textGray,
  },
  searchCard: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: THEME.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: THEME.textDark,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: THEME.badgeBg,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
  },
  filterChipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: THEME.deep,
  },
  filterChipTextActive: {
    color: THEME.white,
  },
  stateCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: THEME.textDark,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textGray,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "700",
  },
  prescriptionCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 18,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardIdentity: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: THEME.deep,
  },
  patientMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textGray,
  },
  issuedText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: THEME.textDark,
  },
  centerText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textGray,
  },
  linkedText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.textGray,
    fontWeight: "600",
  },
  cardFooterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  metricPill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: THEME.badgeBg,
  },
  metricPillSuccess: {
    backgroundColor: doctorColors.successBg,
  },
  metricText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: THEME.primary,
  },
  metricTextSuccess: {
    color: doctorColors.successText,
  },
});
