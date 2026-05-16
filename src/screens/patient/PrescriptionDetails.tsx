import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import type { PatientStackParamList } from "../../types/navigation";
import {
  fetchPatientPrescriptionDetail,
  markPatientPrescriptionSeen,
} from "../../services/patientPrescriptionService";
import { patientTheme } from "../../constants/patientTheme";
import { buildPrescriptionQrValue } from "../../utils/pharmacyPrescription";

const THEME = {
  ...patientTheme.colors,
  card: patientTheme.colors.surface,
  shadow: patientTheme.colors.navy,
  softMint: patientTheme.colors.successSoft,
  primaryBorder: patientTheme.colors.softAqua,
};

type Medicine = {
  id: string;
  name: string;
  dosage: string;
  frequency: string | { morning?: number; afternoon?: number; night?: number } | null;
  duration: number;
  instructions: string;
};

type PrescriptionDetailsModel = {
  id: string;
  title: string;
  doctorName: string;
  specialization: string;
  patientName: string;
  prescribedAt: string | null;
  diagnosis: string;
  notes: string;
  medicines: Medicine[];
  qrToken: string | null;
};

type PrescriptionApiResponse = {
  id?: string | number;
  title?: string | null;
  doctorName?: string | null;
  specialization?: string | null;
  prescribedAt?: string | null;
  patient?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  qrToken?: string | null;
  medicines?: Array<{
    id?: string | number | null;
    name?: string | null;
    medicine_name?: string | null;
    dosage?: string | null;
    frequency?:
      | string
      | {
          morning?: number;
          afternoon?: number;
          night?: number;
        }
      | null;
    duration?: number | string | null;
    instructions?: string | null;
  }> | null;
  prescription?: {
    id?: string | number;
    patient_name?: string | null;
    doctor_name?: string | null;
    issued_at?: string | null;
    consultation_created_at?: string | null;
    created_at?: string | null;
    qr_code?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
  } | null;
};

const normalizeDuration = (value: unknown) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }
  const matched = String(value ?? "").match(/\d+/);
  return matched ? Number(matched[0]) : 0;
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

const parseFrequency = (
  value: string | { morning?: number; afternoon?: number; night?: number } | null | undefined
) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
};

const isScheduleObject = (value: unknown): value is { morning?: number; afternoon?: number; night?: number } => {
  return !!value && typeof value === "object";
};

const looksLikeScheduleString = (value: unknown) => {
  if (typeof value !== "string") return false;
  const parsed = parseFrequency(value);
  return isScheduleObject(parsed);
};

const formatFrequency = (
  value: string | { morning?: number; afternoon?: number; night?: number } | null | undefined
) => {
  const parsed = parseFrequency(value);
  if (!parsed) return "No schedule specified";

  if (typeof parsed === "string") {
    return parsed || "No schedule specified";
  }

  const times: string[] = [];
  if (parsed.morning) times.push("Morning");
  if (parsed.afternoon) times.push("Afternoon");
  if (parsed.night) times.push("Night");

  return times.length ? times.join(" • ") : "No schedule specified";
};

const buildPrescriptionModel = (
  response: PrescriptionApiResponse | null | undefined
): PrescriptionDetailsModel | null => {
  if (!response?.id && !response?.prescription?.id) return null;

  const prescribedAt =
    response?.prescribedAt ??
    response?.prescription?.issued_at ??
    response?.prescription?.consultation_created_at ??
    response?.prescription?.created_at ??
    null;

  return {
    id: String(response.id ?? response.prescription?.id),
    title: response.title?.trim() || "General Treatment",
    doctorName:
      response.doctorName?.trim() ||
      response.prescription?.doctor_name?.trim() ||
      "Doctor",
    specialization: response.specialization?.trim() || "General Physician",
    patientName:
      response.patient?.trim() ||
      response.prescription?.patient_name?.trim() ||
      "Patient",
    prescribedAt,
    diagnosis: response.diagnosis?.trim() || response.prescription?.diagnosis?.trim() || "No diagnosis provided",
    notes: response.notes?.trim() || response.prescription?.notes?.trim() || "No notes provided",
    qrToken: response.qrToken ?? response.prescription?.qr_code ?? null,
    medicines: (response.medicines ?? []).map((medicine, index) => {
      const parsedFrequency = parseFrequency(medicine?.frequency);
      const frequencyFromDosage = looksLikeScheduleString(medicine?.dosage)
        ? parseFrequency(medicine?.dosage as string)
        : null;

      const resolvedFrequency = parsedFrequency ?? frequencyFromDosage;
      const resolvedDosage =
        typeof medicine?.dosage === "string" && !looksLikeScheduleString(medicine.dosage)
          ? medicine.dosage.trim()
          : "";

      return {
        id: String(medicine?.id ?? `${medicine?.name ?? medicine?.medicine_name ?? "medicine"}-${index}`),
        name: medicine?.name?.trim() || medicine?.medicine_name?.trim() || `Medicine ${index + 1}`,
        dosage: resolvedDosage || "Not specified",
        frequency: resolvedFrequency,
        duration: normalizeDuration(medicine?.duration),
        instructions: medicine?.instructions?.trim() || "No instructions",
      };
    }),
  };
};

