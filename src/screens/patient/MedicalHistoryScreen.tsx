import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import {
  fetchPatientMedicalHistory,
  type PatientMedicalHistoryItem,
} from "../../services/patientMedicalHistoryService";
import {
  PatientEmptyState,
  PatientErrorState,
  PatientLoadingState,
} from "../../components/patient/PatientFeedback";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";

const THEME = {
  ...patientTheme.colors,
  primary: "#0F172A", // Futuristic Deep Navy
  accent: "#38BDF8",  // Futuristic Cyan
  bg: "#F8FAFC",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function PatientMedicalHistory() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const [items, setItems] = useState<PatientMedicalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setItems(await fetchPatientMedicalHistory());
    } catch (err) {
      console.log("Patient medical history load error:", err);
      setItems([]);
      setError(err instanceof Error ? err.message : "Failed to load medical history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const stats = useMemo(() => {
    const prescriptionCount = items.filter((item) => item.prescription_id).length;
    const centers = new Set(items.map((item) => item.medical_center_name).filter(Boolean));
    return {
      visits: items.length,
      prescriptions: prescriptionCount,
      centers: centers.size,
    };
  }, [items]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Immersive Futuristic Header Background */}
      <LinearGradient
        colors={[THEME.primary, "#1E293B"]}
        style={styles.headerBackground}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Navigation Header */}
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Medical History</Text>
            <Text style={styles.headerSub}>Consultations & Prescriptions</Text>
          </View>
        </View>

        {loading ? (
          <PatientLoadingState label="Analyzing medical records..." />
        ) : error ? (
          <PatientErrorState message={error} onRetry={() => void loadHistory()} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadHistory(true)}
                tintColor={THEME.accent}
              />
            }
          >
            {/* 2. Glassmorphism Stats Cards */}
            {items.length > 0 && (
              <View style={styles.statsGrid}>
                <StatCard value={String(stats.visits)} label="Visits" icon="calendar" />
                <StatCard value={String(stats.prescriptions)} label="Rx" icon="medkit" />
                <StatCard value={String(stats.centers)} label="Centers" icon="business" />
              </View>
            )}

            {items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <PatientEmptyState
                  icon="folder-open-outline"
                  title="Records Clear"
                  message="Completed consultations will be digitally archived here."
                  actionLabel="Schedule Visit"
                  onAction={() => navigation.navigate("PatientTabs", { screen: "PatientAppointments" })}
                />
              </View>
            ) : (
              items.map((item) => (
                <HistoryCard
                  key={String(item.consultation_id)}
                  item={item}
                  onPrescriptionPress={() => {
                    if (item.prescription_id) {
                      navigation.navigate("PrescriptionDetails", { id: String(item.prescription_id) });
                    }
                  }}
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: any }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={["rgba(255,255,255,0.9)", "rgba(240,249,255,0.9)"]}
        style={styles.statInner}
      >
        <View style={styles.statIconWrap}>
          <Ionicons name={icon} size={14} color={THEME.accent} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

function HistoryCard({
  item,
  onPrescriptionPress,
}: {
  item: PatientMedicalHistoryItem;
  onPrescriptionPress: () => void;
}) {
  const medicines = item.medicines ?? [];

  return (
    <View style={styles.modernCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <LinearGradient colors={[THEME.accent, "#0284C7"]} style={styles.mainIconGrad}>
            <MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color="white" />
          </LinearGradient>
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={styles.diagnosisText}>{item.diagnosis || "Medical Consultation"}</Text>
          <Text style={styles.doctorText}>Dr. {item.doctor_name}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>VERIFIED</Text>
        </View>
      </View>

      <View style={styles.cardInfoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={12} color={THEME.textSecondary} />
          <Text style={styles.infoText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={12} color={THEME.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>{item.medical_center_name}</Text>
        </View>
      </View>

      {item.notes ? (
        <View style={styles.clinicalNotes}>
          <Text style={styles.clinicalNotesLabel}>Clinical Remarks</Text>
          <Text style={styles.noteBody} numberOfLines={3}>{item.notes}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.medicineCountWrap}>
           <MaterialCommunityIcons name="pill" size={16} color={THEME.accent} />
           <Text style={styles.medicineCountText}>
             {medicines.length} Medication{medicines.length === 1 ? "" : "s"}
           </Text>
        </View>

        {item.prescription_id && (
          <TouchableOpacity style={styles.actionBtn} onPress={onPrescriptionPress}>
            <Text style={styles.actionBtnText}>Report</Text>
            <Ionicons name="arrow-forward" size={14} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Add Material Icon support if not present in project, else fallback to Ionicon
const MaterialCommunityIcons = require("@expo/vector-icons").MaterialCommunityIcons;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerBackground: {
    position: 'absolute',
    top: 0, width: '100%', height: 220,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  safe: { flex: 1 },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  glassBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTextWrap: { marginLeft: 15 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 25, paddingTop: 10, paddingBottom: 40 },
  
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 25 },
  statCard: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  statInner: {
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconWrap: { 
    width: 24, height: 24, borderRadius: 8, 
    backgroundColor: "rgba(56,189,248,0.1)", 
    alignItems: 'center', justifyContent: 'center', marginBottom: 6
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  statLabel: { fontSize: 12, fontWeight: "700", color: "#64748B" },

  modernCard: {
    backgroundColor: "white",
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  iconContainer: { marginRight: 15 },
  mainIconGrad: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitleArea: { flex: 1 },
  diagnosisText: { fontSize: 17, fontWeight: "800", color: "#1E293B" },
  doctorText: { fontSize: 14, color: "#64748B", marginTop: 2, fontWeight: '600' },
  statusBadge: {
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BAE6FD"
  },
  statusText: { fontSize: 10, fontWeight: "800", color: "#0077B6" },

  cardInfoRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 15,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  infoText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  infoDivider: { width: 1, height: 12, backgroundColor: "#E2E8F0", marginHorizontal: 10 },

  clinicalNotes: {
    backgroundColor: "white",
    borderLeftWidth: 3,
    borderLeftColor: "#38BDF8",
    paddingLeft: 12,
    marginBottom: 20,
  },
  clinicalNotesLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "800", textTransform: 'uppercase', marginBottom: 4 },
  noteBody: { fontSize: 13, lineHeight: 20, color: "#475569" },

  cardFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  medicineCountWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  medicineCountText: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  actionBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnText: { color: "white", fontWeight: "800", fontSize: 12 },
  emptyWrap: { marginTop: 40 },
});