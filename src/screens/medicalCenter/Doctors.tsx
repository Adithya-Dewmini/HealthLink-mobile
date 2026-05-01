import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import Popover from "react-native-popover-view";
import { apiFetch } from "../../config/api";
import type { MedicalCenterStackParamList } from "../../types/navigation";
import {
  fetchSpecialties,
  updateDoctorSpecialty,
  type Specialty,
} from "../../services/specialtiesService";

const THEME = {
  primary: "#2F6FED",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#D97706",
  danger: "#EF4444",
  softBlue: "#EEF4FF",
  softGreen: "#DCFCE7",
  softAmber: "#FEF3C7",
  softRed: "#FEE2E2",
};

type DoctorRelationshipStatus = "PENDING" | "ACTIVE" | "INACTIVE";
type MenuAction = "pin" | "hide" | "toggle-status" | "remove";
type MenuAnchor = React.ElementRef<typeof TouchableOpacity> | null;

type DoctorCardItem = {
  id: string;
  doctor_id: number | null;
  doctor_profile_id: number | null;
  name: string | null;
  email: string;
  doctor_specialty: string | null;
  clinic_specialty_id: string | null;
  clinic_specialty: string | null;
  status: DoctorRelationshipStatus;
  joined_at: string;
  profile_image: string | null;
  is_pinned: boolean;
  is_hidden: boolean;
};

type AuthTokenPayload = {
  medicalCenterId?: string | null;
  centers?: Array<{ id?: string | null }>;
};

const STATUS_FILTERS: Array<{
  key: "ALL" | "ACTIVE" | "PENDING" | "INACTIVE";
  label: string;
}> = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PENDING", label: "Pending" },
  { key: "INACTIVE", label: "Disabled" },
];

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

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeDoctor = (item: unknown): DoctorCardItem | null => {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const id = toText(row.id);
  const email = toText(row.email).toLowerCase();
  const status = toText(row.status).toUpperCase() as DoctorRelationshipStatus;

  if (!id || !email || !["PENDING", "ACTIVE", "INACTIVE"].includes(status)) {
    return null;
  }

  return {
    id,
    doctor_id: typeof row.doctor_id === "number" ? row.doctor_id : null,
    doctor_profile_id: typeof row.doctor_profile_id === "number" ? row.doctor_profile_id : null,
    name: toText(row.name) || null,
    email,
    doctor_specialty: toText(row.doctor_specialty) || null,
    clinic_specialty_id: toText(row.clinic_specialty_id) || null,
    clinic_specialty: toText(row.clinic_specialty) || null,
    status,
    joined_at: toText(row.joined_at),
    profile_image: toText(row.profile_image) || null,
    is_pinned: Boolean(row.is_pinned),
    is_hidden: Boolean(row.is_hidden),
  };
};

const getInitials = (name: string | null, email: string) => {
  const source = (name || "").split(" ").filter(Boolean).slice(0, 2);
  const letters = source.map((part) => part.charAt(0).toUpperCase()).join("");
  return letters || email.slice(0, 2).toUpperCase() || "DR";
};

const getDisplayName = (doctor: DoctorCardItem) => doctor.name || "Doctor";
const getSpecialization = (doctor: DoctorCardItem) =>
  doctor.clinic_specialty || doctor.doctor_specialty || "Unassigned Specialty";

const getStatusTone = (status: DoctorRelationshipStatus) => {
  if (status === "ACTIVE") {
    return { label: "Active", bg: THEME.softGreen, color: THEME.success };
  }

  if (status === "INACTIVE") {
    return { label: "Inactive", bg: THEME.softRed, color: THEME.danger };
  }

  return { label: "Pending", bg: THEME.softAmber, color: THEME.warning };
};

