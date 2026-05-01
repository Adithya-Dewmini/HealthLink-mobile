import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { MedicalCenterStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<MedicalCenterStackParamList, "MedicalCenterDoctorDetails">;

type DoctorProfile = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  specialization: string | null;
  experience_years: number | null;
  qualifications: string | null;
  bio: string | null;
  clinics: Array<{ name: string; type?: string | null }>;
};

type CenterSchedule = {
  id: number;
  doctor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  max_patients: number;
  is_active: boolean;
  clinic_name: string | null;
};

type DoctorDetailsState = {
  profile: DoctorProfile | null;
  todaySchedules: CenterSchedule[];
  upcomingSchedules: CenterSchedule[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const THEME = {
  primary: "#2F6FED",
  background: "#F4F6F8",
  white: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  border: "#E5E7EB",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  softBlue: "#EFF6FF",
  softGreen: "#DCFCE7",
  softAmber: "#FEF3C7",
  softRed: "#FEE2E2",
  muted: "#94A3B8",
};

const SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05 as const,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");

  if (raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    } catch {
      return raw.trim();
    }
  }

  return `${fallback} (HTTP ${response.status})`;
};

const formatDateBadge = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (parsed.getTime() === today.getTime()) return "Today";
  if (parsed.getTime() === tomorrow.getTime()) return "Tomorrow";

  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatFullDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getStatusTone = (status: "ACTIVE" | "PENDING" | "INACTIVE") => {
  if (status === "ACTIVE") {
    return { bg: THEME.softGreen, color: THEME.success, label: "Active" };
  }

  if (status === "INACTIVE") {
    return { bg: THEME.softRed, color: THEME.danger, label: "Inactive" };
  }

  return { bg: THEME.softAmber, color: THEME.warning, label: "Pending" };
};

const useDoctorDetails = (
  doctorId: number,
  doctorUserId: number
): DoctorDetailsState => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [schedules, setSchedules] = useState<CenterSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [profileResponse, schedulesResponse] = await Promise.all([
          apiFetch(`/api/doctors/${doctorId}`),
          apiFetch("/api/center/schedules?active_only=true"),
        ]);

        if (!profileResponse.ok) {
          throw new Error(
            await getResponseErrorMessage(profileResponse, "Failed to load doctor details")
          );
        }

        if (!schedulesResponse.ok) {
          throw new Error(
            await getResponseErrorMessage(schedulesResponse, "Failed to load schedules")
          );
        }

        const profilePayload = (await profileResponse.json()) as DoctorProfile;
        const schedulesPayload = (await schedulesResponse.json().catch(() => [])) as CenterSchedule[];

        setProfile(profilePayload);
        setSchedules(
          Array.isArray(schedulesPayload)
            ? schedulesPayload.filter((item) => Number(item?.doctor_id) === doctorUserId)
            : []
        );
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load doctor details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [doctorId, doctorUserId]
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const todaySchedules = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return schedules.filter((schedule) => schedule.date === today);
  }, [schedules]);

  const upcomingSchedules = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return schedules.filter((schedule) => schedule.date >= today).slice(0, 6);
  }, [schedules]);

  return {
    profile,
    todaySchedules,
    upcomingSchedules,
    loading,
    refreshing,
    error,
    refresh: async () => load("refresh"),
  };
};

const SectionCard = memo(function SectionCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return <View style={styles.sectionCard}>{children}</View>;
});

const CLINIC_IMAGES = [
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop",
];

const DOCTOR_HERO_IMAGE =
  "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=1400&auto=format&fit=crop";
const DOCTOR_AVATAR_IMAGE =
  "https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=800&auto=format&fit=crop";

