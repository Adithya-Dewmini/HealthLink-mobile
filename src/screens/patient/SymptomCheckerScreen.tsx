import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../../config/api";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import SymptomPill from "../../components/patient/SymptomPill";
import { getDoctorFallbackImage, readDoctorGender, resolveDoctorImage } from "../../utils/imageUtils";

const THEME = {
  ...patientTheme.colors,
  primary: patientTheme.colors.primaryBlue,
  background: patientTheme.colors.background,
  white: patientTheme.colors.white,
  textPrimary: patientTheme.colors.modernText,
  textSecondary: patientTheme.colors.textSecondary,
  border: patientTheme.colors.modernBorder,
  softBlue: patientTheme.colors.lightBlueBg,
  header: patientTheme.colors.modernPrimary,
  headerAlt: patientTheme.colors.modernPrimaryAlt,
};

const SPECIALIST_ALIASES: Record<string, string> = {
  cardiologist: "Cardiologist",
  cardiac: "Cardiologist",
  neurologist: "Neurologist",
  neurology: "Neurologist",
  dermatologist: "Dermatologist",
  dermatology: "Dermatologist",
  ophthalmologist: "Ophthalmologist",
  ophthalmology: "Ophthalmologist",
  ent: "ENT Specialist",
  "ent specialist": "ENT Specialist",
  pediatrician: "Pediatrician",
  orthopedist: "Orthopedic",
  orthopedic: "Orthopedic",
  psychiatrist: "Psychiatrist",
  gynecologist: "Gynecologist",
  "general physician": "General Physician",
  general: "General Physician",
  physician: "General Physician",
  doctor: "General Physician",
};

const QUICK_SUGGESTIONS = [
  "Fever",
  "Headache",
  "Cough",
  "Fatigue",
  "Chest Pain",
];

const normalizeSpecialist = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "General Physician";
  return SPECIALIST_ALIASES[normalized] || value!.trim();
};

const normalizeUrgency = (value?: string | null): "low" | "medium" | "high" => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "low";
};

