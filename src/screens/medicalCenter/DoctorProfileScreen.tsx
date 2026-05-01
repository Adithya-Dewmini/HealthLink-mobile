import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { MedicalCenterStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<MedicalCenterStackParamList, "MedicalCenterDoctorProfile">;

type DoctorProfile = {
  id: number;
  name: string;
  specialization: string | null;
  experience_years: number | null;
  qualifications: string | null;
  bio: string | null;
  affiliations: string | null;
  consultation_fee: string | number | null;
  profile_image: string | null;
  languages: string | null;
  clinic_status: "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE" | null;
  availability_preview: Array<{ day: string; start: string; end: string }>;
  clinics: Array<{ name: string; type?: string | null }>;
};

const THEME = {
  primary: "#2F6FED",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
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

const getInviteProfileState = (
  status: DoctorProfile["clinic_status"],
  inviting: boolean
) => {
  if (inviting) {
    return {
      label: "",
      disabled: true,
      style: styles.inviteButton,
      textStyle: styles.inviteButtonText,
      spinnerColor: THEME.white,
      badge: null,
      badgeStyle: null,
      badgeTextStyle: null,
    };
  }

  if (status === "PENDING") {
    return {
      label: "Pending",
      disabled: true,
      style: styles.pendingButton,
      textStyle: styles.pendingButtonText,
      spinnerColor: "#6B7280",
      badge: "Pending Approval",
      badgeStyle: styles.pendingBadge,
      badgeTextStyle: styles.pendingBadgeText,
    };
  }

  if (status === "ACTIVE") {
    return {
      label: "Assigned",
      disabled: true,
      style: styles.assignedButton,
      textStyle: styles.assignedButtonText,
      spinnerColor: THEME.white,
      badge: "Assigned to Clinic",
      badgeStyle: styles.assignedBadge,
      badgeTextStyle: styles.assignedBadgeText,
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Invite Again",
      disabled: false,
      style: styles.retryButton,
      textStyle: styles.retryButtonText,
      spinnerColor: THEME.primary,
      badge: null,
      badgeStyle: null,
      badgeTextStyle: null,
    };
  }

  if (status === "INACTIVE") {
    return {
      label: "Inactive",
      disabled: true,
      style: styles.pendingButton,
      textStyle: styles.pendingButtonText,
      spinnerColor: "#6B7280",
      badge: "Inactive in Clinic",
      badgeStyle: styles.pendingBadge,
      badgeTextStyle: styles.pendingBadgeText,
    };
  }

  return {
    label: "Invite Doctor",
    disabled: false,
    style: styles.inviteButton,
    textStyle: styles.inviteButtonText,
    spinnerColor: THEME.white,
    badge: null,
    badgeStyle: null,
    badgeTextStyle: null,
  };
};

export default function DoctorProfileScreen({ navigation, route }: Props) {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiFetch(`/api/doctors/${route.params.doctorId}`);
      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, "Failed to load doctor profile"));
      }

      const data = await response.json();
      setProfile(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load doctor profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.doctorId]);

  useEffect(() => {
    loadProfile("initial");
  }, [loadProfile]);

  const initials = useMemo(() => {
    const parts = (profile?.name || "").split(" ").filter(Boolean).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "DR";
  }, [profile?.name]);
  const inviteState = useMemo(
    () => getInviteProfileState(profile?.clinic_status ?? null, inviting),
    [profile?.clinic_status, inviting]
  );

  const handleInvite = async () => {
    if (!profile || inviting) {
      return;
    }

    setInviting(true);
    try {
      const response = await apiFetch("/api/center/doctors/invite", {
        method: "POST",
        body: JSON.stringify({ doctorId: profile.id }),
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, "Failed to invite doctor"));
      }

      const payload = await response.json().catch(() => ({}));
      setProfile((current) => (current ? { ...current, clinic_status: "PENDING" } : current));
      Alert.alert(
        "Doctor Invited",
        typeof payload?.message === "string" ? payload.message : "Doctor invitation sent successfully."
      );
    } catch (inviteError) {
      Alert.alert(
        "Invite Failed",
        inviteError instanceof Error ? inviteError.message : "Failed to invite doctor"
      );
    } finally {
      setInviting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Doctor Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile("refresh")} />}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load profile</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : profile ? (
          <>
            <View style={styles.heroCard}>
              {profile.profile_image ? (
                <Image source={{ uri: profile.profile_image }} style={styles.heroImage} />
              ) : (
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroAvatarText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.heroName}>{profile.name}</Text>
              <Text style={styles.heroMeta}>{profile.specialization || "General Practice"}</Text>
              <Text style={styles.heroMeta}>
                {profile.experience_years ?? 0} years experience
              </Text>
              {inviteState.badge ? (
                <View style={inviteState.badgeStyle}>
                  <Text style={inviteState.badgeTextStyle}>{inviteState.badge}</Text>
                </View>
              ) : null}
            </View>

            <Section title="Qualifications" value={profile.qualifications} />
            <Section title="Bio" value={profile.bio} />
            <Section title="Hospital Affiliations" value={profile.affiliations} />
            <Section title="Languages" value={profile.languages} />
            <Section
              title="Consultation Fee"
              value={
                profile.consultation_fee !== null && profile.consultation_fee !== undefined
                  ? `LKR ${profile.consultation_fee}`
                  : null
              }
            />

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Availability Preview</Text>
              {profile.availability_preview.length === 0 ? (
                <Text style={styles.sectionValue}>No availability published.</Text>
              ) : (
                profile.availability_preview.map((slot, index) => (
                  <View key={`${slot.day}-${slot.start}-${index}`} style={styles.listRow}>
                    <Text style={styles.listPrimary}>{slot.day}</Text>
                    <Text style={styles.listSecondary}>{slot.start} - {slot.end}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Clinics</Text>
              {profile.clinics.length === 0 ? (
                <Text style={styles.sectionValue}>No active clinic affiliations.</Text>
              ) : (
                profile.clinics.map((clinic, index) => (
                  <View key={`${clinic.name}-${index}`} style={styles.listRow}>
                    <Text style={styles.listPrimary}>{clinic.name}</Text>
                    <Text style={styles.listSecondary}>{clinic.type || "PRIVATE"}</Text>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={inviteState.style}
              onPress={handleInvite}
              disabled={inviteState.disabled}
            >
              {inviting ? (
                <ActivityIndicator color={inviteState.spinnerColor} />
              ) : (
                <Text style={inviteState.textStyle}>{inviteState.label}</Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, value }: { title: string; value: string | null }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionValue}>{value || "Not provided"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 12 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "800", color: THEME.textPrimary },
  scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  centerState: { paddingVertical: 60, alignItems: "center" },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#B91C1C" },
  errorText: { fontSize: 13, color: "#991B1B", marginTop: 8 },
  heroCard: {
    backgroundColor: THEME.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  heroImage: { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  heroAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroAvatarText: { fontSize: 28, fontWeight: "800", color: THEME.primary },
  heroName: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary, textAlign: "center" },
  heroMeta: { fontSize: 14, color: THEME.textSecondary, marginTop: 6, textAlign: "center" },
  sectionCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: THEME.textPrimary, marginBottom: 8 },
  sectionValue: { fontSize: 14, lineHeight: 22, color: THEME.textSecondary },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  listPrimary: { flex: 1, fontSize: 14, fontWeight: "700", color: THEME.textPrimary },
  listSecondary: { fontSize: 13, color: THEME.textSecondary, marginLeft: 16 },
  inviteButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  inviteButtonText: { color: THEME.white, fontSize: 16, fontWeight: "800" },
  pendingButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  pendingButtonText: { color: "#6B7280", fontSize: 16, fontWeight: "800" },
  assignedButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.success,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  assignedButtonText: { color: THEME.white, fontSize: 16, fontWeight: "800" },
  retryButton: {
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.primary,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  retryButtonText: { color: THEME.primary, fontSize: 16, fontWeight: "800" },
  pendingBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  pendingBadgeText: { color: "#6B7280", fontSize: 12, fontWeight: "700" },
  assignedBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  assignedBadgeText: { color: THEME.success, fontSize: 12, fontWeight: "700" },
});