const SectionHeader = memo(function SectionHeader({
  title,
  actionLabel,
  onActionPress,
}: {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity style={styles.manageButton} onPress={onActionPress} activeOpacity={0.88}>
          <Text style={styles.manageButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const ClinicAssignedCard = memo(function ClinicAssignedCard({
  name,
  type,
  imageUri,
  onManageSchedule,
  onViewDetails,
}: {
  name: string;
  type?: string | null;
  imageUri: string;
  onManageSchedule: () => void;
  onViewDetails: () => void;
}) {
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "MC",
    [name]
  );

  return (
    <View style={styles.assignedClinicCard}>
      <View style={styles.assignedClinicImageWrap}>
        <Image source={{ uri: imageUri }} style={styles.assignedClinicImage} />
        <View style={styles.assignedClinicOverlay} />
        <View style={styles.assignedClinicInitialBadge}>
          <Text style={styles.assignedClinicInitialText}>{initials}</Text>
        </View>
      </View>

      <View style={styles.assignedClinicBody}>
        <View style={styles.assignedClinicHeader}>
          <Text style={styles.assignedClinicName} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.assignedClinicTypeBadge}>
            <Text style={styles.assignedClinicTypeText}>{type || "PRIVATE"}</Text>
          </View>
        </View>

        <View style={styles.assignedClinicMetaRow}>
          <Ionicons name="medkit-outline" size={13} color={THEME.textSecondary} />
          <Text style={styles.assignedClinicMetaText}>Assigned clinic</Text>
        </View>

        <View style={styles.assignedClinicMetaRow}>
          <Ionicons name="calendar-outline" size={13} color={THEME.textSecondary} />
          <Text style={styles.assignedClinicMetaText}>Available for schedule management</Text>
        </View>

        <View style={styles.assignedClinicActions}>
          <TouchableOpacity
            style={styles.assignedClinicSecondaryButton}
            activeOpacity={0.88}
            onPress={onViewDetails}
          >
            <Text style={styles.assignedClinicSecondaryButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.assignedClinicPrimaryButton}
            activeOpacity={0.88}
            onPress={onManageSchedule}
          >
            <Text style={styles.assignedClinicPrimaryButtonText}>Manage Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const ScheduleCard = memo(function ScheduleCard({ item }: { item: CenterSchedule }) {
  return (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleTopRow}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{formatDateBadge(item.date)}</Text>
        </View>
        <View style={styles.patientBadge}>
          <Text style={styles.patientBadgeText}>{item.max_patients} Patients</Text>
        </View>
      </View>

      <Text style={styles.scheduleClinicName}>{item.clinic_name || "Medical Center"}</Text>

      <View style={styles.scheduleMetaRow}>
        <View style={styles.scheduleMetaItem}>
          <Ionicons name="calendar-outline" size={14} color={THEME.textSecondary} />
          <Text style={styles.scheduleMetaText}>{formatFullDate(item.date)}</Text>
        </View>

        <View style={styles.scheduleMetaItem}>
          <Ionicons name="time-outline" size={14} color={THEME.textSecondary} />
          <Text style={styles.scheduleMetaText}>
            {item.start_time} - {item.end_time}
          </Text>
        </View>
      </View>
    </View>
  );
});

const ProfileCard = memo(function ProfileCard({
  profile,
  status,
  topInset,
  onBackPress,
}: {
  profile: DoctorProfile;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  topInset: number;
  onBackPress: () => void;
}) {
  const tone = getStatusTone(status);
  const description =
    profile.bio?.trim() ||
    profile.qualifications?.trim() ||
    `${profile.experience_years ?? 0} years of experience in clinical practice.`;

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroImageSection}>
        <Image source={{ uri: DOCTOR_HERO_IMAGE }} style={styles.heroImage} />
        <View style={styles.heroImageTint} />
        <LinearGradient
          colors={["rgba(0,0,0,0.18)", "rgba(0,0,0,0.34)", "rgba(0,0,0,0.62)"]}
          locations={[0, 0.45, 1]}
          style={styles.heroImageFade}
        />

        <View style={[styles.heroHeaderRow, { paddingTop: topInset + 12 }]}>
          <TouchableOpacity style={styles.heroHeaderButton} onPress={onBackPress} activeOpacity={0.88}>
            <Ionicons name="chevron-back" size={22} color={THEME.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.heroHeaderButton} activeOpacity={0.88}>
            <Ionicons name="ellipsis-horizontal" size={20} color={THEME.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContentOverlay}>
          <View style={styles.heroTopRow}>
            <View />
            <View style={[styles.statusBadge, styles.heroStatusBadge, { backgroundColor: tone.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: tone.color }]} />
              <Text style={[styles.statusText, { color: tone.color }]}>{tone.label}</Text>
            </View>
          </View>

          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarPlate}>
                <Image source={{ uri: DOCTOR_AVATAR_IMAGE }} style={styles.avatarImage} />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.doctorName}>{profile.name}</Text>
              <Text style={styles.specialization}>
                {profile.specialization || "General Physician"}
              </Text>
              <Text style={styles.heroDescription} numberOfLines={3}>
                {description}
              </Text>
            </View>
          </View>

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetric}>
              <Ionicons name="briefcase-outline" size={15} color={THEME.white} />
              <Text style={styles.heroMetricText}>{profile.experience_years ?? 0} yrs</Text>
            </View>

            <View style={styles.heroMetric}>
              <Ionicons name="business-outline" size={15} color={THEME.white} />
              <Text style={styles.heroMetricText}>{profile.clinics.length || 0} clinics</Text>
            </View>

            <View style={styles.heroMetric}>
              <Ionicons name="shield-checkmark-outline" size={15} color={THEME.white} />
              <Text style={styles.heroMetricText}>Doctor</Text>
            </View>
          </View>
        </View>
      </View>

    </View>
  );
});