function DoctorRecommendationCard({
  doctor,
  onPress,
}: {
  doctor: {
    id: number;
    name: string;
    specialty: string;
    city: string;
    clinicName?: string | null;
    rating: number | null;
    experience: string;
    queueLength: number;
    isAvailableToday: boolean;
    profileImage?: string | null;
    gender?: string | null;
  };
  onPress: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasRemoteImage =
    typeof doctor.profileImage === "string" && doctor.profileImage.trim().length > 0 && !imageFailed;
  const imageSource = hasRemoteImage ? { uri: doctor.profileImage! } : getDoctorFallbackImage(doctor.gender);
  const locationLabel = doctor.clinicName || doctor.city || null;
  const queueLabel = doctor.queueLength > 0 ? `${doctor.queueLength} in queue` : null;
  const experienceLabel = doctor.experience && doctor.experience !== "N/A" ? doctor.experience : null;

  useEffect(() => {
    setImageFailed(false);
  }, [doctor.gender, doctor.profileImage]);

  return (
    <TouchableOpacity style={styles.featuredCard} activeOpacity={0.92} onPress={onPress}>
      <View style={styles.featuredImageWrap}>
        <Image
          source={imageSource}
          style={styles.featuredDoctorImage}
          resizeMode={hasRemoteImage ? "cover" : "cover"}
          onError={() => setImageFailed(true)}
        />
        {!hasRemoteImage ? <View style={styles.featuredDoctorImageFallbackTint} /> : null}
        <LinearGradient
          colors={["rgba(2, 6, 23, 0.02)", "rgba(2, 6, 23, 0.18)", "rgba(2, 6, 23, 0.45)"]}
          locations={[0, 0.52, 1]}
          style={styles.featuredImageOverlay}
        />
        <View
          style={[
            styles.recommendationAvailabilityBadge,
            doctor.isAvailableToday ? styles.availabilityBadgeActive : styles.availabilityBadgeInactive,
          ]}
        >
          <Text
            style={[
              styles.availabilityText,
              doctor.isAvailableToday ? styles.availabilityTextActive : styles.availabilityTextInactive,
            ]}
          >
            {doctor.isAvailableToday ? "Available Today" : "Schedule Ahead"}
          </Text>
        </View>
      </View>

      <View style={styles.featuredCardContent}>
        <Text style={styles.featuredName} numberOfLines={1}>
          {doctor.name}
        </Text>
        <Text style={styles.featuredSpecialty} numberOfLines={1}>
          {doctor.specialty}
        </Text>
        {locationLabel ? (
          <Text style={styles.featuredMetaLine} numberOfLines={1}>
            {locationLabel}
          </Text>
        ) : null}

        {(doctor.rating || queueLabel) ? (
          <View style={styles.featuredMetaRow}>
            {doctor.rating ? (
              <Text style={styles.featuredRating}>{`⭐ ${doctor.rating.toFixed(1)}`}</Text>
            ) : <View />}
            {queueLabel ? <Text style={styles.featuredDistance}>{queueLabel}</Text> : null}
          </View>
        ) : null}

        {(experienceLabel || (doctor.city && doctor.clinicName)) ? (
          <View style={styles.featuredInfoRow}>
            {experienceLabel ? <Text style={styles.featuredInfoText}>{experienceLabel}</Text> : <View />}
            {doctor.city && doctor.clinicName ? <Text style={styles.featuredInfoText}>{doctor.city}</Text> : null}
          </View>
        ) : null}

        <View style={styles.featuredCta}>
          <Text style={styles.featuredCtaText}>View Doctor</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SymptomCheckerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | {
        specialist: string;
        reason: string;
        urgency: "low" | "medium" | "high";
      }
    | null
  >(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const analysisRequestId = useRef(0);
  const [doctors, setDoctors] = useState<
    Array<{
      id: number;
      name: string;
      specialty: string;
      city: string;
      clinicId: string | null;
      clinicName: string | null;
      rating: number | null;
      reviews: number | null;
      experience: string;
      queueLength: number;
      isAvailableToday: boolean;
      profileImage?: string | null;
      gender?: string | null;
    }>
  >([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const loadDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const res = await apiFetch("/api/patients/doctors");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load doctors");
      }
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map((doc: any) => ({
        id: Number(doc.doctor_id),
        name: doc.name ?? "Doctor",
        specialty: normalizeSpecialist(doc.specialization ?? "General Physician"),
        city: doc.city ?? "Colombo",
        clinicId: doc.clinic_id ?? null,
        clinicName: doc.clinic_name ?? null,
        rating: typeof doc.rating === "number" ? doc.rating : null,
        reviews: typeof doc.review_count === "number" ? doc.review_count : null,
        experience: doc.experience_years ? `${doc.experience_years} Years` : "",
        queueLength: Number(doc.queue_length ?? 0),
        isAvailableToday: Boolean(doc.is_available_today),
        profileImage: resolveDoctorImage(doc.profile_image ?? null),
        gender: readDoctorGender(doc.gender, doc.sex),
      }));
      setDoctors(mapped);
    } catch (err) {
      console.error("Load doctors error:", err);
      setDoctors([]);
      setErrorMessage(err instanceof Error ? err.message : "Failed to refresh doctors");
    } finally {
      setDoctorsLoading(false);
    }
  };

  useEffect(() => {
    void loadDoctors();
  }, []);

  const handleReset = () => {
    analysisRequestId.current += 1;
    setInput("");
    setResult(null);
    setLoading(false);
    setSelectedSymptoms([]);
    setErrorMessage(null);
  };

  const handleRefresh = () => {
    handleReset();
    void loadDoctors();
  };

  const selectedSpecialist = useMemo(
    () => (result ? normalizeSpecialist(result.specialist) : null),
    [result]
  );
  const headerHeight = insets.top + 92;

  const recommendedDoctors = useMemo(() => {
    if (!selectedSpecialist) return [];

    return doctors
      .filter((doc) => doc.specialty.toLowerCase() === selectedSpecialist.toLowerCase())
      .sort((a, b) => {
        if (a.isAvailableToday !== b.isAvailableToday) {
          return Number(b.isAvailableToday) - Number(a.isAvailableToday);
        }
        if ((a.rating ?? 0) !== (b.rating ?? 0)) {
          return (b.rating ?? 0) - (a.rating ?? 0);
        }
        return a.queueLength - b.queueLength;
      })
      .slice(0, 6);
  }, [doctors, selectedSpecialist]);

  const handleAnalyze = () => {
    if (!input.trim()) return;
    const requestId = analysisRequestId.current + 1;
    analysisRequestId.current = requestId;
    setLoading(true);
    setResult(null);
    setErrorMessage(null);
    (async () => {
      try {
        const res = await apiFetch("/api/ai/symptom-check", {
          method: "POST",
          body: JSON.stringify({ symptoms: input.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.reason || data?.message || "Unable to analyze symptoms right now.");
        }
        const nextResult = normalizeSpecialist(data?.specialist || data?.result);
        const nextReason =
          data?.reason || "We recommend consulting a general doctor based on your symptoms.";
        const nextUrgency = normalizeUrgency(data?.urgency);
        if (analysisRequestId.current !== requestId) return;
        setResult({
          specialist: nextResult,
          reason: nextReason,
          urgency: nextUrgency,
        });
      } catch (err) {
        if (analysisRequestId.current !== requestId) return;
        const message = err instanceof Error ? err.message : "Unable to reach AI. Please try again.";
        setResult(null);
        setErrorMessage(message);
      } finally {
        if (analysisRequestId.current !== requestId) return;
        setLoading(false);
      }
    })();
  };

  const handleSelectSymptom = (label: string) => {
    setInput(label);
    setSelectedSymptoms([label]);
    setErrorMessage(null);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[THEME.header, THEME.headerAlt]}
        style={styles.headerBackdrop}
      />

      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.fixedHeader, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Symptom Checker</Text>
              <Text style={styles.headerSub}>Find the right doctor for your condition</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={handleRefresh}
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 18 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputCard}>
            <View style={styles.aiAccentRow}>
              <View style={styles.aiOrb}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.aiCopy}>
                <Text style={styles.aiEyebrow}>HealthLink AI Assistant</Text>
                <Text style={styles.aiSubcopy}>Smart symptom triage with live doctor matching</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Describe what you are feeling</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your symptoms (e.g. fever, headache)"
              placeholderTextColor={THEME.textSecondary}
              multiline
              value={input}
              onChangeText={(text) => {
                setInput(text);
                setSelectedSymptoms(
                  QUICK_SUGGESTIONS.filter((item) => item.toLowerCase() === text.trim().toLowerCase())
                );
              }}
            />
            <View style={styles.aiDivider} />
            <LinearGradient
              colors={[patientTheme.colors.primaryBlue, patientTheme.colors.aqua]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={!input ? [styles.analyzeBtn, styles.analyzeBtnDisabled] : styles.analyzeBtn}
            >
              <TouchableOpacity
                style={styles.analyzeBtnContent}
                onPress={handleAnalyze}
                disabled={loading || !input}
                activeOpacity={0.9}
              >
                <Text style={styles.analyzeBtnText}>Analyze Symptoms</Text>
                <Ionicons name="sparkles" size={18} color={THEME.white} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {!loading && result === null && (
            <View style={styles.suggestionSection}>
              <Text style={styles.sectionLabel}>Quick Suggestions</Text>
              <View style={styles.pillContainer}>
                {QUICK_SUGGESTIONS.map((item) => (
                  <SymptomPill
                    key={item}
                    label={item}
                    onPress={() => handleSelectSymptom(item)}
                    selected={selectedSymptoms.includes(item)}
                  />
                ))}
              </View>
            </View>
          )}

          {!loading && errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {loading && (
          <View style={styles.loadingContainer}>
              <LinearGradient
                colors={["rgba(3, 105, 161, 0.08)", "rgba(14, 165, 233, 0.14)"]}
                style={styles.loadingHalo}
              >
                <ActivityIndicator size="large" color={THEME.primary} />
              </LinearGradient>
              <Text style={styles.loadingText}>Analyzing symptoms...</Text>
              <Text style={styles.loadingSubtext}>HealthLink AI is matching symptoms with the right specialist.</Text>
          </View>
          )}

          {result !== null && !loading && (
            <View style={styles.resultContainer}>
              {result.urgency && (
                <View
                  style={[
                    styles.urgencyBadge,
                    result.urgency === "high" && styles.urgencyHigh,
                    result.urgency === "medium" && styles.urgencyMedium,
                    result.urgency === "low" && styles.urgencyLow,
                  ]}
                >
                  <Text style={styles.urgencyText}>
                    {result.urgency === "high"
                      ? "Urgent – Seek immediate care"
                      : result.urgency === "medium"
                        ? "Moderate condition"
                        : "Not urgent"}
                  </Text>
                </View>
              )}
              <View style={styles.resultCard}>
                <View style={styles.resultCardGlow} />
                <Text style={styles.resultLabel}>Recommended Specialist</Text>
                <Text style={styles.specialistName}>{selectedSpecialist}</Text>
                <Text style={styles.resultDesc}>
                  {result.reason
                    ? result.reason
                    : `Based on your symptoms of "${input}", a ${selectedSpecialist} can provide a thorough examination and primary care.`}
                </Text>

                <View style={styles.resultMetaRow}>
                  <View style={styles.resultMetaChip}>
                    <Ionicons name="pulse" size={14} color={THEME.primary} />
                    <Text style={styles.resultMetaText}>{result.urgency.toUpperCase()} PRIORITY</Text>
                  </View>
                  <View style={styles.resultMetaChip}>
                    <Ionicons name="medkit" size={14} color={THEME.primary} />
                    <Text style={styles.resultMetaText}>{selectedSpecialist}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.findDoctorBtn}
                  onPress={() =>
                    selectedSpecialist
                      ? navigation.navigate("DoctorSearchScreen", {
                          specialty: selectedSpecialist,
                        })
                      : undefined
                  }
                >
                  <Text style={styles.findDoctorText}>Find Doctors</Text>
                  <Ionicons name="search" size={18} color={THEME.primary} />
                </TouchableOpacity>
              </View>

              {recommendedDoctors.length > 0 ? (
                <View style={styles.featuredSection}>
                  <Text style={styles.featuredTitle}>Recommended Doctors</Text>
                  <FlatList
                    data={recommendedDoctors}
                    keyExtractor={(item) => String(item.id)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredList}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    snapToInterval={282}
                    renderItem={({ item }) => (
                      <DoctorRecommendationCard
                        doctor={item}
                        onPress={() => {
                          navigation.navigate("PatientDoctorDetails", {
                            doctorId: item.id,
                          });
                        }}
                      />
                    )}
                  />
                </View>
              ) : doctorsLoading ? (
                <View style={styles.emptyRecommendationCard}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                  <Text style={styles.emptyRecommendationTitle}>Loading specialists</Text>
                  <Text style={styles.emptyRecommendationText}>
                    Fetching live doctors for {selectedSpecialist}.
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyRecommendationCard}>
                  <Ionicons name="search" size={18} color={THEME.primary} />
                  <Text style={styles.emptyRecommendationTitle}>No doctors found for this specialty</Text>
                  <Text style={styles.emptyRecommendationText}>
                    Continue to search doctors and we will filter the directory for {selectedSpecialist}.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleReset}
              >
                <Text style={styles.resetText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.background },
  safe: { flex: 1, backgroundColor: THEME.background },
  headerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: THEME.header,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: "#02111F",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  headerTextWrap: {
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtn: {
    marginLeft: "auto",
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.6,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.74)",
    marginTop: 2,
    fontWeight: "600",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  inputCard: {
    backgroundColor: THEME.white,
    borderRadius: 26,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#E4EEF7",
    overflow: "hidden",
  },
  aiAccentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 14,
  },
  aiCopy: {
    flex: 1,
  },
  aiOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  aiEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: THEME.primary,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  aiSubcopy: {
    marginTop: 4,
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 10,
  },
  textInput: {
    minHeight: 124,
    fontSize: 16,
    color: THEME.textPrimary,
    textAlignVertical: "top",
    lineHeight: 24,
    marginBottom: 14,
  },
  aiDivider: {
    height: 1,
    backgroundColor: "#EBF2F8",
    marginBottom: 14,
  },
  analyzeBtn: {
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: patientTheme.colors.primaryBlue,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  analyzeBtnDisabled: {
    opacity: 0.55,
  },
  analyzeBtnContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  analyzeBtnText: { color: THEME.white, fontWeight: "800", fontSize: 16 },
  suggestionSection: { marginBottom: 30 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  pillContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  loadingContainer: { paddingVertical: 36, alignItems: "center" },
  loadingHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D7EBFA",
  },
  loadingText: { marginTop: 15, color: THEME.primary, fontWeight: "800", fontSize: 16 },
  loadingSubtext: {
    marginTop: 8,
    textAlign: "center",
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 22,
  },
  resultContainer: { marginBottom: 25 },
  urgencyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  urgencyText: { fontSize: 12, fontWeight: "700", color: THEME.white },
  urgencyHigh: { backgroundColor: "#EF4444" },
  urgencyMedium: { backgroundColor: "#F59E0B" },
  urgencyLow: { backgroundColor: "#10B981" },
  resultCard: {
    backgroundColor: THEME.white,
    borderRadius: 26,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    borderWidth: 1,
    borderColor: "#DCEAFB",
    overflow: "hidden",
  },
  resultCardGlow: {
    position: "absolute",
    top: -34,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(56,189,248,0.10)",
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  specialistName: { fontSize: 26, fontWeight: "900", color: THEME.textPrimary, marginVertical: 10 },
  resultDesc: { fontSize: 15, color: THEME.textSecondary, lineHeight: 22, marginBottom: 20 },
  resultMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  resultMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.softBlue,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultMetaText: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  findDoctorBtn: {
    backgroundColor: "#E6F1FF",
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  findDoctorText: { color: THEME.primary, fontWeight: "800", fontSize: 16 },
  resetBtn: { alignSelf: "center", marginTop: 15, padding: 10 },
  resetText: { color: THEME.textSecondary, fontWeight: "700", textDecorationLine: "underline" },
  featuredSection: { marginTop: 24 },
  featuredTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: THEME.textPrimary,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  featuredList: { paddingRight: 20 },
  emptyRecommendationCard: {
    marginTop: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 8,
  },
  emptyRecommendationTitle: {
    color: THEME.textPrimary,
    fontWeight: "800",
    fontSize: 15,
  },
  emptyRecommendationText: {
    color: THEME.textSecondary,
    lineHeight: 20,
    fontSize: 13,
  },
  featuredCard: {
    width: 266,
    backgroundColor: THEME.white,
    borderRadius: 20,
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E7EEF6",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  featuredImageWrap: {
    width: "100%",
    height: 170,
    overflow: "hidden",
    backgroundColor: "#EAF8FF",
    position: "relative",
  },
  featuredDoctorImage: {
    width: "100%",
    height: "100%",
  },
  featuredDoctorImageFallbackTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(234,248,255,0.12)",
  },
  featuredImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  recommendationAvailabilityBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  featuredCardContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  featuredName: { fontSize: 16, fontWeight: "900", color: THEME.textPrimary },
  featuredSpecialty: { fontSize: 13, color: THEME.primary, marginTop: 2, fontWeight: "700" },
  featuredMetaLine: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  featuredMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
    minHeight: 18,
  },
  featuredRating: { fontSize: 12, color: THEME.textSecondary },
  featuredDistance: { fontSize: 12, color: THEME.textSecondary },
  featuredInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    minHeight: 18,
  },
  featuredInfoText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  availabilityBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  availabilityBadgeInactive: {
    backgroundColor: "#F3F4F6",
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  availabilityTextActive: {
    color: "#15803D",
  },
  availabilityTextInactive: {
    color: "#6B7280",
  },
  featuredCta: {
    height: 36,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D8EAFE",
  },
  featuredCtaText: { color: THEME.primary, fontWeight: "700", fontSize: 13 },
});
