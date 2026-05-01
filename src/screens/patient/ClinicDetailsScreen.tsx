import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { PatientStackParamList } from "../../types/navigation";

const THEME = {
  background: "#F5F7FB",
  white: "#FFFFFF",
  primary: "#2F6FED",
  textPrimary: "#172033",
  textSecondary: "#6B7280",
  textMuted: "#94A3B8",
  border: "#E5EAF1",
  green: "#16A34A",
  red: "#DC2626",
  blue: "#2563EB",
  amber: "#F59E0B",
  softBlue: "#EAF1FF",
  softGreen: "#EAF8EF",
  softOrange: "#FFF4E5",
  softGray: "#EEF2F7",
};

const SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.06 as const,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
};

type ClinicDetailsRoute = RouteProp<PatientStackParamList, "PatientClinicDetails">;
type Navigation = NativeStackNavigationProp<PatientStackParamList>;
type ActiveTab = "doctors" | "services" | "overview";
type DoctorFilter = "ALL" | "AVAILABLE" | "SPECIALIST";

type ClinicDoctor = {
  id: number;
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
  if (status === "OPEN") return THEME.green;
  if (status === "QUEUE LIVE") return THEME.blue;
  return THEME.red;
};

const getAvailabilityTone = (available: boolean) =>
  available
    ? {
        bg: THEME.softGreen,
        text: THEME.green,
        label: "Available Today",
      }
    : {
        bg: THEME.softOrange,
        text: THEME.amber,
        label: "Next Session",
      };

const formatNextAvailable = (value: string | null, fallback: string) => value || fallback;

