import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../utils/AuthContext";
import { apiFetch } from "../../config/api";
import { uploadPharmacyCover, uploadPharmacyLogo } from "../../services/mediaUploadService";

const THEME = {
  primary: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textMuted: "#6B7280",
  danger: "#EF4444",
  border: "#E0E6ED",
  cardRadius: 20,
};

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useContext(AuthContext);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [expiryAlert, setExpiryAlert] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [pharmacy, setPharmacy] = useState<{
    id: number;
    name: string;
    location?: string | null;
    image_url?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
  } | null>(null);

  React.useEffect(() => {
    const loadPharmacy = async () => {
      try {
        const response = await apiFetch("/api/pharmacy/profile");
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setPharmacy(data ?? null);
      } catch (error) {
        console.log("Pharmacy settings load error:", error);
      }
    };

    void loadPharmacy();
  }, []);

  const handleLogoUpload = async () => {
    if (!pharmacy?.id) {
      return;
    }

    Alert.alert("Change Image", "Do you want to update this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Upload",
        onPress: async () => {
          try {
            setUploading("logo");
            const response = await uploadPharmacyLogo(String(pharmacy.id));
            const logoUrl = response?.data?.logoUrl ?? null;
            if (logoUrl) {
              setPharmacy((prev) => (prev ? { ...prev, logo_url: logoUrl } : prev));
            }
          } finally {
            setUploading(null);
          }
        },
      },
    ]);
  };

  const handleCoverUpload = async () => {
    if (!pharmacy?.id) {
      return;
    }

    Alert.alert("Change Image", "Do you want to update this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Upload",
        onPress: async () => {
          try {
            setUploading("cover");
            const response = await uploadPharmacyCover(String(pharmacy.id));
            const coverUrl = response?.data?.coverUrl ?? null;
            if (coverUrl) {
              setPharmacy((prev) =>
                prev ? { ...prev, cover_image_url: coverUrl, image_url: coverUrl } : prev
              );
            }
          } finally {
            setUploading(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Manage your pharmacy system</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="help-circle-outline" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.coverShell} onPress={handleCoverUpload} activeOpacity={0.9}>
            {pharmacy?.cover_image_url || pharmacy?.image_url ? (
              <Image
                source={{ uri: pharmacy?.cover_image_url || pharmacy?.image_url || undefined }}
                style={styles.coverImage}
              />
            ) : (
              <View style={styles.coverFallback}>
                <MaterialCommunityIcons name="plus-box" size={42} color={THEME.primary} />
              </View>
            )}
            <View style={styles.editIcon}>
              {uploading === "cover" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.editIconText}>✏️</Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.profileRow}>
            <TouchableOpacity
              style={styles.logoContainer}
              onPress={handleLogoUpload}
              activeOpacity={0.9}
            >
              {pharmacy?.logo_url ? (
                <Image source={{ uri: pharmacy.logo_url }} style={styles.logoImage} />
              ) : (
                <MaterialCommunityIcons name="plus-box" size={32} color={THEME.primary} />
              )}
              <View style={styles.logoEditIcon}>
                {uploading === "logo" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.editIconText}>✏️</Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.pharmacyName}>{pharmacy?.name || "HealthLink Pharmacy"}</Text>
              <Text style={styles.pharmacyLoc}>{pharmacy?.location || "Colombo, Sri Lanka"}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SettingsGroup title="Account">
          <SettingsItem icon="person-outline" label="Profile Settings" />
          <SettingsItem icon="lock-closed-outline" label="Change Password" />
        </SettingsGroup>

        <SettingsGroup title="Pharmacy">
          <SettingsItem icon="business-outline" label="Pharmacy Details" />
          <SettingsItem icon="time-outline" label="Operating Hours" />
        </SettingsGroup>

        <SettingsGroup title="Users">
          <SettingsItem icon="people-outline" label="Manage Staff" />
          <SettingsItem icon="shield-checkmark-outline" label="Roles & Permissions" />
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <SettingsToggle
            icon="cube-outline"
            label="Low Stock Alerts"
            value={lowStockAlert}
            onValueChange={setLowStockAlert}
          />
          <SettingsToggle
            icon="calendar-outline"
            label="Expiry Alerts"
            value={expiryAlert}
            onValueChange={setExpiryAlert}
          />
          <SettingsItem icon="notifications-outline" label="App Notifications" />
        </SettingsGroup>

        <SettingsGroup title="System">
          <SettingsToggle
            icon="moon-outline"
            label="Dark Mode"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <SettingsItem icon="language-outline" label="Language" value="English" />
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>App Version</Text>
            <Text style={styles.versionValue}>v1.0.4 (Beta)</Text>
          </View>
        </SettingsGroup>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={THEME.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingsGroup = ({ title, children }: any) => (
  <View style={styles.groupContainer}>
    <Text style={styles.groupTitle}>{title}</Text>
    <View style={styles.groupCard}>{children}</View>
  </View>
);

const SettingsItem = ({ icon, label, value }: any) => (
  <TouchableOpacity style={styles.itemRow}>
    <View style={styles.itemLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={THEME.textPrimary} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
    </View>
    <View style={styles.itemRight}>
      {value && <Text style={styles.itemValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={THEME.border} />
    </View>
  </TouchableOpacity>
);

const SettingsToggle = ({ icon, label, value, onValueChange }: any) => (
  <View style={styles.itemRow}>
    <View style={styles.itemLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={THEME.textPrimary} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: THEME.border, true: THEME.primary }}
      thumbColor={THEME.white}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: THEME.white, gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },

  scrollContent: { padding: 20, paddingBottom: 40 },

  profileCard: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, padding: 20, marginBottom: 25, elevation: 3, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10 },
  coverShell: {
    height: 148,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
    position: "relative",
    backgroundColor: "#ECFDF5",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  logoImage: { width: "100%", height: "100%", resizeMode: "cover" },
  pharmacyName: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  pharmacyLoc: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  editBtn: { backgroundColor: THEME.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: "700", color: THEME.primary },
  editIcon: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(43, 182, 115, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoEditIcon: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(43, 182, 115, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  editIconText: { fontSize: 12 },

  groupContainer: { marginBottom: 25 },
  groupTitle: { fontSize: 13, fontWeight: "800", color: THEME.textMuted, textTransform: "uppercase", marginBottom: 12, marginLeft: 5, letterSpacing: 0.8 },
  groupCard: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10 },

  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: THEME.background },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  itemLabel: { fontSize: 15, fontWeight: "600", color: THEME.textPrimary },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemValue: { fontSize: 14, color: THEME.textMuted, fontWeight: "500" },

  versionRow: { padding: 16, flexDirection: "row", justifyContent: "space-between" },
  versionLabel: { fontSize: 14, color: THEME.textMuted, fontWeight: "600" },
  versionValue: { fontSize: 14, color: THEME.textMuted },

  logoutBtn: { flexDirection: "row", backgroundColor: "#FEE2E2", height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", gap: 10, marginTop: 10 },
  logoutText: { fontSize: 16, fontWeight: "800", color: THEME.danger },
});
