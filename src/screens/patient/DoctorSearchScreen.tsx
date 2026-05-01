import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import FilterBottomSheet from "../../components/FilterBottomSheet";
import { apiFetch } from "../../config/api";
import { addFavorite, getFavorites, removeFavorite } from "../../services/favoritesApi";
import type { PatientStackParamList } from "../../types/navigation";

const THEME = {
  background: "#F5F7FC",
  white: "#FFFFFF",
  textDark: "#162033",
  textGray: "#6D7890",
  textMuted: "#98A2B3",
  border: "#DFE6F0",
  accentBlue: "#2F6FED",
  accentBlueSoft: "#EAF1FF",
  accentGreen: "#18B67A",
  accentGreenSoft: "#E6FAF3",
  accentAmber: "#F59E0B",
  accentAmberSoft: "#FEF3C7",
  accentRed: "#EF4444",
  heroStart: "#DCEBFF",
  heroEnd: "#F9FBFF",
};

const CATEGORIES = [
  "All",
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Dentist",
  "Neurologist",
];

const normalizeValue = (value: string) => value.trim().toLowerCase();

type DoctorCard = {
  id: number;
  name: string;
  specialty: string;
  city: string;
  clinicId?: string | null;
  clinicName?: string | null;
  rating?: number | null;
  reviews?: number | null;
  experience: string;
  queueLength: number;
  isAvailableToday: boolean;
  available: boolean;
  profileImage?: string | null;
};

