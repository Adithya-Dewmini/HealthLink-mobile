import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { AuthContext } from "../../utils/AuthContext";


const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softBlue: "#E1EEF9",   // From reference
  softGreen: "#E1F1E7",  // From reference
  softPurple: "#E9E7F7", // From reference
  accentRed: "#FF5252",
};

export default function SettingsScreen() {
  const { logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={40} color={THEME.textGray} />
          </View>
          <Text style={styles.profileName}>Dr. Silva</Text>
          <Text style={styles.profileRole}>Senior Medical Officer</Text>
        </View>

        {/* Section: General */}
        <Text style={styles.sectionTitle}>Profile & Clinic</Text>
        <View style={styles.card}>
          <SettingsItem icon="person-outline" label="Profile Info" color={THEME.softBlue} />
          <SettingsItem icon="business-outline" label="Clinic Info" color={THEME.softGreen} />
          <SettingsItem icon="lock-closed-outline" label="Password & Security" color={THEME.softPurple} />
        </View>

        {/* Section: Clinical Preferences */}
        <Text style={styles.sectionTitle}>Clinical Preferences</Text>
        <View style={styles.card}>
          <SettingsItem icon="document-text-outline" label="Prescription Templates" color={THEME.softBlue} />
          <SettingsItem icon="medical-outline" label="Default Medicines" color={THEME.softGreen} />
          <SettingsItem icon="notifications-outline" label="Notification Settings" color={THEME.softPurple} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.card, styles.logoutButton]} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={THEME.accentRed} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.4 (2026)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingsItemProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
};
const SettingsItem = ({ icon, label, color }: SettingsItemProps) => (
  <TouchableOpacity style={styles.itemRow}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Ionicons name={icon as any} size={20} color={THEME.textDark} />
    </View>

    <Text style={styles.itemLabel}>{label}</Text>

    <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  container: { padding: 20 },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 30,
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  profileName: { fontSize: 22, fontWeight: 'bold', color: THEME.textDark },
  profileRole: { fontSize: 14, color: THEME.textGray, marginTop: 4 },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: THEME.textDark, 
    marginBottom: 12, 
    marginLeft: 4 
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 24, // Consistent with dashboard
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 25,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: THEME.textDark },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  logoutText: { color: THEME.accentRed, fontWeight: '700', marginLeft: 8, fontSize: 16 },
  versionText: { 
    textAlign: 'center', 
    color: THEME.textGray, 
    fontSize: 12, 
    marginBottom: 40 
  },
});
