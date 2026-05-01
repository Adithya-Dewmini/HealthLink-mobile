import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../config/api";
import { AuthContext, useAuth } from "../../utils/AuthContext";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";

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
      setProfileImage(data?.doctor?.profile_image ?? null);
      setUser((prev) => ({
        ...(prev || {}),
        name: data?.doctor?.name?.trim() || prev?.name || "Doctor",
        specialization:
          data?.doctor?.specialization?.trim() || prev?.specialization || "Clinic dashboard",
        profile_image: data?.doctor?.profile_image ?? prev?.profile_image ?? null,
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

      <View style={styles.topSection}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => navigation.navigate("ProfileEdit")}
              activeOpacity={0.88}
            >
              {resolvedProfileImage ? (
                <Image source={{ uri: resolvedProfileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarCameraBadge}>
                <Ionicons name="camera" size={14} color={THEME.white} />
              </View>
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>My Profile</Text>
              <Text style={styles.headerSub}>{headerSubtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => navigation.navigate("DoctorSettings")}
            activeOpacity={0.88}
          >
            <Ionicons name="settings-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
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
      </View>

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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scrollContent: { paddingBottom: 16 },
  scrollBody: { backgroundColor: THEME.background },
  topSection: { backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    backgroundColor: THEME.white,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "visible",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.softBlue,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  avatarCameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.white,
  },
  quickActionsSection: {
    backgroundColor: THEME.background,
    paddingTop: 12,
    paddingBottom: 12,
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
