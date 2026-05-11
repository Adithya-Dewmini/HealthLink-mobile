import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MedicalCenterStackParamList } from "../../types/navigation";
import { apiFetch } from "../../config/api";

type Props = NativeStackScreenProps<MedicalCenterStackParamList, "MedicalCenterAddDoctor">;

type DoctorSearchItem = {
  id: number;
  name: string;
  specialization: string | null;
  experience_years: number | null;
  profile_image: string | null;
  clinic_status: "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE" | null;
  clinic_hidden?: boolean;
  relationship_id?: string | null;
};

type DoctorFilters = {
  specialty: string;
  minExperience: number | null;
  verifiedOnly: boolean;
  availableToday: boolean;
};

const THEME = {
  background: "#F5F7FC",
  white: "#FFFFFF",
  surface: "#F8FAFC",
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
};

const EXPERIENCE_OPTIONS = [
  { label: "Any", value: null },
  { label: "3+ years", value: 3 },
  { label: "5+ years", value: 5 },
  { label: "10+ years", value: 10 },
] as const;

const DEFAULT_FILTERS: DoctorFilters = {
  specialty: "",
  minExperience: null,
  verifiedOnly: false,
  availableToday: false,
};

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");

  if (raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
      if (typeof parsed.error === "string" && parsed.error.trim()) {
        return parsed.error;
      }
    } catch {
      return raw.trim();
    }
  }

  return `${fallback} (HTTP ${response.status})`;
};

const getInviteButtonConfig = (
  status: DoctorSearchItem["clinic_status"],
  isHidden: boolean,
  inviting: boolean
) => {
  if (inviting) {
    return {
      label: "",
      disabled: true,
      containerStyle: styles.primaryAction,
      textStyle: styles.primaryActionText,
      spinnerColor: THEME.white,
      badgeLabel: null,
      badgeStyle: null,
      badgeTextStyle: null,
    };
  }

  if (status === "PENDING") {
    return {
      label: "Pending",
      disabled: true,
      containerStyle: styles.pendingAction,
      textStyle: styles.pendingActionText,
      spinnerColor: "#6B7280",
      badgeLabel: "Pending Approval",
      badgeStyle: styles.pendingBadge,
      badgeTextStyle: styles.pendingBadgeText,
    };
  }

  if (status === "ACTIVE") {
    if (isHidden) {
      return {
        label: "Unhide",
        disabled: false,
        containerStyle: styles.retryAction,
        textStyle: styles.retryActionText,
        spinnerColor: THEME.accentBlue,
        badgeLabel: "Hidden from Clinic List",
        badgeStyle: styles.neutralBadge,
        badgeTextStyle: styles.neutralBadgeText,
      };
    }

    return {
      label: "Assigned",
      disabled: true,
      containerStyle: styles.assignedAction,
      textStyle: styles.assignedActionText,
      spinnerColor: THEME.white,
      badgeLabel: "Assigned to Clinic",
      badgeStyle: styles.assignedBadge,
      badgeTextStyle: styles.assignedBadgeText,
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Invite Again",
      disabled: false,
      containerStyle: styles.retryAction,
      textStyle: styles.retryActionText,
      spinnerColor: THEME.accentBlue,
      badgeLabel: null,
      badgeStyle: null,
      badgeTextStyle: null,
    };
  }

  if (status === "INACTIVE") {
    return {
      label: "Inactive",
      disabled: true,
      containerStyle: styles.pendingAction,
      textStyle: styles.pendingActionText,
      spinnerColor: "#6B7280",
      badgeLabel: "Inactive in Clinic",
      badgeStyle: styles.neutralBadge,
      badgeTextStyle: styles.neutralBadgeText,
    };
  }

  return {
    label: "Invite",
    disabled: false,
    containerStyle: styles.primaryAction,
    textStyle: styles.primaryActionText,
    spinnerColor: THEME.white,
    badgeLabel: null,
    badgeStyle: null,
    badgeTextStyle: null,
  };
};

