import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  type ImageSourcePropType,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import { apiFetch } from "../../config/api";
import { patientTheme } from "../../constants/patientTheme";
import LiveQueueCard, {
  type ActiveQueueState,
  UpcomingAppointmentCard,
} from "../../components/patient/LiveQueueCard";
import LiveOrderCard from "../../components/patient/LiveOrderCard";
import ActiveUpdatesSection from "../../components/patient/ActiveUpdatesSection";
import DashboardBannerCarousel from "../../components/patient/DashboardBannerCarousel";
import PremiumDashboardEntityCard from "../../components/patient/PremiumDashboardEntityCard";
import PatientLocationButton from "../../components/patient/PatientLocationButton";
import PatientLocationSheet from "../../components/patient/PatientLocationSheet";
import {
  getDashboardBanners,
  type DashboardBanner,
} from "../../services/dashboardBannerApi";
import {
  getDashboardMedicalCenters,
  getDashboardPharmacies,
  type DashboardMedicalCenter,
  type DashboardPharmacy,
} from "../../services/patientDashboardApi";
import { fetchPatientActiveQueueStatus } from "../../services/patientQueueApi";
import { getSocket } from "../../services/socket";
import { connectRealtimeSocket, subscribeToPatientRealtime } from "../../services/socketService";
import { useAuth } from "../../utils/AuthContext";
import { usePatientLocation } from "../../context/PatientLocationContext";

const THEME = {
  ...patientTheme.colors,
  primary: "#0F172A",
  accent: "#38BDF8",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  navy: "#03045E",
};

const CONTENT_GUTTER = 24;
const ACTIVE_QUEUE_PRIORITY = ["called", "in_consultation", "next", "waiting", "checked_in"] as const;

const BANNER_TARGET_SCREEN_ALIASES: Record<string, keyof PatientStackParamList> = {
  appointments: "Appointments",
  bookappointmentscreen: "BookAppointmentScreen",
  doctoravailabilityscreen: "DoctorAvailabilityScreen",
  doctorsearchscreen: "DoctorSearchScreen",
  favorites: "Favorites",
  medicalhistoryscreen: "MedicalHistoryScreen",
  medicinesearch: "MedicineSearch",
  notificationcenter: "NotificationCenter",
  patientclinicdetails: "PatientClinicDetails",
  patientprescriptions: "PatientPrescriptions",
  pharmacymarketplace: "PharmacyMarketplace",
  pharmacystore: "PharmacyStore",
  prescriptiondetails: "PrescriptionDetails",
  symptomchecker: "SymptomChecker",
  uploadprescription: "UploadPrescription",
};

const EASY_ACTIONS = [
  {
    key: "findDoctor",
    label: "Find Doctor",
    image: require("../../../assets/images/quick-actions/quick_find_doctor.png") as ImageSourcePropType,
    gradient: ["#E0F2FE", "#F8FCFF"] as const,
  },
  {
    key: "records",
    label: "Records",
    image: require("../../../assets/images/quick-actions/quick_medical_records.png") as ImageSourcePropType,
    gradient: ["#EDE9FE", "#FAF7FF"] as const,
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    image: require("../../../assets/images/quick-actions/quick_prescriptions.png") as ImageSourcePropType,
    gradient: ["#DCFCE7", "#F4FFF9"] as const,
  },
  {
    key: "uploadRx",
    label: "Upload Rx",
    image: require("../../../assets/images/quick-actions/quick_upload_rx.png") as ImageSourcePropType,
    gradient: ["#FFF7ED", "#FFFDF7"] as const,
  },
  {
    key: "activity",
    label: "Activity",
    image: require("../../../assets/images/quick-actions/quick_activity.png") as ImageSourcePropType,
    gradient: ["#FCE7F3", "#FFF7FB"] as const,
  },
] as const;

type PatientNavigation = NativeStackNavigationProp<PatientStackParamList>;

type ActionTileProps = {
  label: string;
  image: ImageSourcePropType;
  gradient: readonly [string, string];
  onPress: () => void;
};

const normalizeBannerTargetScreen = (value: string | null | undefined): keyof PatientStackParamList | null => {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return BANNER_TARGET_SCREEN_ALIASES[key] ?? null;
};

