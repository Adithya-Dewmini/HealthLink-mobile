import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../config/api";
import { AuthContext, useAuth } from "../../utils/AuthContext";
import DoctorPanelHeader from "../../components/doctor/DoctorPanelHeader";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";
import { resolveImageUrl } from "../../utils/imageUrl";
import { doctorColors } from "../../constants/doctorTheme";

const THEME = {
  primary: "#2196F3",
  background: "#F2F5F9",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6A6D7C",
  border: "#E0E0E0",
  softBlue: "#E1EEF9",
  softGreen: "#E1F1E7",
  softPurple: "#E9E7F7",
  softAmber: "#FEF3C7",
  danger: "#EF4444",
};

type DoctorDashboardResponse = {
  doctor?: {
    name?: string;
    specialization?: string;
    profile_image?: string | null;
  };
};

type ActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  leftAlignLabel?: boolean;
  iconBackground: string;
  onPress?: () => void;
  disabled?: boolean;
};

type ProfileListItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  isNew?: boolean;
  iconBackground: string;
  onPress?: () => void;
};

const ActionCard = ({
  icon,
  label,
  leftAlignLabel,
  iconBackground,
  onPress,
  disabled,
}: ActionCardProps) => (
  <TouchableOpacity
    style={[styles.actionCard, disabled ? styles.actionCardDisabled : null]}
    onPress={onPress}
    activeOpacity={0.88}
    disabled={disabled}
  >
    <View style={[styles.actionIconBox, { backgroundColor: iconBackground }]}>
      <Ionicons name={icon} size={24} color={THEME.textPrimary} />
    </View>
    <Text style={[styles.actionLabel, leftAlignLabel ? styles.actionLabelLeft : null]}>{label}</Text>
  </TouchableOpacity>
);

