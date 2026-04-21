import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2BB673",
  secondary: "#4A90E2",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textMuted: "#6B7280",
  pending: "#F59E0B",
  completed: "#2BB673",
  cancelled: "#EF4444",
  border: "#E0E6ED",
  cardRadius: 18,
};

export default function PrescriptionTrackingScreen() {
  const [activeTab, setActiveTab] = useState("Pending");
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Prescriptions</Text>
          <Text style={styles.headerSub}>Track and manage all prescriptions</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="calendar-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={THEME.textMuted} />
          <TextInput
            placeholder="Search patient or token"
            style={styles.searchInput}
            placeholderTextColor={THEME.textMuted}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {["Pending", "Completed", "Cancelled"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <PrescriptionCard
          name="Rajesh Kumar"
          status="Pending"
          age="45"
          gender="Male"
          doctor="Dr. Ananya Sharma"
          token="#0042"
          date="12 Apr 2026"
          actionLabel="Continue Dispense"
        />
        <PrescriptionCard
          name="Saman Perera"
          status="Completed"
          age="32"
          gender="Male"
          doctor="Dr. Silva"
          token="#0038"
          date="11 Apr 2026"
          actionLabel="View Bill"
        />
        <PrescriptionCard
          name="Niluni Fernando"
          status="Cancelled"
          age="28"
          gender="Female"
          doctor="Dr. Adithya"
          token="#0031"
          date="10 Apr 2026"
          actionLabel="View Details"
        />
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="qr-code-outline" size={24} color={THEME.white} />
        <Text style={styles.fabText}>Scan</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const PrescriptionCard = ({ name, status, age, gender, doctor, token, date, actionLabel }: any) => {
  const statusColor = String(THEME[status.toLowerCase() as keyof typeof THEME] || THEME.textMuted);
  const statusTint = `${statusColor}15`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.patientName}>{name}</Text>
          <Text style={styles.patientDetails}>{age} Yrs • {gender}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusTint }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color={THEME.textMuted} />
          <Text style={styles.infoText}>{doctor}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="receipt-outline" size={14} color={THEME.textMuted} />
          <Text style={styles.infoText}>Token: {token} • {date}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryAction,
            {
              backgroundColor: status === "Pending" ? THEME.primary : THEME.white,
              borderWidth: status === "Pending" ? 0 : 1,
              borderColor: THEME.border,
            },
          ]}
        >
          <Text
            style={[
              styles.primaryActionText,
              { color: status === "Pending" ? THEME.white : THEME.textPrimary },
            ]}
          >
            {actionLabel}
          </Text>
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

  searchRow: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 15, gap: 12 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: THEME.white, borderRadius: 14, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: THEME.border },
  searchInput: { marginLeft: 10, fontSize: 15, color: THEME.textPrimary, flex: 1 },
  filterBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: THEME.white, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: THEME.border },

  tabContainer: { flexDirection: "row", paddingHorizontal: 20, backgroundColor: THEME.background, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tab: { marginRight: 25, paddingVertical: 15, borderBottomWidth: 3, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: THEME.primary },
  tabText: { fontSize: 14, fontWeight: "700", color: THEME.textMuted },
  activeTabText: { color: THEME.primary },

  listContent: { padding: 20, paddingBottom: 120 },
  card: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, padding: 18, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  patientName: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  patientDetails: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "800" },

  cardBody: { marginTop: 15, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13, color: THEME.textMuted, fontWeight: "500" },
  cardDivider: { height: 1, backgroundColor: THEME.background, marginVertical: 15 },

  cardFooter: { flexDirection: "row", gap: 10 },
  secondaryAction: { flex: 1, height: 44, borderRadius: 12, backgroundColor: THEME.background, justifyContent: "center", alignItems: "center" },
  secondaryActionText: { fontSize: 14, fontWeight: "700", color: THEME.textPrimary },
  primaryAction: { flex: 2, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  primaryActionText: { fontSize: 14, fontWeight: "700" },

  fab: { position: "absolute", bottom: 30, right: 20, backgroundColor: THEME.textPrimary, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, height: 56, borderRadius: 28, gap: 8, elevation: 5 },
  fabText: { color: THEME.white, fontWeight: "800", fontSize: 16 },
});
