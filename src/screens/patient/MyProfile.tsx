import React from "react";
import {
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../../config/api";
import { useAuth } from "../../utils/AuthContext";
import { patientTheme } from "../../constants/patientTheme";
import { useImageUpload } from "../../hooks/useImageUpload";

const { width } = Dimensions.get("window");
const THEME = {
  ...patientTheme.colors,
  primary: "#0F172A", // Deep Navy
  accent: "#38BDF8",  // Cyan Accent
  bg: "#F8FAFC",
};

type PatientProfileSummary = {
  name?: string;
  email?: string;
  profile_image?: string | null;
};

const EASY_ACTIONS = [
  {
    icon: "heart-outline" as const,
    label: "Favorites",
    accent: "#0EA5E9",
    gradient: ["#E0F2FE", "#F8FCFF"] as const,
  },
  {
    icon: "receipt-outline" as const,
    label: "Orders",
    accent: "#7C3AED",
    gradient: ["#EDE9FE", "#FAF7FF"] as const,
  },
  {
    icon: "pulse-outline" as const,
    label: "Health",
    accent: "#10B981",
    gradient: ["#DCFCE7", "#F4FFF9"] as const,
  },
] as const;

export default function MyProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();
  const { loading: uploading, pickImage, upload } = useImageUpload();
  const [profile, setProfile] = React.useState<PatientProfileSummary>({
    name: "Patient",
    email: "",
    profile_image: null,
  });

  const loadProfile = React.useCallback(async () => {
    try {
      const response = await apiFetch("/api/patients/me");
      if (!response.ok) return;

      const data = (await response.json()) as PatientProfileSummary;
      const nextProfile = {
        name: String(data?.name || "Patient"),
        email: String(data?.email || ""),
        profile_image: data?.profile_image ?? null,
      };
      setProfile(nextProfile);
      setUser((prev) => ({
        ...(prev || {}),
        name: nextProfile.name,
        email: nextProfile.email,
        role: prev?.role || "patient",
        profile_image: nextProfile.profile_image,
      }));
    } catch (error) {
      console.log("Patient profile summary load error:", error);
    }
  }, [setUser]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  React.useEffect(() => {
    if (!user) return;
    setProfile({
      name: String(user?.name || "Patient"),
      email: String(user?.email || ""),
      profile_image: user?.profile_image ?? null,
    });
  }, [user]);

  const initials = React.useMemo(() => {
    const name = String(profile.name || "").trim();
    if (!name) return "P";
    return name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
  }, [profile.name]);

  const handleProfileImageUpload = React.useCallback(async () => {
    const asset = await pickImage();
    if (!asset) {
      return;
    }

    const result = await upload("profile", asset);
    if (!result || !("imageUrl" in result)) {
      return;
    }

    const nextProfile = {
      name: String(profile.name || "Patient"),
      email: String(profile.email || ""),
      profile_image: result.imageUrl,
    };

    setProfile(nextProfile);
    setUser((prev) => ({
      ...(prev || {}),
      name: nextProfile.name,
      email: nextProfile.email,
      role: prev?.role || "patient",
      profile_image: result.imageUrl,
    }));

    await loadProfile();
  }, [loadProfile, pickImage, profile.email, profile.name, setUser, upload]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Slim Futuristic Top Bar */}
      <LinearGradient colors={[THEME.primary, "#1E293B"]} style={styles.topBar} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Nav Header */}
        <View style={styles.navHeader}>
          <Text style={styles.navLabel}>Medical Identity</Text>
          <TouchableOpacity 
            style={styles.settingsIconBtn} 
            onPress={() => navigation.navigate("PatientSettings")}
          >
            <Ionicons name="settings-sharp" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* 2. Floating Identity Card */}
          <View style={styles.identityCard}>
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              onPress={() => {
                void handleProfileImageUpload();
              }}
              activeOpacity={0.9}
            >
              <LinearGradient colors={[THEME.accent, "#0284C7"]} style={styles.avatarBorder}>
                {profile.profile_image ? (
                  <Image source={{ uri: profile.profile_image }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitialsText}>{initials}</Text>
                  </View>
                )}
              </LinearGradient>
              <View style={styles.cameraPill}>
                <Ionicons name="camera" size={12} color="white" />
              </View>
              {uploading ? (
                <View style={styles.avatarLoader}>
                  <Ionicons name="cloud-upload-outline" size={18} color="white" />
                </View>
              ) : null}
            </TouchableOpacity>
            
            <Text style={styles.userNameText}>{profile.name}</Text>
            <Text style={styles.userEmailText}>{profile.email || "Active Member"}</Text>
            
            <View style={styles.easyActionSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.easyActionRail}
              >
                <ActionCard
                  icon={EASY_ACTIONS[0].icon}
                  label={EASY_ACTIONS[0].label}
                  accent={EASY_ACTIONS[0].accent}
                  gradient={EASY_ACTIONS[0].gradient}
                  onPress={() => navigation.navigate("Favorites")}
                />
                <ActionCard
                  icon={EASY_ACTIONS[1].icon}
                  label={EASY_ACTIONS[1].label}
                  accent={EASY_ACTIONS[1].accent}
                  gradient={EASY_ACTIONS[1].gradient}
                  onPress={() => navigation.navigate("Orders")}
                />
                <ActionCard
                  icon={EASY_ACTIONS[2].icon}
                  label={EASY_ACTIONS[2].label}
                  accent={EASY_ACTIONS[2].accent}
                  gradient={EASY_ACTIONS[2].gradient}
                  onPress={() => navigation.navigate("MyHealthDashboard")}
                />
              </ScrollView>
            </View>
          </View>

          {/* 3. Sectioned List Content */}
          <View style={styles.bodySection}>
            <Text style={styles.sectionLabel}>Healthcare</Text>
            <View style={styles.listWrapperCard}>
              <ProfileListItem 
                icon="person-outline" 
                title="Profile Info" 
                sub="Edit basic details" 
                onPress={() => navigation.navigate("ProfileEdit")}
              />
              <ProfileListItem 
                icon="folder-open-outline" 
                title="Medical Reports" 
                sub="Lab & test results" 
                onPress={() => navigation.navigate("MedicalHistoryScreen")}
              />
              <ProfileListItem
                icon="reader-outline"
                title="Prescriptions"
                sub="Digital Rx archive"
                onPress={() => navigation.navigate("PatientPrescriptions")}
              />
              <ProfileListItem 
                icon="calendar-outline" 
                title="Appointments" 
                sub="Upcoming visits" 
                onPress={() => navigation.navigate("Appointments")}
                noBorder
              />
            </View>

            <Text style={styles.sectionLabel}>Activity</Text>
            <View style={styles.listWrapperCard}>
              <ProfileListItem
                icon="cart-outline"
                title="Medicine Orders"
                sub="Tracking"
                onPress={() => navigation.navigate("Orders")}
              />
              <ProfileListItem
                icon="pulse-outline"
                title="Activity Feed"
                sub="Orders, prescriptions, queue events"
                onPress={() => navigation.navigate("ActivityFeed", { title: "Activity Feed" })}
              />
              <ProfileListItem icon="business-outline" title="Pharmacies" sub="Saved stores" onPress={() => navigation.navigate("Favorites")} />
              <ProfileListItem icon="calendar-outline" title="Subscriptions" sub="Refill plans" isNew noBorder />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// --- Helper UI Components ---

