import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { PatientStackParamList } from "../../types/navigation";

type PatientNavigation = NativeStackNavigationProp<PatientStackParamList>;

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

const THEME = {
  background: "#F5F7FB",
  white: "#FFFFFF",
  primary: "#2F6FED",
  textPrimary: "#172033",
  textSecondary: "#6B7280",
  textMuted: "#94A3B8",
  border: "#E5EAF1",
  chipBg: "#EEF2F7",
  chipActive: "#DCE8FF",
  green: "#16A34A",
  red: "#DC2626",
  blue: "#2563EB",
  amber: "#F59E0B",
};

const SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.06 as const,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "NEARBY", label: "Nearby" },
  { key: "OPEN", label: "Open Now" },
  { key: "FAVORITES", label: "Favorites" },
];

const FALLBACK_CENTER_IMAGES = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1579684385127-1ecd15d5bfbc?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1200&auto=format&fit=crop",
];

const normalize = (value: string) => value.trim().toLowerCase();

const toTitle = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const statusTone = (status: MedicalCenterStatus) => {
  if (status === "OPEN") return THEME.green;
  if (status === "QUEUE LIVE") return THEME.blue;
  return THEME.red;
};

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
        rating: Number(center.rating ?? 4.5) || 4.5,
        waitTime,
        status,
        nextAvailable: String(center.nextAvailable ?? center.next_available ?? "10:30 AM"),
        image:
          typeof center.image === "string" && center.image.trim()
            ? center.image
            : typeof center.cover_image_url === "string" && center.cover_image_url.trim()
              ? center.cover_image_url
            : typeof center.image_url === "string" && center.image_url.trim()
              ? center.image_url
              : typeof center.logo_url === "string" && center.logo_url.trim()
                ? center.logo_url
              : FALLBACK_CENTER_IMAGES[index % FALLBACK_CENTER_IMAGES.length],
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
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonMetaRow}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonBadge} />
        </View>
        <View style={styles.skeletonButton} />
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
}: {
  item: MedicalCenter;
  onView: () => void;
  onBook: () => void;
  onToggleFavorite: () => void;
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

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale }] }]}>
      <Pressable style={styles.card} onPress={onView} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: item.image }} style={styles.cardImage} />
          <View style={[styles.statusBadge, { backgroundColor: statusTone(item.status) }]}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={THEME.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onToggleFavorite}
              activeOpacity={0.88}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={item.isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={item.isFavorite ? "#EF4444" : THEME.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricPill}>
              <Ionicons name="star" size={14} color={THEME.amber} />
              <Text style={styles.metricText}>{item.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.metricPill}>
              <Ionicons name="time-outline" size={14} color={THEME.textSecondary} />
              <Text style={styles.metricText}>{item.waitTime}</Text>
            </View>
          </View>

          <Text style={styles.queueText}>
            {item.status === "QUEUE LIVE"
              ? `Live Queue (${item.liveQueueCount} patients)`
              : `Opens at ${item.nextAvailable}`}
          </Text>
          <Text style={styles.nextAvailableText}>Next available: {item.nextAvailable}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.88} onPress={onView}>
              <Text style={styles.secondaryButtonText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88} onPress={onBook}>
              <Text style={styles.primaryButtonText}>Book Appointment</Text>
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

  const loadCenters = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);
      const response = await apiFetch("/api/clinics");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string" ? payload.message : "Failed to load medical centers"
        );
      }

      setCenters(parseCenters(payload));
    } catch (err) {
      console.error("Load clinics error:", err);
      setCenters([]);
      setError(err instanceof Error ? err.message : "Failed to load medical centers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

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

  const toggleFavorite = useCallback((id: string) => {
    setCenters((prev) =>
      prev.map((center) =>
        center.id === id ? { ...center, isFavorite: !center.isFavorite } : center
      )
    );
  }, []);

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerBlock}>
        <Text style={styles.screenTitle}>Medical Centers</Text>
        <Text style={styles.screenSubtitle}>Find your clinic, check queue status, and book faster.</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={THEME.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search clinic or specialty"
            placeholderTextColor={THEME.textMuted}
            style={styles.searchInput}
          />
        </View>

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
    ),
    [activeFilter, search]
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
          navigation.navigate("DoctorSearchScreen", {
            specialty: item.specialty,
          })
        }
        onToggleFavorite={() => toggleFavorite(item.id)}
      />
    ),
    [navigation, toggleFavorite]
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
      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          renderItem={() => <LoadingCard />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredCenters}
          keyExtractor={(item) => item.id}
          renderItem={renderCenterCard}
          ListHeaderComponent={renderHeader}
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
    backgroundColor: THEME.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  headerBlock: {
    marginBottom: 18,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    ...SHADOW,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: THEME.textPrimary,
  },
  filtersContent: {
    paddingRight: 8,
  },
  filterChip: {
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.chipBg,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: THEME.chipActive,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.primary,
  },
  cardWrap: {
    marginBottom: 18,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    overflow: "hidden",
    ...SHADOW,
  },
  imageWrap: {
    height: 140,
    width: "100%",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    marginLeft: 5,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  metricsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginRight: 8,
  },
  metricText: {
    marginLeft: 5,
    fontSize: 12,
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  queueText: {
    fontSize: 13,
    color: THEME.textPrimary,
    fontWeight: "700",
    marginBottom: 4,
  },
  nextAvailableText: {
    fontSize: 13,
    color: THEME.primary,
    fontWeight: "600",
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: "row",
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#F8FAFC",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  primaryButton: {
    flex: 1.45,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.white,
  },
  emptyState: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
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
    backgroundColor: THEME.primary,
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
    height: 140,
    backgroundColor: "#E9EEF5",
  },
  skeletonTitle: {
    width: "58%",
    height: 18,
    borderRadius: 8,
    backgroundColor: "#E9EEF5",
    marginBottom: 10,
  },
  skeletonLine: {
    width: "42%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EEF2F7",
    marginBottom: 14,
  },
  skeletonMetaRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  skeletonBadge: {
    width: 88,
    height: 28,
    borderRadius: 12,
    backgroundColor: "#EEF2F7",
    marginRight: 10,
  },
  skeletonButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#E9EEF5",
  },
});
