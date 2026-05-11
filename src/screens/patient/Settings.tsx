import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../../utils/AuthContext";
import { apiFetch } from "../../config/api";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  accentRed: "#F44336",
  softBlue: "#E3F2FD",
  border: "#E0E0E0",
};

export default function Settings() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await apiFetch("/api/patients/me");
        const data = await res.json();
        setProfile(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color={THEME.accentBlue} /></View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.headerBackground} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={THEME.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* 2. Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={THEME.accentBlue} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>{profile?.name || "Nadun Peiris"}</Text>
              <Text style={styles.metaText}>Age: {profile?.age || "24"}  •  Blood: {profile?.blood_group || "O+"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Health Information Section */}
        <SectionTitle title="Health Information" />
        <View style={styles.sectionCard}>
          <MenuLink icon="medical" color="#4CAF50" label="Medical Conditions" />
          <MenuLink icon="alert-circle" color="#FF9800" label="Allergies" />
          <MenuLink icon="call" color="#2196F3" label="Emergency Contact" />
          <MenuLink icon="file-tray-full" color="#9C27B0" label="Health Records" isLast />
        </View>

        {/* 4. App Preferences Section */}
        <SectionTitle title="App Preferences" />
        <View style={styles.sectionCard}>
          <MenuLink icon="language" color="#3F51B5" label="Language" value="English" />
          <MenuToggle icon="notifications" color="#FF5252" label="Notifications" value={true} />
          <MenuLink icon="body" color="#009688" label="Accessibility" />
          <MenuToggle 
            icon="moon" 
            color="#607D8B" 
            label="Dark Mode" 
            value={darkMode} 
            onValueChange={setDarkMode} 
            isLast 
          />
        </View>

        {/* 5. Security Section */}
        <SectionTitle title="Security" />
        <View style={styles.sectionCard}>
          <MenuLink icon="lock-closed" color={THEME.textGray} label="Change Password" />
          <MenuLink icon="shield-checkmark" color={THEME.textGray} label="Two-Factor Auth" />
          <MenuLink icon="eye-off" color={THEME.textGray} label="Privacy Settings" isLast />
        </View>

        {/* 6. Support Section */}
        <SectionTitle title="Support" />
        <View style={styles.sectionCard}>
          <MenuLink icon="help-circle" color={THEME.textGray} label="Help Center" />
          <MenuLink icon="chatbox-ellipses" color={THEME.textGray} label="Contact Support" />
          <MenuLink icon="document-text" color={THEME.textGray} label="Terms & Privacy" isLast />
        </View>

        {/* 7. Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={THEME.white} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>HealthLink v2.0.4</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Internal Components
const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitleText}>{title}</Text>
);

const MenuLink = ({ icon, label, color, isLast, value }: any) => (
  <TouchableOpacity style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    {value && <Text style={styles.menuValue}>{value}</Text>}
    <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
  </TouchableOpacity>
);

const MenuToggle = ({ icon, label, color, value, onValueChange, isLast }: any) => (
  <View style={[styles.menuRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <Switch 
      value={value} 
      onValueChange={onValueChange}
      trackColor={{ true: THEME.accentBlue, false: "#D1D1D1" }}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { backgroundColor: THEME.background },
  scrollContent: { paddingBottom: 40 },
  headerBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 160,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: THEME.white },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerSpacer: { width: 40, height: 40 },
  
  // Profile Card
  profileCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: THEME.softBlue, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  profileInfo: { marginLeft: 16 },
  nameText: { fontSize: 20, fontWeight: 'bold', color: THEME.textDark },
  metaText: { fontSize: 14, color: THEME.textGray, marginTop: 4 },
  editProfileBtn: {
    marginTop: 20,
    backgroundColor: THEME.background,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  editProfileText: { fontWeight: 'bold', color: THEME.accentBlue },

  // Sections
  sectionTitleText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.textGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 25,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 16, color: THEME.textDark, fontWeight: '500' },
  menuValue: { fontSize: 14, color: THEME.textGray, marginRight: 8 },

  // Logout
  logoutBtn: {
    backgroundColor: THEME.accentRed,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    gap: 10,
  },
  logoutText: { color: THEME.white, fontWeight: 'bold', fontSize: 16 },
  
  footer: { alignItems: 'center', marginTop: 25 },
  versionText: { fontSize: 12, color: THEME.textGray },
});
