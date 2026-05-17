import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../../config/api";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import { resolveImageUrl } from "../../utils/imageUrl";
import PatientDoctorInfoCard from "../../components/patient/PatientDoctorInfoCard";

type Props = NativeStackScreenProps<PatientStackParamList, "PatientDoctorDetails">;

type DoctorWorkplaceSession = {
  sessionId?: string;
  dayOfWeek?: string;
  date?: string;
  startTime: string;
  endTime: string;
  availableSlots?: number | null;
  queueStarted?: boolean | null;
};

type DoctorWorkplace = {
  medicalCenterId: string;
  medicalCenterName: string;
  city?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  sessions: DoctorWorkplaceSession[];
};

type DoctorProfile = {
  id: number;
  fullName: string;
  specialization: string | null;
  profileImageUrl: string | null;
  gender?: string | null;
  experienceYears: number | null;
  qualifications: string | null;
  about: string | null;
  isVerified: boolean;
  city?: string | null;
  location?: string | null;
  workplaces: DoctorWorkplace[];
};

const THEME = patientTheme.colors;
const MODERN_THEME = {
  primary: patientTheme.colors.modernPrimary,
  primaryAlt: patientTheme.colors.modernPrimaryAlt,
  white: patientTheme.colors.modernSurface,
};

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as { message?: string; error?: string };
      return parsed.message || parsed.error || fallback;
    } catch {
      return raw.trim();
    }
  }
  return fallback;
};

