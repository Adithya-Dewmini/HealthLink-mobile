import React, { useEffect, useMemo, useState } from "react";
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
import { apiFetch } from "../../config/api";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  softBlue: "#E1EEF9",
  softGreen: "#E1F1E7",
  softRed: "#FEE2E2",
  softPurple: "#F3E5F5",
  accentBlue: "#2196F3",
  accentGreen: "#4CAF50",
  accentRed: "#FF5252",
  accentPurple: "#9C27B0",
};

const formatDosageSchedule = (frequency: any) => {
  if (!frequency) return "—";

  const toLabels = (schedule: any) => {
    if (!schedule || typeof schedule !== "object") return null;
    const labels: string[] = [];
    if (schedule.morning) labels.push("Morning");
    if (schedule.afternoon) labels.push("Afternoon");
    if (schedule.night) labels.push("Night");
    return labels.length > 0 ? labels : null;
  };

  if (Array.isArray(frequency)) {
    return frequency.length ? frequency.join(" • ") : "—";
  }

  if (typeof frequency === "string") {
    const trimmed = frequency.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        const labels = toLabels(parsed);
        if (labels) return labels.join(" • ");
      } catch {
        // fall through to return raw string
      }
    }
    return trimmed || "—";
  }

  const labels = toLabels(frequency);
  if (labels) return labels.join(" • ");

  return "—";
};

const formatDoseDisplay = (dose: any) => {
  if (!dose) return "";

  const toLabels = (schedule: any) => {
    if (!schedule || typeof schedule !== "object") return null;
    const labels: string[] = [];
    if (schedule.morning) labels.push("Morning");
    if (schedule.afternoon) labels.push("Afternoon");
    if (schedule.night) labels.push("Night");
    return labels.length > 0 ? labels : null;
  };

  if (typeof dose === "string") {
    const trimmed = dose.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        const labels = toLabels(parsed);
        if (labels) return labels.join(" • ");
      } catch {
        // fall through to return raw string
      }
    }
    return trimmed;
  }

  if (typeof dose === "object") {
    const labels = toLabels(dose);
    if (labels) return labels.join(" • ");
  }

  return String(dose);
};

export default function Prescriptions() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch("/api/patients/prescriptions");
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load prescriptions");
        }
        const data = await res.json();
        setPrescriptions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || "Failed to load prescriptions");
      } finally {
        setLoading(false);
      }
    };
    void fetchPrescriptions();
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === "active") {
      return prescriptions.filter((p) => p.status === "Active");
    }
    return prescriptions.filter((p) => p.status !== "Active");
  }, [activeTab, prescriptions]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={THEME.textDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Prescriptions</Text>
            <Text style={styles.headerSub}>Digital medical records</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={22} color={THEME.textDark} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "active" && styles.tabItemActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.tabTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "past" && styles.tabItemActive]}
          onPress={() => setActiveTab("past")}
        >
          <Text style={[styles.tabText, activeTab === "past" && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Prescription Cards */}
        {filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("PrescriptionDetails" as never, { id: item.id } as never)}
          >
            {/* Top Row: Doctor Info & Status */}
            <View style={styles.rowBetween}>
              <View style={styles.docInfo}>
                <View style={[styles.docIcon, { backgroundColor: THEME.softBlue }]}>
                  <Ionicons name="document-text" size={22} color={THEME.accentBlue} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.docName}>{item.doctor?.name ?? "Doctor"}</Text>
                  <Text style={styles.docSpec}>{item.doctor?.specialization || "General"}</Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: item.status === "Active" ? THEME.softGreen : THEME.background }
              ]}>
                <Text style={[
                  styles.statusText, 
                  { color: item.status === "Active" ? THEME.accentGreen : THEME.textGray }
                ]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.dateLabel}>
              Prescribed on {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : "Recently"}
            </Text>

            <View style={styles.divider} />

            {/* Meds List */}
            <Text style={styles.medHeading}>Medications</Text>
            {(item.medicines || []).map((med: any, idx: number) => (
              <View key={idx} style={styles.medRow}>
                <View style={styles.medBullet} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>
                    {med.name || "—"}{" "}
                    <Text style={styles.medDose}>{formatDoseDisplay(med.dosage)}</Text>
                  </Text>
                  <View style={styles.chipRow}>
                    <View style={styles.pillChip}>
                      <Ionicons name="repeat" size={12} color={THEME.accentPurple} />
                      <Text style={styles.pillText}>{formatDosageSchedule(med.frequency)}</Text>
                    </View>
                    <View style={[styles.pillChip, { backgroundColor: THEME.softBlue }]}>
                      <Ionicons name="calendar-outline" size={12} color={THEME.accentBlue} />
                      <Text style={styles.pillText}>{med.duration || "—"}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            {(!item.medicines || item.medicines.length === 0) && (
              <Text style={styles.emptyText}>No medicines prescribed.</Text>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => navigation.navigate("MedicineTracker" as never)}
              >
                <Ionicons name="pulse-outline" size={18} color={THEME.white} />
                <Text style={styles.downloadText}>Track Prescription</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => navigation.navigate("PrescriptionDetails" as never, { id: item.id } as never)}
              >
                <Text style={styles.viewBtnText}>View pharmacy QR</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading</Text>
            <Text style={styles.emptyText}>Fetching prescriptions...</Text>
          </View>
        )}
        {!loading && error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Error</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        )}
        {!loading && !error && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No prescriptions</Text>
            <Text style={styles.emptyText}>There are no {activeTab} prescriptions yet.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  container: { padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: THEME.textDark },
  headerSub: { fontSize: 14, color: THEME.textGray, marginTop: 2 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME.background, justifyContent: 'center', alignItems: 'center' },
  tabRow: {
    flexDirection: "row",
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F7",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 3, borderBottomColor: THEME.accentBlue },
  tabText: { fontSize: 13, fontWeight: "700", color: THEME.textGray },
  tabTextActive: { color: THEME.accentBlue },

  card: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docInfo: { flexDirection: 'row', alignItems: 'center' },
  docIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  docName: { fontSize: 16, fontWeight: 'bold', color: THEME.textDark },
  docSpec: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  
  dateLabel: { fontSize: 12, color: THEME.textGray, marginTop: 15, marginLeft: 5 },
  divider: { height: 1, backgroundColor: '#F0F3F7', marginVertical: 15 },
  
  medHeading: { fontSize: 13, fontWeight: 'bold', color: THEME.textGray, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  medRow: { flexDirection: 'row', marginBottom: 16 },
  medBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.accentBlue, marginTop: 8, marginRight: 12 },
  medName: { fontSize: 15, fontWeight: 'bold', color: THEME.textDark },
  medDose: { fontWeight: 'normal', color: THEME.textGray, fontSize: 14 },
  
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pillChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: THEME.softPurple, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8,
    gap: 4
  },
  pillText: { fontSize: 11, fontWeight: 'bold', color: THEME.textDark },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  downloadBtn: { 
    flex: 1.2, 
    backgroundColor: THEME.textDark, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 48, 
    borderRadius: 14,
    gap: 8
  },
  downloadText: { color: THEME.white, fontWeight: 'bold', fontSize: 13 },
  viewBtn: { 
    flex: 1, 
    borderWidth: 1.5, 
    borderColor: THEME.background, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 14 
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: THEME.textDark },
  emptyState: {
    backgroundColor: THEME.white,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EDF1F7",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: THEME.textDark },
  emptyText: { fontSize: 13, color: THEME.textGray, marginTop: 6, textAlign: "center" },
});
