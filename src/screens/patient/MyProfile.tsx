import React from "react";
import {
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../../config/api";
import { useAuth } from "../../utils/AuthContext";

const THEME = {
  primary: "#2196F3",
  background: "#F2F5F9",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6A6D7C",
  border: "#E0E0E0",
  softBlue: "#E3F2FD",
  danger: "#EF4444",
};

type PatientProfileSummary = {
  name?: string;
  email?: string;
  profile_image?: string | null;
};

export default function MyProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = React.useState<PatientProfileSummary>({
    name: "Patient",
    email: "",
    profile_image: null,
  });

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await apiFetch("/api/patients/me");
        if (!response.ok) {
          return;
        }

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
    };

    void loadProfile();
  }, [setUser]);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    setProfile({
      name: String(user?.name || "Patient"),
      email: String(user?.email || ""),
      profile_image: user?.profile_image ?? null,
    });
  }, [user]);

  const initials = React.useMemo(() => {
    const name = String(profile.name || "").trim();
    if (!name) {
      return "P";
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [profile.name]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />
      {/* Fixed Top Section */}
      <View style={styles.topSection}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => navigation.navigate("ProfileEdit")}
              activeOpacity={0.88}
            >
              {profile.profile_image ? (
                <Image source={{ uri: profile.profile_image }} style={styles.avatarImage} />
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
              <Text style={styles.headerSub}>{profile.email || "Health insights & activity"}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => navigation.navigate("PatientSettings")}
          >
            <Ionicons name="settings-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionsSection}>
          <View style={styles.quickActionsRow}>
            <ActionCard
              icon="heart-outline"
              label="Favorites"
              onPress={() => navigation.navigate("Favorites")}
            />
            <ActionCard icon="receipt-outline" label="Orders" />
            <ActionCard
              icon="fitness-outline"
              label="My Health"
              onPress={() => navigation.navigate("MyHealthDashboard")}
            />
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollBody}
      >
        <Text style={styles.sectionTitle}>Health</Text>
        <View style={styles.listContainer}>
          <ProfileListItem 
            icon="person-outline" 
            title="Profile Info" 
            sub="Edit your basic details and photo" 
            onPress={() => navigation.navigate("ProfileEdit")}
          />
          <ProfileListItem 
            icon="folder-open-outline" 
            title="Medical Reports" 
            sub="View your lab & test results" 
            onPress={() => navigation.navigate("MedicalHistoryScreen")}
          />
          <ProfileListItem
            icon="reader-outline"
            title="Prescriptions"
            sub="Digital Rx from your doctors"
            onPress={() => navigation.navigate("PatientPrescriptions")}
          />
          <ProfileListItem 
            icon="calendar-outline" 
            title="Appointments" 
            sub="Upcoming visits & bookings" 
            onPress={() => navigation.navigate("Appointments")}
          />
        </View>

        <Text style={styles.sectionTitle}>My Activity</Text>
        <View style={styles.listContainer}>
          <ProfileListItem 
            icon="cart-outline" 
            title="Medicine Orders" 
            sub="Track your current purchases" 
          />
          <ProfileListItem 
            icon="business-outline" 
            title="Favorite Pharmacies" 
            sub="Quick access to local stores" 
            onPress={() => navigation.navigate("Favorites")}
          />
          <ProfileListItem 
            icon="calendar-outline" 
            title="Subscriptions" 
            sub="Upcoming refills & plans" 
            isNew 
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Helper Components ---

const ActionCard = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={styles.actionIconBox}>
      <Ionicons name={icon} size={24} color={THEME.primary} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const ProfileListItem = ({ icon, title, sub, isNew, onPress }: any) => (
  <TouchableOpacity style={styles.listItem} onPress={onPress}>
    <View style={styles.listItemLeft}>
      <View style={styles.listIconBox}>
        <Ionicons name={icon} size={20} color={THEME.primary} />
      </View>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.listItemTitle}>{title}</Text>
          {isNew && <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View>}
        </View>
        {sub && <Text style={styles.listItemSub}>{sub}</Text>}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={THEME.border} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scrollContent: { paddingBottom: 10 },
  scrollBody: { backgroundColor: THEME.background },
  topSection: { backgroundColor: THEME.white },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    color: THEME.primary,
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

  // Quick Actions
  quickActionsSection: { backgroundColor: THEME.background, paddingTop: 12, paddingBottom: 12 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 },
  actionCard: { flex: 1, backgroundColor: THEME.white, padding: 16, borderRadius: 20, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  actionIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME.softBlue, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary },

  // List Sections
  sectionTitle: { fontSize: 14, fontWeight: '800', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 25, marginTop: 30, marginBottom: 15 },
  listContainer: { backgroundColor: THEME.white, marginHorizontal: 20, borderRadius: 24, paddingVertical: 5, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  listIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME.softBlue, justifyContent: 'center', alignItems: 'center' },
  listItemTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  listItemSub: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  
  newBadge: { backgroundColor: THEME.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newText: { color: THEME.white, fontSize: 8, fontWeight: '900' },

  // Logout
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 16, marginTop: 5 },
  logoutText: { fontSize: 16, fontWeight: '700', color: THEME.danger },
});
