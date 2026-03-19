import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import FilterBottomSheet from "../../components/FilterBottomSheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E3F2FD",
  accentAmber: "#FFC107",
  accentGreen: "#4CAF50",
  border: "#E0E6ED",
};

const CATEGORIES = [
  "All",
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Dentist",
  "Neurologist",
];

const DOCTORS = [
  {
    id: "1",
    name: "Dr. Silva",
    specialty: "General Physician",
    city: "Colombo",
    rating: 4.9,
    reviews: "120",
    experience: "8 Years",
    queueLength: 8,
    isAvailableToday: true,
    available: true,
  },
  {
    id: "2",
    name: "Dr. Fernando",
    specialty: "Dermatologist",
    city: "Kandy",
    rating: 4.8,
    reviews: "85",
    experience: "5 Years",
    queueLength: 15,
    isAvailableToday: false,
    available: false,
  },
  {
    id: "3",
    name: "Dr. Peiris",
    specialty: "Cardiologist",
    city: "Galle",
    rating: 5.0,
    reviews: "210",
    experience: "12 Years",
    queueLength: 4,
    isAvailableToday: true,
    available: true,
  },
];

export default function DoctorSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    specialty: "",
    rating: null as number | null,
    queue: null as number | null,
    availableToday: false,
  });
  const [filteredDoctors, setFilteredDoctors] = useState(DOCTORS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const locations = useMemo(
    () => [
      "Colombo",
      "Kandy",
      "Galle",
      "Jaffna",
      "Negombo",
      "Kurunegala",
      "Anuradhapura",
      "Matara",
      "Batticaloa",
      "Trincomalee",
      "Ratnapura",
      "Badulla",
      "Kalutara",
      "Gampaha",
    ],
    []
  );
  const specialties = useMemo(
    () => [
      "General Physician",
      "Cardiologist",
      "Dermatologist",
      "Pediatrician",
      "Orthopedic",
      "Neurologist",
      "ENT Specialist",
      "Psychiatrist",
      "Gynecologist",
    ],
    []
  );

  useEffect(() => {
    let filtered = [...DOCTORS];

    if (filters.location) {
      filtered = filtered.filter((d) => d.city === filters.location);
    }
    if (filters.specialty) {
      filtered = filtered.filter((d) => d.specialty === filters.specialty);
    }
    if (filters.rating) {
      filtered = filtered.filter((d) => d.rating >= (filters.rating || 0));
    }
    if (filters.queue) {
      filtered = filtered.filter((d) => d.queueLength < (filters.queue || Infinity));
    }
    if (filters.availableToday) {
      filtered = filtered.filter((d) => d.isAvailableToday === true);
    }

    if (search.trim()) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(lower) ||
          d.specialty.toLowerCase().includes(lower) ||
          d.city.toLowerCase().includes(lower)
      );
    }

    setFilteredDoctors(filtered);
  }, [filters, search]);

  const applyFilters = (nextFilters = filters) => {
    setFilters(nextFilters);
    if (nextFilters.specialty) {
      setActiveTab(nextFilters.specialty);
    }
    setIsFilterOpen(false);
  };

  const openFilter = () => {
    setIsFilterOpen(true);
  };

  const displayDoctors = filteredDoctors.filter((doc) =>
    activeTab === "All" ? true : doc.specialty === activeTab
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

        {/* Header & Search */}
        <View style={styles.headerContainer}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={THEME.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Find Doctors</Text>
            <TouchableOpacity style={styles.filterBtn} onPress={openFilter}>
              <Ionicons name="options-outline" size={22} color={THEME.accentBlue} />
            </TouchableOpacity>
          </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            placeholder="Search doctor or specialty..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor={THEME.textGray}
          />
        </View>
      </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Categories Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveTab(cat)}
                style={[
                  styles.categoryPill,
                  activeTab === cat && styles.activeCategoryPill,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeTab === cat && styles.activeCategoryText,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Doctor List */}
          <View style={styles.listContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Specialists</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {displayDoctors.map((doc) => (
              <TouchableOpacity key={doc.id} style={styles.doctorCard}>
                <View style={styles.docMainInfo}>
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={32} color={THEME.accentBlue} />
                    {doc.available && <View style={styles.onlineDot} />}
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docSpec}>{doc.specialty}</Text>

                    <View style={styles.statsRow}>
                      <View style={styles.ratingBox}>
                        <Ionicons name="star" size={14} color={THEME.accentAmber} />
                        <Text style={styles.ratingText}>{doc.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.statDivider}>|</Text>
                      <Text style={styles.experienceText}>{doc.experience} Exp</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.favBtn}>
                    <Ionicons name="heart-outline" size={22} color={THEME.textGray} />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.availabilityBtn}
                  onPress={() =>
                    navigation.navigate("DoctorAvailabilityScreen", {
                      doctorId: doc.id,
                    })
                  }
                >
                    <Ionicons name="calendar-outline" size={16} color={THEME.white} />
                    <Text style={styles.availabilityBtnText}>View Availability</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => navigation.navigate("BookAppointmentScreen")}
                  >
                    <Text style={styles.bookBtnText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <FilterBottomSheet
          visible={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          filters={filters}
          setFilters={setFilters}
          onApply={applyFilters}
          locations={locations}
          specialties={specialties}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  headerContainer: {
    backgroundColor: THEME.white,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: THEME.textDark },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9EEF5",
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 50,
    marginHorizontal: 16,
    marginTop: 10,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: THEME.textDark },

  categoryScroll: { paddingHorizontal: 20, paddingVertical: 20 },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.white,
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeCategoryPill: { backgroundColor: THEME.accentBlue, borderColor: THEME.accentBlue },
  categoryText: { fontSize: 14, fontWeight: "600", color: THEME.textGray },
  activeCategoryText: { color: THEME.white },

  listContainer: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  seeAllText: { fontSize: 14, color: THEME.accentBlue, fontWeight: "600" },

  doctorCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  docMainInfo: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.accentGreen,
    borderWidth: 2,
    borderColor: THEME.white,
  },
  detailsContainer: { flex: 1, marginLeft: 15 },
  docName: { fontSize: 17, fontWeight: "bold", color: THEME.textDark },
  docSpec: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ratingBox: { flexDirection: "row", alignItems: "center" },
  ratingText: { marginLeft: 4, fontSize: 13, fontWeight: "bold", color: THEME.textDark },
  statDivider: { marginHorizontal: 8, color: THEME.border },
  experienceText: { fontSize: 13, color: THEME.textGray },
  favBtn: { alignSelf: "flex-start" },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F5F7FA",
  },
  availabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  availabilityBtnText: { fontSize: 13, fontWeight: "600", color: THEME.white },
  bookBtn: {
    backgroundColor: THEME.accentGreen,
    borderWidth: 1,
    borderColor: THEME.accentGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookBtnText: { color: THEME.white, fontSize: 13, fontWeight: "bold" },
});
