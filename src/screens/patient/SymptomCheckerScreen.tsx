import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { PatientStackParamList } from "../../types/navigation";
import SymptomPill from "../../components/patient/SymptomPill";

const THEME = {
  primary: "#2563EB",
  background: "#F9FAFB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  softBlue: "#EFF6FF",
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

export default function SymptomCheckerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
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
        experience: doc.experience_years ? `${doc.experience_years} Years` : "N/A",
        queueLength: Number(doc.queue_length ?? 0),
        isAvailableToday: Boolean(doc.is_available_today),
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

  const selectedSpecialist = useMemo(
    () => (result ? normalizeSpecialist(result.specialist) : null),
    [result]
  );

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Symptom Checker</Text>
          <Text style={styles.headerSub}>Find the right doctor for your condition</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            handleReset();
          }}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={THEME.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.inputCard}>
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
          <TouchableOpacity
            style={[styles.analyzeBtn, !input && { opacity: 0.6 }]}
            onPress={handleAnalyze}
            disabled={loading}
          >
            <Text style={styles.analyzeBtnText}>Analyze Symptoms</Text>
            <Ionicons name="sparkles" size={18} color={THEME.white} />
          </TouchableOpacity>
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
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.loadingText}>Analyzing symptoms...</Text>
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
                  snapToInterval={232}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.featuredCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (!item.clinicId) {
                          return;
                        }
                        navigation.navigate("DoctorAvailabilityScreen", {
                          doctorId: item.id,
                          clinicId: item.clinicId,
                          clinicName: item.clinicName ?? undefined,
                          doctorName: item.name,
                          specialty: item.specialty,
                        });
                      }}
                    >
                      <View style={styles.featuredAvatar}>
                        <Text style={styles.featuredAvatarText}>
                          {item.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("") || "DR"}
                        </Text>
                      </View>
                      <Text style={styles.featuredName}>{item.name}</Text>
                      <Text style={styles.featuredSpecialty}>{item.specialty}</Text>
                      <View style={styles.featuredMetaRow}>
                        <Text style={styles.featuredRating}>
                          {item.rating ? `⭐ ${item.rating.toFixed(1)}` : "New"}
                        </Text>
                        <Text style={styles.featuredDistance}>{item.city}</Text>
                      </View>
                      <View style={styles.featuredInfoRow}>
                        <Text style={styles.featuredInfoText}>{item.experience}</Text>
                        <Text style={styles.featuredInfoText}>
                          Queue {item.queueLength}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.availabilityBadge,
                          item.isAvailableToday
                            ? styles.availabilityBadgeActive
                            : styles.availabilityBadgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.availabilityText,
                            item.isAvailableToday
                              ? styles.availabilityTextActive
                              : styles.availabilityTextInactive,
                          ]}
                        >
                          {item.isAvailableToday ? "Available Today" : "Schedule Ahead"}
                        </Text>
                      </View>
                      <View style={styles.featuredCta}>
                        <Text style={styles.featuredCtaText}>View Slots</Text>
                      </View>
                    </TouchableOpacity>
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

        <Text style={styles.disclaimer}>
          This is not a medical diagnosis.{"\n"}Please consult a doctor for professional advice.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTextWrap: {
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtn: {
    marginLeft: "auto",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  scrollContent: { padding: 20 },
  inputCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 10,
  },
  textInput: {
    minHeight: 120,
    fontSize: 16,
    color: THEME.textPrimary,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  analyzeBtn: {
    backgroundColor: THEME.primary,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  analyzeBtnText: { color: THEME.white, fontWeight: "800", fontSize: 16 },
  suggestionSection: { marginBottom: 25 },
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
  loadingContainer: { paddingVertical: 40, alignItems: "center" },
  loadingText: { marginTop: 15, color: THEME.primary, fontWeight: "700", fontSize: 16 },
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
    borderRadius: 24,
    padding: 24,
    shadowColor: THEME.primary,
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: THEME.softBlue,
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
    backgroundColor: THEME.softBlue,
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
  featuredSection: { marginTop: 20 },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 12,
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
    width: 220,
    backgroundColor: THEME.white,
    borderRadius: 16,
    marginRight: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  featuredAvatar: {
    width: "100%",
    height: 110,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredAvatarText: {
    color: THEME.primary,
    fontSize: 28,
    fontWeight: "900",
  },
  featuredName: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  featuredSpecialty: { fontSize: 13, color: THEME.primary, marginTop: 2 },
  featuredMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 10,
  },
  featuredRating: { fontSize: 12, color: THEME.textSecondary },
  featuredDistance: { fontSize: 12, color: THEME.textSecondary },
  featuredInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  featuredInfoText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  availabilityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
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
  },
  featuredCtaText: { color: THEME.primary, fontWeight: "700", fontSize: 13 },
  disclaimer: {
    textAlign: "center",
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
    marginTop: 10,
  },
});
