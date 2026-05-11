import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import FilterBottomSheet from "../../components/FilterBottomSheet";
import { apiFetch } from "../../config/api";
import { getFavorites, toggleFavorite as toggleFavoriteRequest } from "../../services/favoritesApi";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import { resolveImageUrl } from "../../utils/imageUrl";

const THEME = patientTheme.colors;
const MODERN_THEME = {
  primary: patientTheme.colors.modernPrimary,
  primaryAlt: patientTheme.colors.modernPrimaryAlt,
  white: patientTheme.colors.modernSurface,
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
  city?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
  rating?: number | null;
  reviews?: number | null;
  experience?: string | null;
  queueLength?: number | null;
  isAvailableToday?: boolean | null;
  assignedMedicalCentersCount?: number | null;
  nextAvailableSession?: {
    date: string;
    startTime: string;
    medicalCenterName?: string | null;
  } | null;
  profileImage?: string | null;
};

type DoctorSection = {
  title: string;
  items: DoctorCard[];
};

export default function DoctorSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const bottomSpacing = Math.max(insets.bottom, 16);
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
  const [error, setError] = useState<string | null>(null);
  const [favoriteDoctorIds, setFavoriteDoctorIds] = useState<string[]>([]);
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<string[]>([]);

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
        setError(null);
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
          city: typeof doc.city === "string" && doc.city.trim() ? doc.city.trim() : null,
          clinicId: doc.clinic_id ?? null,
          clinicName: doc.clinic_name ?? null,
          rating: doc.rating ?? null,
          reviews: doc.review_count ?? null,
          experience:
            doc.experience_years != null && !Number.isNaN(Number(doc.experience_years))
              ? `${Number(doc.experience_years)} years`
              : null,
          queueLength:
            doc.queue_length == null || Number.isNaN(Number(doc.queue_length))
              ? null
              : Number(doc.queue_length),
          isAvailableToday:
            typeof doc.is_available_today === "boolean" ? doc.is_available_today : null,
          assignedMedicalCentersCount:
            doc.assigned_medical_centers_count == null ||
            Number.isNaN(Number(doc.assigned_medical_centers_count))
              ? null
              : Number(doc.assigned_medical_centers_count),
          nextAvailableSession:
            typeof doc.next_session_date === "string" && typeof doc.next_session_start_time === "string"
              ? {
                  date: doc.next_session_date,
                  startTime: String(doc.next_session_start_time).slice(0, 5),
                  medicalCenterName:
                    typeof doc.next_session_clinic_name === "string"
                      ? doc.next_session_clinic_name
                      : null,
                }
              : null,
          profileImage: resolveImageUrl(doc.profile_image ?? null),
        }));
        setDoctors(mapped);
      } catch (err) {
        console.error("Load doctors error:", err);
        setDoctors([]);
        setError(err instanceof Error ? err.message : "Could not load doctors");
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadFavorites = async () => {
        try {
          const data = await getFavorites();
          setFavoriteDoctorIds(data.doctors.map((doc) => String(doc.entityId)));
        } catch (err) {
          console.error("Load favorite doctors error:", err);
        }
      };

      void loadFavorites();
      return undefined;
    }, [])
  );

  const filteredDoctors = useMemo(() => {
    let nextDoctors = [...doctors];

    if (filters.location) {
      const target = normalizeValue(filters.location);
      nextDoctors = nextDoctors.filter((doctor) => normalizeValue(doctor.city || "") === target);
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
        (doctor) =>
          doctor.queueLength != null &&
          doctor.queueLength < (filters.queue || Number.POSITIVE_INFINITY)
      );
    }

    if (filters.availableToday) {
      nextDoctors = nextDoctors.filter((doctor) => {
        if (doctor.isAvailableToday === true) {
          return true;
        }
        if (!doctor.nextAvailableSession?.date) {
          return false;
        }
        return doctor.nextAvailableSession.date === new Date().toISOString().slice(0, 10);
      });
    }

    if (search.trim()) {
      const searchTerm = normalizeValue(search);
      nextDoctors = nextDoctors.filter(
        (doctor) =>
          normalizeValue(doctor.name).includes(searchTerm) ||
          normalizeValue(doctor.specialty).includes(searchTerm) ||
          normalizeValue(doctor.city || "").includes(searchTerm)
      );
    }

    return nextDoctors.filter((doctor) => {
      if (activeTab === "All") {
        return true;
      }

      return normalizeValue(doctor.specialty || "") === normalizeValue(activeTab);
    });
  }, [activeTab, doctors, filters, search]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        search.trim() ||
          filters.location ||
          filters.specialty ||
          filters.rating ||
          filters.queue ||
          filters.availableToday ||
          activeTab !== "All"
      ),
    [activeTab, filters, search]
  );

  const doctorSections = useMemo<DoctorSection[]>(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const availableToday = filteredDoctors
      .filter(
        (doctor) =>
          doctor.isAvailableToday === true || doctor.nextAvailableSession?.date === todayKey
      )
      .slice(0, 8);
    const topRated = [...filteredDoctors]
      .filter((doctor) => doctor.rating != null && !Number.isNaN(Number(doctor.rating)))
      .sort((left, right) => Number(right.rating ?? 0) - Number(left.rating ?? 0))
      .slice(0, 8);
    const lowQueue = [...filteredDoctors]
      .filter((doctor) => doctor.queueLength != null)
      .sort((left, right) => (left.queueLength ?? 0) - (right.queueLength ?? 0))
      .slice(0, 8);

    return [
      { title: "Available today", items: availableToday },
      { title: "Top rated", items: topRated },
      ...(lowQueue.length > 0 ? [{ title: "Low queue", items: lowQueue }] : []),
    ].filter((section) => section.items.length > 0);
  }, [filteredDoctors]);

  const openDoctorDetails = useCallback(
    (doctorId: number) => {
      navigation.navigate("PatientDoctorDetails", { doctorId });
    },
    [navigation]
  );

  const toggleFavorite = async (doctorId: number) => {
    const favoriteKey = String(doctorId);
    if (favoriteBusyIds.includes(favoriteKey)) return;

    const isFavorite = favoriteDoctorIds.includes(favoriteKey);
    setFavoriteBusyIds((current) => [...current, favoriteKey]);
    setFavoriteDoctorIds((current) =>
      isFavorite ? current.filter((id) => id !== favoriteKey) : [...current, favoriteKey]
    );

    try {
      await toggleFavoriteRequest("doctor", favoriteKey, isFavorite);
    } catch (err) {
      setFavoriteDoctorIds((current) =>
        isFavorite ? [...current, favoriteKey] : current.filter((id) => id !== favoriteKey)
      );
      console.error("Toggle doctor favorite error:", err);
    } finally {
      setFavoriteBusyIds((current) => current.filter((id) => id !== favoriteKey));
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
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[MODERN_THEME.primary, MODERN_THEME.primaryAlt]}
          style={styles.headerBackground}
        />

        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.frozenTop}>
            <View style={styles.storefrontHeader}>
              <View style={styles.storefrontTopRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.storefrontIconBtn}>
                  <Ionicons name="arrow-back" size={20} color={THEME.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Find Doctor</Text>
                <TouchableOpacity
                  style={styles.storefrontIconBtn}
                  onPress={() => setIsFilterOpen(true)}
                >
                  <Ionicons name="options-outline" size={20} color={THEME.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.storefrontSearchRow}>
                <View style={styles.storefrontSearchBar}>
                  <Ionicons name="search-outline" size={22} color={THEME.textGray} />
                  <TextInput
                    placeholder="Search doctor, specialty, or city"
                    value={search}
                    onChangeText={setSearch}
                    style={styles.storefrontSearchInput}
                    placeholderTextColor={THEME.textGray}
                  />
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pharmacyCategoryTabs}
            >
              {CATEGORIES.map((category) => {
                const active = activeTab === category;
                return (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setActiveTab(category)}
                    style={styles.pharmacyCategoryTab}
                  >
                    <Text style={[styles.pharmacyCategoryText, active && styles.pharmacyCategoryTextActive]}>
                      {category}
                    </Text>
                    <View
                      style={[
                        styles.pharmacyCategoryUnderline,
                        active && styles.pharmacyCategoryUnderlineActive,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color={THEME.accentBlue} />
                  <Text style={styles.loadingText}>Loading doctors</Text>
                </View>
              ) : error ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="cloud-offline-outline" size={30} color={THEME.textGray} />
                  </View>
                  <Text style={styles.emptyTitle}>Could not load doctors</Text>
                  <Text style={styles.emptyText}>{error}</Text>
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
              ) : !hasActiveFilters ? (
                doctorSections.map((section) => (
                  <View key={section.title} style={styles.pharmacySectionBlock}>
                    <View style={styles.pharmacySectionHeader}>
                      <Text style={styles.pharmacySectionTitle}>{section.title}</Text>
                      <View style={styles.pharmacySectionArrow}>
                        <Ionicons name="arrow-forward" size={20} color={THEME.textDark} />
                      </View>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pharmacySectionRail}
                    >
                      {section.items.map((doctor) => {
                        const favoriteKey = String(doctor.id);
                        const isFavorite = favoriteDoctorIds.includes(favoriteKey);
                        const favoriteBusy = favoriteBusyIds.includes(favoriteKey);
                        return (
                          <DoctorListingCard
                            key={`${section.title}-${doctor.id}`}
                            doctor={doctor}
                            compact
                            isFavorite={isFavorite}
                            favoriteBusy={favoriteBusy}
                            onToggleFavorite={() => toggleFavorite(doctor.id)}
                            onOpenDetails={() => openDoctorDetails(doctor.id)}
                          />
                        );
                      })}
                    </ScrollView>
                  </View>
                ))
              ) : (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>
                        {search.trim() ? "Search results" : activeTab}
                      </Text>
                      <Text style={styles.sectionSub}>{`${filteredDoctors.length} matching doctors`}</Text>
                    </View>
                  </View>

                  <View style={styles.doctorGrid}>
                    {filteredDoctors.map((doctor) => {
                      const favoriteKey = String(doctor.id);
                      const isFavorite = favoriteDoctorIds.includes(favoriteKey);
                      const favoriteBusy = favoriteBusyIds.includes(favoriteKey);
                      return (
                        <DoctorListingCard
                          key={doctor.id}
                          doctor={doctor}
                          isFavorite={isFavorite}
                          favoriteBusy={favoriteBusy}
                          onToggleFavorite={() => toggleFavorite(doctor.id)}
                          onOpenDetails={() => openDoctorDetails(doctor.id)}
                        />
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            <View style={{ height: bottomSpacing + 56 }} />
          </ScrollView>

          <FilterBottomSheet
            visible={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            setFilters={setFilters}
            onApply={applyFilters}
            locations={locations}
            specialties={specialties}
          />

          <TouchableOpacity
            style={[styles.floatingFab, { bottom: bottomSpacing + 12 }]}
            onPress={() => navigation.navigate("SymptomChecker")}
            activeOpacity={0.9}
          >
            <Ionicons name="sparkles-outline" size={24} color={THEME.white} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

function DoctorListingCard({
  doctor,
  compact = false,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
  onOpenDetails,
}: {
  doctor: DoctorCard;
  compact?: boolean;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
  onOpenDetails: () => void;
}) {
  const hasImage = typeof doctor.profileImage === "string" && doctor.profileImage.trim().length > 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  const isAvailableToday =
    doctor.isAvailableToday === true || doctor.nextAvailableSession?.date === todayKey;
  const hasNextSession = Boolean(doctor.nextAvailableSession?.date && doctor.nextAvailableSession?.startTime);
  const availabilityLabel = isAvailableToday
    ? "Available today"
    : hasNextSession
      ? "Next available"
      : null;
  const centerCountLabel =
    typeof doctor.assignedMedicalCentersCount === "number" && doctor.assignedMedicalCentersCount > 0
      ? `Available at ${doctor.assignedMedicalCentersCount} medical center${
          doctor.assignedMedicalCentersCount === 1 ? "" : "s"
        }`
      : null;
  const nextSessionLabel =
    hasNextSession && doctor.nextAvailableSession
      ? `Next: ${
          doctor.nextAvailableSession.date === todayKey ? "Today" : doctor.nextAvailableSession.date
        } ${doctor.nextAvailableSession.startTime}${
          doctor.nextAvailableSession.medicalCenterName
            ? ` · ${doctor.nextAvailableSession.medicalCenterName}`
            : ""
        }`
      : null;
  const locationLabel =
    doctor.clinicName && doctor.city
      ? `${doctor.clinicName} • ${doctor.city}`
      : doctor.clinicName || doctor.city || null;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpenDetails}
      style={[styles.doctorListingCard, compact ? styles.doctorListingCompact : styles.doctorListingGrid]}
    >
      <View style={styles.doctorImageShell}>
        {hasImage ? (
          <Image source={{ uri: doctor.profileImage! }} style={styles.doctorListingImage} />
        ) : (
          <View style={styles.doctorListingFallback}>
            <View style={styles.doctorListingFallbackAvatar}>
              <View style={styles.doctorListingFallbackAura} />
              <View style={styles.doctorListingFallbackHair} />
              <View style={styles.doctorListingFallbackHead} />
              <View style={styles.doctorListingFallbackNeck} />
              <View style={styles.doctorListingFallbackCoat} />
              <View style={styles.doctorListingFallbackShirt} />
              <View style={styles.doctorListingFallbackTie} />
              <View style={styles.doctorListingFallbackStethoscopeLeft} />
              <View style={styles.doctorListingFallbackStethoscopeRight} />
              <View style={styles.doctorListingFallbackStethoscopeChest} />
              <View style={styles.doctorListingFallbackStethoscopeBell} />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.doctorFavoriteBtn, favoriteBusy ? styles.favoriteBtnDisabled : null]}
          onPress={onToggleFavorite}
          disabled={favoriteBusy}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={isFavorite ? THEME.accentRed : THEME.textGray}
          />
        </TouchableOpacity>

        {availabilityLabel ? (
          <View
            style={[
              styles.doctorAvailabilityBadge,
              isAvailableToday ? styles.statusAvailable : styles.statusLimited,
            ]}
          >
            <Text
              style={[
                styles.doctorAvailabilityText,
                { color: isAvailableToday ? THEME.accentGreen : THEME.accentAmber },
              ]}
            >
              {availabilityLabel}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.doctorActionOrb}
          onPress={onOpenDetails}
          accessibilityRole="button"
          accessibilityLabel="View availability"
        >
          <Ionicons name="arrow-forward" size={22} color="#111111" />
        </TouchableOpacity>
      </View>

      <View style={styles.doctorListingInfo}>
        <Text style={styles.doctorListingName} numberOfLines={1}>
          {doctor.name}
        </Text>
        <Text style={styles.doctorListingSpecialty} numberOfLines={1}>
          {doctor.specialty}
        </Text>
        {centerCountLabel ? (
          <Text style={styles.doctorListingMeta} numberOfLines={1}>
            {centerCountLabel}
          </Text>
        ) : locationLabel ? (
          <Text style={styles.doctorListingMeta} numberOfLines={1}>
            {locationLabel}
          </Text>
        ) : null}
        {nextSessionLabel ? (
          <Text style={styles.doctorListingMetaSecondary} numberOfLines={2}>
            {nextSessionLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.background },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 176,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
  frozenTop: {
    zIndex: 2,
  },
  scroll: { flex: 1, backgroundColor: THEME.background },
  storefrontHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "transparent",
  },
  storefrontTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.white,
  },
  storefrontIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: "#03045E",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  storefrontSearchRow: {
    paddingBottom: 4,
  },
  storefrontSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 30,
    paddingHorizontal: 18,
    height: 64,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#03045E",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  storefrontSearchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.textDark,
    marginLeft: 12,
    fontWeight: "400",
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 10,
  },
  pharmacyCategoryTabs: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 12,
  },
  pharmacyCategoryTab: {
    paddingHorizontal: 12,
    paddingTop: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  pharmacyCategoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: THEME.textGray,
  },
  pharmacyCategoryTextActive: {
    fontWeight: "700",
    color: THEME.accentBlue,
  },
  pharmacyCategoryUnderline: {
    height: 3,
    width: 62,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginTop: 10,
  },
  pharmacyCategoryUnderlineActive: {
    backgroundColor: THEME.accentBlue,
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
    paddingTop: 8,
  },
  pharmacySectionBlock: {
    marginBottom: 28,
  },
  pharmacySectionHeader: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pharmacySectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textDark,
    letterSpacing: -0.2,
  },
  pharmacySectionArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.highlight,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pharmacySectionRail: {
    paddingRight: 20,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textDark,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 12,
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
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: THEME.accentBlueSoft,
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
  doctorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  doctorListingCard: {
    marginBottom: 24,
  },
  doctorListingCompact: {
    width: 246,
    marginRight: 18,
  },
  doctorListingGrid: {
    width: "48%",
  },
  doctorImageShell: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: THEME.highlight,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  doctorListingImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  doctorListingFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F4EF",
  },
  doctorListingFallbackAvatar: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  doctorListingFallbackAura: {
    position: "absolute",
    top: "10%",
    width: "58%",
    height: "34%",
    borderRadius: 999,
    backgroundColor: "#D8F1D6",
  },
  doctorListingFallbackHair: {
    position: "absolute",
    top: "20%",
    width: "28%",
    height: "15%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 12,
    backgroundColor: "#5B341F",
  },
  doctorListingFallbackHead: {
    position: "absolute",
    top: "23%",
    width: "24%",
    height: "19%",
    borderRadius: 999,
    backgroundColor: "#F2C9A5",
  },
  doctorListingFallbackNeck: {
    position: "absolute",
    top: "39%",
    width: "8%",
    height: "6%",
    borderRadius: 10,
    backgroundColor: "#E5B48C",
  },
  doctorListingFallbackCoat: {
    position: "absolute",
    bottom: "-4%",
    width: "84%",
    height: "48%",
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    backgroundColor: "#FFFFFF",
  },
  doctorListingFallbackShirt: {
    position: "absolute",
    bottom: "16%",
    width: "22%",
    height: "18%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#8FD3DA",
  },
  doctorListingFallbackTie: {
    position: "absolute",
    bottom: "17%",
    width: "5%",
    height: "17%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#1F2937",
  },
  doctorListingFallbackStethoscopeLeft: {
    position: "absolute",
    bottom: "24%",
    left: "27%",
    width: "17%",
    height: "22%",
    borderWidth: 3,
    borderColor: "#2B77B7",
    borderTopColor: "transparent",
    borderRightColor: "#2B77B7",
    borderBottomColor: "#2B77B7",
    borderLeftColor: "#2B77B7",
    borderRadius: 28,
    transform: [{ rotate: "10deg" }],
    backgroundColor: "transparent",
  },
  doctorListingFallbackStethoscopeRight: {
    position: "absolute",
    bottom: "24%",
    right: "27%",
    width: "17%",
    height: "22%",
    borderWidth: 3,
    borderColor: "#2B77B7",
    borderTopColor: "transparent",
    borderRadius: 28,
    transform: [{ rotate: "-10deg" }],
    backgroundColor: "transparent",
  },
  doctorListingFallbackStethoscopeChest: {
    position: "absolute",
    bottom: "20%",
    width: "18%",
    height: "11%",
    borderBottomWidth: 3,
    borderColor: "#2B77B7",
    borderRadius: 20,
  },
  doctorListingFallbackStethoscopeBell: {
    position: "absolute",
    bottom: "18%",
    right: "26%",
    width: "7%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "#C7CDD4",
    borderWidth: 2,
    borderColor: "#9AA4AF",
  },
  doctorFavoriteBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.98)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  doctorAvailabilityBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  doctorAvailabilityText: {
    fontSize: 10,
    fontWeight: "800",
  },
  doctorActionOrb: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#03045E",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  doctorListingInfo: {
    paddingTop: 12,
  },
  doctorListingName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: THEME.textDark,
  },
  doctorListingSpecialty: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: THEME.textGray,
  },
  doctorListingMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: THEME.textMuted,
  },
  doctorListingMetaSecondary: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: THEME.textGray,
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
  favoriteBtnDisabled: {
    opacity: 0.55,
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
    borderWidth: 1,
    borderColor: THEME.softAqua,
    shadowColor: "#03045E",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
});