export default function AddDoctorScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<DoctorFilters>(DEFAULT_FILTERS);
  const [sheetDraft, setSheetDraft] = useState<DoctorFilters>(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctors, setDoctors] = useState<DoctorSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const debouncedQuery = useDebouncedValue(query, 350);

  const loadDoctors = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (debouncedQuery.trim()) {
          params.set("query", debouncedQuery.trim());
        }
        if (filters.specialty.trim()) {
          params.set("specialization", filters.specialty.trim());
        }
        params.set("limit", "40");
        params.set("offset", "0");

        const response = await apiFetch(`/api/doctors/search?${params.toString()}`);
        if (!response.ok) {
          throw new Error(await getResponseErrorMessage(response, "Failed to search doctors"));
        }

        const data = await response.json().catch(() => []);
        setDoctors(Array.isArray(data) ? data : []);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to search doctors");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedQuery, filters.specialty]
  );

  useEffect(() => {
    void loadDoctors("initial");
  }, [loadDoctors]);

  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((doctor) => {
      const value = String(doctor.specialization || "").trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((left, right) => left.localeCompare(right));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const experience = Number(doctor.experience_years || 0);
      const matchesExperience =
        filters.minExperience === null ? true : experience >= filters.minExperience;
      const matchesVerified = filters.verifiedOnly ? true : true;
      const matchesAvailability = filters.availableToday ? true : true;

      return matchesExperience && matchesVerified && matchesAvailability;
    });
  }, [doctors, filters.availableToday, filters.minExperience, filters.verifiedOnly]);

  const stats = useMemo(() => {
    const experienced = filteredDoctors.filter((doctor) => Number(doctor.experience_years || 0) >= 5).length;
    const specialists = filteredDoctors.filter(
      (doctor) =>
        (doctor.specialization || "").trim().length > 0 &&
        doctor.specialization !== "General Physician"
    ).length;

    return {
      total: filteredDoctors.length,
      experienced,
      specialists,
    };
  }, [filteredDoctors]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.specialty) count += 1;
    if (filters.minExperience !== null) count += 1;
    if (filters.verifiedOnly) count += 1;
    if (filters.availableToday) count += 1;
    return count;
  }, [filters]);

  const openFilters = useCallback(() => {
    setSheetDraft(filters);
    setFilterVisible(true);
  }, [filters]);

  const applyFilters = useCallback(() => {
    setFilters(sheetDraft);
    setFilterVisible(false);
  }, [sheetDraft]);

  const resetFilters = useCallback(() => {
    setSheetDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setFilterVisible(false);
  }, []);

  const handleInvite = async (doctorId: number) => {
    if (invitingId !== null) {
      return;
    }

    setInvitingId(doctorId);
    try {
      const response = await apiFetch("/api/center/doctors/invite", {
        method: "POST",
        body: JSON.stringify({ doctorId }),
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, "Failed to invite doctor"));
      }

      const payload = await response.json().catch(() => ({}));
      setDoctors((current) =>
        current.map((doctor) =>
          doctor.id === doctorId ? { ...doctor, clinic_status: "PENDING" } : doctor
        )
      );
      Alert.alert(
        "Doctor Invited",
        typeof payload?.message === "string"
          ? payload.message
          : "Doctor invitation sent successfully."
      );
    } catch (inviteError) {
      Alert.alert(
        "Invite Failed",
        inviteError instanceof Error ? inviteError.message : "Failed to invite doctor"
      );
    } finally {
      setInvitingId(null);
    }
  };

  const handleUnhide = async (doctor: DoctorSearchItem) => {
    if (invitingId !== null) {
      return;
    }

    if (!doctor.relationship_id) {
      Alert.alert("Unhide Doctor", "Doctor relationship is missing for this clinic.");
      return;
    }

    setInvitingId(doctor.id);
    try {
      const response = await apiFetch(`/api/center/doctors/${doctor.relationship_id}/hide`, {
        method: "PATCH",
        body: JSON.stringify({ hidden: false }),
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, "Failed to unhide doctor"));
      }

      setDoctors((current) =>
        current.map((item) =>
          item.id === doctor.id
            ? { ...item, clinic_hidden: false, clinic_status: item.clinic_status || "ACTIVE" }
            : item
        )
      );
      Alert.alert("Doctor Unhidden", "The doctor is visible in the clinic list again.");
    } catch (actionError) {
      Alert.alert(
        "Unhide Failed",
        actionError instanceof Error ? actionError.message : "Failed to unhide doctor"
      );
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDoctors("refresh")} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={THEME.accentBlue} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Discover Doctors</Text>

          <TouchableOpacity style={styles.iconCircle} onPress={() => void loadDoctors("refresh")}>
            <Ionicons name="refresh-outline" size={20} color={THEME.accentBlue} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={THEME.textMuted} />
            <TextInput
              placeholder="Search doctor..."
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholderTextColor={THEME.textMuted}
            />
            <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
              <Ionicons name="options-outline" size={18} color={THEME.accentBlue} />
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          {specialtyOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.specialtyScroll}
            >
              <TouchableOpacity
                style={[styles.specialtyPill, filters.specialty === "" && styles.specialtyPillActive]}
                onPress={() => setFilters((prev) => ({ ...prev, specialty: "" }))}
              >
                <Text style={[styles.specialtyText, filters.specialty === "" && styles.specialtyTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {specialtyOptions.map((item) => {
                const active = filters.specialty === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.specialtyPill, active && styles.specialtyPillActive]}
                    onPress={() => setFilters((prev) => ({ ...prev, specialty: item }))}
                  >
                    <Text style={[styles.specialtyText, active && styles.specialtyTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.statsRow}>
            <StatsCard
              label="Doctors"
              value={String(stats.total)}
              tint={THEME.accentBlueSoft}
              color={THEME.accentBlue}
              icon="people-outline"
            />
            <StatsCard
              label="5+ Years"
              value={String(stats.experienced)}
              tint={THEME.accentGreenSoft}
              color={THEME.accentGreen}
              icon="briefcase-outline"
            />
            <StatsCard
              label="Specialists"
              value={String(stats.specialists)}
              tint={THEME.accentAmberSoft}
              color={THEME.accentAmber}
              icon="ribbon-outline"
            />
          </View>

          <View style={styles.resultsMeta}>
            <Text style={styles.resultsLabel}>Doctor Directory</Text>
            <Text style={styles.resultsCount}>
              {loading ? "Searching..." : `${filteredDoctors.length} found`}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={THEME.accentBlue} />
              <Text style={styles.loadingText}>Loading doctor directory</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Unable to load doctors</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : filteredDoctors.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="medkit-outline" size={28} color={THEME.textGray} />
              </View>
              <Text style={styles.emptyTitle}>No doctors found</Text>
              <Text style={styles.emptyText}>Try another specialty or search keyword.</Text>
            </View>
          ) : (
            filteredDoctors.map((doctor) => {
              const inviteConfig = getInviteButtonConfig(
                doctor.clinic_status,
                Boolean(doctor.clinic_hidden),
                invitingId === doctor.id
              );

              return (
                <View key={doctor.id} style={styles.doctorCard}>
                <View style={styles.cardTop}>
                  {doctor.profile_image ? (
                    <Image source={{ uri: doctor.profile_image }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>
                        {doctor.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join("") || "DR"}
                      </Text>
                    </View>
                  )}

                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{doctor.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {doctor.specialization || "General Physician"}
                    </Text>

                    <View style={styles.metaRow}>
                      <MetricChip
                        icon="briefcase-outline"
                        value={`${doctor.experience_years ?? 0} years`}
                        tone="green"
                      />
                      <MetricChip
                        icon="shield-checkmark-outline"
                        value="Verified"
                        tone="blue"
                      />
                      {inviteConfig.badgeLabel ? (
                        <View style={inviteConfig.badgeStyle}>
                          <Text style={inviteConfig.badgeTextStyle}>{inviteConfig.badgeLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() =>
                      navigation.navigate("MedicalCenterDoctorProfile", { doctorId: doctor.id })
                    }
                  >
                    <Text style={styles.secondaryActionText}>View Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={inviteConfig.containerStyle}
                    onPress={() =>
                      doctor.clinic_status === "ACTIVE" && Boolean(doctor.clinic_hidden)
                        ? void handleUnhide(doctor)
                        : void handleInvite(doctor.id)
                    }
                    disabled={inviteConfig.disabled}
                  >
                    {invitingId === doctor.id ? (
                      <ActivityIndicator color={inviteConfig.spinnerColor} />
                    ) : (
                      <Text style={inviteConfig.textStyle}>{inviteConfig.label}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                </View>
              );
            })
          )}

          <View style={{ height: 36 }} />
        </View>
      </ScrollView>

      <DiscoverDoctorsFilterSheet
        visible={filterVisible}
        draft={sheetDraft}
        setDraft={setSheetDraft}
        specialties={specialtyOptions}
        onApply={applyFilters}
        onClose={() => setFilterVisible(false)}
        onReset={resetFilters}
      />
    </SafeAreaView>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

function StatsCard({
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
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
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
  tone: "blue" | "green";
}) {
  const palette =
    tone === "green"
      ? { bg: "#E6FAF3", color: "#18B67A" }
      : { bg: "#EAF1FF", color: "#2F6FED" };

  return (
    <View style={[styles.metricChip, { backgroundColor: palette.bg }]}>
      <Ionicons name={icon} size={12} color={palette.color} />
      <Text style={[styles.metricChipText, { color: palette.color }]}>{value}</Text>
    </View>
  );
}

function DiscoverDoctorsFilterSheet({
  visible,
  draft,
  setDraft,
  specialties,
  onApply,
  onClose,
  onReset,
}: {
  visible: boolean;
  draft: DoctorFilters;
  setDraft: React.Dispatch<React.SetStateAction<DoctorFilters>>;
  specialties: string[];
  onApply: () => void;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          style={styles.sheetContainer}
          onPress={(event) => {
            event.stopPropagation();
          }}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter Doctors</Text>
            <TouchableOpacity onPress={onReset}>
              <Text style={styles.sheetReset}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScroll}
          >
            <Text style={styles.sheetSectionLabel}>Specialty</Text>
            <View style={styles.sheetChipRow}>
              <SheetChip
                label="All"
                selected={draft.specialty === ""}
                onPress={() => setDraft((prev) => ({ ...prev, specialty: "" }))}
              />
              {specialties.map((item) => (
                <SheetChip
                  key={item}
                  label={item}
                  selected={draft.specialty === item}
                  onPress={() => setDraft((prev) => ({ ...prev, specialty: item }))}
                />
              ))}
            </View>

            <Text style={styles.sheetSectionLabel}>Experience</Text>
            <View style={styles.sheetChipRow}>
              {EXPERIENCE_OPTIONS.map((item) => (
                <SheetChip
                  key={item.label}
                  label={item.label}
                  selected={draft.minExperience === item.value}
                  onPress={() => setDraft((prev) => ({ ...prev, minExperience: item.value }))}
                />
              ))}
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Verified only</Text>
                <Text style={styles.toggleSubtitle}>Show verified doctors only</Text>
              </View>
              <Switch
                value={draft.verifiedOnly}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, verifiedOnly: value }))}
                trackColor={{ false: "#D7DEE8", true: "#BFD7FF" }}
                thumbColor={draft.verifiedOnly ? THEME.accentBlue : "#FFFFFF"}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Availability</Text>
                <Text style={styles.toggleSubtitle}>Available today (future option)</Text>
              </View>
              <Switch
                value={draft.availableToday}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, availableToday: value }))}
                trackColor={{ false: "#D7DEE8", true: "#BFD7FF" }}
                thumbColor={draft.availableToday ? THEME.accentBlue : "#FFFFFF"}
              />
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.sheetApplyButton} onPress={onApply}>
              <Text style={styles.sheetApplyText}>Apply Filters</Text>
              <Ionicons name="arrow-forward" size={18} color={THEME.white} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.sheetChip, selected && styles.sheetChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.sheetChipText, selected && styles.sheetChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: THEME.white,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.accentBlueSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textDark,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: THEME.textDark,
  },
  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: THEME.accentBlueSoft,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.white,
  },
  specialtyScroll: {
    paddingTop: 12,
    gap: 8,
  },
  specialtyPill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  specialtyPillActive: {
    backgroundColor: THEME.accentBlue,
    borderColor: THEME.accentBlue,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textGray,
  },
  specialtyTextActive: {
    color: THEME.white,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 12,
    minHeight: 88,
    borderWidth: 1,
    borderColor: "#E7EDF5",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statsIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  statsLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 3,
    fontWeight: "700",
  },
  resultsMeta: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textDark,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: "700",
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
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 20,
    padding: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#B91C1C",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#EEF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textDark,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: THEME.textGray,
    textAlign: "center",
  },
  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.accentBlueSoft,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.accentBlue,
  },
  cardCopy: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.textDark,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textGray,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metricChipText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryAction: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
  },
  secondaryActionText: {
    color: THEME.textDark,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryAction: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.accentBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: "800",
  },
  pendingAction: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingActionText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
  },
  assignedAction: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.accentGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  assignedActionText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: "800",
  },
  retryAction: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.accentBlue,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
  },
  retryActionText: {
    color: THEME.accentBlue,
    fontSize: 13,
    fontWeight: "800",
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  assignedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: THEME.accentGreenSoft,
  },
  assignedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.accentGreen,
  },
  neutralBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  neutralBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 18,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textDark,
  },
  sheetReset: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.accentBlue,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.textGray,
    marginBottom: 10,
  },
  sheetChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  sheetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.white,
  },
  sheetChipActive: {
    borderColor: THEME.accentBlue,
    backgroundColor: THEME.accentBlueSoft,
  },
  sheetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textGray,
  },
  sheetChipTextActive: {
    color: THEME.accentBlue,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textDark,
  },
  toggleSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: THEME.textGray,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 6,
  },
  sheetApplyButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.accentBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sheetApplyText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.white,
  },
});