const ActionTile = ({ image, label, gradient, onPress }: ActionTileProps) => (
  <TouchableOpacity style={styles.actionTileTouch} onPress={onPress} activeOpacity={0.88}>
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.quickActionCircle}
    >
      <Image source={image} style={styles.quickActionImage} resizeMode="contain" />
    </LinearGradient>
    <Text style={styles.tileLabel} numberOfLines={2}>
      {label}
    </Text>
  </TouchableOpacity>
);

const LoadingCard = () => (
  <View style={styles.loadingCardShell}>
    <LinearGradient colors={["#E2E8F0", "#F8FAFC"]} style={styles.loadingCard}>
      <View style={styles.loadingBadgeRow}>
        <View style={styles.loadingEyebrow} />
        <View style={styles.loadingBadge} />
      </View>
      <View style={styles.loadingVisual} />
      <View style={styles.loadingLineLarge} />
      <View style={styles.loadingLineSmall} />
    </LinearGradient>
  </View>
);

const InlineMessage = ({
  message,
  actionLabel,
  onPress,
}: {
  message: string;
  actionLabel?: string;
  onPress?: () => void;
}) => (
  <View style={styles.inlineMessage}>
    <Text style={styles.inlineMessageText}>{message}</Text>
    {actionLabel && onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        <Text style={styles.inlineMessageAction}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PatientNavigation>();
  const { user } = useAuth();
  const {
    selectedLocation,
    savedLocations,
    loading: locationLoading,
    selectLocation,
    saveLocation,
    deleteLocation,
    getLocationLabel,
  } = usePatientLocation();
  const fabFloat = useRef(new Animated.Value(0)).current;
  const fabPulse = useRef(new Animated.Value(0)).current;
  const [profileName, setProfileName] = useState("Patient");
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [activeQueue, setActiveQueue] = useState<ActiveQueueState | null>(null);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [banners, setBanners] = useState<DashboardBanner[]>([]);
  const [medicalCenters, setMedicalCenters] = useState<DashboardMedicalCenter[]>([]);
  const [pharmacies, setPharmacies] = useState<DashboardPharmacy[]>([]);
  const [loadingDashboardData, setLoadingDashboardData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [bannersError, setBannersError] = useState<string | null>(null);
  const [centersError, setCentersError] = useState<string | null>(null);
  const [pharmaciesError, setPharmaciesError] = useState<string | null>(null);
  const [fixedHeaderHeight, setFixedHeaderHeight] = useState(0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabFloat, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(fabFloat, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fabPulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [fabFloat, fabPulse]);

  const fabAnimatedStyle = {
    transform: [
      { translateY: fabFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
      { scale: fabFloat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
    ],
  };

  const fabPulseStyle = {
    opacity: fabPulse.interpolate({ inputRange: [0, 1], outputRange: [0.24, 0.8] }),
    transform: [{ scale: fabPulse.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.38] }) }],
  };

  const fabPulseStyleSecondary = {
    opacity: fabPulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.38] }),
    transform: [{ scale: fabPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.62] }) }],
  };

  const fabIconAnimatedStyle = {
    transform: [
      { scale: fabPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) },
      { rotate: fabPulse.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "14deg"] }) },
    ],
  };

  const loadDashboard = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setLoadingDashboardData(true);
    } else {
      setRefreshing(true);
    }

    const [profileResult, queueResult, bannersResult, medicalCentersResult, pharmaciesResult] = await Promise.allSettled([
      apiFetch("/api/patients/me"),
      fetchPatientActiveQueueStatus(),
      getDashboardBanners(),
      getDashboardMedicalCenters(),
      getDashboardPharmacies(),
    ]);

    if (profileResult.status === "fulfilled" && profileResult.value.ok) {
      const profile = await profileResult.value.json().catch(() => ({}));
      setProfileName(typeof profile?.name === "string" && profile.name.trim() ? profile.name : "Patient");
    }

    if (queueResult.status === "fulfilled") {
      setActiveQueue((queueResult.value as ActiveQueueState | null) ?? null);
    } else {
      setActiveQueue(null);
    }

    if (bannersResult.status === "fulfilled") {
      setBanners(bannersResult.value);
      setBannersError(null);
    } else {
      setBanners([]);
      setBannersError("Could not load latest banners.");
    }

    if (medicalCentersResult.status === "fulfilled") {
      setMedicalCenters(medicalCentersResult.value);
      setCentersError(null);
    } else {
      setMedicalCenters([]);
      setCentersError("Could not load latest centers. Pull to refresh.");
    }

    if (pharmaciesResult.status === "fulfilled") {
      setPharmacies(pharmaciesResult.value);
      setPharmaciesError(null);
    } else {
      setPharmacies([]);
      setPharmaciesError("Could not load latest pharmacies. Pull to refresh.");
    }

    const hasSectionError =
      bannersResult.status === "rejected" ||
      medicalCentersResult.status === "rejected" ||
      pharmaciesResult.status === "rejected";
    setDashboardError(hasSectionError ? "Some dashboard sections could not be refreshed." : null);
    setLoadingDashboardData(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard("initial");
      return undefined;
    }, [loadDashboard])
  );

  const showUpcomingAppointmentCard = Boolean(
    activeQueue && (activeQueue.status === "appointment_booked" || activeQueue.status === "today_appointment")
  );
  const normalizedQueueStatus = String(activeQueue?.status || "").trim().toLowerCase();
  const queuePriorityIndex = ACTIVE_QUEUE_PRIORITY.indexOf(
    normalizedQueueStatus as (typeof ACTIVE_QUEUE_PRIORITY)[number]
  );
  const hasPrimaryQueue = Boolean(activeQueue?.active && queuePriorityIndex >= 0);
  const primaryActiveType: "queue" | "order" | null = hasPrimaryQueue ? "queue" : hasActiveOrder ? "order" : null;
  const hasActiveUpdates = primaryActiveType !== null;
  const locationCity = useMemo(
    () => String(selectedLocation?.city || "").trim().toLowerCase(),
    [selectedLocation?.city]
  );
  const sortedMedicalCenters = useMemo(() => {
    if (!locationCity) return medicalCenters;
    return [...medicalCenters].sort((left, right) => {
      const leftScore = String(left.city || left.address || "").toLowerCase().includes(locationCity) ? 0 : 1;
      const rightScore = String(right.city || right.address || "").toLowerCase().includes(locationCity) ? 0 : 1;
      return leftScore - rightScore;
    });
  }, [locationCity, medicalCenters]);
  const sortedPharmacies = useMemo(() => {
    if (!locationCity) return pharmacies;
    return [...pharmacies].sort((left, right) => {
      const leftScore = String(left.city || left.address || "").toLowerCase().includes(locationCity) ? 0 : 1;
      const rightScore = String(right.city || right.address || "").toLowerCase().includes(locationCity) ? 0 : 1;
      return leftScore - rightScore;
    });
  }, [locationCity, pharmacies]);

  const handleUpcomingPress = useCallback(() => {
    navigation.navigate("Appointments");
  }, [navigation]);

  const handleQueuePress = useCallback(() => {
    if (activeQueue?.doctorId || activeQueue?.appointmentId || activeQueue?.sessionId) {
      navigation.navigate("PatientQueue", {
        doctorId: activeQueue.doctorId,
        clinicId: activeQueue.clinicId,
        sessionId: activeQueue.sessionId,
        appointmentId: activeQueue.appointmentId,
        queueId: activeQueue.queueId,
      });
      return;
    }

    navigation.navigate("Appointments");
  }, [activeQueue, navigation]);

  useEffect(() => {
    const patientId = user?.id;
    if (!patientId) {
      return undefined;
    }

    void connectRealtimeSocket();
    void subscribeToPatientRealtime(patientId);
    const socket = getSocket();
    const refresh = () => {
      void loadDashboard("refresh");
    };

    socket.on("queue:update", refresh);
    socket.on("session.updated", refresh);
    socket.on("appointment.updated", refresh);
    socket.on("consultation.updated", refresh);
    socket.on("connect", refresh);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("session.updated", refresh);
      socket.off("appointment.updated", refresh);
      socket.off("consultation.updated", refresh);
      socket.off("connect", refresh);
    };
  }, [loadDashboard, user?.id]);

  const handleBannerPress = useCallback((banner: DashboardBanner) => {
    const targetType = String(banner.targetType || "none").toLowerCase();
    const targetId = banner.targetId?.trim();
    const targetScreen = normalizeBannerTargetScreen(banner.targetScreen);

    if (targetScreen === "PatientClinicDetails" && targetId) {
      navigation.navigate("PatientClinicDetails", {
        clinicId: targetId,
        clinicName: banner.title?.trim() || "Medical Center",
        location: "Location not provided",
        status: "OPEN",
        image: banner.imageUrl,
        rating: 0,
        waitTime: "Queue details unavailable",
        nextAvailable: "Unavailable",
        specialty: "Medical Center",
      });
      return;
    }

    if (targetScreen === "PharmacyStore") {
      const pharmacyId = Number(targetId);
      if (Number.isInteger(pharmacyId)) {
        navigation.navigate("PharmacyStore", { pharmacyId });
        return;
      }
    }

    if (targetScreen === "DoctorSearchScreen") {
      const doctorId = Number(targetId);
      navigation.navigate("DoctorSearchScreen", {
        doctorId: Number.isFinite(doctorId) ? doctorId : undefined,
      });
      return;
    }

    if (targetScreen === "BookAppointmentScreen") {
      const doctorId = Number(targetId);
      navigation.navigate("BookAppointmentScreen", {
        doctorId: Number.isFinite(doctorId) ? doctorId : undefined,
      });
      return;
    }

    if (targetScreen === "UploadPrescription") {
      navigation.navigate("UploadPrescription");
      return;
    }

    if (targetScreen === "Appointments") {
      navigation.navigate("Appointments");
      return;
    }

    if (targetScreen === "PharmacyMarketplace") {
      navigation.navigate("PharmacyMarketplace");
      return;
    }

    if (targetScreen === "PatientPrescriptions") {
      navigation.navigate("PatientPrescriptions");
      return;
    }

    if (targetScreen === "MedicalHistoryScreen") {
      navigation.navigate("MedicalHistoryScreen");
      return;
    }

    if (targetScreen === "MedicineSearch") {
      navigation.navigate("MedicineSearch");
      return;
    }

    if (targetScreen === "Favorites") {
      navigation.navigate("Favorites");
      return;
    }

    if (targetScreen === "SymptomChecker") {
      navigation.navigate("SymptomChecker");
      return;
    }

    if (targetScreen === "NotificationCenter") {
      navigation.navigate("NotificationCenter");
      return;
    }

    if (targetType === "medical_center" && targetId) {
      navigation.navigate("PatientClinicDetails", {
        clinicId: targetId,
        clinicName: banner.title?.trim() || "Medical Center",
        location: "Location not provided",
        status: "OPEN",
        image: banner.imageUrl,
        rating: 0,
        waitTime: "Queue details unavailable",
        nextAvailable: "Unavailable",
        specialty: "Medical Center",
      });
      return;
    }

    if (targetType === "pharmacy" && targetId) {
      const pharmacyId = Number(targetId);
      if (Number.isInteger(pharmacyId)) {
        navigation.navigate("PharmacyStore", { pharmacyId });
        return;
      }
      navigation.navigate("PharmacyMarketplace");
      return;
    }

    if (targetType === "doctor" && targetId) {
      const doctorId = Number(targetId);
      navigation.navigate("DoctorSearchScreen", {
        doctorId: Number.isFinite(doctorId) ? doctorId : undefined,
      });
      return;
    }

    if (targetType === "prescription_upload") {
      navigation.navigate("UploadPrescription");
      return;
    }

    if (targetType === "appointments") {
      navigation.navigate("Appointments");
    }
  }, [navigation]);

  const getCenterStatus = useCallback((center: DashboardMedicalCenter) => {
    if (center.activeQueueCount && center.activeQueueCount > 0) return "Queue Live" as const;
    if (center.isOpen === true) return "Open" as const;
    if (center.isOpen === false) return "Closed" as const;
    return null;
  }, []);

  const getPharmacyStatus = useCallback((pharmacy: DashboardPharmacy) => {
    if (pharmacy.isOpen === true) return "Open" as const;
    if (pharmacy.isOpen === false) return "Closed" as const;
    return null;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={[]}>
        <View
          style={[styles.fixedHeader, { paddingTop: insets.top + 18 }]}
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setFixedHeaderHeight((current) => (current !== nextHeight ? nextHeight : current));
          }}
        >
          <View style={styles.headerNav}>
            <View style={styles.headerCopy}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.userNameText}>{profileName}</Text>
            </View>
            <View style={styles.headerActions}>
              <PatientLocationButton
                loading={locationLoading}
                location={selectedLocation}
                label={getLocationLabel(selectedLocation)}
                onPress={() => setLocationSheetVisible(true)}
              />
              <TouchableOpacity
                style={styles.notifBtn}
                onPress={() => navigation.navigate("NotificationCenter", { title: "Notifications", panel: "patient" })}
                activeOpacity={0.88}
              >
                <Ionicons name="notifications-outline" size={22} color="white" />
                <View style={styles.notifBadge} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          bounces={false}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: fixedHeaderHeight },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadDashboard("refresh");
              }}
              tintColor={THEME.white}
            />
          }
        >
          <View style={styles.scrollHeroSection}>
            <LinearGradient
              colors={[THEME.primary, "#1E293B"]}
              style={styles.scrollHeroBackdrop}
            />
            {bannersError && banners.length === 0 ? (
              <InlineMessage
                message="Promotional banners are unavailable right now."
                actionLabel="Retry"
                onPress={() => void loadDashboard("refresh")}
              />
            ) : (
              <DashboardBannerCarousel banners={banners} onPressBanner={handleBannerPress} />
            )}
          </View>

          <View style={styles.bodySection}>
            {hasActiveUpdates ? <Text style={styles.sectionLabel}>Active Updates</Text> : null}
            {primaryActiveType === "queue" && activeQueue ? (
              <ActiveUpdatesSection>
                <LiveQueueCard variant="primary" queue={activeQueue} onPress={handleQueuePress} />
              </ActiveUpdatesSection>
            ) : null}
            {primaryActiveType !== "queue" ? (
              <ActiveUpdatesSection>
                <LiveOrderCard variant="primary" onActiveStateChange={setHasActiveOrder} />
              </ActiveUpdatesSection>
            ) : null}

            {showUpcomingAppointmentCard && activeQueue ? (
              <UpcomingAppointmentCard appointment={activeQueue} onPress={handleUpcomingPress} />
            ) : null}

            {dashboardError ? (
              <InlineMessage
                message={dashboardError}
                actionLabel="Retry"
                onPress={() => void loadDashboard("refresh")}
              />
            ) : null}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionLabel}>Quick Actions</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.easyActionScroll}
                contentContainerStyle={styles.easyActionRail}
              >
                <ActionTile
                  label={EASY_ACTIONS[0].label}
                  image={EASY_ACTIONS[0].image}
                  gradient={EASY_ACTIONS[0].gradient}
                  onPress={() => navigation.navigate("DoctorSearchScreen")}
                />
                <ActionTile
                  label={EASY_ACTIONS[1].label}
                  image={EASY_ACTIONS[1].image}
                  gradient={EASY_ACTIONS[1].gradient}
                  onPress={() => navigation.navigate("MedicalHistoryScreen")}
                />
                <ActionTile
                  label={EASY_ACTIONS[2].label}
                  image={EASY_ACTIONS[2].image}
                  gradient={EASY_ACTIONS[2].gradient}
                  onPress={() => navigation.navigate("PatientPrescriptions")}
                />
                <ActionTile
                  label={EASY_ACTIONS[3].label}
                  image={EASY_ACTIONS[3].image}
                  gradient={EASY_ACTIONS[3].gradient}
                  onPress={() => navigation.navigate("UploadPrescription")}
                />
                <ActionTile
                  label={EASY_ACTIONS[4].label}
                  image={EASY_ACTIONS[4].image}
                  gradient={EASY_ACTIONS[4].gradient}
                  onPress={() => navigation.navigate("ActivityFeed", { title: "Activity Feed" })}
                />
              </ScrollView>
            </View>

            <View style={styles.listingSection}>
              <View style={styles.featuredHeader}>
                <Text style={styles.sectionLabel}>Healthcare Centers</Text>
                <TouchableOpacity onPress={() => navigation.navigate("PatientTabs", { screen: "PatientAppointments" })}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              {centersError ? (
                <InlineMessage message={centersError} actionLabel="Retry" onPress={() => void loadDashboard("refresh")} />
              ) : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {loadingDashboardData ? (
                  <>
                    <LoadingCard />
                    <LoadingCard />
                  </>
                ) : sortedMedicalCenters.length > 0 ? (
                  sortedMedicalCenters.map((center) => (
                    <PremiumDashboardEntityCard
                      key={center.id}
                      title={center.name}
                      subtitle={center.city || center.address || "Address not provided"}
                      imageUrl={center.imageUrl || center.logoUrl}
                      status={getCenterStatus(center)}
                      metadata={
                        center.activeQueueCount && center.activeQueueCount > 0
                          ? `${center.activeQueueCount} in queue`
                          : null
                      }
                      icon="business-outline"
                      onPress={() =>
                        navigation.navigate("PatientClinicDetails", {
                          clinicId: center.id,
                          clinicName: center.name,
                          location: center.address || center.city || "Location not provided",
                          status:
                            center.activeQueueCount && center.activeQueueCount > 0
                              ? "QUEUE LIVE"
                              : center.isOpen
                                ? "OPEN"
                                : "CLOSED",
                          image: center.imageUrl || center.logoUrl || "",
                          rating: 0,
                          waitTime:
                            center.activeQueueCount && center.activeQueueCount > 0
                              ? `${center.activeQueueCount} in queue`
                              : "Queue details unavailable",
                          nextAvailable: center.isOpen ? "Open now" : "Unavailable",
                          specialty: "Medical Center",
                        })
                      }
                    />
                  ))
                ) : (
                  <View style={styles.emptySectionCard}>
                    <View style={styles.emptySectionIconWrap}>
                      <Ionicons name="business-outline" size={24} color="#475569" />
                    </View>
                    <Text style={styles.emptySectionTitle}>No healthcare centers available yet</Text>
                    <Text style={styles.emptySectionText}>Approved centers will appear here when available.</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.featuredSection}>
              <View style={styles.featuredHeader}>
                <Text style={styles.sectionLabel}>Pharmacies</Text>
                <TouchableOpacity onPress={() => navigation.navigate("PharmacyMarketplace")}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>

              {pharmaciesError ? (
                <InlineMessage
                  message={pharmaciesError}
                  actionLabel="Retry"
                  onPress={() => {
                    void loadDashboard("refresh");
                  }}
                />
              ) : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {loadingDashboardData ? (
                  <>
                    <LoadingCard />
                    <LoadingCard />
                  </>
                ) : sortedPharmacies.length > 0 ? (
                  sortedPharmacies.map((pharmacy) => (
                    <PremiumDashboardEntityCard
                      key={pharmacy.id}
                      title={pharmacy.name}
                      subtitle={pharmacy.city || pharmacy.address || "Address not provided"}
                      imageUrl={pharmacy.imageUrl || pharmacy.logoUrl}
                      status={getPharmacyStatus(pharmacy)}
                      metadata={
                        pharmacy.medicineCount && pharmacy.medicineCount > 0
                          ? `${pharmacy.medicineCount} medicines`
                          : null
                      }
                      icon="medical-outline"
                      onPress={() => navigation.navigate("PharmacyMarketplace")}
                    />
                  ))
                ) : (
                  <View style={styles.emptySectionCard}>
                    <View style={styles.emptySectionIconWrap}>
                      <Ionicons name="medical-outline" size={24} color="#475569" />
                    </View>
                    <Text style={styles.emptySectionTitle}>No pharmacies available yet</Text>
                    <Text style={styles.emptySectionText}>Approved pharmacies will appear here when available.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </ScrollView>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.medimateFab,
            fabAnimatedStyle,
            {
              bottom: Math.max(insets.bottom, 20) + 88,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate("PatientAssistant")}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Open MediMate assistant"
          >
            <LinearGradient
              colors={[patientTheme.colors.primaryBlue, patientTheme.colors.aqua]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medimateFabGradient}
            >
              <Animated.View pointerEvents="none" style={[styles.medimateFabPulseSecondary, fabPulseStyleSecondary]} />
              <Animated.View pointerEvents="none" style={[styles.medimateFabPulse, fabPulseStyle]} />
              <Animated.View style={[styles.medimateFabIcon, fabIconAnimatedStyle]}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <PatientLocationSheet
          visible={locationSheetVisible}
          selectedLocation={selectedLocation}
          savedLocations={savedLocations}
          onClose={() => setLocationSheetVisible(false)}
          onSelect={(location) => {
            void selectLocation(location);
            setLocationSheetVisible(false);
          }}
          onSave={(location) => {
            void saveLocation(location);
            setLocationSheetVisible(false);
          }}
          onDelete={(id) => {
            void deleteLocation(id);
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  safe: { flex: 1 },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: THEME.primary,
    paddingHorizontal: CONTENT_GUTTER,
    paddingBottom: 0,
  },
  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  greetingText: { color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: "600", marginBottom: 2 },
  userNameText: { color: "white", fontSize: 27, lineHeight: 32, fontWeight: "800", letterSpacing: -0.4 },
  notifBtn: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#1E293B",
  },
  scroll: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scrollContent: {
    paddingBottom: 220,
  },
  scrollHeroSection: {
    position: "relative",
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 2,
  },
  scrollHeroBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 72,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  bodySection: {
    marginTop: -10,
    paddingTop: 18,
    paddingHorizontal: CONTENT_GUTTER,
    paddingBottom: 8,
    backgroundColor: THEME.bg,
    zIndex: 1,
  },
  activeUpdatesStack: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  quickActionsSection: {
    marginTop: 10,
    marginBottom: 12,
  },
  easyActionRail: {
    paddingLeft: CONTENT_GUTTER,
    paddingRight: CONTENT_GUTTER,
    gap: 12,
    marginBottom: 6,
  },
  easyActionScroll: {
    marginHorizontal: -CONTENT_GUTTER,
  },
  actionTileTouch: {
    width: 104,
    alignItems: "center",
  },
  quickActionCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  quickActionImage: {
    width: 96,
    height: 96,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.primary,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
    width: "100%",
  },
  listingSection: {
    marginTop: 10,
  },
  featuredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  featuredSection: { marginTop: 24 },
  seeAllText: { color: THEME.accent, fontWeight: "800", fontSize: 15 },
  horizontalScroll: { marginHorizontal: -CONTENT_GUTTER, paddingLeft: CONTENT_GUTTER, marginTop: 6 },
  inlineMessage: {
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#E0F2FE",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  inlineMessageText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "600",
  },
  inlineMessageAction: {
    color: "#0284C7",
    fontSize: 13,
    fontWeight: "800",
  },
  loadingCardShell: {
    width: 266,
    height: 188,
    marginRight: 14,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    ...patientTheme.shadows.card,
  },
  loadingCard: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-start",
  },
  loadingBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loadingBadge: {
    width: 76,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.28)",
  },
  loadingEyebrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(148,163,184,0.24)",
  },
  loadingVisual: {
    width: "100%",
    height: 104,
    borderRadius: 16,
    backgroundColor: "rgba(148,163,184,0.22)",
    marginTop: 12,
  },
  loadingLineLarge: {
    width: "72%",
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(148,163,184,0.34)",
    marginTop: 12,
  },
  loadingLineSmall: {
    width: "48%",
    height: 12,
    borderRadius: 7,
    backgroundColor: "rgba(148,163,184,0.26)",
    marginTop: 8,
  },
  emptySectionCard: {
    width: 266,
    minHeight: 188,
    marginRight: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 20,
    ...patientTheme.shadows.soft,
  },
  emptySectionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptySectionTitle: {
    color: "#0F172A",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySectionText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  medimateFab: {
    position: "absolute",
    right: 18,
    zIndex: 60,
    borderRadius: 999,
    shadowColor: patientTheme.colors.primaryBlue,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  medimateFabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },
  medimateFabPulse: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  medimateFabPulseSecondary: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  medimateFabIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
});
