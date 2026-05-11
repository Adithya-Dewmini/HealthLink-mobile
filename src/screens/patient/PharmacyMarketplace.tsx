import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { PatientEmptyState, PatientErrorState, PatientLoadingState } from "../../components/patient/PatientFeedback";
import { getFavorites, toggleFavorite as toggleFavoriteRequest } from "../../services/favoritesApi";
import {
  getPatientPharmacies,
  type PatientPharmacy,
} from "../../services/patientPharmacyService";
import { patientTheme } from "../../constants/patientTheme";

const { width } = Dimensions.get("window");

const THEME = patientTheme.colors;

export default function PharmacyMarketplace() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [isOpen, setIsOpen] = useState(false);
  const [favoritePharmacyIds, setFavoritePharmacyIds] = useState<string[]>([]);
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<string[]>([]);
  const [pharmacies, setPharmacies] = useState<PatientPharmacy[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  const loadPharmacies = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [pharmacyData, favoriteData] = await Promise.all([
        getPatientPharmacies(),
        getFavorites().catch((favoriteError) => {
          console.log("Load pharmacy favorites error:", favoriteError);
          return { doctors: [], pharmacies: [], medicalCenters: [], items: [] };
        }),
      ]);
      setPharmacies(pharmacyData);
      setFavoritePharmacyIds(favoriteData.pharmacies.map((item) => String(item.entityId)));
    } catch (err) {
      console.log("Load pharmacies error:", err);
      setError(err instanceof Error ? err.message : "Failed to load pharmacies");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPharmacies("initial");
      return undefined;
    }, [loadPharmacies])
  );

  const visiblePharmacies = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return pharmacies.filter((pharmacy) => {
      const matchesSearch =
        query.length === 0 ||
        pharmacy.name.toLowerCase().includes(query) ||
        pharmacy.location.toLowerCase().includes(query);

      const status = pharmacy.status.toLowerCase();
      const verificationStatus = pharmacy.verificationStatus.toLowerCase();
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Open Now" && status.includes("open")) ||
        (activeFilter === "Verified" && verificationStatus === "approved") ||
        (activeFilter === "Top Rated" && (pharmacy.rating ?? 0) >= 4);

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, pharmacies, searchText]);

  const toggleFavorite = async (pharmacyId: number) => {
    const favoriteKey = String(pharmacyId);
    if (favoriteBusyIds.includes(favoriteKey)) return;

    const isFavorite = favoritePharmacyIds.includes(favoriteKey);
    setFavoriteBusyIds((current) => [...current, favoriteKey]);
    setFavoritePharmacyIds((current) =>
      isFavorite ? current.filter((id) => id !== favoriteKey) : [...current, favoriteKey]
    );

    try {
      await toggleFavoriteRequest("pharmacy", favoriteKey, isFavorite);
    } catch (err) {
      console.log("Toggle pharmacy favorite error:", err);
      setFavoritePharmacyIds((current) =>
        isFavorite ? [...current, favoriteKey] : current.filter((id) => id !== favoriteKey)
      );
    } finally {
      setFavoriteBusyIds((current) => current.filter((id) => id !== favoriteKey));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[THEME.modernPrimary, "#1E293B"]} style={styles.headerBackground} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} activeOpacity={0.88}>
          <Ionicons name="chevron-back" size={22} color={THEME.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>Pharmacy Hub</Text>
          <Text style={styles.headerTitle}>Pharmacies</Text>
        </View>
        <TouchableOpacity
          style={styles.headerIconBtn}
          activeOpacity={0.88}
          onPress={() => navigation.navigate("Cart")}
        >
          <Ionicons name="cart-outline" size={22} color={THEME.white} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchShell}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={THEME.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pharmacy or medicine"
              placeholderTextColor={THEME.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadPharmacies("refresh")} />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {["All", "Open Now", "Verified", "Top Rated"].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterPill, activeFilter === filter && styles.activePill]}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <PatientLoadingState label="Loading pharmacies..." />
        ) : error ? (
          <PatientErrorState message={error} onRetry={() => void loadPharmacies()} />
        ) : visiblePharmacies.length === 0 ? (
          <PatientEmptyState
            icon="storefront-outline"
            title="No pharmacies found"
            message="Try another search term or pull down to refresh."
          />
        ) : (
          visiblePharmacies.map((pharmacy) => (
            <PharmacyCard
              key={pharmacy.id}
              pharmacy={pharmacy}
              isFavorite={favoritePharmacyIds.includes(String(pharmacy.id))}
              favoriteBusy={favoriteBusyIds.includes(String(pharmacy.id))}
              onToggleFavorite={() => toggleFavorite(pharmacy.id)}
              onPress={() => navigation.navigate("PharmacyStore", { pharmacyId: pharmacy.id })}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsOpen((prev) => !prev)}
        activeOpacity={0.85}
      >
        <Ionicons name={isOpen ? "close" : "grid"} size={24} color={THEME.white} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Quick Actions</Text>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setIsOpen(false);
                navigation.navigate("UploadPrescription");
              }}
            >
              <View style={styles.sheetIcon}>
                <Ionicons name="cloud-upload-outline" size={22} color={THEME.primary} />
              </View>
              <View style={styles.sheetText}>
                <Text style={styles.sheetLabel}>Upload Prescription</Text>
                <Text style={styles.sheetDesc}>Add a new prescription</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setIsOpen(false);
                navigation.navigate("SymptomChecker");
              }}
            >
              <View style={[styles.sheetIcon, styles.sheetIconWarn]}>
                <Ionicons name="shield-checkmark" size={22} color="#F59E0B" />
              </View>
              <View style={styles.sheetText}>
                <Text style={styles.sheetLabel}>Symptom Checker</Text>
                <Text style={styles.sheetDesc}>Check your symptoms</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setIsOpen(false);
                navigation.navigate("MedicineSearch");
              }}
            >
              <View style={[styles.sheetIcon, styles.sheetIconPurple]}>
                <Ionicons name="medkit-outline" size={22} color="#8B5CF6" />
              </View>
              <View style={styles.sheetText}>
                <Text style={styles.sheetLabel}>Pharmacy / Medicine</Text>
                <Text style={styles.sheetDesc}>Manage your medicines</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetClose} onPress={() => setIsOpen(false)}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const PharmacyCard = ({
  pharmacy,
  isFavorite,
  favoriteBusy,
  onToggleFavorite,
  onPress,
}: {
  pharmacy: PatientPharmacy;
  isFavorite: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
    {pharmacy.imageUrl ? (
      <Image source={{ uri: pharmacy.imageUrl }} style={styles.cardImage} />
    ) : (
      <View style={styles.imagePlaceholder}>
        <Ionicons name="storefront-outline" size={34} color={THEME.primary} />
      </View>
    )}
    <View style={styles.cardContent}>
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{pharmacy.name}</Text>
          <Text style={styles.locationLabel}>{pharmacy.location}</Text>
        </View>
        <View style={styles.cardHeaderActions}>
          {pharmacy.rating !== null ? (
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color={THEME.star} />
              <Text style={styles.ratingText}>{pharmacy.rating.toFixed(1)}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.favoriteBtn, favoriteBusy ? styles.favoriteBtnDisabled : null]}
            onPress={onToggleFavorite}
            disabled={favoriteBusy}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? "#EF4444" : THEME.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: THEME.success, fontWeight: "700" }]}>
          {pharmacy.status}
        </Text>
        {pharmacy.verificationStatus === "approved" ? (
          <>
            <View style={styles.dot} />
            <Text style={[styles.metaText, { color: THEME.primary, fontWeight: "700" }]}>
              Verified
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.tagRow}>
        {["QR prescription", "Patient handoff"].map((tag: string) => (
          <View key={tag} style={styles.tagBadge}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  headerBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 200,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.64)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: THEME.white },
  badge: {
    position: "absolute",
    top: 11,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "rgba(15, 23, 42, 0.8)",
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  prototypeBanner: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#D7E8FF",
  },
  prototypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
  },
  prototypeTextWrap: { flex: 1 },
  prototypeTitle: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  prototypeText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: THEME.textSecondary },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    position: "relative",
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.9)",
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: THEME.textPrimary },
  filterScroll: { marginBottom: 20, paddingBottom: 5 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: THEME.white,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activePill: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  filterText: { fontSize: 13, fontWeight: "700", color: THEME.textSecondary },
  activeFilterText: { color: THEME.white },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    marginBottom: 20,
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
  cardHeaderActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardName: { fontSize: 18, fontWeight: "700", color: THEME.textPrimary },
  locationLabel: { marginTop: 3, fontSize: 12, fontWeight: "600", color: THEME.textSecondary },
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
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteBtnDisabled: {
    opacity: 0.55,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { fontSize: 13, color: THEME.textSecondary },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: THEME.border, marginHorizontal: 8 },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  tagBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "600", color: THEME.textSecondary },
  fab: {
    position: "absolute",
    bottom: 130,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: THEME.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    width: width * 0.9,
    maxWidth: 420,
    marginBottom: 180,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 12,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sheetIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sheetIconWarn: { backgroundColor: "#FEF3C7" },
  sheetIconPurple: { backgroundColor: "#F3E8FF" },
  sheetText: { flex: 1 },
  sheetLabel: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  sheetDesc: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  sheetClose: { marginTop: 6, padding: 10, alignItems: "center" },
  sheetCloseText: { color: THEME.textSecondary, fontWeight: "700", fontSize: 14 },
});
