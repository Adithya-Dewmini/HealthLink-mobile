import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  acceptDoctorClinicInvite,
  fetchDoctorClinics,
  rejectDoctorClinicInvite,
  type DoctorClinicItem,
} from "../../services/doctorClinicsService";
import { useClinicStore } from "../../stores/useClinicStore";
import DoctorPanelHeader from "../../components/doctor/DoctorPanelHeader";
import { doctorColors } from "../../constants/doctorTheme";
import { resolveDoctorImage } from "../../utils/imageUtils";

const THEME = {
  background: "#F4F6F8",
  white: "#FFFFFF",
  textDark: "#1E293B",
  textGray: "#64748B",
  border: "#E2E8F0",
  activeSoft: "#E8F5E9",
  activeText: "#2E7D32",
  accept: "#4CAF50",
  reject: "#F44336",
  shadow: "#000000",
};

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

const SectionHeader = memo(function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
});

const ClinicImage = memo(function ClinicImage({
  coverImage,
  imageUrl,
  logoImage,
}: {
  coverImage?: string;
  imageUrl?: string;
  logoImage?: string;
}) {
  const [failed, setFailed] = useState(false);
  const sourceUri = resolveDoctorImage(coverImage, imageUrl, logoImage);

  useEffect(() => {
    setFailed(false);
  }, [sourceUri]);

  if (sourceUri && !failed) {
    return (
      <Image
        source={{ uri: sourceUri }}
        style={styles.cardImage}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={styles.cardImageFallback}>
      <View style={styles.cardImageFallbackIcon}>
        <Ionicons name="business-outline" size={28} color={doctorColors.primary} />
      </View>
      <Text style={styles.cardImageFallbackText}>Clinic image unavailable</Text>
    </View>
  );
});

type ActiveClinicCardProps = {
  clinic: DoctorClinicItem;
  isSelected: boolean;
  onSelect: (clinic: DoctorClinicItem) => void;
  onViewDetails: (clinic: DoctorClinicItem) => void;
};

const ActiveClinicCard = memo(function ActiveClinicCard({
  clinic,
  isSelected,
  onSelect,
  onViewDetails,
}: ActiveClinicCardProps) {
  return (
    <TouchableOpacity
      style={[styles.imageCard, isSelected && styles.selectedCard]}
      activeOpacity={0.94}
      onPress={() => onSelect(clinic)}
    >
      <View style={styles.imageWrap}>
        <ClinicImage coverImage={clinic.cover_image_url} imageUrl={clinic.image_url} logoImage={clinic.logo_url} />
        <View style={[styles.cornerBadge, isSelected ? styles.selectedBadge : styles.activeBadge]}>
          <Text style={[styles.cornerBadgeText, isSelected ? styles.selectedBadgeText : styles.activeBadgeText]}>
            {isSelected ? "SELECTED" : "ACTIVE"}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.cardTitle}>{clinic.name}</Text>
            {clinic.address || clinic.location ? (
              <Text style={styles.cardMeta}>{clinic.address || clinic.location}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.linkButton}
            activeOpacity={0.88}
            onPress={() => onViewDetails(clinic)}
          >
            <Text style={styles.linkText}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color={THEME.textDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={isSelected ? styles.selectedButton : styles.selectButton}
            activeOpacity={0.88}
            onPress={() => onSelect(clinic)}
          >
            <Text style={isSelected ? styles.selectedButtonText : styles.selectButtonText}>
              {isSelected ? "Selected" : "Select Clinic"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

type PendingClinicCardProps = {
  clinic: DoctorClinicItem;
  isBusy: boolean;
  onAccept: (relationshipId: string) => void;
  onReject: (relationshipId: string) => void;
};

const PendingClinicCard = memo(function PendingClinicCard({
  clinic,
  isBusy,
  onAccept,
  onReject,
}: PendingClinicCardProps) {
  return (
    <View style={styles.imageCard}>
      <View style={styles.imageWrap}>
        <ClinicImage coverImage={clinic.cover_image_url} imageUrl={clinic.image_url} logoImage={clinic.logo_url} />
        <View style={[styles.cornerBadge, styles.pendingBadge]}>
          <Text style={styles.pendingBadgeText}>PENDING</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.cardTitle}>{clinic.name}</Text>
            {clinic.address || clinic.location ? (
              <Text style={styles.cardMeta}>{clinic.address || clinic.location}</Text>
            ) : null}
          </View>
        </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.pendingActionButton, styles.acceptButton, isBusy && styles.disabledButton]}
          activeOpacity={0.88}
          disabled={isBusy}
          onPress={() => onAccept(clinic.relationship_id || clinic.id)}
        >
          <Text style={styles.actionButtonText}>{isBusy ? "Please wait..." : "Accept"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pendingActionButton, styles.rejectButton, isBusy && styles.disabledButton]}
          activeOpacity={0.88}
          disabled={isBusy}
          onPress={() => onReject(clinic.relationship_id || clinic.id)}
        >
          <Text style={styles.actionButtonText}>{isBusy ? "Please wait..." : "Reject"}</Text>
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
});

const SkeletonClinicCard = memo(function SkeletonClinicCard() {
  return (
    <View style={styles.imageCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.cardContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
        <View style={styles.skeletonActions}>
          <View style={styles.skeletonLink} />
          <View style={styles.skeletonButton} />
        </View>
      </View>
    </View>
  );
});

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

const EmptyState = memo(function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={22} color={THEME.textGray} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
});

export default function DoctorClinicsScreen() {
  const navigation = useNavigation<any>();
  const { selectedClinicId, setSelectedClinic } = useClinicStore();
  const [activeClinics, setActiveClinics] = useState<DoctorClinicItem[]>([]);
  const [pendingClinics, setPendingClinics] = useState<DoctorClinicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionClinicId, setActionClinicId] = useState<string | null>(null);

  const loadClinics = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);

    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await fetchDoctorClinics();
      setActiveClinics(data.active);
      setPendingClinics(data.pending);
      setErrorMessage(null);

      if (data.active.length > 0) {
        const matchingClinic = data.active.find((clinic) => clinic.id === selectedClinicId) ?? data.active[0];
        setSelectedClinic(matchingClinic);
      } else {
        setSelectedClinic(null);
      }
    } catch (error) {
      console.log("Doctor clinics fetch error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load clinics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedClinicId, setSelectedClinic]);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  const handleAccept = useCallback(
    async (clinicId: string) => {
      if (actionClinicId) return;
      setActionClinicId(clinicId);

      try {
        await acceptDoctorClinicInvite(clinicId);
        await loadClinics({ silent: true });
      } catch (error) {
        console.log("Accept clinic invite error:", error);
        Alert.alert("Accept Failed", error instanceof Error ? error.message : "Failed to accept invitation");
      } finally {
        setActionClinicId(null);
      }
    },
    [actionClinicId, loadClinics]
  );

  const handleReject = useCallback(
    async (clinicId: string) => {
      if (actionClinicId) return;
      setActionClinicId(clinicId);

      try {
        await rejectDoctorClinicInvite(clinicId);
        await loadClinics({ silent: true });
      } catch (error) {
        console.log("Reject clinic invite error:", error);
        Alert.alert("Reject Failed", error instanceof Error ? error.message : "Failed to reject invitation");
      } finally {
        setActionClinicId(null);
      }
    },
    [actionClinicId, loadClinics]
  );

  const activeKeyExtractor = useCallback(
    (item: DoctorClinicItem) => item.relationship_id || item.id,
    []
  );
  const pendingKeyExtractor = useCallback(
    (item: DoctorClinicItem) => item.relationship_id || item.id,
    []
  );

  const handleSelectClinic = useCallback(
    (clinic: DoctorClinicItem) => {
      setSelectedClinic(clinic);
    },
    [setSelectedClinic]
  );

  const handleViewClinicDetails = useCallback(
    (clinic: DoctorClinicItem) => {
      setSelectedClinic(clinic);
      navigation.navigate("ClinicDetails");
    },
    [navigation, setSelectedClinic]
  );

  const renderActiveClinic = useCallback(
    ({ item }: { item: DoctorClinicItem }) => (
      <ActiveClinicCard
        clinic={item}
        isSelected={selectedClinicId === item.id}
        onSelect={handleSelectClinic}
        onViewDetails={handleViewClinicDetails}
      />
    ),
    [handleSelectClinic, handleViewClinicDetails, selectedClinicId]
  );

  const renderPendingClinic = useCallback(
    ({ item }: { item: DoctorClinicItem }) => (
      <PendingClinicCard
        clinic={item}
        isBusy={actionClinicId === item.id}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    ),
    [actionClinicId, handleAccept, handleReject]
  );

  const activeListEmpty = useMemo(
    () => (
      <EmptyState
        icon="checkmark-circle-outline"
        title="No active clinics"
      />
    ),
    []
  );

  const pendingListEmpty = useMemo(
    () => (
      <EmptyState
        icon="mail-outline"
        title="No pending requests"
      />
    ),
    []
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={doctorColors.primary} />
      </SafeAreaView>

      <DoctorPanelHeader
        variant="hero"
        showBack
        title="My Clinics"
        subtitle="Review active centers and pending invitations"
        onRightPress={() => void loadClinics({ silent: true })}
        rightIcon={isRefreshing ? "sync-outline" : "refresh-outline"}
        rightAccessibilityLabel="Refresh clinics"
      />

      <View style={styles.contentWrapper}>
        <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
          <View style={styles.screen}>
            <FlatList
            data={isLoading ? [{ key: "loading" }] : [{ key: "content" }]}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            renderItem={({ item }) =>
              item.key === "loading" ? (
                <View style={styles.sectionsWrap}>
                  <View>
                    <SectionHeader title="Active Clinics" />
                    <View style={styles.cardSpacer} />
                    <SkeletonClinicCard />
                    <View style={styles.cardSpacer} />
                    <SkeletonClinicCard />
                  </View>
                  <View>
                    <SectionHeader title="Pending Requests" />
                    <View style={styles.cardSpacer} />
                    <SkeletonClinicCard />
                  </View>
                </View>
              ) : (
              <View style={styles.sectionsWrap}>
                {errorMessage ? (
                  <View style={styles.errorCard}>
                    <View style={styles.errorCopy}>
                      <Text style={styles.errorTitle}>Unable to load clinics</Text>
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                    <TouchableOpacity style={styles.retryButton} activeOpacity={0.88} onPress={() => void loadClinics()}>
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View>
                  <SectionHeader title="Active Clinics" />
                  <FlatList
                    data={activeClinics}
                    keyExtractor={activeKeyExtractor}
                    renderItem={renderActiveClinic}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.cardSpacer} />}
                    ListEmptyComponent={activeListEmpty}
                  />
                </View>

                <View>
                  <SectionHeader title="Pending Requests" />
                  <FlatList
                    data={pendingClinics}
                    keyExtractor={pendingKeyExtractor}
                    renderItem={renderPendingClinic}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.cardSpacer} />}
                    ListEmptyComponent={pendingListEmpty}
                  />
                </View>
              </View>
            )}
            />
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: doctorColors.primary,
  },
  topSafeArea: {
    backgroundColor: doctorColors.primary,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: THEME.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: THEME.textGray,
  },
  content: {
    paddingBottom: 120,
  },
  sectionsWrap: {
    gap: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textDark,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: THEME.textGray,
    marginTop: 4,
  },
  imageCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  selectedCard: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#F8FBFF",
  },
  imageWrap: {
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 130,
  },
  cardImageFallback: {
    width: "100%",
    height: 130,
    backgroundColor: "#EAF7F7",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cardImageFallbackIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageFallbackText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textDark,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  titleWrap: {
    flex: 1,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textDark,
  },
  cardMeta: {
    fontSize: 14,
    color: THEME.textGray,
    marginTop: 4,
    lineHeight: 20,
  },
  cornerBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadge: {
    backgroundColor: THEME.activeSoft,
  },
  selectedBadge: {
    backgroundColor: "#DCFCE7",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },
  cornerBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  activeBadgeText: {
    color: THEME.activeText,
  },
  selectedBadgeText: {
    color: "#15803D",
  },
  pendingBadgeText: {
    color: "#B45309",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textDark,
  },
  selectButton: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectedButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textDark,
  },
  selectedButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.white,
  },
  pendingActionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 11,
  },
  acceptButton: {
    backgroundColor: THEME.accept,
  },
  rejectButton: {
    backgroundColor: THEME.reject,
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.white,
  },
  cardSpacer: {
    height: 12,
  },
  skeletonImage: {
    width: "100%",
    height: 130,
    backgroundColor: "#E8EDF4",
  },
  skeletonTitle: {
    height: 18,
    width: "58%",
    borderRadius: 8,
    backgroundColor: "#E8EDF4",
  },
  skeletonSubtitle: {
    marginTop: 10,
    height: 14,
    width: "74%",
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
  },
  skeletonActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonLink: {
    width: 92,
    height: 14,
    borderRadius: 8,
    backgroundColor: "#EEF2F7",
  },
  skeletonButton: {
    width: 104,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8EDF4",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textDark,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.textGray,
    marginTop: 4,
    textAlign: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorCopy: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B91C1C",
  },
});
