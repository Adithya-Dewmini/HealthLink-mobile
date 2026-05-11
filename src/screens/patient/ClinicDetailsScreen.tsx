import React, { memo, useCallback, useMemo, useState } from "react";
import {
  Alert,
  StatusBar,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../../config/api";
import { getFavorites, toggleFavorite as toggleFavoriteRequest } from "../../services/favoritesApi";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import { resolveImageUrl } from "../../utils/imageUrl";

const THEME = patientTheme.colors;

const SHADOW = patientTheme.shadows.card;

const MODERN_THEME = {
  primary: THEME.modernPrimary,
  accent: THEME.modernAccent,
  accentDark: THEME.modernAccentDark,
  success: "#10B981",
  white: THEME.white,
  bg: THEME.modernBackground,
  border: "rgba(226, 232, 240, 0.8)",
};

type ClinicDetailsRoute = RouteProp<PatientStackParamList, "PatientClinicDetails">;
type Navigation = NativeStackNavigationProp<PatientStackParamList>;
type ActiveTab = "doctors" | "services";
type DoctorFilter = "ALL" | "AVAILABLE" | "SPECIALIST";

type ClinicDoctor = {
  id: number;
  clinic_id?: string;
  name: string;
  specialization: string;
  experience_years: number;
  profile_image: string | null;
  clinic_name: string;
  rating: number;
  review_count: number;
  is_available_today: boolean;
  next_available_time: string | null;
};

type CanonicalClinicDetails = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  location?: string | null;
  type?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  average_wait?: string | null;
  average_wait_minutes?: number | null;
  next_available?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  doctor_count?: number | null;
  available_today_count?: number | null;
  top_specialty?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
};

const DOCTOR_FILTERS: Array<{ key: DoctorFilter; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "AVAILABLE", label: "Available Today" },
  { key: "SPECIALIST", label: "Specialist" },
];

const SERVICE_ITEMS = [
  {
    id: "consultation",
    title: "Consultation",
    description: "General and specialist consultations with scheduled appointment slots.",
    icon: "medkit-outline" as const,
    tone: THEME.softBlue,
  },
  {
    id: "pharmacy",
    title: "Pharmacy Availability",
    description: "Prescription fulfillment and medicine pickup support at the clinic.",
    icon: "medical-outline" as const,
    tone: THEME.softGreen,
  },
  {
    id: "lab",
    title: "Lab Services",
    description: "Basic diagnostics, blood work, and sample collection during clinic hours.",
    icon: "flask-outline" as const,
    tone: THEME.softOrange,
  },
];

const normalize = (value: string) => value.trim().toLowerCase();

const getStatusTone = (status: string) => {
  if (status === "OPEN") return MODERN_THEME.success;
  if (status === "QUEUE LIVE") return MODERN_THEME.accent;
  return THEME.red;
};

const normalizeDoctorRecord = (item: Partial<ClinicDoctor> & Record<string, unknown>): ClinicDoctor => ({
  id: Number(item.id ?? 0),
  clinic_id: String(item.clinic_id ?? item.clinicId ?? ""),
  name: String(item.name ?? "Doctor"),
  specialization: String(item.specialization ?? item.speciality ?? "General Physician"),
  experience_years: Number(item.experience_years ?? item.experienceYears ?? 0),
  profile_image: resolveImageUrl(
    typeof item.profile_image === "string"
      ? item.profile_image
      : typeof item.profileImage === "string"
        ? item.profileImage
        : null
  ),
  clinic_name: String(item.clinic_name ?? item.clinicName ?? ""),
  rating: Number(item.rating ?? 0),
  review_count: Number(item.review_count ?? item.reviewCount ?? 0),
  is_available_today: Boolean(item.is_available_today ?? item.isAvailableToday),
  next_available_time:
    typeof item.next_available_time === "string"
      ? item.next_available_time
      : typeof item.nextAvailableTime === "string"
        ? item.nextAvailableTime
        : null,
});

