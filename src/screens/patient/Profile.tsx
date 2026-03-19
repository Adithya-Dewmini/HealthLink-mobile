import React from "react";
import {
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

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softBlue: "#E1EEF9",
  softRed: "#FEE2E2",
  accentBlue: "#2196F3",
  accentPurple: "#9C27B0",
  accentRed: "#FF5252",
  accentGreen: "#4CAF50",
};

export default function PatientProfile() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={22} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={50} color={THEME.textGray} />
            <TouchableOpacity style={styles.editBadge}>
              <Ionicons name="camera" size={16} color={THEME.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Alex Johnson</Text>
          <Text style={styles.userID}>Patient ID: P-9920</Text>
        </View>

        {/* Health Stats Summary Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Blood</Text>
            <Text style={[styles.statValue, { color: THEME.accentRed }]}>O+</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statLabel}>Weight</Text>
            <Text style={styles.statValue}>72kg</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Height</Text>
            <Text style={styles.statValue}>178cm</Text>
          </View>
        </View>

        {/* Personal Details Section */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.infoCard}>
          <ProfileInfoItem icon="call" label="Phone" value="+1 555 0123 456" color={THEME.accentBlue} />
          <ProfileInfoItem icon="mail" label="Email" value="alex.j@example.com" color={THEME.accentPurple} />
          <ProfileInfoItem icon="location" label="Address" value="452 Oak Street, NY" color={THEME.accentGreen} isLast />
        </View>

        {/* Account Actions */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoCard}>
          <ActionItem icon="shield-checkmark" label="Privacy Policy" />
          <ActionItem icon="help-circle" label="Help Support" />
          <ActionItem icon="log-out" label="Log Out" isDestructive isLast />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
const ProfileInfoItem = ({ icon, label, value, color, isLast }: any) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={styles.textColumn}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const ActionItem = ({ icon, label, isDestructive, isLast }: any) => (
  <TouchableOpacity style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={[styles.iconBox, { backgroundColor: isDestructive ? THEME.softRed : THEME.background }]}>
      <Ionicons name={icon} size={18} color={isDestructive ? THEME.accentRed : THEME.textGray} />
    </View>
    <Text style={[styles.actionLabel, isDestructive && { color: THEME.accentRed }]}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  container: { padding: 20 },
  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  iconBtn: { padding: 5 },

  profileCard: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.accentBlue,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: THEME.white,
  },
  userName: { fontSize: 22, fontWeight: "bold", color: THEME.textDark, marginTop: 15 },
  userID: { fontSize: 14, color: THEME.textGray, marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.white,
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 25,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F0F0F0' },
  statLabel: { fontSize: 12, color: THEME.textGray, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: THEME.textDark },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: THEME.textDark, marginBottom: 12, marginLeft: 5 },
  infoCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  textColumn: { flex: 1, marginLeft: 15 },
  infoLabel: { fontSize: 12, color: THEME.textGray },
  infoValue: { fontSize: 15, fontWeight: "600", color: THEME.textDark, marginTop: 2 },
  actionLabel: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: "600", color: THEME.textDark },
});
