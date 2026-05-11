import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { doctorColors } from "../../constants/doctorTheme";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";
import {
  fetchDoctorPrescriptionDetail,
  type DoctorPrescriptionDetail,
} from "../../services/doctorPrescriptionService";
import { useAuth } from "../../utils/AuthContext";

const THEME = {
  background: doctorColors.background,
  surface: doctorColors.surface,
  card: doctorColors.card,
  deep: doctorColors.deep,
  primary: doctorColors.primary,
  text: doctorColors.textPrimary,
  textSecondary: doctorColors.textSecondary,
  border: doctorColors.border,
  muted: doctorColors.textMuted,
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const formatValue = (value?: string | null) => {
  const normalized = String(value || "").trim();
  return normalized.length ? normalized : "Not recorded";
};

export default function DoctorPrescriptionDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const prescriptionId = String(route.params?.prescriptionId || "").trim();
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  const [data, setData] = useState<DoctorPrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async (showSpinner = true) => {
    if (!isVerifiedDoctor) {
      setData(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!prescriptionId) {
      setData(null);
      setError("Invalid prescription ID");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const response = await fetchDoctorPrescriptionDetail(prescriptionId);
      setData(response);
    } catch (fetchError: any) {
      setData(null);
      setError(fetchError?.message || "Failed to load prescription");
    } finally {
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, [isVerifiedDoctor, prescriptionId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={THEME.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerSub}>Doctor Panel</Text>
          <Text style={styles.headerTitle}>Prescription Details</Text>
        </View>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      {!isVerifiedDoctor ? (
        <View style={styles.blockedWrap}>
          <PendingApprovalBanner />
          <View style={styles.blockedCard}>
            <Text style={styles.errorTitle}>Limited access</Text>
            <Text style={styles.centerText}>
              Your account is under review. Prescription details will be available after doctor approval.
            </Text>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.centerText}>Loading prescription...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color={doctorColors.dangerText} />
          <Text style={styles.errorTitle}>Unable to load prescription</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadDetails()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !data ? (
        <View style={styles.centerState}>
          <Ionicons name="document-text-outline" size={28} color={THEME.muted} />
          <Text style={styles.errorTitle}>Prescription not found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadDetails(false);
              }}
              tintColor={THEME.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIdentity}>
                <Text style={styles.patientName} numberOfLines={1}>{data.patient.name}</Text>
                <Text style={styles.patientMeta}>
                  {[data.patient.age ? `${data.patient.age} yrs` : null, data.patient.gender]
                    .filter(Boolean)
                    .join(" • ") || "Patient details available"}
                </Text>
              </View>
              <ScheduleStatusBadge
                label={data.status}
                tone={data.dispensed.isDispensed ? "completed" : "upcoming"}
              />
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Issued</Text>
                <Text style={styles.metaValue}>{formatDateTime(data.issuedAt)}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Medical Center</Text>
                <Text style={styles.metaValue}>
                  {data.medicalCenter?.name ?? "Not linked"}
                </Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>QR Status</Text>
                <Text style={styles.metaValue}>
                  {data.qr.available ? data.qr.status : "Unavailable"}
                </Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Dispensed</Text>
                <Text style={styles.metaValue}>
                  {data.dispensed.isDispensed
                    ? formatDateTime(data.dispensed.dispensedAt)
                    : "Not dispensed"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Consultation Context</Text>
            <Text style={styles.fieldLabel}>Diagnosis</Text>
            <Text style={styles.fieldText}>{formatValue(data.consultation.diagnosis)}</Text>
            <Text style={styles.fieldLabel}>Symptoms</Text>
            <Text style={styles.fieldText}>{formatValue(data.consultation.symptoms)}</Text>
            <Text style={styles.fieldLabel}>Notes</Text>
            <Text style={styles.fieldText}>{formatValue(data.consultation.notes)}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Medicines</Text>
            {data.medicines.length ? (
              data.medicines.map((medicine) => (
                <View key={medicine.id} style={styles.medicineCard}>
                  <Text style={styles.medicineName} numberOfLines={2}>
                    {medicine.name}
                  </Text>
                  <Text style={styles.medicineMeta}>Dosage: {formatValue(medicine.dosage)}</Text>
                  <Text style={styles.medicineMeta}>
                    Frequency: {formatValue(medicine.frequency)}
                  </Text>
                  <Text style={styles.medicineMeta}>
                    Duration: {formatValue(
                      medicine.duration !== null && medicine.duration !== undefined
                        ? String(medicine.duration)
                        : null
                    )}
                  </Text>
                  <Text style={styles.medicineMeta}>
                    Instructions: {formatValue(medicine.instructions)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No medicines recorded for this prescription.</Text>
            )}
          </View>
        </ScrollView>
      )}
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
    paddingVertical: 16,
    backgroundColor: THEME.surface,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#EAF6F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTextWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerSub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: THEME.text,
  },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 28 },
  blockedWrap: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  blockedCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    alignItems: "center",
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  centerText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: THEME.text,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 18,
    gap: 16,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryIdentity: {
    flex: 1,
  },
  patientName: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    color: THEME.deep,
  },
  patientMeta: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaBlock: {
    width: "47%",
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: "#F6FBFB",
    padding: 12,
  },
  metaLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaValue: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: THEME.text,
  },
  sectionCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: THEME.deep,
    marginBottom: 12,
  },
  fieldLabel: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldText: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    color: THEME.text,
  },
  medicineCard: {
    borderRadius: 18,
    backgroundColor: "#F8FCFC",
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: THEME.text,
  },
  medicineMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
  },
});
