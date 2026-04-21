import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  primary: "#2563EB",
  background: "#F9FAFB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  softBlue: "#EFF6FF",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
};

export default function MedicineSearchScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Find Medicine</Text>
          <Text style={styles.headerSub}>Check availability near you</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={THEME.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicine (e.g. Panadol)"
              placeholderTextColor={THEME.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity>
              <Ionicons name="mic-outline" size={20} color={THEME.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.suggestionSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
            {["Panadol", "Paracetamol", "Vitamin C", "Amoxicillin"].map((pill) => (
              <TouchableOpacity key={pill} style={styles.pill} onPress={() => setSearch(pill)}>
                <Text style={styles.pillText}>{pill}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.medName}>Panadol 500mg</Text>
            <View style={styles.stockBadge}>
              <View style={[styles.dot, { backgroundColor: THEME.success }]} />
              <Text style={styles.stockText}>In Stock</Text>
            </View>
          </View>
          <Text style={styles.medCategory}>Pain Reliever • Tablet</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Avg. Price Range</Text>
            <Text style={styles.priceValue}>Rs. 120 — Rs. 180</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Nearby Pharmacies</Text>

        <PharmacyCard name="Lanka Pharmacy" distance="1.2 km" status="In Stock" color={THEME.success} />
        <PharmacyCard name="MediHelp Wellness" distance="2.4 km" status="Low Stock" color={THEME.warning} />
        <PharmacyCard name="City Care Pharma" distance="3.1 km" status="Out of Stock" color={THEME.danger} />

        <TouchableOpacity style={styles.aiCard}>
          <View style={styles.aiIconBox}>
            <MaterialCommunityIcons name="robot-outline" size={24} color={THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>Smart Alternative</Text>
            <Text style={styles.aiDesc}>
              Paracetamol 500mg is a generic alternative with high availability.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.primary} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const PharmacyCard = ({ name, distance, status, color }: any) => (
  <View style={styles.pharmacyCard}>
    <View style={styles.pharmaLeft}>
      <View style={styles.pharmaIcon}>
        <MaterialCommunityIcons name="store-marker-outline" size={24} color={THEME.textSecondary} />
      </View>
      <View>
        <Text style={styles.pharmaName}>{name}</Text>
        <View style={styles.pharmaMeta}>
          <Text style={styles.metaText}>{distance} away</Text>
          <View style={styles.metaDivider} />
          <Text style={[styles.metaText, { color, fontWeight: "700" }]}>{status}</Text>
        </View>
      </View>
    </View>
    <TouchableOpacity style={styles.navBtn}>
      <Ionicons name="navigate-circle" size={32} color={THEME.primary} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  scrollContent: { padding: 20 },
  searchContainer: { marginBottom: 15 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 30,
    paddingHorizontal: 20,
    height: 56,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: THEME.textPrimary },
  suggestionSection: { marginBottom: 25 },
  pillScroll: { gap: 10 },
  pill: { backgroundColor: THEME.softBlue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25 },
  pillText: { color: THEME.primary, fontWeight: "700", fontSize: 14 },
  summaryCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  medName: { fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 11, fontWeight: "800", color: THEME.success },
  medCategory: { fontSize: 14, color: THEME.textSecondary, marginTop: 4 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: THEME.background,
  },
  priceLabel: { fontSize: 13, color: THEME.textSecondary, fontWeight: "600" },
  priceValue: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 15,
  },
  pharmacyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  pharmaLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  pharmaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  pharmaName: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  pharmaMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  metaText: { fontSize: 12, color: THEME.textSecondary },
  metaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: THEME.border, marginHorizontal: 8 },
  navBtn: { padding: 4 },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softBlue,
    padding: 16,
    borderRadius: 20,
    marginTop: 15,
    gap: 15,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.1)",
  },
  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  aiTitle: { fontSize: 15, fontWeight: "800", color: THEME.primary },
  aiDesc: { fontSize: 12, color: THEME.textSecondary, marginTop: 2, lineHeight: 18 },
});
