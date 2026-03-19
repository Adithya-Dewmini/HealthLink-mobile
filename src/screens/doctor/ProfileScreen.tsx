import React, { useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../utils/AuthContext";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  mint: "#E1F1E7",
  lavender: "#E9E7F7",
  softBlue: "#E1EEF9",
  accentGreen: "#4CAF50",
  accentPurple: "#9C27B0",
  accentBlue: "#2196F3",
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerNav}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Profile</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="create-outline" size={24} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color={THEME.textGray} />
            </View>
            <View style={styles.activeBadge} />
          </View>
          <Text style={styles.drName}>Dr. Silva</Text>
          <Text style={styles.drSpecialty}>Cardiologist</Text>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>ID: DR-1021</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>📞 Contact Information</Text>
        <View style={styles.infoCard}>
          <InfoRow
            icon="call-outline"
            label="Phone"
            value="+1 234 567 890"
            color={THEME.accentBlue}
          />
          <InfoRow
            icon="mail-outline"
            label="Email"
            value="dr.silva@clinic.com"
            color={THEME.accentPurple}
          />
          <InfoRow
            icon="location-outline"
            label="Clinic Location"
            value="Medical Center, Wing B, Room 402"
            color={THEME.accentRed}
            isLast
          />
        </View>

        <Text style={styles.sectionTitle}>🏥 Professional Details</Text>
        <View style={styles.infoCard}>
          <DetailBlock label="Specialization" value="Cardiovascular Medicine" />
          <DetailBlock label="License Number" value="MED-99201-X" />
          <DetailBlock label="Experience" value="12 Years" />
          <DetailBlock
            label="Consultation Hours"
            value="Mon - Fri (09:00 AM - 05:00 PM)"
            isLast
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={THEME.accentRed} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ icon, label, value, color, isLast }: any) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={{ flex: 1, marginLeft: 15 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const DetailBlock = ({ label, value, isLast }: any) => (
  <View style={[styles.detailBlock, isLast && { borderBottomWidth: 0 }]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
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
    backgroundColor: THEME.white,
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    marginBottom: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: THEME.white,
  },
  activeBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.accentGreen,
    borderWidth: 3,
    borderColor: THEME.white,
  },
  drName: { fontSize: 22, fontWeight: "bold", color: THEME.textDark },
  drSpecialty: { fontSize: 16, color: THEME.textGray, marginTop: 4 },
  idBadge: {
    marginTop: 12,
    backgroundColor: THEME.softBlue,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  idText: { fontSize: 12, color: THEME.accentBlue, fontWeight: "700" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textDark,
    marginBottom: 12,
    marginLeft: 5,
  },
  infoCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 15,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: { fontSize: 12, color: THEME.textGray },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.textDark,
    marginTop: 2,
  },

  detailBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  detailLabel: {
    fontSize: 12,
    color: THEME.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.textDark,
    marginTop: 4,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.softRed,
  },
  logoutText: {
    color: THEME.accentRed,
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
});
