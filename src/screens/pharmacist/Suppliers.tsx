import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  primary: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textMuted: "#6B7280",
  success: "#2BB673",
  border: "#E0E6ED",
  cardRadius: 20,
};

export default function SuppliersScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Suppliers</Text>
          <Text style={styles.headerSub}>Manage medicine suppliers</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="map-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={THEME.textMuted} />
            <TextInput
              placeholder="Search supplier..."
              style={styles.searchInput}
              placeholderTextColor={THEME.textMuted}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>24</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: THEME.success }]}>22</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statCount}>02</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>All Suppliers</Text>

        <SupplierCard
          name="A.S.P. Pharmaceuticals"
          status="Active"
          phone="+94 77 123 4567"
          email="info@asppharma.lk"
          location="Colombo 03, Sri Lanka"
        />

        <SupplierCard
          name="MediLink Distributors"
          status="Active"
          phone="+94 11 255 8899"
          email="sales@medilink.lk"
          location="Kandy Road, Kelaniya"
        />

        <SupplierCard
          name="Global Health Ltd"
          status="Inactive"
          phone="+94 71 998 7766"
          email="contact@globalhealth.lk"
          location="Galle Face, Colombo"
        />
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={32} color={THEME.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const SupplierCard = ({ name, status, phone, email, location }: any) => {
  const isActive = status === "Active";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.supplierName}>{name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? "#E0F5EB" : "#F1F5F9" }]}>
            <Text style={[styles.statusText, { color: isActive ? THEME.success : THEME.textMuted }]}>{status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.contactItem}>
          <Feather name="phone" size={14} color={THEME.textMuted} />
          <Text style={styles.contactText}>{phone}</Text>
        </View>
        <View style={styles.contactItem}>
          <Feather name="mail" size={14} color={THEME.textMuted} />
          <Text style={styles.contactText}>{email}</Text>
        </View>
        <View style={styles.contactItem}>
          <Feather name="map-pin" size={14} color={THEME.textMuted} />
          <Text style={styles.contactText}>{location}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="call" size={18} color={THEME.primary} />
          <Text style={[styles.actionLabel, { color: THEME.primary }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="chatbubble-ellipses" size={18} color={THEME.textPrimary} />
          <Text style={styles.actionLabel}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={[styles.actionLabel, { fontWeight: "800" }]}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: THEME.white, gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  searchRow: { flexDirection: "row", paddingVertical: 20, gap: 12 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: THEME.white, borderRadius: 14, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: THEME.border },
  searchInput: { marginLeft: 10, fontSize: 15, color: THEME.textPrimary, flex: 1 },
  filterBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: THEME.white, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: THEME.border },

  statsContainer: { flexDirection: "row", backgroundColor: THEME.white, borderRadius: 16, padding: 15, alignItems: "center", marginBottom: 25, elevation: 2, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10 },
  statItem: { flex: 1, alignItems: "center" },
  statCount: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  statLabel: { fontSize: 11, color: THEME.textMuted, fontWeight: "700", marginTop: 2, textTransform: "uppercase" },
  statDivider: { width: 1, height: 30, backgroundColor: THEME.border },

  sectionLabel: { fontSize: 14, fontWeight: "800", color: THEME.textMuted, textTransform: "uppercase", marginBottom: 15, letterSpacing: 0.5 },

  card: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, padding: 20, marginBottom: 16, elevation: 3, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 15 },
  avatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: THEME.primary },
  supplierName: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: "800" },

  cardBody: { gap: 8 },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactText: { fontSize: 13, color: THEME.textMuted, fontWeight: "500" },

  divider: { height: 1, backgroundColor: THEME.background, marginVertical: 15 },
  cardActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  actionLabel: { fontSize: 13, fontWeight: "700", color: THEME.textPrimary },

  fab: { position: "absolute", bottom: 110, right: 20, width: 64, height: 64, borderRadius: 20, backgroundColor: THEME.primary, justifyContent: "center", alignItems: "center", elevation: 8, shadowColor: THEME.primary, shadowOpacity: 0.3, shadowRadius: 10 },
});
