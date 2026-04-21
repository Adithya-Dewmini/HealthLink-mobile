import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  primary: "#2563EB",
  success: "#10B981",
  background: "#F9FAFB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  star: "#F59E0B",
};

type LocationItem = {
  id: number;
  type: "doctor" | "pharmacy";
  title: string;
  latitude: number;
  longitude: number;
  distance: string;
  rating: string;
  status: string;
  image: string;
};

const LOCATIONS: LocationItem[] = [
  {
    id: 1,
    type: "pharmacy",
    title: "Lanka Pharmacy",
    latitude: 6.9305,
    longitude: 79.86,
    distance: "0.8 km",
    rating: "4.7",
    status: "Open Now",
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=400&auto=format&fit=crop",
  },
  {
    id: 2,
    type: "doctor",
    title: "Dr. Silva - Cardiologist",
    latitude: 6.925,
    longitude: 79.865,
    distance: "1.2 km",
    rating: "4.9",
    status: "Open Now",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop",
  },
  {
    id: 3,
    type: "pharmacy",
    title: "MediHelp Pharmacy",
    latitude: 6.928,
    longitude: 79.858,
    distance: "1.6 km",
    rating: "4.6",
    status: "Open Now",
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=400&auto=format&fit=crop",
  },
  {
    id: 4,
    type: "doctor",
    title: "Dr. Sarah Perera",
    latitude: 6.932,
    longitude: 79.862,
    distance: "2.4 km",
    rating: "4.8",
    status: "Open Now",
    image: "https://images.unsplash.com/photo-1559839734-2b71f1536783?w=400&auto=format&fit=crop",
  },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<FlatList<LocationItem>>(null);
  const markerPressRef = useRef(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const snapPoints = useMemo(() => ["20%", "50%", "85%"], []);
  const previewAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shouldShow = Boolean(selectedLocation) && !isBottomSheetOpen;
    Animated.timing(previewAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selectedLocation, isBottomSheetOpen, previewAnim]);

  const filteredLocations = useMemo(() => {
    return LOCATIONS.filter((item) => {
      if (activeFilter === "doctor") return item.type === "doctor";
      if (activeFilter === "pharmacy") return item.type === "pharmacy";
      return true;
    });
  }, [activeFilter]);

  useEffect(() => {
    if (!selectedLocation || !isBottomSheetOpen) {
      return;
    }
    const index = filteredLocations.findIndex((item) => item.id === selectedLocation.id);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [selectedLocation, isBottomSheetOpen, filteredLocations]);

  useEffect(() => {
    if (isBottomSheetOpen) {
      bottomSheetRef.current?.snapToIndex(1);
      return;
    }
    bottomSheetRef.current?.close();
  }, [isBottomSheetOpen]);

  const handleNavigate = (item: LocationItem) => {
    console.log("Explore selection:", item);
    if (item.type === "doctor") {
      navigation.navigate("PatientTabs", {
        screen: "PatientAppointments",
        params: { doctorId: item.id },
      });
      return;
    }
    navigation.navigate("PharmacyStore", { pharmacyId: item.id });
  };

  const renderItem = ({ item }: { item: LocationItem }) => {
    const isActive = selectedLocation?.id === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => setSelectedLocation(item)}
      >
        <Image source={{ uri: item.image }} style={styles.thumbnail} />
        <View style={styles.cardDetails}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardName}>{item.title}</Text>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={12} color={THEME.star} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          </View>
          <Text style={styles.cardType}>
            {item.type === "doctor" ? "Doctor" : "Pharmacy"}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.distanceText}>{item.distance}</Text>
            <View style={styles.dot} />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.ctaBtn,
              { backgroundColor: item.type === "doctor" ? THEME.primary : "#EFF6FF" },
            ]}
            onPress={() => handleNavigate(item)}
          >
            <Text
              style={[
                styles.ctaText,
                { color: item.type === "doctor" ? THEME.white : THEME.primary },
              ]}
            >
              {item.type === "doctor" ? "Book Appointment" : "View Store"}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={item.type === "doctor" ? THEME.white : THEME.primary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 6.9271,
          longitude: 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={() => {
          if (markerPressRef.current) {
            markerPressRef.current = false;
            return;
          }
          setSelectedLocation(null);
          if (isBottomSheetOpen) {
            setIsBottomSheetOpen(false);
            bottomSheetRef.current?.close();
            return;
          }
          setIsBottomSheetOpen(true);
          bottomSheetRef.current?.snapToIndex(1);
        }}
      >
        {filteredLocations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            onPress={(event) => {
              event?.stopPropagation?.();
              markerPressRef.current = true;
              setSelectedLocation(loc);
              setIsBottomSheetOpen(false);
              bottomSheetRef.current?.close();
              mapRef.current?.animateToRegion(
                {
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                },
                350
              );
            }}
          >
            <View
              style={[
                styles.markerContainer,
                loc.type === "doctor" ? styles.doctorMarker : styles.pharmacyMarker,
                selectedLocation?.id === loc.id && styles.selectedMarker,
              ]}
            >
              <Ionicons
                name={loc.type === "doctor" ? "medkit" : "medical"}
                size={16}
                color={THEME.white}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.9}
          onPress={() => {
            setSelectedLocation(null);
            setIsBottomSheetOpen(true);
            bottomSheetRef.current?.snapToIndex(2);
          }}
        >
          <Ionicons name="search-outline" size={20} color={THEME.textSecondary} />
          <TextInput
            placeholder="Search doctors, pharmacies..."
            placeholderTextColor={THEME.textSecondary}
            style={styles.searchInput}
          />
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => bottomSheetRef.current?.snapToIndex(1)}
          >
            <Ionicons name="options-outline" size={20} color={THEME.primary} />
          </TouchableOpacity>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {[
            { label: "All", value: "all" },
            { label: "Doctors", value: "doctor" },
            { label: "Pharmacies", value: "pharmacy" },
            { label: "Open Now", value: "open" },
          ].map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.pill,
                activeFilter === item.value ? styles.pillActive : styles.pillInactive,
              ]}
              onPress={() => {
                setActiveFilter(item.value);
                setSelectedLocation(null);
                setIsBottomSheetOpen(true);
                bottomSheetRef.current?.snapToIndex(1);
              }}
            >
              <Text
                style={[
                  styles.pillText,
                  activeFilter === item.value ? styles.pillTextActive : styles.pillTextInactive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.floatingButtons}>
        <TouchableOpacity style={styles.fab}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab}>
          <Ionicons name="navigate" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        bottomInset={insets.bottom + 70}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
        onChange={(index) => {
          if (index === -1) {
            setIsBottomSheetOpen(false);
            return;
          }
          setIsBottomSheetOpen(true);
          setSelectedLocation(null);
        }}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Nearby Services</Text>
          <Text style={styles.sheetSubtitle}>Doctors & Pharmacies near you</Text>
        </View>

        <BottomSheetFlatList
          ref={listRef}
          data={filteredLocations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => null}
        />
      </BottomSheet>

      {selectedLocation && !isBottomSheetOpen && (
        <Animated.View
          style={[
            styles.previewCard,
            {
              transform: [
                {
                  translateY: previewAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              opacity: previewAnim,
            },
          ]}
        >
          <Image source={{ uri: selectedLocation.image }} style={styles.previewImage} />
          <Text style={styles.previewTitle}>{selectedLocation.title}</Text>
          <View style={styles.previewMetaRow}>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={12} color={THEME.star} />
              <Text style={styles.ratingText}>{selectedLocation.rating}</Text>
            </View>
            <View style={styles.dot} />
            <Text style={styles.distanceText}>{selectedLocation.distance}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.previewButton,
              {
                backgroundColor:
                  selectedLocation.type === "doctor" ? THEME.primary : "#EFF6FF",
              },
            ]}
            onPress={() => handleNavigate(selectedLocation)}
          >
            <Text
              style={[
                styles.previewButtonText,
                {
                  color:
                    selectedLocation.type === "doctor" ? THEME.white : THEME.primary,
                },
              ]}
            >
              {selectedLocation.type === "doctor" ? "Book Appointment" : "View Store"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.primary,
  },
  doctorMarker: {
    backgroundColor: "green",
  },
  pharmacyMarker: {
    backgroundColor: THEME.primary,
  },
  selectedMarker: {
    transform: [{ scale: 1.3 }],
    borderWidth: 3,
    borderColor: THEME.white,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchBar: {
    backgroundColor: THEME.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.textPrimary,
  },
  filterBtn: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: THEME.border,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: THEME.primary,
  },
  pillInactive: {
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pillTextActive: {
    color: THEME.white,
  },
  pillTextInactive: {
    color: THEME.textPrimary,
  },
  floatingButtons: {
    position: "absolute",
    right: 16,
    top: "45%",
    gap: 12,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sheetBackground: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleIndicator: {
    width: 40,
    height: 5,
    backgroundColor: THEME.border,
    borderRadius: 3,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 4,
  },
  card: {
    flexDirection: "row",
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  cardActive: {
    borderColor: "#C7DAFF",
    shadowOpacity: 0.08,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: THEME.background,
  },
  cardDetails: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  cardType: {
    fontSize: 12,
    color: THEME.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.textSecondary,
    marginHorizontal: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.success,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
  },
  previewCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 110,
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  previewImage: {
    width: "100%",
    height: 120,
    borderRadius: 14,
    backgroundColor: THEME.background,
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  previewButton: {
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