const DoctorSkeletonCard = memo(function DoctorSkeletonCard() {
  return (
    <View style={styles.doctorCard}>
      <View style={styles.doctorTopRow}>
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
  onViewProfile,
  onBook,
}: {
  doctor: ClinicDoctor;
  onViewProfile: () => void;
  onBook: () => void;
}) {
  const availabilityTone = getAvailabilityTone(doctor.is_available_today);

  return (
    <View style={styles.doctorCard}>
      <View style={styles.doctorTopRow}>
        <Image
          source={{
            uri:
              doctor.profile_image ||
              "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=600&auto=format&fit=crop",
          }}
          style={styles.doctorAvatar}
        />

        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>

          <View style={styles.doctorMetaRow}>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={13} color={THEME.amber} />
              <Text style={styles.ratingPillText}>{doctor.rating.toFixed(1)}</Text>
            </View>

            <View style={[styles.availabilityBadge, { backgroundColor: availabilityTone.bg }]}>
              <Text style={[styles.availabilityBadgeText, { color: availabilityTone.text }]}>
                {availabilityTone.label}
              </Text>
            </View>
          </View>

          <Text style={styles.nextAvailableText}>
            Next: {formatNextAvailable(doctor.next_available_time, "See availability")}
          </Text>
        </View>
      </View>

      <View style={styles.doctorActions}>
        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.88} onPress={onViewProfile}>
          <Text style={styles.secondaryButtonText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={onBook}>
          <Text style={styles.primaryButtonText}>Book Now</Text>
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

  const fetchDoctors = useCallback(async () => {
    try {
      setLoadingDoctors(true);
      const response = await apiFetch(`/api/clinics/${clinicId}/doctors`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || "Failed to load clinic doctors");
      }

      const payload = (await response.json().catch(() => ({ doctors: [] }))) as { doctors?: ClinicDoctor[] };
      setDoctors(Array.isArray(payload.doctors) ? payload.doctors : []);
      setDoctorError(null);
    } catch (error) {
      console.error("Clinic doctors fetch error:", error);
      setDoctors([]);
      setDoctorError(error instanceof Error ? error.message : "Failed to load clinic doctors");
    } finally {
      setLoadingDoctors(false);
    }
  }, [clinicId]);

  useEffect(() => {
    if (activeTab === "doctors" && doctors.length === 0 && !loadingDoctors && !doctorError) {
      void fetchDoctors();
    }
  }, [activeTab, doctorError, doctors.length, fetchDoctors, loadingDoctors]);

  const filteredDoctors = useMemo(() => {
    if (doctorFilter === "AVAILABLE") {
      return doctors.filter((doctor) => doctor.is_available_today);
    }

    if (doctorFilter === "SPECIALIST") {
      return doctors.filter((doctor) => !normalize(doctor.specialization).includes("general"));
    }

    return doctors;
  }, [doctorFilter, doctors]);

  const renderHeader = useCallback(
    () => (
      <View>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <Ionicons name="chevron-back" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clinic Details</Text>
          <View style={styles.headerButtonGhost} />
        </View>

        <View style={styles.heroCard}>
          <Image source={{ uri: image }} style={styles.heroImage} />
          <View style={[styles.statusBadge, { backgroundColor: getStatusTone(status) }]}>
            <Text style={styles.statusBadgeText}>{status}</Text>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.heroContentRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.name}>{clinicName}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color={THEME.textSecondary} />
                  <Text style={styles.metaText}>{location}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.detailsButton}
                activeOpacity={0.88}
                onPress={() => setDetailsVisible(true)}
              >
                <Text style={styles.detailsButtonText}>About Clinic</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.segmentedTabs}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "doctors" ? styles.segmentTabActive : null]}
            activeOpacity={0.88}
            onPress={() => setActiveTab("doctors")}
          >
            <Text style={[styles.segmentTabText, activeTab === "doctors" ? styles.segmentTabTextActive : null]}>
              Doctors
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "services" ? styles.segmentTabActive : null]}
            activeOpacity={0.88}
            onPress={() => setActiveTab("services")}
          >
            <Text style={[styles.segmentTabText, activeTab === "services" ? styles.segmentTabTextActive : null]}>
              Services
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "overview" ? styles.segmentTabActive : null]}
            activeOpacity={0.88}
            onPress={() => setActiveTab("overview")}
          >
            <Text style={[styles.segmentTabText, activeTab === "overview" ? styles.segmentTabTextActive : null]}>
              Overview
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "doctors" ? (
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
        ) : null}
      </View>
    ),
    [activeTab, clinicName, doctorFilter, image, location, navigation, status]
  );

  const renderDoctor = useCallback(
    ({ item }: { item: ClinicDoctor }) => (
      <DoctorCard
        doctor={item}
        onViewProfile={() =>
          navigation.navigate("DoctorAvailabilityScreen", {
            doctorId: item.id,
            clinicId,
            clinicName: item.clinic_name,
            doctorName: item.name,
            specialty: item.specialization,
          })
        }
        onBook={() =>
          navigation.navigate("BookAppointmentScreen", {
            doctorId: item.id,
            clinicId,
            clinicName: item.clinic_name,
            doctorName: item.name,
            specialty: item.specialization,
            experienceYears: item.experience_years,
            rating: item.rating,
            reviewCount: item.review_count,
          })
        }
      />
    ),
    [navigation]
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

  const renderOverviewScreen = useCallback(
    () => (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Clinic Overview</Text>
        <Text style={styles.sectionSubtitle}>
          Queue status, timing, and specialty details for this medical center.
        </Text>

        <InfoRow icon="star" label="Rating" value={rating.toFixed(1)} />
        <InfoRow icon="time-outline" label="Average wait" value={waitTime} />
        <InfoRow icon="calendar-outline" label="Next available" value={nextAvailable} />
        <InfoRow icon="medkit-outline" label="Specialty" value={specialty} noDivider />
      </View>
    ),
    [nextAvailable, rating, specialty, waitTime]
  );

  return (
    <SafeAreaView style={styles.safe}>
      {activeTab === "doctors" ? (
        <FlatList
          data={loadingDoctors || doctorError ? [] : filteredDoctors}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDoctor}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderDoctorContent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={[{ key: activeTab }]}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={renderHeader}
          renderItem={() => (activeTab === "services" ? renderServicesScreen() : renderOverviewScreen())}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About Clinic</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)} activeOpacity={0.88}>
                <Ionicons name="close" size={22} color={THEME.textPrimary} />
              </TouchableOpacity>
            </View>

            <InfoRow icon="star" label="Rating" value={rating.toFixed(1)} />
            <InfoRow icon="time-outline" label="Average wait" value={waitTime} />
            <InfoRow icon="calendar-outline" label="Next available" value={nextAvailable} />
            <InfoRow icon="medkit-outline" label="Specialty" value={specialty} noDivider />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonGhost: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  heroCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    ...SHADOW,
  },
  heroImage: {
    width: "100%",
    height: 138,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: "800",
  },
  heroBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 6,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  detailsButton: {
    alignSelf: "center",
    minWidth: 116,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: THEME.primary,
  },
  detailsButtonText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  segmentedTabs: {
    flexDirection: "row",
    backgroundColor: THEME.softGray,
    borderRadius: 14,
    padding: 5,
    marginBottom: 12,
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 12,
  },
  segmentTabActive: {
    backgroundColor: THEME.white,
    ...SHADOW,
  },
  segmentTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  segmentTabTextActive: {
    color: THEME.textPrimary,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.softBlue,
    borderColor: "#C9DBFF",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.primary,
  },
  doctorCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    ...SHADOW,
  },
  doctorTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  doctorAvatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: THEME.softGray,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  doctorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softOrange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ratingPillText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#9A6700",
  },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  availabilityBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  nextAvailableText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  doctorActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
  },
  secondaryButtonText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  primaryButtonText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    ...SHADOW,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: THEME.textSecondary,
    marginBottom: 14,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FAFCFF",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  serviceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceCopy: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textSecondary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
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
    color: THEME.textSecondary,
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  emptyState: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    ...SHADOW,
  },
  emptyTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: THEME.primary,
  },
  retryButtonText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: "700",
  },
  skeletonAvatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: "#E8EDF4",
  },
  skeletonDoctorCopy: {
    flex: 1,
  },
  skeletonName: {
    width: "52%",
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E8EDF4",
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: "38%",
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
    borderRadius: 999,
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
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2F7",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 19, 40, 0.38)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    ...SHADOW,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
});