export default function DoctorDetailsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"clinics" | "schedule">("schedule");
  const {
    profile,
    todaySchedules,
    upcomingSchedules,
    loading,
    refreshing,
    error,
    refresh,
  } = useDoctorDetails(route.params.doctorId, route.params.doctorUserId);

  const canManageSchedule = route.params.status === "ACTIVE";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : error ? (
          <SectionCard>
            <Text style={styles.errorTitle}>Unable to load doctor details</Text>
            <Text style={styles.errorText}>{error}</Text>
          </SectionCard>
        ) : profile ? (
          <>
            <ProfileCard
              profile={profile}
              status={route.params.status}
              topInset={insets.top}
              onBackPress={() => navigation.goBack()}
            />

            <View style={styles.segmentedTabs}>
              <TouchableOpacity
                style={[styles.segmentTab, activeTab === "schedule" ? styles.segmentTabActive : null]}
                activeOpacity={0.88}
                onPress={() => setActiveTab("schedule")}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    activeTab === "schedule" ? styles.segmentTabTextActive : null,
                  ]}
                >
                  Schedule
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, activeTab === "clinics" ? styles.segmentTabActive : null]}
                activeOpacity={0.88}
                onPress={() => setActiveTab("clinics")}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    activeTab === "clinics" ? styles.segmentTabTextActive : null,
                  ]}
                >
                  Clinics Assigned
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "schedule" ? (
              <>
                <SectionHeader
                  title="Schedule"
                  actionLabel="Manage"
                  onActionPress={
                    canManageSchedule
                      ? () =>
                          navigation.navigate("MedicalCenterDoctorSchedule", {
                            doctorId: profile.id,
                            doctorUserId: route.params.doctorUserId,
                            doctorName: profile.name,
                            specialization: profile.specialization,
                          })
                      : undefined
                  }
                />

                {!canManageSchedule ? (
                  <Text style={styles.helperText}>
                    Schedule management becomes available after the doctor is active in this clinic.
                  </Text>
                ) : null}

                <SectionCard>
                  <Text style={styles.subsectionLabel}>Today's Schedule</Text>
                  {todaySchedules.length > 0 ? (
                    todaySchedules.map((item) => <ScheduleCard key={`today-${item.id}`} item={item} />)
                  ) : (
                    <Text style={styles.emptyText}>No schedule yet for today.</Text>
                  )}

                  <Text style={styles.subsectionLabel}>Upcoming Sessions</Text>
                  {upcomingSchedules.length > 0 ? (
                    upcomingSchedules.map((item) => (
                      <ScheduleCard key={`upcoming-${item.id}`} item={item} />
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No schedule yet.</Text>
                  )}
                </SectionCard>
              </>
            ) : (
              <SectionCard>
                <Text style={styles.sectionTitle}>Clinics Assigned</Text>
                {profile.clinics.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.assignedClinicsScrollContent}
                  >
                    {profile.clinics.map((clinic, index) => (
                      <ClinicAssignedCard
                        key={`${clinic.name}-${index}`}
                        name={clinic.name}
                        type={clinic.type}
                        imageUri={CLINIC_IMAGES[index % CLINIC_IMAGES.length]}
                        onManageSchedule={
                          canManageSchedule
                            ? () =>
                                navigation.navigate("MedicalCenterDoctorSchedule", {
                                  doctorId: profile.id,
                                  doctorUserId: route.params.doctorUserId,
                                  doctorName: profile.name,
                                  specialization: profile.specialization,
                                })
                            : () => setActiveTab("schedule")
                        }
                        onViewDetails={() => setActiveTab("schedule")}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No clinic assignments found.</Text>
                )}
              </SectionCard>
            )}

            <SectionHeader title="Notes" />
            <SectionCard>
              <Text style={styles.noteText}>
                {profile.bio?.trim() || "No additional notes provided."}
              </Text>
            </SectionCard>
          </>
        ) : null}

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  scrollContent: { paddingBottom: 24 },
  centerState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  sectionCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...SHADOW,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  segmentedTabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 5,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.primary,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#DBEAFE",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 16,
    ...SHADOW,
  },
  heroImageSection: {
    minHeight: 470,
    position: "relative",
    justifyContent: "space-between",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroImageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(147, 197, 253, 0.22)",
  },
  heroImageFade: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroHeaderButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroContentOverlay: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heroStatusBadge: {
    backgroundColor: THEME.white,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  avatarWrap: {
    marginRight: 16,
  },
  avatarPlate: {
    width: 98,
    height: 118,
    borderRadius: 30,
    backgroundColor: "rgba(219, 234, 254, 0.42)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    flex: 1,
    paddingTop: 6,
  },
  doctorName: {
    fontSize: 30,
    fontWeight: "800",
    color: THEME.white,
    letterSpacing: 0.2,
    textAlign: "left",
  },
  specialization: {
    fontSize: 15,
    color: "rgba(255,255,255,0.82)",
    marginTop: 4,
    fontWeight: "600",
    letterSpacing: 0.1,
    textAlign: "left",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  heroDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.86)",
    lineHeight: 21,
    marginTop: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
    textAlign: "left",
  },
  heroMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  heroMetric: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    marginBottom: 10,
  },
  heroMetricText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.white,
    marginLeft: 6,
  },
  assignedClinicsScrollContent: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 4,
  },
  assignedClinicCard: {
    width: 212,
    backgroundColor: THEME.white,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    marginRight: 12,
    ...SHADOW,
  },
  assignedClinicImageWrap: {
    height: 96,
    backgroundColor: "#DBEAFE",
    position: "relative",
  },
  assignedClinicImage: {
    width: "100%",
    height: "100%",
  },
  assignedClinicOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.14)",
  },
  assignedClinicInitialBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  assignedClinicInitialText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
  },
  assignedClinicBody: {
    padding: 14,
  },
  assignedClinicHeader: {
    marginBottom: 10,
  },
  assignedClinicName: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  assignedClinicTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: THEME.softBlue,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  assignedClinicTypeText: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.primary,
  },
  assignedClinicMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  assignedClinicMetaText: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginLeft: 6,
  },
  assignedClinicActions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  assignedClinicPrimaryButton: {
    flex: 1,
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  assignedClinicPrimaryButtonText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: "700",
  },
  assignedClinicSecondaryButton: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  assignedClinicSecondaryButtonText: {
    color: THEME.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  scheduleCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  scheduleTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dateBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  patientBadge: {
    backgroundColor: THEME.white,
    borderColor: "#E2E8F0",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  patientBadgeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  scheduleClinicName: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  scheduleMetaRow: {
    gap: 8,
  },
  scheduleMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  scheduleMetaText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginLeft: 6,
  },
  noteText: {
    color: THEME.muted,
    fontStyle: "italic",
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.danger,
  },
  errorText: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 8,
  },
  footerSpacer: {
    height: 40,
  },
});
