import React, { useContext, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../utils/AuthContext";

const THEME = {
  primary: "#2563EB",
  background: "#F8FAFC",
  white: "#FFFFFF",
  textPrimary: "#1E293B",
  textMuted: "#64748B",
  danger: "#EF4444",
  border: "#E2E8F0",
  cardRadius: 20,
};

export default function MedicalCenterSettings() {
  const navigation = useNavigation<any>();
  const { logout } = useContext(AuthContext);
  const [queueAlerts, setQueueAlerts] = useState(true);
  const [doctorStatusAlerts, setDoctorStatusAlerts] = useState(true);
  const [dailyReports, setDailyReports] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Manage your medical center system</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="help-circle-outline" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="hospital-building" size={30} color={THEME.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.centerName}>HealthLink Medical Center</Text>
              <Text style={styles.centerMeta}>Colombo, Sri Lanka</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SettingsGroup title="Center">
          <SettingsItem icon="business-outline" label="Medical Center Details" />
          <SettingsItem icon="location-outline" label="Branches & Address" />
          <SettingsItem icon="time-outline" label="Operating Hours" />
        </SettingsGroup>

        <SettingsGroup title="Settings">
          <SettingsItem icon="information-circle-outline" label="Clinic Info" />
          <SettingsItem icon="alarm-outline" label="Working Hours" />
          <SettingsItem icon="git-branch-outline" label="Queue Rules" />
        </SettingsGroup>

        <SettingsGroup title="Staff & Access">
          <SettingsItem icon="medkit-outline" label="Manage Doctors" />
          <SettingsItem icon="people-outline" label="Manage Receptionists" />
          <SettingsItem icon="shield-checkmark-outline" label="Roles & Permissions" />
        </SettingsGroup>

        <SettingsGroup title="Operations">
          <SettingsToggle
            icon="notifications-outline"
            label="Queue Alerts"
            value={queueAlerts}
            onValueChange={setQueueAlerts}
          />
          <SettingsToggle
            icon="pulse-outline"
            label="Doctor Status Alerts"
            value={doctorStatusAlerts}
            onValueChange={setDoctorStatusAlerts}
          />
          <SettingsToggle
            icon="document-text-outline"
            label="Daily Report Summary"
            value={dailyReports}
            onValueChange={setDailyReports}
          />
        </SettingsGroup>

        <SettingsGroup title="System">
          <SettingsItem icon="language-outline" label="Language" value="English" />
          <SettingsItem icon="cloud-outline" label="Data Sync" value="Healthy" />
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
      {value ? <Text style={styles.itemValue}>{value}</Text> : null}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 20,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: { flex: 1 },
  centerName: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  centerMeta: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  editBtn: {
    backgroundColor: THEME.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 12, fontWeight: "700", color: THEME.primary },
  groupContainer: { marginBottom: 25 },
  groupTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.textMuted,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 5,
    letterSpacing: 0.8,
  },
  groupCard: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.background,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 8 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  itemLabel: { fontSize: 15, fontWeight: "600", color: THEME.textPrimary, flex: 1 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemValue: { fontSize: 14, color: THEME.textMuted, fontWeight: "500" },
  versionRow: { padding: 16, flexDirection: "row", justifyContent: "space-between" },
  versionLabel: { fontSize: 14, color: THEME.textMuted, fontWeight: "600" },
  versionValue: { fontSize: 14, color: THEME.textMuted },
  logoutBtn: {
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  logoutText: { fontSize: 16, fontWeight: "800", color: THEME.danger },
});
