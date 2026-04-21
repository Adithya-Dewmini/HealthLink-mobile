import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  getFavorites,
  type FavoriteDoctor,
  type FavoritePharmacy,
} from "../../services/favoritesApi";

const THEME = {
  primary: "#2563EB",
  background: "#F8FAFC",
  white: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  softBlue: "#EFF6FF",
  success: "#10B981",
  border: "#E2E8F0",
  danger: "#EF4444",
};

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<"Doctors" | "Pharmacies">("Doctors");
  const [doctors, setDoctors] = useState<FavoriteDoctor[]>([]);
  const [pharmacies, setPharmacies] = useState<FavoritePharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data = await getFavorites();
      setDoctors(data.doctors);
      setPharmacies(data.pharmacies);
    } catch (err: any) {
      setError(err?.message || "Failed to load favorites");
    } finally {
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites(false);
      return undefined;
    }, [loadFavorites])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites(false);
  }, [loadFavorites]);

  const activeItems = useMemo(
    () => (activeTab === "Doctors" ? doctors : pharmacies),
    [activeTab, doctors, pharmacies]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Favorites</Text>
          <Text style={styles.headerSub}>Quick access to your preferred choices</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => void loadFavorites(false)}>
          <Ionicons name="search-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabWrapper}>
        <View style={styles.tabTrack}>
          {(["Doctors", "Pharmacies"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabPill, activeTab === tab && styles.activeTabPill]}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.centerText}>Loading favorites...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color={THEME.danger} />
          <Text style={styles.errorTitle}>Unable to load favorites</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFavorites()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />
          }
        >
          {activeTab === "Doctors" ? (
            <View>
              {doctors.length ? (
                doctors.map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    name={doctor.name}
                    specialty={doctor.specialization}
                    hospital={
                      doctor.experienceYears != null
                        ? `${doctor.experienceYears} years experience`
                        : "Specialist"
                    }
                    rating="4.9"
                    image={`https://i.pravatar.cc/150?u=doctor-${doctor.id}`}
                  />
                ))
              ) : (
                <EmptyState message="No favorite doctors yet" />
              )}
            </View>
          ) : (
            <View>
              {pharmacies.length ? (
                pharmacies.map((pharmacy) => (
                  <PharmacyCard
                    key={pharmacy.id}
                    name={pharmacy.name}
                    location={pharmacy.location}
                    distance={pharmacy.rating != null ? `${pharmacy.rating.toFixed(1)} rating` : "Saved pharmacy"}
                    isOpen={(pharmacy.status || "").toLowerCase().includes("open")}
                  />
                ))
              ) : (
                <EmptyState message="No favorite pharmacies yet" />
              )}
            </View>
          )}

          {!!activeItems.length && <View style={{ height: 100 }} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const EmptyState = ({ message }: { message: string }) => (
  <View style={styles.emptyCard}>
    <Ionicons name="heart-dislike-outline" size={28} color={THEME.textSecondary} />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const DoctorCard = ({
  name,
  specialty,
  hospital,
  rating,
  image,
}: {
  name: string;
  specialty: string;
  hospital: string;
  rating: string;
  image: string;
}) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9}>
    <View style={styles.cardHeader}>
      <Image source={{ uri: image }} style={styles.doctorImg} />
      <View style={styles.cardDetails}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardName}>{name}</Text>
          <Ionicons name="heart" size={20} color={THEME.danger} />
        </View>
        <View style={styles.specBadge}>
          <Text style={styles.specText}>{specialty}</Text>
        </View>
        <Text style={styles.hospitalText}>{hospital}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>{rating} (favorite)</Text>
        </View>
      </View>
    </View>
    <TouchableOpacity style={styles.bookBtn}>
      <Text style={styles.bookBtnText}>Book Now</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const PharmacyCard = ({
  name,
  location,
  distance,
  isOpen,
}: {
  name: string;
  location: string;
  distance: string;
  isOpen: boolean;
}) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9}>
    <View style={styles.cardHeader}>
      <View style={styles.pharmacyIconBox}>
        <MaterialCommunityIcons name="store-plus" size={28} color={THEME.primary} />
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardName}>{name}</Text>
          <Ionicons name="heart" size={20} color={THEME.danger} />
        </View>
        <Text style={styles.hospitalText}>
          {location} • {distance}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isOpen ? "#DCFCE7" : "#F1F5F9" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isOpen ? THEME.success : THEME.textSecondary },
            ]}
          >
            {isOpen ? "Open Now" : "Closed"}
          </Text>
        </View>
      </View>
    </View>
    <TouchableOpacity style={styles.viewBtn}>
      <Text style={styles.viewBtnText}>View Store</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tabWrapper: { paddingHorizontal: 20, marginVertical: 15 },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 5,
    borderRadius: 100,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 100,
  },
  activeTabPill: {
    backgroundColor: THEME.white,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  activeTabLabel: { color: THEME.primary },
  scrollContent: { padding: 20 },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  centerText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: THEME.white, fontWeight: "700" },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: "row", gap: 15 },
  doctorImg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: THEME.softBlue,
  },
  pharmacyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDetails: { flex: 1 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary, flex: 1, paddingRight: 12 },
  specBadge: {
    backgroundColor: THEME.softBlue,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 6,
  },
  specText: { color: THEME.primary, fontSize: 12, fontWeight: "700" },
  hospitalText: { fontSize: 13, color: THEME.textSecondary },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  ratingText: { fontSize: 12, fontWeight: "600", color: THEME.textPrimary },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: { fontSize: 11, fontWeight: "800" },
  bookBtn: {
    backgroundColor: THEME.primary,
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  bookBtnText: { color: THEME.white, fontWeight: "800", fontSize: 14 },
  viewBtn: {
    borderWidth: 1,
    borderColor: THEME.primary,
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  viewBtnText: { color: THEME.primary, fontWeight: "800", fontSize: 14 },
});