const ActionCard = ({ icon, label, accent, gradient, onPress }: any) => (
  <TouchableOpacity style={styles.actionCardTouch} onPress={onPress} activeOpacity={0.9}>
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionCard}>
      <View style={[styles.actionGlow, { backgroundColor: `${accent}18` }]} />
      <View style={styles.actionTopRow}>
        <View style={[styles.gridIconCircle, { shadowColor: accent }]}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
        <View style={[styles.actionAccentDot, { backgroundColor: accent }]} />
      </View>
      <Text style={styles.gridLabelText} numberOfLines={1}>
        {label}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
);

const ProfileListItem = ({ icon, title, sub, isNew, onPress, noBorder }: any) => (
  <TouchableOpacity style={[styles.listItem, noBorder && { borderBottomWidth: 0 }]} onPress={onPress}>
    <View style={styles.listItemLeft}>
      <View style={styles.listIconCircle}>
        <Ionicons name={icon} size={18} color={THEME.primary} />
      </View>
      <View>
        <View style={styles.titleWithBadge}>
          <Text style={styles.itemTitle}>{title}</Text>
          {isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
        </View>
        <Text style={styles.itemSubText}>{sub}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  topBar: { position: 'absolute', top: 0, width: '100%', height: 180 },
  safe: { flex: 1 },
  navHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 10 
  },
  navLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, textTransform: 'uppercase' },
  settingsIconBtn: { 
    width: 38, height: 38, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignItems: 'center', justifyContent: 'center' 
  },
  scrollContent: { paddingTop: 20 },
  
  // Floating Card
  identityCard: {
    backgroundColor: 'white', 
    marginHorizontal: 24, 
    borderRadius: 28, 
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: 'center',
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 20, 
    elevation: 10,
  },
  avatarWrapper: { marginBottom: 10 },
  avatarBorder: { width: 86, height: 86, borderRadius: 43, padding: 3 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 40 },
  avatarFallback: { 
    width: '100%', height: '100%', borderRadius: 40, 
    backgroundColor: '#F0F9FF', alignItems: 'center', justifyContent: 'center' 
  },
  avatarInitialsText: { fontSize: 24, fontWeight: '800', color: 'white' },
  cameraPill: { 
    position: 'absolute', bottom: 0, right: 0, 
    width: 26, height: 26, borderRadius: 13, 
    backgroundColor: THEME.accent, alignItems: 'center', 
    justifyContent: 'center', borderWidth: 3, borderColor: 'white' 
  },
  avatarLoader: {
    position: "absolute",
    inset: 3,
    borderRadius: 40,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  userNameText: { fontSize: 18, fontWeight: '800', color: THEME.primary },
  userEmailText: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  
  easyActionSection: {
    marginTop: 14, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9', 
    paddingTop: 14,
    width: "100%",
  },
  easyActionRail: {
    paddingRight: 8,
    gap: 12,
  },
  actionCardTouch: {
    width: 108,
  },
  actionCard: {
    minHeight: 112,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  actionGlow: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    top: -12,
    right: -10,
  },
  actionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
  },
  gridIconCircle: { 
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center', 
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  actionAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  gridLabelText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.primary,
    lineHeight: 17,
    marginTop: 12,
    textAlign: "center",
    width: "100%",
  },

  // Body
  bodySection: { paddingHorizontal: 20, marginTop: 30 },
  sectionLabel: { 
    fontSize: 12, fontWeight: '800', color: '#94A3B8', 
    textTransform: 'uppercase', letterSpacing: 1.2, 
    marginBottom: 15, marginLeft: 10 
  },
  listWrapperCard: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    paddingVertical: 5, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC' 
  },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  listIconCircle: { 
    width: 40, height: 40, borderRadius: 12, 
    backgroundColor: '#F8FAFC', alignItems: 'center', 
    justifyContent: 'center' 
  },
  titleWithBadge: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: THEME.primary },
  itemSubText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  newBadge: { 
    backgroundColor: THEME.accent, 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 6, 
    marginLeft: 8 
  },
  newBadgeText: { fontSize: 8, fontWeight: '900', color: THEME.primary },
});
