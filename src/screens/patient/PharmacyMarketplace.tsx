import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { addFavorite, getFavorites, removeFavorite } from "../../services/favoritesApi";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2563EB",
  background: "#F9FAFB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  star: "#F59E0B",
};

export default function PharmacyMarketplace() {
  const [activeFilter, setActiveFilter] = useState("Nearest");
  const [isOpen, setIsOpen] = useState(false);
  const [favoritePharmacyIds, setFavoritePharmacyIds] = useState<number[]>([]);
  const navigation = useNavigation<any>();

  const pharmacies = [
    {
      id: 1,
      name: "Lanka Pharmacy - Central",
      rating: "4.8",
      distance: "0.8 km",
      location: "Colombo",
      status: "Open Now",
      tags: ["Delivery", "E-Prescription"],
      image: "https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?q=80&w=1000&auto=format&fit=crop",
    },
    {
      id: 2,
      name: "MediHelp Wellness Center",
      rating: "4.5",
      distance: "1.4 km",
      location: "Kandy",
      status: "Open Now",
      tags: ["24/7", "Drive-thru"],
      image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?q=80&w=1000&auto=format&fit=crop",
    },
    {
      id: 3,
      name: "City Care Healthcare",
      rating: "4.2",
      distance: "2.1 km",
      location: "Galle",
      status: "Closing Soon",
      tags: ["In-store only"],
      image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?q=80&w=1000&auto=format&fit=crop",
    },
  ];

  React.useEffect(() => {
    const loadFavorites = async () => {
      try {
        const data = await getFavorites();
        setFavoritePharmacyIds(data.pharmacies.map((pharmacy) => Number(pharmacy.id)));
      } catch (err) {
        console.error("Load favorite pharmacies error:", err);
      }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async (pharmacyId: number) => {
    const isFavorite = favoritePharmacyIds.includes(pharmacyId);
    setFavoritePharmacyIds((current) =>
      isFavorite ? current.filter((id) => id !== pharmacyId) : [...current, pharmacyId]
    );

    try {
      if (isFavorite) {
        await removeFavorite(pharmacyId, "pharmacy");
      } else {
        await addFavorite(pharmacyId, "pharmacy");
      }
    } catch (err) {
      setFavoritePharmacyIds((current) =>
        isFavorite ? [...current, pharmacyId] : current.filter((id) => id !== pharmacyId)
      );
      console.error("Toggle pharmacy favorite error:", err);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Pharmacies</Text>
          <Text style={styles.headerSub}>Find trusted pharmacies near you</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={24} color={THEME.primary} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={THEME.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pharmacy or medicine"
              placeholderTextColor={THEME.textSecondary}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {["Nearest", "Open Now", "Top Rated", "24/7 Service"].map((filter) => (
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

        {pharmacies.map((pharmacy) => (
          <PharmacyCard
            key={pharmacy.id}
            {...pharmacy}
            isFavorite={favoritePharmacyIds.includes(pharmacy.id)}
            onToggleFavorite={() => toggleFavorite(pharmacy.id)}
            onPress={() => navigation.navigate("PharmacyStore", { pharmacyId: pharmacy.id })}
          />
        ))}

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
  name,
  rating,
  distance,
  status,
  tags,
  image,
  isFavorite,
  onToggleFavorite,
  onPress,
}: any) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
    <Image source={{ uri: image }} style={styles.cardImage} />
    <View style={styles.cardContent}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardName}>{name}</Text>
        <View style={styles.cardHeaderActions}>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={14} color={THEME.star} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
          <TouchableOpacity style={styles.favoriteBtn} onPress={onToggleFavorite}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? "#EF4444" : THEME.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{distance} away</Text>
        <View style={styles.dot} />
        <Text style={[styles.metaText, { color: THEME.success, fontWeight: "700" }]}>{status}</Text>
      </View>

      <View style={styles.tagRow}>
        {tags.map((tag: string) => (
          <View key={tag} style={styles.tagBadge}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.ctaRow}>
        <Text style={styles.availabilityHint}>Popular medicines available</Text>
        <TouchableOpacity style={styles.viewStoreBtn}>
          <Text style={styles.viewStoreText}>View Store</Text>
          <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
    borderWidth: 2,
    borderColor: "#EFF6FF",
  },
  scrollContent: { paddingHorizontal: 16 },
  searchContainer: { marginVertical: 15 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 30,
    paddingHorizontal: 18,
    height: 52,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
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
  cardContent: { padding: 16 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeaderActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardName: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: "800", color: THEME.star },
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { fontSize: 13, color: THEME.textSecondary },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: THEME.border, marginHorizontal: 8 },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  tagBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "700", color: THEME.textSecondary },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 15 },
  ctaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  availabilityHint: { fontSize: 12, color: THEME.textSecondary, fontStyle: "italic" },
  viewStoreBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewStoreText: { fontSize: 14, fontWeight: "800", color: THEME.primary },
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
    fontWeight: "800",
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
  sheetLabel: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  sheetDesc: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  sheetClose: { marginTop: 6, padding: 10, alignItems: "center" },
  sheetCloseText: { color: THEME.textSecondary, fontWeight: "700", fontSize: 14 },
});