const normalizeClinicDetails = (
  item: Partial<CanonicalClinicDetails> & Record<string, unknown>
): CanonicalClinicDetails => ({
  id: String(item.id ?? ""),
  name: String(item.name ?? "Medical Center"),
  address: typeof item.address === "string" ? item.address : null,
  city: typeof item.city === "string" ? item.city : null,
  location: typeof item.location === "string" ? item.location : null,
  type: typeof item.type === "string" ? item.type : null,
  phone: typeof item.phone === "string" ? item.phone : null,
  email: typeof item.email === "string" ? item.email : null,
  status: typeof item.status === "string" ? item.status : null,
  average_wait: typeof item.average_wait === "string" ? item.average_wait : null,
  average_wait_minutes:
    typeof item.average_wait_minutes === "number" ? item.average_wait_minutes : null,
  next_available: typeof item.next_available === "string" ? item.next_available : null,
  image_url: resolveImageUrl(typeof item.image_url === "string" ? item.image_url : null),
  logo_url: resolveImageUrl(typeof item.logo_url === "string" ? item.logo_url : null),
  cover_image_url: resolveImageUrl(typeof item.cover_image_url === "string" ? item.cover_image_url : null),
  doctor_count: typeof item.doctor_count === "number" ? item.doctor_count : null,
  available_today_count:
    typeof item.available_today_count === "number" ? item.available_today_count : null,
  top_specialty: typeof item.top_specialty === "string" ? item.top_specialty : null,
  opening_time: typeof item.opening_time === "string" ? item.opening_time : null,
  closing_time: typeof item.closing_time === "string" ? item.closing_time : null,
});

const DoctorSkeletonCard = memo(function DoctorSkeletonCard() {
  return (
    <View style={styles.modernDoctorCard}>
      <View style={styles.doctorCardMain}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonDoctorCopy}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonMetaRow}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonBadge} />
          </View>
          <View style={styles.skeletonLineTiny} />
        </View>
      </View>
      <View style={styles.doctorActions}>
        <View style={styles.skeletonButtonHalf} />
        <View style={styles.skeletonButtonHalf} />
      </View>
    </View>
  );
});

