import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../../config/api";
import { getFavorites, toggleFavorite as toggleFavoriteRequest } from "../../services/favoritesApi";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import { resolveImageUrl } from "../../utils/imageUrl";

type PatientNavigation = NativeStackNavigationProp<PatientStackParamList>;
type IconName = keyof typeof Ionicons.glyphMap;

type FilterKey = "ALL" | "NEARBY" | "OPEN" | "FAVORITES";

type MedicalCenterStatus = "OPEN" | "CLOSED" | "QUEUE LIVE";

type MedicalCenter = {
  id: string;
  name: string;
  location: string;
  rating: number;
  waitTime: string;
  status: MedicalCenterStatus;
  nextAvailable: string;
  image: string;
  specialty: string;
  liveQueueCount: number;
  isFavorite: boolean;
};

const THEME = patientTheme.colors;
const HEADER_NAVY = THEME.modernPrimary;

const SHADOW = patientTheme.shadows.card;

const FILTERS: Array<{ key: FilterKey; label: string; icon: IconName }> = [
  { key: "ALL", label: "All", icon: "grid-outline" },
  { key: "NEARBY", label: "Nearby", icon: "navigate-outline" },
  { key: "OPEN", label: "Open Now", icon: "flash-outline" },
  { key: "FAVORITES", label: "Favorites", icon: "heart-outline" },
];

const normalize = (value: string) => value.trim().toLowerCase();

const toTitle = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const parseCenters = (payload: unknown): MedicalCenter[] => {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { clinics?: unknown[] }).clinics)
      ? (payload as { clinics: unknown[] }).clinics
      : payload && typeof payload === "object" && Array.isArray((payload as { medicalCenters?: unknown[] }).medicalCenters)
        ? (payload as { medicalCenters: unknown[] }).medicalCenters
        : [];

  return rows
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const center = row as Record<string, unknown>;
      const rawStatus = String(center.status ?? center.queue_status ?? "OPEN").toUpperCase();
      const status: MedicalCenterStatus =
        rawStatus === "QUEUE LIVE" || rawStatus === "QUEUE_LIVE"
          ? "QUEUE LIVE"
          : rawStatus === "CLOSED"
            ? "CLOSED"
            : "OPEN";

      const liveQueueCount = Number(center.liveQueueCount ?? center.queue_count ?? center.patient_count ?? 0) || 0;
      const waitTime =
        typeof center.waitTime === "string"
          ? center.waitTime
          : `${Number(center.average_wait ?? center.wait_minutes ?? 15) || 15} min`;

      return {
        id: String(center.id ?? center.medical_center_id ?? index + 1),
        name: String(center.name ?? center.clinic_name ?? "Medical Center"),
        location: String(center.location ?? center.city ?? center.address ?? "Sri Lanka"),
        rating: Number(center.rating ?? 0) || 0,
        waitTime,
        status,
        nextAvailable: String(center.nextAvailable ?? center.next_available ?? "10:30 AM"),
        image: resolveImageUrl(
          (typeof center.cover_image_url === "string" && center.cover_image_url.trim()
            ? center.cover_image_url
            : typeof center.image === "string" && center.image.trim()
              ? center.image
              : typeof center.image_url === "string" && center.image_url.trim()
                ? center.image_url
                : typeof center.logo_url === "string" && center.logo_url.trim()
                  ? center.logo_url
                  : "") || null
        ) || "",
        specialty: String(center.specialty ?? center.type ?? "General"),
        liveQueueCount,
        isFavorite: Boolean(center.isFavorite ?? false),
      } satisfies MedicalCenter;
    })
    .filter((item): item is MedicalCenter => Boolean(item));
};

const LoadingCard = memo(function LoadingCard() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.skeletonHeaderText}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonLine} />
          </View>
          <View style={styles.skeletonCircle} />
        </View>
        <View style={styles.skeletonMetaRow} />
        <View style={styles.skeletonTagRow}>
          <View style={styles.skeletonTag} />
          <View style={styles.skeletonTag} />
        </View>
        <View style={styles.skeletonActionRow}>
          <View style={styles.skeletonButtonHalf} />
          <View style={styles.skeletonButtonHalf} />
        </View>
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