const ProfileListItem = ({
  icon,
  title,
  sub,
  isNew,
  iconBackground,
  onPress,
}: ProfileListItemProps) => (
  <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.88}>
    <View style={styles.listItemLeft}>
      <View style={[styles.listIconBox, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={THEME.textPrimary} />
      </View>
      <View style={styles.listCopy}>
        <View style={styles.listTitleRow}>
          <Text style={styles.listItemTitle}>{title}</Text>
          {isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          ) : null}
        </View>
        {sub ? <Text style={styles.listItemSub}>{sub}</Text> : null}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={THEME.border} />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { logout, setUser } = useContext(AuthContext);
  const { user } = useAuth();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [specialization, setSpecialization] = useState("Clinic dashboard");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        return;
      }

      const response = await apiFetch("/api/doctor/dashboard");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as DoctorDashboardResponse;
      setDoctorName(data?.doctor?.name?.trim() || "Doctor");
      setSpecialization(data?.doctor?.specialization?.trim() || "Clinic dashboard");
      setProfileImage(resolveImageUrl(data?.doctor?.profile_image ?? null));
      setUser((prev) => ({
        ...(prev || {}),
        name: data?.doctor?.name?.trim() || prev?.name || "Doctor",
        specialization:
          data?.doctor?.specialization?.trim() || prev?.specialization || "Clinic dashboard",
        profile_image: resolveImageUrl(data?.doctor?.profile_image ?? null) ?? prev?.profile_image ?? null,
        role: prev?.role || "doctor",
      }));
    } catch (error) {
      console.log("Doctor profile summary load error:", error);
    }
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const headerSubtitle = useMemo(() => specialization || "Clinic dashboard", [specialization]);
  const initials = useMemo(() => {
    const name = String(doctorName || "").trim();
    if (!name) {
      return "D";
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [doctorName]);

  const resolvedProfileImage = user?.profile_image ?? profileImage;
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  const quickActions = useMemo(
    () => [
      {
        icon: "calendar-outline" as const,
        label: "Schedule",
        iconBackground: THEME.softBlue,
        onPress: () => navigation.navigate("DoctorSchedule"),
      },
      {
        icon: "time-outline" as const,
        label: "Queue",
        iconBackground: THEME.softGreen,
        onPress: () => navigation.navigate("DoctorQueueControl"),
        disabled: !isVerifiedDoctor,
      },
      {
        icon: "business-outline" as const,
        label: "Clinics",
        iconBackground: THEME.softPurple,
        onPress: () => navigation.navigate("DoctorClinics"),
      },
      {
        icon: "people-outline" as const,
        label: "Patients",
        iconBackground: THEME.softAmber,
        onPress: () => navigation.navigate("DoctorPatients"),
      },
      {
        icon: "document-text-outline" as const,
        label: "Prescriptions",
        iconBackground: THEME.softBlue,
        leftAlignLabel: true,
        onPress: () => navigation.navigate("DoctorPrescriptions"),
        disabled: !isVerifiedDoctor,
      },
    ],
    [isVerifiedDoctor, navigation]
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={doctorColors.primary} />
      </SafeAreaView>

      <View style={styles.topSection}>
        <DoctorPanelHeader
          variant="hero"
          title={doctorName}
          subtitle={headerSubtitle}
          profileImageUri={resolvedProfileImage}
          initials={initials}
          onAvatarPress={() => navigation.navigate("DoctorSettings")}
          rightAccessibilityLabel="Open doctor settings"
        />
      </View>

      <View style={styles.quickActionsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsRow}
        >
          {quickActions.map((action) => (
            <ActionCard key={action.label} {...action} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.contentWrapper}>
        <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safe}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            style={styles.scrollBody}
          >
            {!isVerifiedDoctor ? (
              <View style={styles.bannerWrap}>
                <PendingApprovalBanner />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Practice</Text>
            <View style={styles.listContainer}>
              <ProfileListItem
                icon="person-outline"
                title="Profile Info"
                sub="Review your professional details"
                iconBackground={THEME.softBlue}
                onPress={() => navigation.navigate("ProfileEdit")}
              />
              <ProfileListItem
                icon="business-outline"
                title="My Clinics"
                sub="Switch between connected clinics"
                iconBackground={THEME.softGreen}
                onPress={() => navigation.navigate("DoctorClinics")}
              />
              <ProfileListItem
                icon="calendar-outline"
                title="Availability & Calendar"
                sub="Manage your sessions and availability"
                iconBackground={THEME.softPurple}
                onPress={() => navigation.navigate("DoctorSchedule")}
              />
            </View>

            <Text style={styles.sectionTitle}>My Activity</Text>
            <View style={styles.listContainer}>
              <ProfileListItem
                icon="bar-chart-outline"
                title="Daily Report"
                sub="Check patient and queue metrics"
                iconBackground={THEME.softBlue}
                onPress={() => navigation.navigate("DoctorReport")}
              />
              <ProfileListItem
                icon="settings-outline"
                title="Settings"
                sub="Notifications, security and preferences"
                iconBackground={THEME.softPurple}
                onPress={() => navigation.navigate("DoctorSettings")}
              />
              <ProfileListItem
                icon="log-out-outline"
                title="Log Out"
                sub="Sign out from your doctor panel"
                iconBackground={"#FFEBEB"}
                onPress={logout}
                isNew={false}
              />
            </View>

            <View style={styles.footerSpacer} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: doctorColors.primary },
  topSafeArea: { backgroundColor: doctorColors.primary },
  contentWrapper: {
    flex: 1,
    backgroundColor: THEME.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    marginTop: 12,
  },
  safe: { flex: 1, backgroundColor: THEME.background },
  scrollContent: { paddingTop: 0, paddingBottom: 16 },
  scrollBody: { backgroundColor: THEME.background },
  topSection: { backgroundColor: doctorColors.primary },
  quickActionsSection: {
    backgroundColor: "transparent",
    marginTop: -8,
    marginBottom: 6,
    zIndex: 2,
  },
  bannerWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    paddingRight: 28,
  },
  actionCard: {
    width: 140,
    backgroundColor: THEME.white,
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionCardDisabled: {
    opacity: 0.45,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    width: "100%",
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  actionLabelLeft: {
    textAlign: "left",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 25,
    marginTop: 30,
    marginBottom: 15,
  },
  listContainer: {
    backgroundColor: THEME.white,
    marginHorizontal: 20,
    borderRadius: 24,
    paddingVertical: 5,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    flex: 1,
  },
  listCopy: {
    flex: 1,
  },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  listItemSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newText: {
    color: THEME.white,
    fontSize: 8,
    fontWeight: "900",
  },
  footerSpacer: { height: 70 },
});