const getPrescriptionProgress = (medicines: Medicine[], prescribedAt: string | null) => {
  const totalDays = medicines.reduce((max, medicine) => Math.max(max, medicine.duration), 0);
  if (!prescribedAt || totalDays <= 0) {
    return null;
  }

  const startDate = new Date(prescribedAt);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const elapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const day = Math.max(1, Math.min(elapsed, totalDays));
  const progress = Math.max(0, Math.min(day / totalDays, 1));

  return { day, totalDays, progress };
};

const ProgressBar = memo(function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
});

const MedicineItem = memo(function MedicineItem({ item }: { item: Medicine }) {
  const frequencyText = formatFrequency(item.frequency);

  return (
    <View style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        <View style={styles.medicineIconWrap}>
          <MaterialCommunityIcons name="pill" size={20} color={THEME.primary} />
        </View>
        <View style={styles.medicineTextWrap}>
          <Text style={styles.medicineName}>{item.name}</Text>
          <Text style={styles.frequencyText}>{frequencyText}</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        <View style={[styles.chip, styles.dosageChip]}>
          <Text style={[styles.chipText, styles.dosageChipText]}>{item.dosage}</Text>
        </View>
        {item.duration > 0 ? (
          <View style={[styles.chip, styles.durationChip]}>
            <Text style={[styles.chipText, styles.durationChipText]}>
              {`${item.duration} day${item.duration === 1 ? "" : "s"}`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.instructionText}>{item.instructions}</Text>
    </View>
  );
});

const PatientInfoCard = ({
  title,
  doctorName,
  specialization,
  patientName,
  prescribedAt,
}: {
  title: string;
  doctorName: string;
  specialization: string;
  patientName: string;
  prescribedAt: string | null;
}) => (
  <View style={styles.infoCard}>
    <View style={styles.infoRow}>
      <View style={styles.avatarWrap}>
        <Ionicons name="document-text-outline" size={26} color={THEME.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDoctor}>{`${doctorName} • ${specialization}`}</Text>
      </View>
    </View>

    <View style={styles.infoDivider} />

    <View style={styles.infoMetaRow}>
      <View>
        <Text style={styles.metaLabel}>Patient</Text>
        <Text style={styles.metaValue}>{patientName}</Text>
      </View>
      <View style={styles.metaDateWrap}>
        <Text style={styles.metaLabel}>Date</Text>
        <Text style={styles.metaValue}>{formatDate(prescribedAt)}</Text>
      </View>
    </View>
  </View>
);

const SummaryBlock = ({
  title,
  value,
  icon,
  accent = "blue",
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: "blue" | "mint";
}) => (
  <View style={[styles.summaryCard, accent === "mint" ? styles.summaryCardMint : styles.summaryCardBlue]}>
    <View style={styles.summaryHeader}>
      <View style={[styles.summaryIconWrap, accent === "mint" ? styles.summaryIconWrapMint : styles.summaryIconWrapBlue]}>
        <Ionicons
          name={icon}
          size={18}
          color={accent === "mint" ? THEME.success : THEME.primary}
        />
      </View>
      <Text style={styles.summaryTitle}>{title}</Text>
    </View>
    <Text style={styles.summaryText}>{value}</Text>
  </View>
);

export default function PrescriptionDetails() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<PatientStackParamList, "PrescriptionDetails">>();
  const prescriptionId = route.params?.id;

  const [prescription, setPrescription] = useState<PrescriptionDetailsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrescription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!prescriptionId) {
        throw new Error("Missing prescription id");
      }

      const data = (await fetchPatientPrescriptionDetail(prescriptionId)) as PrescriptionApiResponse;
      const normalized = buildPrescriptionModel(data);
      if (!normalized) {
        throw new Error("Prescription details are unavailable");
      }

      setPrescription(normalized);
      void markPatientPrescriptionSeen(prescriptionId).catch((markError) => {
        console.log("Mark prescription seen error:", markError);
      });
    } catch (err: any) {
      setPrescription(null);
      setError(err?.message || "Failed to load prescription");
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    void loadPrescription();
  }, [loadPrescription]);

  const progress = useMemo(
    () => getPrescriptionProgress(prescription?.medicines ?? [], prescription?.prescribedAt ?? null),
    [prescription]
  );

  const qrValue = useMemo(
    () => buildPrescriptionQrValue({ qrToken: prescription?.qrToken }),
    [prescription?.qrToken]
  );

  const handleDownload = () => {
    Alert.alert("Download unavailable", "Prescription download will be added in a later update.");
  };

  const handleCheckAvailability = () => {
    navigation.navigate("MedicineSearch");
  };

  const handleOrderMedicines = () => {
    if (!prescription?.id) return;
    navigation.navigate("PrescriptionFulfillment", {
      prescriptionId: prescription.id,
      title: prescription.title,
    });
  };

  const handleNearbyPharmacies = () => {
    navigation.navigate("PharmacyMarketplace");
  };

  const bottomBarHeight = insets.bottom + 120;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prescription Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleDownload}>
          <Ionicons name="download-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.stateTitle}>Loading prescription</Text>
          <Text style={styles.stateText}>Fetching prescription details...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load prescription</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.stateButton} onPress={() => void loadPrescription()}>
            <Text style={styles.stateButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !prescription ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No prescription found</Text>
          <Text style={styles.stateText}>This prescription is not available right now.</Text>
          <TouchableOpacity style={styles.stateButtonSecondary} onPress={() => navigation.goBack()}>
            <Text style={styles.stateButtonSecondaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomBarHeight + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <PatientInfoCard
              title={prescription.title}
              doctorName={prescription.doctorName}
              specialization={prescription.specialization}
              patientName={prescription.patientName}
              prescribedAt={prescription.prescribedAt}
            />

            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <View>
                  <Text style={styles.qrTitle}>Pharmacy QR</Text>
                  <Text style={styles.qrSub}>Show this at the pharmacy counter</Text>
                </View>
                <Ionicons name="qr-code-outline" size={24} color={THEME.primary} />
              </View>
              <View style={styles.qrBox}>
                {qrValue ? (
                  <QRCode
                    value={qrValue}
                    size={170}
                    color={THEME.textPrimary}
                    backgroundColor={THEME.card}
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="alert-circle-outline" size={32} color={THEME.textSecondary} />
                    <Text style={styles.qrPlaceholderText}>QR token is not available yet</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Medicines</Text>
                {progress ? (
                  <Text style={styles.progressLabel}>{`Day ${progress.day} of ${progress.totalDays}`}</Text>
                ) : null}
              </View>

              {progress ? <ProgressBar progress={progress.progress} /> : null}

              {prescription.medicines.length > 0 ? (
                prescription.medicines.map((medicine) => (
                  <MedicineItem key={medicine.id} item={medicine} />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>No medicines listed in this prescription.</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consultation Summary</Text>
              <SummaryBlock
                title="Diagnosis"
                value={prescription.diagnosis}
                icon="medkit-outline"
                accent="blue"
              />
              <SummaryBlock
                title="Doctor Notes"
                value={prescription.notes}
                icon="document-text-outline"
                accent="mint"
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.bottomContainer,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleOrderMedicines}
            >
              <Text style={styles.primaryText}>Order Medicines</Text>
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleCheckAvailability}
              >
                <Text style={styles.secondaryText}>Check Availability</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleNearbyPharmacies}
              >
                <Text style={styles.secondaryText}>Find Pharmacy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: THEME.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#E6EEF8",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  stateButtonSecondary: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE7F2",
  },
  stateButtonSecondaryText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8EEF5",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  infoDoctor: {
    fontSize: 14,
    color: "#6B7A90",
    marginTop: 4,
  },
  infoDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 16,
  },
  infoMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  metaDateWrap: {
    alignItems: "flex-end",
  },
  qrCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8EEF5",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  qrSub: {
    marginTop: 3,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  qrBox: {
    alignSelf: "center",
    minWidth: 212,
    minHeight: 212,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  qrPlaceholder: {
    width: 170,
    height: 170,
    borderRadius: 18,
    backgroundColor: THEME.softGray,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  qrPlaceholderText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.primary,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#DCE7F5",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: THEME.primary,
  },
  medicineCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8EEF5",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  medicineHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  medicineIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  medicineTextWrap: { flex: 1 },
  medicineName: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  medicineFrequency: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  frequencyText: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7A90",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dosageChip: {
    backgroundColor: THEME.softBlue,
  },
  durationChip: {
    backgroundColor: THEME.softMint,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dosageChipText: {
    color: THEME.primary,
  },
  durationChipText: {
    color: THEME.success,
  },
  instructionText: {
    marginTop: 10,
    fontSize: 12,
    color: "#9CA3AF",
  },
  emptyCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyCardText: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  summaryCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  summaryCardBlue: {
    borderColor: "#DCEBFA",
  },
  summaryCardMint: {
    borderColor: "#D9F6E6",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  summaryIconWrapBlue: {
    backgroundColor: THEME.softBlue,
  },
  summaryIconWrapMint: {
    backgroundColor: THEME.softMint,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textSecondary,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#E6EEF8",
  },
  primaryBtn: {
    backgroundColor: THEME.textPrimary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#DCEBFA",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  secondaryText: {
    color: THEME.primary,
    fontWeight: "500",
    fontSize: 14,
  },
});
