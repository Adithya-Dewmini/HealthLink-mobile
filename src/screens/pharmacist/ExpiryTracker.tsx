import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const THEME = {
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textMuted: "#6B7280",
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#2BB673",
  border: "#E0E6ED",
  cardRadius: 20,
};

export default function ExpiryTrackerScreen() {
  const [activeTab, setActiveTab] = useState("Expiring Soon");
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Expiry Tracker</Text>
          <Text style={styles.headerSub}>Monitor expiring medicines</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="filter-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {["All", "Expiring Soon", "Expired"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { borderLeftColor: THEME.warning }]}> 
            <Text style={styles.summaryCount}>12</Text>
            <Text style={styles.summaryLabel}>Expiring Soon</Text>
          </View>
          <View style={[styles.summaryBox, { borderLeftColor: THEME.danger }]}> 
            <Text style={styles.summaryCount}>03</Text>
            <Text style={styles.summaryLabel}>Expired</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Expired</Text>
        <ExpiryCard
          name="Amoxicillin 250mg"
          date="10 Apr 2026"
          statusText="Expired 2 days ago"
          urgency="danger"
          actions={["Remove", "Return"]}
        />

        <Text style={styles.sectionLabel}>Expiring Soon</Text>
        <ExpiryCard
          name="Paracetamol 500mg"
          date="17 Apr 2026"
          statusText="Expires in 5 days"
          urgency="warning"
          actions={["Discount", "Restock"]}
        />
        <ExpiryCard
          name="Cetirizine Syrup"
          date="25 Apr 2026"
          statusText="Expires in 13 days"
          urgency="warning"
          actions={["Discount", "Restock"]}
        />

        <Text style={styles.sectionLabel}>Safe</Text>
        <ExpiryCard
          name="Vitamin C 1000mg"
          date="20 Oct 2026"
          statusText="Expires in 6 months"
          urgency="success"
          actions={[]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const ExpiryCard = ({ name, date, statusText, urgency, actions }: any) => {
  const color = THEME[urgency as keyof typeof THEME];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.medName}>{name}</Text>
          <Text style={styles.expiryDate}>Expiry: {date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}> 
          <Text style={[styles.statusText, { color }]}>{statusText}</Text>
        </View>
      </View>

      {actions.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={[styles.actionBtnText, { color: THEME.textPrimary }]}>{actions[0]}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.primaryAction, { backgroundColor: color }]}> 
              <Text style={[styles.actionBtnText, { color: THEME.white }]}>{actions[1]}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: THEME.white, gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },

  tabContainer: { flexDirection: "row", paddingHorizontal: 20, backgroundColor: THEME.white, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tab: { marginRight: 25, paddingVertical: 15, borderBottomWidth: 3, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: THEME.success },
  tabText: { fontSize: 14, fontWeight: "700", color: THEME.textMuted },
  activeTabText: { color: THEME.success },

  scrollContent: { padding: 20, paddingBottom: 120 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 25 },
  summaryBox: { flex: 1, backgroundColor: THEME.white, padding: 16, borderRadius: 16, borderLeftWidth: 4, elevation: 2, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10 },
  summaryCount: { fontSize: 24, fontWeight: "900", color: THEME.textPrimary },
  summaryLabel: { fontSize: 12, fontWeight: "700", color: THEME.textMuted, marginTop: 2 },

  sectionLabel: { fontSize: 13, fontWeight: "800", color: THEME.textMuted, textTransform: "uppercase", marginBottom: 15, marginTop: 10, letterSpacing: 0.5 },

  card: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, padding: 18, marginBottom: 15, elevation: 3, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  medName: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  expiryDate: { fontSize: 13, color: THEME.textMuted, marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "800" },

  divider: { height: 1, backgroundColor: THEME.background, marginVertical: 15 },
  cardActions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: THEME.background },
  primaryAction: { flex: 1.5 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
});