export default function DoctorSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<any>();
  const tabBarHeight = useBottomTabBarHeight();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    specialty: "",
    rating: null as number | null,
    queue: null as number | null,
    availableToday: false,
  });
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favoriteDoctorIds, setFavoriteDoctorIds] = useState<number[]>([]);

  const locations = useMemo(
    () => [
      "Colombo",
      "Kandy",
      "Galle",
      "Jaffna",
      "Negombo",
      "Kurunegala",
      "Anuradhapura",
      "Matara",
      "Batticaloa",
      "Trincomalee",
      "Ratnapura",
      "Badulla",
      "Kalutara",
      "Gampaha",
    ],
    []
  );

  const specialties = useMemo(
    () => [
      "General Physician",
      "Cardiologist",
      "Dermatologist",
      "Pediatrician",
      "Orthopedic",
      "Neurologist",
      "ENT Specialist",
      "Psychiatrist",
      "Gynecologist",
    ],
    []
  );

  useEffect(() => {
    const specialtyParam = route?.params?.specialty;
    if (typeof specialtyParam === "string" && specialtyParam.trim()) {
      const normalized = specialtyParam.trim().toLowerCase();
      const matched = CATEGORIES.find((cat) => cat.toLowerCase() === normalized) || "All";
      setActiveTab(matched);
      setFilters((prev) => ({
        ...prev,
        specialty: matched === "All" ? "" : matched,
      }));
    }
  }, [route?.params?.specialty]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/api/patients/doctors");
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load doctors");
        }
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map((doc: any) => ({
          id: Number(doc.doctor_id),
          name: doc.name ?? "Doctor",
          specialty: doc.specialization ?? "General Physician",
          city: doc.city ?? "Colombo",
          clinicId: doc.clinic_id ?? null,
          clinicName: doc.clinic_name ?? null,
          rating: doc.rating ?? null,
          reviews: doc.review_count ?? null,
          experience: doc.experience_years ? `${doc.experience_years} years` : "N/A",
          queueLength: Number(doc.queue_length ?? 0),
          isAvailableToday: Boolean(doc.is_available_today),
          available: Boolean(doc.is_available_today),
          profileImage: doc.profile_image ?? null,
        }));
        setDoctors(mapped);
      } catch (err) {
        console.error("Load doctors error:", err);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const data = await getFavorites();
        setFavoriteDoctorIds(data.doctors.map((doc) => Number(doc.id)));
      } catch (err) {
        console.error("Load favorite doctors error:", err);
      }
    };

    loadFavorites();
  }, []);

  const filteredDoctors = useMemo(() => {
    let nextDoctors = [...doctors];

    if (filters.location) {
      const target = normalizeValue(filters.location);
      nextDoctors = nextDoctors.filter((doctor) => normalizeValue(doctor.city) === target);
    }

    if (filters.specialty) {
      const target = normalizeValue(filters.specialty);
      nextDoctors = nextDoctors.filter((doctor) => normalizeValue(doctor.specialty) === target);
    }

    if (filters.rating) {
      nextDoctors = nextDoctors.filter((doctor) => (doctor.rating ?? 0) >= (filters.rating || 0));
    }

    if (filters.queue) {
      nextDoctors = nextDoctors.filter(
        (doctor) => doctor.queueLength < (filters.queue || Number.POSITIVE_INFINITY)
      );
    }

    if (filters.availableToday) {
      nextDoctors = nextDoctors.filter((doctor) => doctor.isAvailableToday);
    }

    if (search.trim()) {
      const searchTerm = normalizeValue(search);
      nextDoctors = nextDoctors.filter(
        (doctor) =>
          normalizeValue(doctor.name).includes(searchTerm) ||
          normalizeValue(doctor.specialty).includes(searchTerm) ||
          normalizeValue(doctor.city).includes(searchTerm)
      );
    }

    return nextDoctors.filter((doctor) => {
      if (activeTab === "All") {
        return true;
      }

      return normalizeValue(doctor.specialty) === normalizeValue(activeTab);
    });
  }, [activeTab, doctors, filters, search]);

  const counts = useMemo(() => {
    const availableToday = doctors.filter((doctor) => doctor.isAvailableToday).length;
    const lowQueue = doctors.filter((doctor) => doctor.queueLength <= 5).length;
    return {
      total: doctors.length,
      availableToday,
      lowQueue,
    };
  }, [doctors]);

  const toggleFavorite = async (doctorId: number) => {
    const isFavorite = favoriteDoctorIds.includes(doctorId);
    setFavoriteDoctorIds((current) =>
      isFavorite ? current.filter((id) => id !== doctorId) : [...current, doctorId]
    );

    try {
      if (isFavorite) {
        await removeFavorite(doctorId, "doctor");
      } else {
        await addFavorite(doctorId, "doctor");
      }
    } catch (err) {
      setFavoriteDoctorIds((current) =>
        isFavorite ? [...current, doctorId] : current.filter((id) => id !== doctorId)
      );
      console.error("Toggle doctor favorite error:", err);
    }
  };

  const applyFilters = (nextFilters = filters) => {
    setFilters(nextFilters);
    if (nextFilters.specialty) {
      setActiveTab(nextFilters.specialty);
    } else {
      setActiveTab("All");
    }
    setIsFilterOpen(false);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.topRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={THEME.textDark} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setIsFilterOpen(true)}
              >
                <Ionicons name="options-outline" size={22} color={THEME.accentBlue} />
              </TouchableOpacity>
            </View>

            <Text style={styles.headerTitle}>Find Doctors</Text>
            <Text style={styles.headerSub}>
              Search specialists, compare availability, and book the right visit faster.
            </Text>

            <View style={styles.searchShell}>
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={THEME.accentBlue} />
                <TextInput
                  placeholder="Search doctor, specialty, or city"
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  placeholderTextColor={THEME.textMuted}
                />
              </View>

              <TouchableOpacity
                style={styles.quickFilterButton}
                onPress={() => setIsFilterOpen(true)}
              >
                <Ionicons name="funnel-outline" size={18} color={THEME.textDark} />
                <Text style={styles.quickFilterText}>Filters</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <StatsPill
                label="Doctors"
                value={String(counts.total)}
                tint={THEME.accentBlueSoft}
                color={THEME.accentBlue}
                icon="people-outline"
              />
              <StatsPill
                label="Today"
                value={String(counts.availableToday)}
                tint={THEME.accentGreenSoft}
                color={THEME.accentGreen}
                icon="checkmark-circle-outline"
              />
              <StatsPill
                label="Low Queue"
                value={String(counts.lowQueue)}
                tint={THEME.accentAmberSoft}
                color={THEME.accentAmber}
                icon="flash-outline"
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((category) => {
              const active = activeTab === category;
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setActiveTab(category)}
                  style={[styles.categoryPill, active && styles.activeCategoryPill]}
                >
                  <Text style={[styles.categoryText, active && styles.activeCategoryText]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recommended For You</Text>
                <Text style={styles.sectionSub}>
                  {loading
                    ? "Loading doctor directory..."
                    : `${filteredDoctors.length} matching doctors`}
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={THEME.accentBlue} />
                <Text style={styles.loadingText}>Preparing the doctor directory</Text>
              </View>
            ) : filteredDoctors.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="medkit-outline" size={30} color={THEME.textGray} />
                </View>
                <Text style={styles.emptyTitle}>No doctors found</Text>
                <Text style={styles.emptyText}>
                  Try another specialty, city, or search keyword.
                </Text>
              </View>
            ) : (
              filteredDoctors.map((doctor) => {
                const isFavorite = favoriteDoctorIds.includes(doctor.id);
                return (
                  <View key={doctor.id} style={styles.doctorCard}>
                    <View style={styles.docMainInfo}>
                      {doctor.profileImage ? (
                        <Image source={{ uri: doctor.profileImage }} style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarInitials}>
                            {doctor.name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part.charAt(0).toUpperCase())
                              .join("") || "DR"}
                          </Text>
                        </View>
                      )}

                      <View style={styles.detailsContainer}>
                        <View style={styles.nameRow}>
                          <Text style={styles.docName}>{doctor.name}</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              doctor.available ? styles.statusAvailable : styles.statusLimited,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: doctor.available ? THEME.accentGreen : THEME.accentAmber },
                              ]}
                            >
                              {doctor.available ? "Available Today" : "Limited Today"}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.docSpec}>{doctor.specialty}</Text>
                        <Text style={styles.docMeta}>{doctor.city}</Text>

                        <View style={styles.metricsRow}>
                          <MetricChip
                            icon="star"
                            value={
                              doctor.rating != null ? Number(doctor.rating).toFixed(1) : "New"
                            }
                            tone="amber"
                          />
                          <MetricChip
                            icon="briefcase-outline"
                            value={doctor.experience}
                            tone="blue"
                          />
                          <MetricChip
                            icon="git-network-outline"
                            value={`Queue ${doctor.queueLength}`}
                            tone="green"
                          />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.favoriteBtn}
                        onPress={() => toggleFavorite(doctor.id)}
                      >
                        <Ionicons
                          name={isFavorite ? "heart" : "heart-outline"}
                          size={22}
                          color={isFavorite ? THEME.accentRed : THEME.textGray}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.secondaryAction}
                        onPress={() => {
                          if (!doctor.clinicId) {
                            Alert.alert("Clinic Required", "This doctor does not have an active clinic schedule right now.");
                            return;
                          }
                          navigation.navigate("DoctorAvailabilityScreen", {
                            doctorId: doctor.id,
                            clinicId: doctor.clinicId,
                            clinicName: doctor.clinicName ?? undefined,
                            doctorName: doctor.name,
                            specialty: doctor.specialty,
                          });
                        }}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={THEME.textDark}
                        />
                        <Text style={styles.secondaryActionText}>Availability</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.primaryAction}
                        onPress={() => {
                          if (!doctor.clinicId) {
                            Alert.alert("Clinic Required", "This doctor does not have an active clinic schedule right now.");
                            return;
                          }
                          navigation.navigate("BookAppointmentScreen", {
                            doctorId: doctor.id,
                            clinicId: doctor.clinicId,
                            clinicName: doctor.clinicName ?? undefined,
                            doctorName: doctor.name,
                            specialty: doctor.specialty,
                            experienceYears: Number.isNaN(Number.parseInt(doctor.experience, 10))
                              ? undefined
                              : Number.parseInt(doctor.experience, 10),
                            rating:
                              doctor.rating == null || Number.isNaN(Number(doctor.rating))
                                ? undefined
                                : Number(doctor.rating),
                            reviewCount:
                              doctor.reviews == null || Number.isNaN(Number(doctor.reviews))
                                ? undefined
                                : Number(doctor.reviews),
                          });
                        }}
                      >
                        <Text style={styles.primaryActionText}>Book Appointment</Text>
                        <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: tabBarHeight + 40 }} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.floatingFab, { bottom: tabBarHeight + 28 }]}
          onPress={() => navigation.navigate("SymptomChecker")}
          activeOpacity={0.9}
        >
          <Ionicons name="sparkles" size={22} color={THEME.white} />
        </TouchableOpacity>

        <FilterBottomSheet
          visible={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          setFilters={setFilters}
          onApply={applyFilters}
          locations={locations}
          specialties={specialties}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function StatsPill({
  label,
  value,
  tint,
  color,
  icon,
}: {
  label: string;
  value: string;
  tint: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statsPill}>
      <View style={[styles.statsIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View>
        <Text style={[styles.statsValue, { color }]}>{value}</Text>
        <Text style={styles.statsLabel}>{label}</Text>
      </View>
    </View>
  );
}

function MetricChip({
  icon,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  tone: "amber" | "blue" | "green";
}) {
  const toneMap = {
    amber: { bg: "#FFF6D8", color: "#D97706" },
    blue: { bg: "#E8F1FF", color: "#2F6FED" },
    green: { bg: "#E6FAF3", color: "#18B67A" },
  } as const;

  const palette = toneMap[tone];

  return (
    <View style={[styles.metricChip, { backgroundColor: palette.bg }]}>
      <Ionicons name={icon} size={13} color={palette.color} />
      <Text style={[styles.metricChipText, { color: palette.color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { flex: 1, backgroundColor: THEME.background },
  hero: {
    backgroundColor: THEME.white,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.accentBlueSoft,
  },
  headerTitle: {
    marginTop: 20,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    color: THEME.textDark,
  },
  headerSub: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textGray,
    maxWidth: "92%",
  },
  searchShell: {
    marginTop: 22,
    padding: 14,
    borderRadius: 24,
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#E7EEF8",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: THEME.textDark,
  },
  quickFilterButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textDark,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    gap: 10,
  },
  statsPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statsIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  statsLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
    fontWeight: "700",
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeCategoryPill: {
    backgroundColor: THEME.accentBlue,
    borderColor: THEME.accentBlue,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textGray,
  },
  activeCategoryText: {
    color: THEME.white,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: THEME.textDark,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textGray,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: THEME.textGray,
  },
  emptyState: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EEF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: THEME.textDark,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: THEME.textGray,
    textAlign: "center",
    lineHeight: 20,
  },
  doctorCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#18212F",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  docMainInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.accentBlue,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  docName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    color: THEME.textDark,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusAvailable: {
    backgroundColor: THEME.accentGreenSoft,
  },
  statusLimited: {
    backgroundColor: THEME.accentAmberSoft,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  docSpec: {
    fontSize: 15,
    color: THEME.textGray,
    marginTop: 4,
    fontWeight: "700",
  },
  docMeta: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 5,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metricChipText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "800",
  },
  favoriteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textDark,
  },
  primaryAction: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: THEME.accentBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "900",
    color: THEME.white,
  },
  floatingFab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.accentBlue,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
});