const FilterChip = memo(function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active ? styles.filterChipActive : null]}
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter doctors by ${label}`}
    >
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
    </TouchableOpacity>
  );
});

const SectionEmpty = memo(function SectionEmpty({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = THEME.textMuted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={30} color={tone} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.retryButton} activeOpacity={0.88} onPress={onAction}>
          <Text style={styles.retryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const ServiceCard = memo(function ServiceCard({
  title,
  description,
  icon,
  tone,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
}) {
  return (
    <View style={styles.serviceCard}>
      <View style={[styles.serviceIconWrap, { backgroundColor: tone }]}>
        <Ionicons name={icon} size={18} color={THEME.primary} />
      </View>
      <View style={styles.serviceCopy}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceDescription}>{description}</Text>
      </View>
    </View>
  );
});

const DoctorCard = memo(function DoctorCard({
  doctor,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
  onViewProfile,
  onBook,
}: {
  doctor: ClinicDoctor;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
  onViewProfile: () => void;
  onBook: () => void;
}) {
  const initials =
    doctor.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "DR";

  return (
    <View style={styles.modernDoctorCard}>
      <View style={styles.doctorCardMain}>
        <View style={styles.avatarWrapper}>
          {doctor.profile_image ? (
            <Image source={{ uri: doctor.profile_image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          {doctor.is_available_today ? <View style={styles.onlineBadge} /> : null}
        </View>

        <View style={styles.doctorInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.doctorName} numberOfLines={1}>
              {doctor.name}
            </Text>
            <TouchableOpacity
              style={[styles.favoriteBtn, favoriteBusy ? styles.favoriteBtnDisabled : null]}
              activeOpacity={0.8}
              onPress={onToggleFavorite}
              disabled={favoriteBusy}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? `Remove ${doctor.name} from favorites` : `Add ${doctor.name} to favorites`}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? THEME.accentRed : "#64748B"}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.doctorSpec} numberOfLines={1}>
            {doctor.specialization}
          </Text>

          <View style={styles.doctorMetaLine}>
            <View style={styles.statPill}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.statText}>{Number(doctor.rating || 0).toFixed(1)}</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="briefcase-outline" size={12} color="#64748B" />
              <Text style={styles.statText}>{doctor.experience_years || 0} yrs</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.doctorActions}>
        <TouchableOpacity
          style={styles.scheduleBtn}
          activeOpacity={0.88}
          onPress={onViewProfile}
          accessibilityRole="button"
          accessibilityLabel={`View clinic schedule for ${doctor.name}`}
        >
            <Text style={styles.scheduleBtnText}>View Clinic</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bookActionBtn}
          activeOpacity={0.88}
          onPress={onBook}
          accessibilityRole="button"
          accessibilityLabel={`Book appointment with ${doctor.name}`}
        >
          <LinearGradient
            colors={[MODERN_THEME.accent, MODERN_THEME.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGrad}
          >
            <Text style={styles.bookActionText}>Book Now</Text>
            <Ionicons name="chevron-forward" size={14} color={MODERN_THEME.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
});

function InfoRow({
  icon,
  label,
  value,
  noDivider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  noDivider?: boolean;
}) {
  return (
    <View style={[styles.infoRow, noDivider ? styles.infoRowNoDivider : null]}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={16} color={THEME.primary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ClinicDetailsScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ClinicDetailsRoute>();
  const {
    clinicId,
    clinicName,
    location,
    status,
    image,
    rating,
    waitTime,
    nextAvailable,
    specialty,
  } = route.params;

  const [activeTab, setActiveTab] = useState<ActiveTab>("doctors");
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>("ALL");
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [favoriteDoctorIds, setFavoriteDoctorIds] = useState<string[]>([]);
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<string[]>([]);
  const [clinicDetails, setClinicDetails] = useState<CanonicalClinicDetails | null>(null);
  const [clinicDetailsError, setClinicDetailsError] = useState<string | null>(null);

  const fetchClinicDetails = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/clinics/${clinicId}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || "Failed to load clinic details");
      }

      const payload = (await response.json().catch(() => ({}))) as {
        clinic?: Partial<CanonicalClinicDetails> & Record<string, unknown>;
      };
      setClinicDetails(payload.clinic ? normalizeClinicDetails(payload.clinic) : null);
      setClinicDetailsError(null);
    } catch (error) {
      console.error("Clinic details fetch error:", error);
      setClinicDetailsError(error instanceof Error ? error.message : "Failed to load clinic details");
    }
  }, [clinicId]);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoadingDoctors(true);
      const [response, favorites] = await Promise.all([
        apiFetch(`/api/clinics/${clinicId}/doctors`),
        getFavorites().catch((error) => {
          console.error("Clinic favorite doctors load error:", error);
          return null;
        }),
      ]);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || "Failed to load clinic doctors");
      }

      const payload = (await response.json().catch(() => ({ doctors: [] }))) as { doctors?: Array<Partial<ClinicDoctor> & Record<string, unknown>> };
      setDoctors(Array.isArray(payload.doctors) ? payload.doctors.map(normalizeDoctorRecord) : []);
      setFavoriteDoctorIds((favorites?.doctors ?? []).map((item) => String(item.entityId)));
      setDoctorError(null);
    } catch (error) {
      console.error("Clinic doctors fetch error:", error);
      setDoctors([]);
      setDoctorError(error instanceof Error ? error.message : "Failed to load clinic doctors");
    } finally {
      setLoadingDoctors(false);
    }
  }, [clinicId]);

  useFocusEffect(
    useCallback(() => {
      void fetchClinicDetails();
      if (activeTab === "doctors") {
        void fetchDoctors();
      }
      return undefined;
    }, [activeTab, fetchClinicDetails, fetchDoctors])
  );

  const clinicDisplay = useMemo(() => {
    const resolvedImage =
      clinicDetails?.cover_image_url || clinicDetails?.image_url || clinicDetails?.logo_url || image;
    const resolvedLocation =
      clinicDetails?.location || clinicDetails?.city || clinicDetails?.address || location;
    const resolvedWait =
      clinicDetails?.average_wait ||
      (typeof clinicDetails?.average_wait_minutes === "number"
        ? `${clinicDetails.average_wait_minutes} min`
        : waitTime);

    return {
      name: clinicDetails?.name || clinicName,
      location: resolvedLocation || "Location not added",
      status: clinicDetails?.status || status,
      image: resolvedImage || null,
      rating,
      waitTime: resolvedWait || "Not available",
      nextAvailable: clinicDetails?.next_available || nextAvailable || "Not available",
      specialty: clinicDetails?.top_specialty || specialty || "General Care",
      phone: clinicDetails?.phone || null,
      email: clinicDetails?.email || null,
      hours:
        clinicDetails?.opening_time && clinicDetails?.closing_time
          ? `${clinicDetails.opening_time} - ${clinicDetails.closing_time}`
          : null,
      doctorCount: clinicDetails?.doctor_count ?? null,
      availableTodayCount: clinicDetails?.available_today_count ?? null,
    };
  }, [clinicDetails, clinicName, image, location, nextAvailable, rating, specialty, status, waitTime]);

  const filteredDoctors = useMemo(() => {
    if (doctorFilter === "AVAILABLE") {
      return doctors.filter((doctor) => doctor.is_available_today);
    }

    if (doctorFilter === "SPECIALIST") {
      return doctors.filter((doctor) => !normalize(doctor.specialization).includes("general"));
    }

    return doctors;
  }, [doctorFilter, doctors]);

  const handleToggleDoctorFavorite = useCallback(async (doctorId: number) => {
    const favoriteKey = String(doctorId);
    if (favoriteBusyIds.includes(favoriteKey)) return;

    const isFavorite = favoriteDoctorIds.includes(favoriteKey);
    setFavoriteBusyIds((current) => [...current, favoriteKey]);
    setFavoriteDoctorIds((current) =>
      isFavorite ? current.filter((id) => id !== favoriteKey) : [...current, favoriteKey]
    );

    try {
      await toggleFavoriteRequest("doctor", favoriteKey, isFavorite);
    } catch (error) {
      console.error("Clinic doctor favorite toggle error:", error);
      setFavoriteDoctorIds((current) =>
        isFavorite ? [...current, favoriteKey] : current.filter((id) => id !== favoriteKey)
      );
    } finally {
      setFavoriteBusyIds((current) => current.filter((id) => id !== favoriteKey));
    }
  }, [favoriteBusyIds, favoriteDoctorIds]);

  const renderFixedHeader = useCallback(
    () => (
      <View style={styles.headerStack}>
        <View style={styles.heroContainer}>
          {clinicDisplay.image ? (
            <Image source={{ uri: clinicDisplay.image }} style={styles.heroImg} />
          ) : (
            <View style={styles.heroFallback} />
          )}

          <LinearGradient
            colors={[MODERN_THEME.primary, "rgba(15, 23, 42, 0.56)", "rgba(15, 23, 42, 0)"]}
            style={styles.heroOverlay}
          />

          <SafeAreaView edges={["top"]} style={styles.navLayer}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={MODERN_THEME.white} />
            </TouchableOpacity>
            <View style={[styles.statusPill, { backgroundColor: getStatusTone(clinicDisplay.status) }]}>
              <Text style={styles.statusText}>{clinicDisplay.status}</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoGlowOne} />
          <View style={styles.infoGlowTwo} />
          <View style={styles.infoAccentLine} />
          <View style={styles.infoTitleRow}>
            <View style={styles.infoTitleCopy}>
              <Text style={styles.clinicName} numberOfLines={2}>
                {clinicDisplay.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color={MODERN_THEME.accentDark} />
                <Text style={styles.locationText} numberOfLines={2}>
                  {clinicDisplay.location}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.aboutBtn}
              activeOpacity={0.88}
              onPress={() => setDetailsVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Open clinic information"
            >
              <MaterialCommunityIcons name="information-variant" size={22} color={MODERN_THEME.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg. Wait</Text>
              <Text style={styles.statValue}>{clinicDisplay.waitTime}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Next Slot</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {clinicDisplay.nextAvailable}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Specialty</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {clinicDisplay.specialty}
              </Text>
            </View>
          </View>
          {clinicDetailsError ? (
            <Text style={styles.detailFallbackNote} numberOfLines={2}>
              Showing saved clinic info. Some live details could not be refreshed.
            </Text>
          ) : null}
        </View>

      </View>
    ),
    [clinicDetailsError, clinicDisplay, navigation]
  );

  const renderStickyTabBar = useCallback(
    () => (
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabBtn}
          activeOpacity={0.88}
          onPress={() => setActiveTab("doctors")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "doctors" }}
          accessibilityLabel="Doctors tab"
        >
          <Text style={[styles.tabBtnText, activeTab === "doctors" ? styles.tabBtnTextActive : null]}>
            Doctors
          </Text>
          {activeTab === "doctors" ? <View style={styles.tabIndicator} /> : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          activeOpacity={0.88}
          onPress={() => setActiveTab("services")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "services" }}
          accessibilityLabel="Services tab"
        >
          <Text style={[styles.tabBtnText, activeTab === "services" ? styles.tabBtnTextActive : null]}>
            Services
          </Text>
          {activeTab === "services" ? <View style={styles.tabIndicator} /> : null}
        </TouchableOpacity>
      </View>
    ),
    [activeTab]
  );

  const renderDoctorListHeader = useCallback(
    () => (
      <View style={styles.filtersRow}>
        {DOCTOR_FILTERS.map((filter) => (
          <FilterChip
            key={filter.key}
            label={filter.label}
            active={doctorFilter === filter.key}
            onPress={() => setDoctorFilter(filter.key)}
          />
        ))}
      </View>
    ),
    [doctorFilter]
  );

  const renderDoctor = useCallback(
    ({ item }: { item: ClinicDoctor }) => (
      <DoctorCard
        doctor={item}
        isFavorite={favoriteDoctorIds.includes(String(item.id))}
        favoriteBusy={favoriteBusyIds.includes(String(item.id))}
        onToggleFavorite={() => void handleToggleDoctorFavorite(item.id)}
        onViewProfile={() =>
          navigation.navigate("DoctorAvailabilityScreen", {
            doctorId: item.id,
            clinicId: item.clinic_id || clinicId,
            clinicName: item.clinic_name || clinicDisplay.name,
            doctorName: item.name,
            specialty: item.specialization,
          })
        }
        onBook={() =>
          {
            const resolvedClinicId = item.clinic_id || clinicId;
            if (!item.id || !resolvedClinicId) {
              Alert.alert("Clinic Required", "This doctor does not have an active clinic schedule right now.");
              return;
            }

            navigation.navigate("BookAppointmentScreen", {
              doctorId: item.id,
              clinicId: resolvedClinicId,
              clinicName: item.clinic_name || clinicDisplay.name || undefined,
              doctorName: item.name,
              specialty: item.specialization,
              experienceYears: item.experience_years || undefined,
              rating: item.rating || undefined,
              reviewCount: item.review_count || undefined,
            });
          }
        }
      />
    ),
    [clinicDisplay.name, clinicId, favoriteBusyIds, favoriteDoctorIds, handleToggleDoctorFavorite, navigation]
  );

  const renderDoctorContent = useCallback(() => {
    if (loadingDoctors) {
      return (
        <View>
          <DoctorSkeletonCard />
          <DoctorSkeletonCard />
          <DoctorSkeletonCard />
        </View>
      );
    }

    if (doctorError) {
      return (
        <SectionEmpty
          icon="alert-circle-outline"
          title="Could not load doctors"
          message={doctorError}
          actionLabel="Retry"
          onAction={() => {
            void fetchDoctors();
          }}
          tone={THEME.red}
        />
      );
    }

    if (filteredDoctors.length === 0) {
      return (
        <SectionEmpty
          icon="medkit-outline"
          title="No doctors available"
          message="Try another filter or check back later for more doctors."
        />
      );
    }

    return null;
  }, [doctorError, fetchDoctors, filteredDoctors.length, loadingDoctors]);

  const renderServicesScreen = useCallback(
    () => (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Clinic Services</Text>
        <Text style={styles.sectionSubtitle}>
          Explore what this clinic currently supports before you book.
        </Text>

        {SERVICE_ITEMS.map((service) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            description={service.description}
            icon={service.icon}
            tone={service.tone}
          />
        ))}
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={MODERN_THEME.primary} />
      {renderFixedHeader()}
      {renderStickyTabBar()}
      {activeTab === "doctors" ? (
        <FlatList
          data={loadingDoctors || doctorError ? [] : filteredDoctors}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDoctor}
          ListHeaderComponent={renderDoctorListHeader}
          ListEmptyComponent={renderDoctorContent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={[{ key: activeTab }]}
          keyExtractor={(item) => item.key}
          renderItem={() => renderServicesScreen()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clinic Information</Text>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Close clinic information"
              >
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {clinicDisplay.name} specializes in {clinicDisplay.specialty}. Digital booking, queue visibility, and appointment
              management are available when supported by the clinic.
            </Text>
            <InfoRow icon="star" label="Rating" value={clinicDisplay.rating.toFixed(1)} />
            <InfoRow icon="time-outline" label="Average wait" value={clinicDisplay.waitTime} />
            <InfoRow icon="calendar-outline" label="Next available" value={clinicDisplay.nextAvailable} />
            {clinicDisplay.hours ? (
              <InfoRow icon="business-outline" label="Hours" value={clinicDisplay.hours} />
            ) : null}
            {clinicDisplay.phone ? (
              <InfoRow icon="call-outline" label="Phone" value={clinicDisplay.phone} />
            ) : null}
            <InfoRow icon="medkit-outline" label="Specialty" value={clinicDisplay.specialty} noDivider />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MODERN_THEME.bg,
  },
  listContent: {
    paddingBottom: 60,
    paddingTop: 12,
  },
  headerStack: {
    marginBottom: 0,
  },
  heroContainer: {
    width: "100%",
    height: 260,
    backgroundColor: MODERN_THEME.primary,
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MODERN_THEME.primary,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  navLayer: {
    position: "absolute",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statusPill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    color: MODERN_THEME.white,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  infoCard: {
    backgroundColor: MODERN_THEME.white,
    marginHorizontal: 20,
    borderRadius: 30,
    padding: 24,
    marginTop: -118,
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    borderWidth: 1,
    borderColor: MODERN_THEME.border,
    overflow: "hidden",
  },
  infoGlowOne: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    right: -24,
    top: -28,
    backgroundColor: "rgba(56, 189, 248, 0.10)",
  },
  infoGlowTwo: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    left: -18,
    bottom: -24,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  infoAccentLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
    backgroundColor: "rgba(56, 189, 248, 0.14)",
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  infoTitleCopy: {
    flex: 1,
    paddingRight: 12,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: "700",
    color: MODERN_THEME.primary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  locationText: {
    marginLeft: 5,
    flex: 1,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  aboutBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MODERN_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 15,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#F1F5F9",
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: MODERN_THEME.primary,
    marginTop: 4,
    textAlign: "center",
  },
  detailFallbackNote: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: MODERN_THEME.white,
    paddingHorizontal: 20,
    paddingTop: 4,
    marginTop: -4,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEF5",
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  tabBtnTextActive: {
    color: MODERN_THEME.primary,
  },
  tabIndicator: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: MODERN_THEME.accent,
  },
  filtersRow: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 14,
    paddingHorizontal: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  filterChip: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: MODERN_THEME.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: MODERN_THEME.primary,
    borderColor: MODERN_THEME.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: MODERN_THEME.white,
  },
  modernDoctorCard: {
    backgroundColor: MODERN_THEME.white,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MODERN_THEME.border,
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  doctorCardMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    marginRight: 16,
    position: "relative",
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F0F9FF",
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: "700",
    color: MODERN_THEME.accentDark,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: MODERN_THEME.success,
    borderWidth: 3,
    borderColor: MODERN_THEME.white,
  },
  doctorInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  favoriteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  favoriteBtnDisabled: {
    opacity: 0.55,
  },
  doctorName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: MODERN_THEME.primary,
  },
  doctorSpec: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
    textTransform: "capitalize",
  },
  doctorMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  doctorActions: {
    flexDirection: "row",
    marginTop: 18,
    gap: 12,
  },
  scheduleBtn: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#DCE7F2",
    backgroundColor: "#FBFDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B6B81",
  },
  bookActionBtn: {
    flex: 1.8,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: MODERN_THEME.accentDark,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  actionGrad: {
    minHeight: 52,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  bookActionText: {
    fontSize: 15,
    color: MODERN_THEME.white,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: MODERN_THEME.white,
    borderRadius: 28,
    padding: 22,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: MODERN_THEME.border,
    ...SHADOW,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: MODERN_THEME.primary,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    marginBottom: 14,
    fontWeight: "500",
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FAFCFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 14,
    marginTop: 10,
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceCopy: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: MODERN_THEME.primary,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoRowNoDivider: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 10,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: MODERN_THEME.primary,
  },
  emptyState: {
    backgroundColor: MODERN_THEME.white,
    borderRadius: 28,
    padding: 26,
    alignItems: "center",
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: MODERN_THEME.border,
    ...SHADOW,
  },
  emptyTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 17,
    fontWeight: "700",
    color: MODERN_THEME.primary,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: MODERN_THEME.accentDark,
  },
  retryButtonText: {
    color: MODERN_THEME.white,
    fontSize: 13,
    fontWeight: "900",
  },
  skeletonAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 16,
    backgroundColor: "#E8EDF4",
  },
  skeletonDoctorCopy: {
    flex: 1,
  },
  skeletonName: {
    width: "56%",
    height: 18,
    borderRadius: 8,
    backgroundColor: "#E8EDF4",
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: "42%",
    height: 12,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
    marginBottom: 10,
  },
  skeletonMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  skeletonBadge: {
    width: 84,
    height: 26,
    borderRadius: 10,
    backgroundColor: "#EEF2F7",
  },
  skeletonLineTiny: {
    width: "44%",
    height: 11,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
  },
  skeletonButtonHalf: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EEF2F7",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: MODERN_THEME.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    paddingBottom: 60,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: MODERN_THEME.primary,
  },
  modalSub: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 12,
  },
});
