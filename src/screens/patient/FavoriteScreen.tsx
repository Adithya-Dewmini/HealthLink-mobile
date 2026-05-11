import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getFavorites,
  removeFavorite,
  type FavoriteItem,
} from "../../services/favoritesApi";
import { PatientEmptyState, PatientErrorState, PatientLoadingState } from "../../components/patient/PatientFeedback";
import { patientTheme } from "../../constants/patientTheme";
import type { PatientStackParamList } from "../../types/navigation";

const THEME = patientTheme.colors;

type FavoritesNavigation = NativeStackNavigationProp<PatientStackParamList>;
type FavoriteFilter = "all" | "doctor" | "medical_center" | "pharmacy";

const FILTERS: Array<{ key: FavoriteFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "doctor", label: "Doctors" },
  { key: "medical_center", label: "Medical Centers" },
  { key: "pharmacy", label: "Pharmacies" },
];

const makePendingKey = (item: FavoriteItem) => `${item.entityType}:${item.entityId}`;

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

export default function FavoriteScreen() {
  const navigation = useNavigation<FavoritesNavigation>();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FavoriteFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([]);

  const loadFavorites = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);
      const data = await getFavorites();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load favorites");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites("initial");
      return undefined;
    }, [loadFavorites])
  );

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.entityType === activeFilter);
  }, [activeFilter, items]);

  const handleRemove = useCallback(async (item: FavoriteItem) => {
    const pendingKey = makePendingKey(item);
    if (pendingRemovals.includes(pendingKey)) return;

    const previousItems = items;
    setPendingRemovals((current) => [...current, pendingKey]);
    setItems((current) =>
      current.filter(
        (entry) => !(entry.entityType === item.entityType && entry.entityId === item.entityId)
      )
    );

    try {
      await removeFavorite(item.entityType, item.entityId);
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "Could not update favorite. Please try again.");
    } finally {
      setPendingRemovals((current) => current.filter((entry) => entry !== pendingKey));
    }
  }, [items, pendingRemovals]);

  const openFavorite = useCallback(
    (item: FavoriteItem) => {
      if (item.entityType === "doctor") {
        if (item.clinicId && item.doctorId) {
          navigation.navigate("DoctorAvailabilityScreen", {
            doctorId: item.doctorId,
            clinicId: item.clinicId,
            clinicName: item.clinicName ?? undefined,
            doctorName: item.name,
            specialty: item.specialization ?? undefined,
          });
          return;
        }

        navigation.navigate("DoctorSearchScreen", { doctorId: item.doctorId ?? Number(item.entityId) });
        return;
      }

      if (item.entityType === "medical_center") {
        navigation.navigate("PatientClinicDetails", {
          clinicId: item.medicalCenterId ?? item.entityId,
          clinicName: item.name,
          location: item.location ?? "Sri Lanka",
          status: item.status ?? "OPEN",
          image: item.imageUrl ?? "",
          rating: item.rating ?? 0,
          waitTime: item.waitTime ?? "N/A",
          nextAvailable: item.nextAvailable ?? "Check schedule",
          specialty: item.medicalCenterSpecialty ?? item.subtitle ?? "General",
        });
        return;
      }

      navigation.navigate("PharmacyStore", {
        pharmacyId: item.pharmacyId ?? Number(item.entityId),
      });
    },
    [navigation]
  );

  const handlePrimaryAction = useCallback(
    (item: FavoriteItem) => {
      if (item.entityType === "doctor") {
        if (item.clinicId && item.doctorId) {
          navigation.navigate("BookAppointmentScreen", {
            doctorId: item.doctorId,
            clinicId: item.clinicId,
            clinicName: item.clinicName ?? undefined,
            doctorName: item.name,
            specialty: item.specialization ?? undefined,
            experienceYears: item.experienceYears ?? undefined,
            rating: item.rating ?? undefined,
            reviewCount: item.reviewCount ?? undefined,
          });
          return;
        }

        navigation.navigate("DoctorSearchScreen", { doctorId: item.doctorId ?? Number(item.entityId) });
        return;
      }

      if (item.entityType === "medical_center") {
        openFavorite(item);
        return;
      }

      navigation.navigate("UploadPrescription");
    },
    [navigation, openFavorite]
  );

  const emptyCopy = useMemo(() => {
    if (activeFilter === "doctor") {
      return {
        title: "No saved doctors yet",
        message: "Save doctors you trust so they are easier to find next time.",
      };
    }

    if (activeFilter === "medical_center") {
      return {
        title: "No saved medical centers yet",
        message: "Save medical centers to return to their doctors and schedules faster.",
      };
    }

    if (activeFilter === "pharmacy") {
      return {
        title: "No saved pharmacies yet",
        message: "Save pharmacies you use often to check medicines and prescriptions faster.",
      };
    }

    return {
      title: "Nothing saved yet",
      message: "Save doctors, pharmacies, or medical centers to find them faster next time.",
    };
  }, [activeFilter]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.modernPrimary} />
      <SafeAreaView style={styles.headerSafe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <Ionicons name="arrow-back" size={22} color={THEME.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>Saved Care</Text>
            <Text style={styles.headerTitle}>Favorites</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadFavorites("refresh")} activeOpacity={0.88}>
            <Ionicons name="refresh-outline" size={20} color={THEME.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRail}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, active ? styles.filterChipActive : null]}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.88}
              >
                <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFavorites("refresh")}
            tintColor={THEME.modernAccent}
          />
        }
      >
        {loading ? (
          <PatientLoadingState label="Loading your favorites..." />
        ) : error && items.length === 0 ? (
          <PatientErrorState
            title="Unable to load favorites"
            message={error}
            onRetry={() => void loadFavorites("initial")}
          />
        ) : filteredItems.length === 0 ? (
          <PatientEmptyState
            icon="heart-dislike-outline"
            title={emptyCopy.title}
            message={emptyCopy.message}
          />
        ) : (
          <View style={styles.list}>
            {filteredItems.map((item) => {
              const pending = pendingRemovals.includes(makePendingKey(item));
              return (
                <FavoriteCard
                  key={`${item.entityType}:${item.entityId}`}
                  item={item}
                  pending={pending}
                  onOpen={() => openFavorite(item)}
                  onPrimaryAction={() => handlePrimaryAction(item)}
                  onRemove={() => void handleRemove(item)}
                />
              );
            })}
          </View>
        )}

        {error && items.length > 0 ? (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle-outline" size={18} color={THEME.accentRed} />
            <Text style={styles.inlineErrorText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function FavoriteCard({
  item,
  pending,
  onOpen,
  onPrimaryAction,
  onRemove,
}: {
  item: FavoriteItem;
  pending: boolean;
  onOpen: () => void;
  onPrimaryAction: () => void;
  onRemove: () => void;
}) {
  const meta = getFavoriteMeta(item);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={onOpen}>
      <View style={styles.cardGlowOne} />
      <View style={styles.cardAccentLine} />

      <View style={styles.cardTopRow}>
        <View style={[styles.avatar, { backgroundColor: meta.avatarTint }]}>
          <Text style={[styles.avatarText, { color: meta.avatarText }]}>{getInitials(item.name)}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={[styles.heartButton, pending ? styles.heartButtonDisabled : null]}
              onPress={onRemove}
              disabled={pending}
              activeOpacity={0.88}
            >
              <Ionicons name="heart" size={18} color={THEME.accentRed} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitleText} numberOfLines={1}>
            {meta.subtitle}
          </Text>

          {meta.secondary ? (
            <Text style={styles.secondaryText} numberOfLines={1}>
              {meta.secondary}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: meta.badgeTint }]}>
              <Text style={[styles.typeBadgeText, { color: meta.badgeText }]}>{meta.typeLabel}</Text>
            </View>
            {item.unavailable ? (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableBadgeText}>Unavailable favorite</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onOpen} activeOpacity={0.88}>
          <Text style={styles.secondaryButtonText}>{meta.openLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryAction} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>{meta.primaryLabel}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function getFavoriteMeta(item: FavoriteItem) {
  if (item.entityType === "doctor") {
    return {
      typeLabel: "Doctor",
      subtitle: item.specialization ?? "Doctor",
      secondary: item.clinicName ?? item.location ?? "View doctor details",
      openLabel: "View Doctor",
      primaryLabel: item.clinicId ? "Book Now" : "View Doctor",
      avatarTint: "#E0F2FE",
      avatarText: "#0284C7",
      badgeTint: "#EFF6FF",
      badgeText: "#2563EB",
    };
  }

  if (item.entityType === "medical_center") {
    return {
      typeLabel: "Medical Center",
      subtitle: item.location ?? "Sri Lanka",
      secondary: item.nextAvailable ? `Next available ${item.nextAvailable}` : "View doctors and schedules",
      openLabel: "View Center",
      primaryLabel: "View Doctors",
      avatarTint: "#DBEAFE",
      avatarText: "#1D4ED8",
      badgeTint: "#EEF2FF",
      badgeText: "#4338CA",
    };
  }

  return {
    typeLabel: "Pharmacy",
    subtitle: item.location ?? "Saved pharmacy",
    secondary: item.status ?? "View pharmacy details",
    openLabel: "View Pharmacy",
    primaryLabel: "Upload Prescription",
    avatarTint: "#DCFCE7",
    avatarText: "#059669",
    badgeTint: "#ECFDF5",
    badgeText: "#047857",
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.modernBackground,
  },
  headerSafe: {
    backgroundColor: THEME.modernPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: THEME.modernPrimary,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerText: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.64)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: THEME.white,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  filtersWrap: {
    backgroundColor: THEME.modernBackground,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  filterRail: {
    paddingTop: 4,
    paddingBottom: 18,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.modernBorder,
  },
  filterChipActive: {
    backgroundColor: THEME.modernAccent,
    borderColor: THEME.modernAccent,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.modernMuted,
  },
  filterChipTextActive: {
    color: THEME.white,
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.modernBorder,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    overflow: "hidden",
  },
  cardGlowOne: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    right: -24,
    top: -20,
    backgroundColor: "rgba(56, 189, 248, 0.09)",
  },
  cardAccentLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  cardTopRow: {
    flexDirection: "row",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900",
  },
  cardBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardName: {
    flex: 1,
    fontSize: 19,
    fontWeight: "900",
    color: THEME.modernText,
  },
  heartButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  heartButtonDisabled: {
    opacity: 0.55,
  },
  subtitleText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: THEME.modernText,
  },
  secondaryText: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.modernMuted,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  unavailableBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFF7ED",
  },
  unavailableBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#C2410C",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.modernBorder,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.modernText,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.modernAccent,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: THEME.white,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 13,
    color: "#991B1B",
  },
});