const formatSessionPreview = (session: DoctorWorkplaceSession) => {
  const dayLabel =
    session.dayOfWeek ||
    (session.date
      ? new Date(`${session.date}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
        })
      : "Session");

  return `${dayLabel} ${session.startTime} - ${session.endTime}`;
};

const formatClinicRouteNextAvailable = (session: DoctorWorkplaceSession | null) => {
  if (!session) {
    return "Check schedule";
  }

  return formatSessionPreview(session);
};

const buildLocationLine = (profile: DoctorProfile | null) => {
  if (!profile) {
    return null;
  }

  if (profile.city && profile.location) {
    return `${profile.city} • ${profile.location}`;
  }

  return profile.city || profile.location || null;
};

export default function PatientDoctorDetailsScreen({ navigation, route }: Props) {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await apiFetch(`/api/patients/doctors/${route.params.doctorId}`);
        if (!response.ok) {
          throw new Error(await getResponseErrorMessage(response, "Failed to load doctor details"));
        }

        const data = (await response.json()) as DoctorProfile;
        setProfile({
          ...data,
          profileImageUrl: resolveImageUrl(data.profileImageUrl ?? null),
          gender:
            typeof data.gender === "string" && data.gender.trim()
              ? data.gender
              : typeof (data as any).sex === "string" && String((data as any).sex).trim()
                ? String((data as any).sex)
                : null,
          workplaces: Array.isArray(data.workplaces)
            ? data.workplaces.map((workplace) => ({
                ...workplace,
                imageUrl: resolveImageUrl(workplace.imageUrl ?? null),
                sessions: Array.isArray(workplace.sessions) ? workplace.sessions : [],
              }))
            : [],
        });
        setError(null);
      } catch (loadError) {
        setProfile(null);
        setError(loadError instanceof Error ? loadError.message : "Failed to load doctor details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params.doctorId]
  );

  useEffect(() => {
    void loadProfile("initial");
  }, [loadProfile]);

  const locationLine = useMemo(() => buildLocationLine(profile), [profile]);
  const workplaces = profile?.workplaces ?? [];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[MODERN_THEME.primary, MODERN_THEME.primaryAlt]}
        style={styles.headerBackground}
      />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={THEME.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Doctor Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        {profile ? (
          <View style={styles.frozenHero}>
            <View style={styles.heroBlock}>
              <PatientDoctorInfoCard
                name={profile.fullName}
                specialty={profile.specialization}
                locationLabel={locationLine}
                experienceLabel={
                  profile.experienceYears != null ? `${profile.experienceYears} years experience` : null
                }
                imageUrl={profile.profileImageUrl}
                gender={profile.gender}
                verified={profile.isVerified}
              />
            </View>
          </View>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadProfile("refresh")} />}
        >
        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={THEME.accentBlue} />
            <Text style={styles.stateText}>Loading doctor details</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={30} color={THEME.textGray} />
            <Text style={styles.stateTitle}>Could not load doctor</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadProfile("initial")}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : profile ? (
          <>
            {profile.about ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIconWrap}>
                    <Ionicons name="sparkles-outline" size={16} color={THEME.accentBlue} />
                  </View>
                  <Text style={styles.sectionTitle}>About</Text>
                </View>
                <Text style={styles.sectionText}>{profile.about}</Text>
              </View>
            ) : null}

            {profile.qualifications ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIconWrap}>
                    <Ionicons name="school-outline" size={16} color={THEME.accentBlue} />
                  </View>
                  <Text style={styles.sectionTitle}>Qualifications</Text>
                </View>
                <Text style={styles.sectionText}>{profile.qualifications}</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>Works at</Text>
              <Text style={styles.sectionSubheading}>
                Choose a medical center to view available sessions.
              </Text>
            </View>

            {workplaces.length === 0 ? (
              <View style={styles.emptyWorkplacesCard}>
                <Text style={styles.emptyWorkplacesTitle}>No sessions available yet</Text>
                <Text style={styles.emptyWorkplacesText}>
                  This doctor does not have patient-bookable sessions at a medical center right now.
                </Text>
              </View>
            ) : (
              workplaces.map((workplace) => {
                const nextSession = workplace.sessions[0] ?? null;
                const previewSessions = workplace.sessions
                  .slice(nextSession ? 1 : 0)
                  .slice(0, 2);
                const hiddenSessionCount = Math.max(
                  workplace.sessions.length - (nextSession ? 1 : 0) - previewSessions.length,
                  0
                );
                const location =
                  workplace.city && workplace.address
                    ? `${workplace.city} • ${workplace.address}`
                    : workplace.city || workplace.address || null;

                return (
                  <View key={workplace.medicalCenterId} style={styles.workplaceCard}>
                    <View style={styles.workplaceTopRow}>
                      {workplace.imageUrl ? (
                        <Image source={{ uri: workplace.imageUrl }} style={styles.workplaceImage} />
                      ) : (
                        <View style={styles.workplaceFallback}>
                          <Ionicons name="business-outline" size={22} color={THEME.accentBlue} />
                        </View>
                      )}

                      <View style={styles.workplaceCopy}>
                        <Text style={styles.workplaceName}>{workplace.medicalCenterName}</Text>
                        {location ? (
                          <Text style={styles.workplaceLocation} numberOfLines={1}>
                            {location}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.workplaceArrowWrap}>
                        <Ionicons name="business-outline" size={18} color={THEME.textDark} />
                      </View>
                    </View>

                    {nextSession ? (
                      <LinearGradient
                        colors={["#EAF7FF", "#F4FFFC"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.nextSessionHero}
                      >
                        <Text style={styles.nextSessionLabel}>Next session</Text>
                        <Text style={styles.nextSessionText}>{formatSessionPreview(nextSession)}</Text>
                      </LinearGradient>
                    ) : null}

                    {previewSessions.length > 0 ? (
                      <View style={styles.sessionPreviewList}>
                        {previewSessions.map((session, index) => (
                          <View
                            key={`${workplace.medicalCenterId}-${session.sessionId || index}`}
                            style={styles.sessionPreviewRow}
                          >
                            <Ionicons name="time-outline" size={14} color={THEME.textGray} />
                            <Text style={styles.sessionPreviewText}>{formatSessionPreview(session)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {hiddenSessionCount > 0 ? (
                      <Text style={styles.moreSessionsText}>+{hiddenSessionCount} more sessions</Text>
                    ) : null}

                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.secondaryActionButton}
                        activeOpacity={0.9}
                        onPress={() =>
                          navigation.navigate("PatientClinicDetails", {
                            clinicId: workplace.medicalCenterId,
                            clinicName: workplace.medicalCenterName,
                            location: location || "Location not provided",
                            status: nextSession ? "OPEN" : "CHECK SCHEDULE",
                            image: workplace.imageUrl || "",
                            rating: 0,
                            waitTime: nextSession ? "Check live queue" : "Queue details unavailable",
                            nextAvailable: formatClinicRouteNextAvailable(nextSession),
                            specialty: profile.specialization || "Medical Center",
                          })
                        }
                      >
                        <Text style={styles.secondaryActionText}>View Clinic</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        activeOpacity={0.9}
                        onPress={() =>
                          navigation.navigate("DoctorAvailabilityScreen", {
                            doctorId: profile.id,
                            clinicId: workplace.medicalCenterId,
                            clinicName: workplace.medicalCenterName,
                            doctorName: profile.fullName,
                            specialty: profile.specialization || undefined,
                          })
                        }
                      >
                        <Text style={styles.primaryActionText}>Book Now</Text>
                        <Ionicons name="arrow-forward" size={16} color={THEME.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Doctor not found</Text>
            <Text style={styles.stateText}>This doctor profile is not available.</Text>
          </View>
        )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.background },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 168,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, paddingBottom: 40, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.white,
  },
  headerSpacer: { width: 44, height: 44 },
  frozenHero: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    zIndex: 2,
  },
  heroBlock: {
    marginBottom: 8,
  },
  stateCard: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
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
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: THEME.accentBlue,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.white,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginTop: 14,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#03045E",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: THEME.accentBlueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textDark,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textGray,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.textDark,
  },
  sectionSubheading: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textGray,
  },
  emptyWorkplacesCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.borderStrong,
    backgroundColor: THEME.highlight,
    padding: 20,
  },
  emptyWorkplacesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textDark,
  },
  emptyWorkplacesText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textGray,
  },
  workplaceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#03045E",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  workplaceTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  workplaceImage: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
  },
  workplaceFallback: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.accentBlueSoft,
  },
  workplaceCopy: {
    flex: 1,
    marginLeft: 14,
  },
  workplaceArrowWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.highlight,
    borderWidth: 1,
    borderColor: THEME.border,
    marginLeft: 12,
  },
  workplaceName: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textDark,
  },
  workplaceLocation: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textGray,
  },
  nextSessionHero: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.borderStrong,
  },
  nextSessionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.blueTextOnSoft,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  nextSessionText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textDark,
  },
  sessionPreviewList: {
    marginTop: 12,
  },
  sessionPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  sessionPreviewText: {
    marginLeft: 8,
    fontSize: 12,
    color: THEME.textGray,
  },
  moreSessionsText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: THEME.accentBlue,
  },
  cardActionsRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.borderStrong,
    backgroundColor: THEME.accentBlueSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.accentBlue,
  },
  primaryActionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: THEME.accentBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.white,
  },
});