const MedicalCenterCard = memo(function MedicalCenterCard({
  item,
  onView,
  onBook,
  onToggleFavorite,
  favoriteBusy,
}: {
  item: MedicalCenter;
  onView: () => void;
  onBook: () => void;
  onToggleFavorite: () => void;
  favoriteBusy: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [scale]);

  const isLive = item.status === "QUEUE LIVE";
  const primaryCopy = isLive ? "Join Queue" : "Book Appointment";
  const statusText = isLive ? "Queue Live" : item.status === "OPEN" ? "Open" : "Closed";
  const secondaryStatusText = isLive ? THEME.success : item.status === "OPEN" ? THEME.success : THEME.textSecondary;

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
      <Pressable style={styles.card} onPress={onView} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="business-outline" size={34} color={THEME.primary} />
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.locationLabel} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            <View style={styles.cardHeaderActions}>
              {item.rating > 0 ? (
                <View style={styles.ratingBox}>
                  <Ionicons name="star" size={14} color={THEME.star} />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onToggleFavorite}
              activeOpacity={0.88}
              style={[styles.favoriteButton, favoriteBusy ? styles.favoriteButtonDisabled : null]}
              disabled={favoriteBusy}
            >
              <Ionicons
                name={item.isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={item.isFavorite ? "#EF4444" : THEME.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: secondaryStatusText, fontWeight: "700" }]}>
              {statusText}
            </Text>
            <View style={styles.dot} />
            <Text style={[styles.metaText, { color: THEME.primary, fontWeight: "700" }]}>
              {toTitle(item.specialty)}
            </Text>
          </View>

          {isLive ? (
            <View style={styles.tagRow}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{`${item.liveQueueCount} waiting`}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.88} onPress={onView}>
              <Text style={styles.secondaryButtonText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={onBook}>
              <Text style={styles.primaryButtonText}>{primaryCopy}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function MedicalCenterHubScreen() {
  const navigation = useNavigation<PatientNavigation>();
  const [centers, setCenters] = useState<MedicalCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<string[]>([]);

  const loadCenters = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);
      const [response, favorites] = await Promise.all([
        apiFetch("/api/clinics"),
        getFavorites().catch((favoriteError) => {
          console.error("Load medical center favorites error:", favoriteError);
          return null;
        }),
      ]);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string" ? payload.message : "Failed to load medical centers"
        );
      }

      const favoriteIds = new Set(
        (favorites?.medicalCenters ?? []).map((center) => String(center.entityId))
      );
      setCenters(
        parseCenters(payload).map((center) => ({
          ...center,
          isFavorite: favoriteIds.has(center.id),
        }))
      );
    } catch (err) {
      console.error("Load clinics error:", err);
      setCenters([]);
      setError(err instanceof Error ? err.message : "Failed to load medical centers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCenters(centers.length === 0);
      return undefined;
    }, [centers.length, loadCenters])
  );

  const filteredCenters = useMemo(() => {
    let next = [...centers];
    const searchTerm = normalize(search);

    if (activeFilter === "NEARBY") {
      next = next.filter((center) => normalize(center.location).includes("colombo"));
    }

    if (activeFilter === "OPEN") {
      next = next.filter((center) => center.status === "OPEN" || center.status === "QUEUE LIVE");
    }

    if (activeFilter === "FAVORITES") {
      next = next.filter((center) => center.isFavorite);
    }

    if (searchTerm) {
      next = next.filter(
        (center) =>
          normalize(center.name).includes(searchTerm) ||
          normalize(center.specialty).includes(searchTerm) ||
          normalize(center.location).includes(searchTerm)
      );
    }

    return next;
  }, [activeFilter, centers, search]);

  const toggleFavorite = useCallback(async (id: string) => {
    if (favoriteBusyIds.includes(id)) return;

    const center = centers.find((entry) => entry.id === id);
    if (!center) return;

    const isFavorite = center.isFavorite;
    setFavoriteBusyIds((current) => [...current, id]);
    setCenters((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, isFavorite: !isFavorite } : entry))
    );

    try {
      await toggleFavoriteRequest("medical_center", id, isFavorite);
    } catch (err) {
      console.error("Toggle medical center favorite error:", err);
      setCenters((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, isFavorite } : entry))
      );
    } finally {
      setFavoriteBusyIds((current) => current.filter((entry) => entry !== id));
    }
  }, [centers, favoriteBusyIds]);

  const renderFixedHeader = useCallback(
    () => (
      <View>
        <View style={styles.headerBlock}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.88}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={22} color={THEME.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.eyebrow}>Patient Care</Text>
              <Text style={styles.screenTitle}>Medical Centers</Text>
            </View>
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeValue}>{filteredCenters.length}</Text>
              <Text style={styles.resultBadgeLabel}>found</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchShell}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={THEME.modernMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search clinic or specialty"
                placeholderTextColor={THEME.modernMuted}
                style={styles.searchInput}
              />
            </View>
          </View>
        </View>

        <View style={styles.filtersPanel}>
          <FlatList
            horizontal
            data={FILTERS}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            renderItem={({ item }) => (
              <FilterChip
                label={item.label}
                active={activeFilter === item.key}
                onPress={() => setActiveFilter(item.key)}
              />
            )}
          />
        </View>
      </View>
    ),
    [activeFilter, filteredCenters.length, search]
  );

  const renderCenterCard = useCallback(
    ({ item }: { item: MedicalCenter }) => (
      <MedicalCenterCard
        item={item}
        onView={() =>
          navigation.navigate("PatientClinicDetails", {
            clinicId: item.id,
            clinicName: item.name,
            location: item.location,
            status: item.status,
            image: item.image,
            rating: item.rating,
            waitTime: item.waitTime,
            nextAvailable: item.nextAvailable,
            specialty: item.specialty,
          })
        }
        onBook={() =>
          navigation.navigate("PatientClinicDetails", {
            clinicId: item.id,
            clinicName: item.name,
            location: item.location,
            status: item.status,
            image: item.image,
            rating: item.rating,
            waitTime: item.waitTime,
            nextAvailable: item.nextAvailable,
            specialty: item.specialty,
          })
        }
        onToggleFavorite={() => void toggleFavorite(item.id)}
        favoriteBusy={favoriteBusyIds.includes(item.id)}
      />
    ),
    [favoriteBusyIds, navigation, toggleFavorite]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Ionicons
          name={error ? "alert-circle-outline" : "business-outline"}
          size={28}
          color={error ? THEME.red : THEME.textMuted}
        />
        <Text style={styles.emptyTitle}>
          {error ? "Unable to load medical centers" : "No medical centers found"}
        </Text>
        <Text style={styles.emptyText}>
          {error ? error : "Try another search or change the selected filter."}
        </Text>
        {error ? (
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.88} onPress={() => void loadCenters()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [error, loadCenters]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY} />
      <LinearGradient colors={[THEME.modernPrimary, "#1E293B"]} style={styles.headerBackground} />
      {renderFixedHeader()}
      {loading ? (
        <FlatList
          style={styles.list}
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.listContent}
          renderItem={() => <LoadingCard />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={filteredCenters}
          keyExtractor={(item) => item.id}
          renderItem={renderCenterCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadCenters(false);
              }}
              tintColor={THEME.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.modernBackground,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 190,
  },
  list: {
    flex: 1,
    backgroundColor: THEME.modernBackground,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 120,
  },
  headerBlock: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 0,
    minHeight: 112,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 2,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: THEME.white,
    marginBottom: 0,
    textAlign: "center",
  },
  resultBadge: {
    width: 52,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginBottom: 0,
  },
  resultBadgeValue: {
    color: THEME.white,
    fontSize: 18,
    fontWeight: "900",
  },
  resultBadgeLabel: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 1,
  },
  searchSection: {
    marginTop: -8,
    marginBottom: 10,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  searchShell: {
    borderRadius: 32,
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.9)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: THEME.textPrimary,
  },
  filtersPanel: {
    paddingHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.white,
  },
  cardWrap: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  cardImage: { width: "100%", height: 130, backgroundColor: "#E5E7EB" },
  imagePlaceholder: {
    width: "100%",
    height: 130,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { padding: 16 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  locationLabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textSecondary,
  },
  cardHeaderActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: "700", color: THEME.star },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButtonDisabled: {
    opacity: 0.55,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { fontSize: 13, color: THEME.textSecondary },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: THEME.border, marginHorizontal: 8 },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  tagBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "600", color: THEME.textSecondary },
  actionsRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: THEME.white,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  primaryButton: {
    flex: 1.3,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.white,
  },
  emptyState: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.modernBorder,
    ...SHADOW,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: THEME.modernAccentDark,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: "800",
  },
  skeletonImage: {
    width: "100%",
    height: 130,
    backgroundColor: "#E9EEF5",
  },
  skeletonHeaderText: {
    flex: 1,
  },
  skeletonTitle: {
    width: "68%",
    height: 18,
    borderRadius: 8,
    backgroundColor: "#E9EEF5",
    marginBottom: 10,
  },
  skeletonLine: {
    width: "48%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EEF2F7",
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2F7",
  },
  skeletonMetaRow: {
    width: "48%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EEF2F7",
    marginTop: 12,
  },
  skeletonTagRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  skeletonTag: {
    width: 110,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
  },
  skeletonActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  skeletonButtonHalf: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#E9EEF5",
  },
});