export default function MedicalCenterDoctors() {
  const navigation = useNavigation<NativeStackNavigationProp<MedicalCenterStackParamList>>();
  const tabBarHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  const specialtyPickerRef = useRef<BottomSheetModal>(null);
  const menuTranslateX = useRef(new Animated.Value(-320)).current;
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorCardItem[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING" | "INACTIVE">("ALL");
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>("ALL");
  const [adminMenuVisible, setAdminMenuVisible] = useState(false);
  const [doctorMenuVisible, setDoctorMenuVisible] = useState(false);
  const [doctorMenuAnchor, setDoctorMenuAnchor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorCardItem | null>(null);
  const [specialtyDraftId, setSpecialtyDraftId] = useState<string | null>(null);
  const [savingSpecialty, setSavingSpecialty] = useState(false);

  const loadClinicId = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode<AuthTokenPayload>(token);
      const primary = typeof decoded.medicalCenterId === "string" ? decoded.medicalCenterId.trim() : "";
      if (primary) return primary;
      const fallback = decoded.centers?.find((center) => typeof center?.id === "string" && center.id.trim())?.id;
      return fallback?.trim() || null;
    } catch {
      return null;
    }
  }, []);

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const resolvedClinicId = clinicId || (await loadClinicId());
      if (!resolvedClinicId) {
        throw new Error("Clinic context not found");
      }

      if (!clinicId) {
        setClinicId(resolvedClinicId);
      }

      const [doctorResponse, specialtyData] = await Promise.all([
        apiFetch(`/api/clinics/${encodeURIComponent(resolvedClinicId)}/doctors`),
        fetchSpecialties(),
      ]);

      if (!doctorResponse.ok) {
        throw new Error(await getResponseErrorMessage(doctorResponse, "Failed to load doctors"));
      }

      const payload = await doctorResponse.json().catch(() => []);
      const normalized = Array.isArray(payload)
        ? (payload.map(normalizeDoctor).filter(Boolean) as DoctorCardItem[])
        : [];

      setDoctors(normalized.filter((doctor) => !doctor.is_hidden));
      setSpecialties(specialtyData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load doctors");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, loadClinicId]);

  useEffect(() => {
    if (isFocused) {
      void loadData("initial");
    }
  }, [isFocused, loadData]);

  const handleAction = useCallback(async (doctor: DoctorCardItem, action: MenuAction) => {
    if (busyId) {
      return;
    }

    setBusyId(doctor.id);
    try {
      let response: Response;

      if (action === "pin") {
        response = await apiFetch(`/api/doctors/${doctor.id}/pin`, {
          method: "PATCH",
          body: JSON.stringify({ pinned: !doctor.is_pinned }),
        });
      } else if (action === "hide") {
        response = await apiFetch(`/api/doctors/${doctor.id}/hide`, {
          method: "PATCH",
          body: JSON.stringify({ hidden: !doctor.is_hidden }),
        });
      } else if (action === "toggle-status") {
        response = await apiFetch(`/api/doctors/${doctor.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: doctor.status === "INACTIVE" ? "ACTIVE" : "INACTIVE" }),
        });
      } else {
        response = await apiFetch(`/api/doctors/${doctor.id}`, {
          method: "DELETE",
        });
      }

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, "Action failed"));
      }

      setDoctorMenuVisible(false);
      setSelectedDoctor(null);
      await loadData("refresh");
    } catch (actionError) {
      Alert.alert("Action Failed", actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }, [busyId, loadData]);

  const openDoctorActions = useCallback((doctor: DoctorCardItem, anchor: any) => {
    setSelectedDoctor(doctor);
    setSpecialtyDraftId(doctor.clinic_specialty_id);
    setDoctorMenuAnchor(anchor);
    setDoctorMenuVisible(true);
  }, []);

  const openAdminMenu = useCallback(() => {
    menuTranslateX.setValue(-320);
    setAdminMenuVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(menuTranslateX, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [menuTranslateX]);

  const closeAdminMenu = useCallback(() => {
    Animated.timing(menuTranslateX, {
      toValue: -320,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setAdminMenuVisible(false);
      }
    });
  }, [menuTranslateX]);

  const openSpecialtyPicker = useCallback(() => {
    setDoctorMenuVisible(false);
    requestAnimationFrame(() => {
      specialtyPickerRef.current?.present();
    });
  }, []);

  const handleSaveSpecialty = useCallback(async () => {
    if (!selectedDoctor || savingSpecialty) {
      return;
    }

    setSavingSpecialty(true);
    try {
      await updateDoctorSpecialty(selectedDoctor.id, specialtyDraftId);
      specialtyPickerRef.current?.dismiss();
      setSelectedDoctor(null);
      await loadData("refresh");
    } catch (saveError) {
      Alert.alert(
        "Update Specialty",
        saveError instanceof Error ? saveError.message : "Failed to update doctor specialty"
      );
    } finally {
      setSavingSpecialty(false);
    }
  }, [loadData, savingSpecialty, selectedDoctor, specialtyDraftId]);

  const filteredDoctors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const effectiveSpecialty = (doctor.clinic_specialty || doctor.doctor_specialty || "").trim();
      const matchesStatus =
        selectedStatusFilter === "ALL" ? true : doctor.status === selectedStatusFilter;
      const matchesFilter =
        selectedSpecialtyFilter === "ALL" ? true : effectiveSpecialty === selectedSpecialtyFilter;
      const haystack = [
        doctor.name || "",
        doctor.email,
        doctor.clinic_specialty || "",
        doctor.doctor_specialty || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);
      return matchesStatus && matchesFilter && matchesSearch;
    });
  }, [doctors, search, selectedSpecialtyFilter, selectedStatusFilter]);

  const specialtyFilters = useMemo(() => {
    const specialtySet = new Set<string>();

    specialties.forEach((item) => {
      const name = item.name.trim();
      if (name) specialtySet.add(name);
    });

    doctors.forEach((doctor) => {
      const fallbackName = (doctor.clinic_specialty || doctor.doctor_specialty || "").trim();
      if (fallbackName) specialtySet.add(fallbackName);
    });

    return ["ALL", ...Array.from(specialtySet).sort((left, right) => left.localeCompare(right))];
  }, [doctors, specialties]);

  const summaryCards = useMemo(
    () => [
      {
        key: "total",
        label: "Total",
        value: doctors.length,
        icon: "people-outline" as const,
        tint: THEME.softBlue,
        color: THEME.primary,
      },
      {
        key: "active",
        label: "Active",
        value: doctors.filter((doctor) => doctor.status === "ACTIVE").length,
        icon: "checkmark-circle-outline" as const,
        tint: THEME.softGreen,
        color: THEME.success,
      },
      {
        key: "pending",
        label: "Pending",
        value: doctors.filter((doctor) => doctor.status === "PENDING" && doctor.doctor_id !== null).length,
        icon: "time-outline" as const,
        tint: THEME.softAmber,
        color: THEME.warning,
      },
      {
        key: "requests",
        label: "Requests",
        value: doctors.filter((doctor) => doctor.status === "PENDING" && doctor.doctor_id === null).length,
        icon: "mail-unread-outline" as const,
        tint: THEME.softRed,
        color: THEME.danger,
      },
    ],
    [doctors]
  );

  const renderItem = useCallback(
    ({ item }: { item: DoctorCardItem }) => (
      <DoctorCard
        doctor={item}
        busy={busyId === item.id}
        onPress={() => {
          if (!item.doctor_profile_id) {
            Alert.alert("Doctor Profile", "This doctor profile is not available yet.");
            return;
          }
          navigation.navigate("MedicalCenterDoctorProfile", { doctorId: item.doctor_profile_id });
        }}
        onAddSchedule={() => {
          if (!item.doctor_profile_id || !item.doctor_id) {
            Alert.alert("Add Schedule", "This doctor is not ready for scheduling yet.");
            return;
          }
          navigation.navigate("MedicalCenterDoctorSchedule", {
            doctorId: item.doctor_profile_id,
            doctorUserId: item.doctor_id,
            doctorName: getDisplayName(item),
            specialization: getSpecialization(item),
          });
        }}
        onViewAvailability={() => {
          if (!item.doctor_profile_id || !item.doctor_id) {
            Alert.alert("View Availability", "This doctor is not ready for availability viewing yet.");
            return;
          }
          navigation.navigate("MedicalCenterDoctorAvailability", {
            doctorId: item.doctor_profile_id,
            doctorUserId: item.doctor_id,
            doctorName: getDisplayName(item),
            specialization: getSpecialization(item),
          });
        }}
        onOpenMenu={(anchor) => openDoctorActions(item, anchor)}
      />
    ),
    [busyId, navigation, openDoctorActions]
  );

  const listHeader = (
    <View>
      <View style={styles.searchShell}>
        <Ionicons name="search-outline" size={18} color={THEME.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search doctor..."
          placeholderTextColor={THEME.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filtersRow}>
        {STATUS_FILTERS.map((item) => {
          const active = selectedStatusFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedStatusFilter(item.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {specialtyFilters.length > 1 ? (
        <View style={styles.filtersRow}>
          {specialtyFilters.map((item) => {
            const label = item === "ALL" ? "All Specialties" : item;
            const active = selectedSpecialtyFilter === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedSpecialtyFilter(item)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <View key={card.key} style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: card.tint }]}>
              <Ionicons name={card.icon} size={16} color={card.color} />
            </View>
            <Text style={styles.summaryValue}>{card.value}</Text>
            <Text style={styles.summaryLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load doctors</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={openAdminMenu}>
          <Ionicons name="menu-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Doctors</Text>
          <Text style={styles.headerSub}>Management dashboard</Text>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={() => void loadData("refresh")}>
          <Ionicons name="refresh-outline" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          renderItem={() => <DoctorCardSkeleton />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData("refresh")} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="medkit-outline" size={28} color={THEME.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No doctors match this view</Text>
              <Text style={styles.emptyText}>Adjust the search or filter, or add a new doctor.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("MedicalCenterAddDoctor")}
              >
                <Ionicons name="add" size={18} color={THEME.white} />
                <Text style={styles.emptyButtonText}>Add Doctor</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 28 }]}
        onPress={() => navigation.navigate("MedicalCenterAddDoctor")}
      >
        <Ionicons name="add" size={26} color={THEME.white} />
      </TouchableOpacity>

      <Modal
        visible={adminMenuVisible}
        transparent
        animationType="none"
        onRequestClose={closeAdminMenu}
      >
        <Pressable style={styles.drawerOverlay} onPress={closeAdminMenu}>
          <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: menuTranslateX }] }]}>
            <Pressable onPress={(event) => event.stopPropagation()}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Clinic Menu</Text>
                <Text style={styles.drawerSubtitle}>Quick access to doctor management actions.</Text>
              </View>

              <DrawerAction
                icon="layers-outline"
                label="Manage Specialties"
                onPress={() => {
                  closeAdminMenu();
                  navigation.navigate("MedicalCenterSpecialties");
                }}
              />
              <DrawerAction
                icon="person-add-outline"
                label="Add Doctor"
                onPress={() => {
                  closeAdminMenu();
                  navigation.navigate("MedicalCenterAddDoctor");
                }}
              />
              <DrawerAction
                icon="people-outline"
                label="Bulk Assign Doctors"
                onPress={() => {
                  closeAdminMenu();
                  navigation.navigate("MedicalCenterAddDoctor");
                }}
              />
              <DrawerAction
                icon="settings-outline"
                label="Clinic Settings"
                onPress={() => {
                  closeAdminMenu();
                  navigation.navigate("MedicalCenterSettings");
                }}
              />
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      <Popover
        isVisible={doctorMenuVisible}
        from={doctorMenuAnchor}
        onRequestClose={() => setDoctorMenuVisible(false)}
        placement={"bottom" as any}
        popoverStyle={styles.popoverCard}
        backgroundStyle={styles.popoverBackdrop}
      >
        <View style={styles.popoverContent}>
          <PopoverAction icon="options-outline" label="Assign Specialty" onPress={openSpecialtyPicker} />
          <PopoverAction
            icon="pin-outline"
            label={selectedDoctor?.is_pinned ? "Unpin Doctor" : "Pin Doctor"}
            onPress={() => selectedDoctor && void handleAction(selectedDoctor, "pin")}
            disabled={selectedDoctor ? busyId === selectedDoctor.id : false}
          />
          <PopoverAction
            icon="eye-off-outline"
            label={selectedDoctor?.is_hidden ? "Unhide Doctor" : "Hide Doctor"}
            onPress={() => selectedDoctor && void handleAction(selectedDoctor, "hide")}
            disabled={selectedDoctor ? busyId === selectedDoctor.id : false}
          />
          <PopoverAction
            icon={selectedDoctor?.status === "INACTIVE" ? "checkmark-circle-outline" : "ban-outline"}
            label={selectedDoctor?.status === "INACTIVE" ? "Activate Doctor" : "Disable Doctor"}
            onPress={() => selectedDoctor && void handleAction(selectedDoctor, "toggle-status")}
            disabled={selectedDoctor ? busyId === selectedDoctor.id : false}
            destructive={selectedDoctor?.status !== "INACTIVE"}
          />
          <PopoverAction
            icon="trash-outline"
            label="Remove Doctor"
            onPress={() => selectedDoctor && void handleAction(selectedDoctor, "remove")}
            disabled={selectedDoctor ? busyId === selectedDoctor.id : false}
            destructive
            last
          />
          {selectedDoctor && busyId === selectedDoctor.id ? (
            <ActivityIndicator style={styles.popoverLoader} color={THEME.primary} />
          ) : null}
        </View>
      </Popover>

      <BottomSheetModal
        ref={specialtyPickerRef}
        snapPoints={["64%"]}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
        onDismiss={() => setSavingSpecialty(false)}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Assign Specialty</Text>
          <Text style={styles.sheetSubtitle}>
            {selectedDoctor ? `Select a specialty for ${getDisplayName(selectedDoctor)}.` : "Select a specialty."}
          </Text>

          <TouchableOpacity
            style={[styles.specialtyOption, specialtyDraftId === null && styles.specialtyOptionActive]}
            onPress={() => setSpecialtyDraftId(null)}
          >
            <Text style={[styles.specialtyOptionText, specialtyDraftId === null && styles.specialtyOptionTextActive]}>
              No specialty assigned
            </Text>
            {specialtyDraftId === null ? <Ionicons name="checkmark" size={18} color={THEME.primary} /> : null}
          </TouchableOpacity>

          {specialties.map((item) => {
            const active = specialtyDraftId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.specialtyOption, active && styles.specialtyOptionActive]}
                onPress={() => setSpecialtyDraftId(item.id)}
              >
                <Text style={[styles.specialtyOptionText, active && styles.specialtyOptionTextActive]}>{item.name}</Text>
                {active ? <Ionicons name="checkmark" size={18} color={THEME.primary} /> : null}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.saveSpecialtyButton, savingSpecialty && styles.saveSpecialtyButtonDisabled]}
            onPress={() => void handleSaveSpecialty()}
            disabled={savingSpecialty}
          >
            {savingSpecialty ? (
              <ActivityIndicator color={THEME.white} />
            ) : (
              <Text style={styles.saveSpecialtyButtonText}>Save Specialty</Text>
            )}
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

function DoctorCard({
  doctor,
  busy,
  onPress,
  onAddSchedule,
  onViewAvailability,
  onOpenMenu,
}: {
  doctor: DoctorCardItem;
  busy: boolean;
  onPress: () => void;
  onAddSchedule: () => void;
  onViewAvailability: () => void;
  onOpenMenu: (anchor: MenuAnchor) => void;
}) {
  const tone = getStatusTone(doctor.status);
  const menuButtonRef = useRef<MenuAnchor>(null);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.94} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.identityRow}>
          {doctor.profile_image ? (
            <Image source={{ uri: doctor.profile_image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{getInitials(doctor.name, doctor.email)}</Text>
            </View>
          )}

          <View style={styles.identityCopy}>
            <Text style={styles.nameText}>{getDisplayName(doctor)}</Text>
            <Text style={styles.emailText}>{doctor.email}</Text>
            <Text style={styles.specializationText}>{getSpecialization(doctor)}</Text>
          </View>
        </View>

        <TouchableOpacity
          ref={(ref) => {
            menuButtonRef.current = ref;
          }}
          style={styles.menuButton}
          onPress={() => onOpenMenu(menuButtonRef.current)}
          disabled={busy}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.badgeText, { color: tone.color }]}>{tone.label}</Text>
        </View>
        {doctor.is_pinned ? (
          <View style={styles.pinChip}>
            <Ionicons name="pin" size={12} color={THEME.primary} />
            <Text style={styles.pinChipText}>Pinned</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryAction} onPress={onAddSchedule} disabled={busy}>
          <Text style={styles.primaryActionText}>+ Add Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={onViewAvailability} disabled={busy}>
          <Text style={styles.secondaryActionText}>View Availability</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function SheetAction({
  icon,
  label,
  onPress,
  disabled,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.sheetAction} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={18} color={destructive ? THEME.danger : THEME.textPrimary} />
      <Text style={[styles.sheetActionText, destructive && styles.sheetActionTextDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PopoverAction({
  icon,
  label,
  onPress,
  disabled,
  destructive,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.popoverAction, last && styles.popoverActionLast, disabled && styles.popoverActionDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={destructive ? THEME.danger : THEME.textPrimary} />
      <Text style={[styles.popoverActionText, destructive && styles.popoverActionTextDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DrawerAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.drawerAction} onPress={onPress}>
      <View style={styles.drawerActionIcon}>
        <Ionicons name={icon} size={18} color={THEME.primary} />
      </View>
      <Text style={styles.drawerActionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={THEME.textSecondary} />
    </TouchableOpacity>
  );
}

function DoctorCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonTop}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonCopy}>
          <View style={[styles.skeletonLine, { width: "56%" }]} />
          <View style={[styles.skeletonLine, { width: "72%" }]} />
          <View style={[styles.skeletonLine, { width: "46%" }]} />
        </View>
      </View>
      <View style={styles.skeletonActions}>
        <View style={styles.skeletonButton} />
        <View style={styles.skeletonButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: THEME.white,
  },
  headerCopy: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { marginTop: 2, fontSize: 13, color: THEME.textSecondary },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { padding: 20, paddingBottom: 120 },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: THEME.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: THEME.textPrimary,
    fontSize: 14,
  },
  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: "700", color: THEME.textSecondary },
  filterChipTextActive: { color: THEME.white },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 22,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: { marginTop: 14, fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  summaryLabel: { marginTop: 4, fontSize: 12, color: THEME.textSecondary },
  errorCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  errorTitle: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  errorText: { marginTop: 6, fontSize: 14, lineHeight: 21, color: THEME.textSecondary },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  identityRow: { flexDirection: "row", flex: 1, gap: 12 },
  avatarImage: { width: 54, height: 54, borderRadius: 27, backgroundColor: THEME.softBlue },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: THEME.primary },
  identityCopy: { flex: 1 },
  nameText: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  emailText: { marginTop: 3, fontSize: 13, color: THEME.textSecondary },
  specializationText: { marginTop: 4, fontSize: 13, fontWeight: "700", color: THEME.textPrimary },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.background,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  pinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: THEME.softBlue,
  },
  pinChipText: { fontSize: 12, fontWeight: "700", color: THEME.primary },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  primaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryActionText: { fontSize: 13, fontWeight: "800", color: THEME.white },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryActionText: { fontSize: 13, fontWeight: "800", color: THEME.primary },
  emptyState: {
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
  },
  emptyTitle: { marginTop: 16, fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  emptyText: { marginTop: 8, fontSize: 14, textAlign: "center", color: THEME.textSecondary },
  emptyButton: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: THEME.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: { fontSize: 14, fontWeight: "800", color: THEME.white },
  fab: {
    position: "absolute",
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.24)",
  },
  drawerPanel: {
    width: "78%",
    maxWidth: 320,
    height: "100%",
    backgroundColor: THEME.white,
    paddingTop: 66,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 8, height: 0 },
    elevation: 12,
  },
  drawerHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  drawerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textSecondary,
  },
  drawerAction: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  drawerActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  popoverBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  popoverArrow: {
    backgroundColor: THEME.white,
  },
  popoverCard: {
    borderRadius: 16,
    backgroundColor: THEME.white,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  popoverContent: {
    width: 220,
    paddingVertical: 8,
  },
  popoverAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  popoverActionLast: {
    borderBottomWidth: 0,
  },
  popoverActionDisabled: {
    opacity: 0.6,
  },
  popoverActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  popoverActionTextDanger: {
    color: THEME.danger,
  },
  popoverLoader: {
    paddingVertical: 10,
  },
  sheetHandle: { backgroundColor: THEME.border },
  sheetBackground: { backgroundColor: THEME.white },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 28 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary, marginBottom: 8 },
  sheetSubtitle: { fontSize: 13, lineHeight: 19, color: THEME.textSecondary, marginBottom: 14 },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetActionText: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  sheetActionTextDanger: { color: THEME.danger },
  sheetLoader: { marginTop: 16 },
  specialtyOption: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  specialtyOptionActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.softBlue,
  },
  specialtyOptionText: { fontSize: 14, color: THEME.textPrimary },
  specialtyOptionTextActive: { fontWeight: "800", color: THEME.primary },
  saveSpecialtyButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveSpecialtyButtonDisabled: { opacity: 0.7 },
  saveSpecialtyButtonText: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  skeletonTop: { flexDirection: "row", gap: 12 },
  skeletonAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E5E7EB",
  },
  skeletonCopy: { flex: 1, gap: 8 },
  skeletonLine: { height: 12, borderRadius: 999, backgroundColor: "#E5E7EB" },
  skeletonActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  skeletonButton: { flex: 1, height: 44, borderRadius: 999, backgroundColor: "#E5E7EB" },
});
