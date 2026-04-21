import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit"; // Ensure this is installed
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2BB673", // Pharmacy Green
  secondary: "#4A90E2", // Medical Blue
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardRadius: 20,
};

export default function PharmacyDashboard() {
  const navigation = useNavigation<any>();
  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="menu-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
          <View style={styles.centerGroup}>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.dateText}>{todayLabel}</Text>
          </View>
          <View style={styles.rightGroup}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color={THEME.textPrimary} />
              <View style={styles.dot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("PharmacySettings")}
            >
              <Ionicons name="settings-outline" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 2. Summary Cards (2x2 Grid) */}
        <View style={styles.grid}>
          <StatCard icon="cash-outline" value="LKR 45k" label="Today Sales" trend="+12%" color={THEME.primary} />
          <StatCard icon="receipt-outline" value="128" label="Prescriptions" trend="+5" color={THEME.secondary} />
          <StatCard icon="cube-outline" value="12" label="Low Stock" color={THEME.warning} />
          <StatCard icon="calendar-outline" value="08" label="Expiring" color={THEME.danger} />
        </View>

        {/* 3. Sales Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Sales Overview</Text>
            <View style={styles.filterRow}>
               <Text style={[styles.filterText, styles.activeFilter]}>7D</Text>
               <Text style={styles.filterText}>30D</Text>
            </View>
          </View>
          <LineChart
            data={{
              labels: ["M", "T", "W", "T", "F", "S", "S"],
              datasets: [{ data: [20, 45, 28, 80, 99, 43, 50] }]
            }}
            width={width - 72}
            height={160}
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        </View>

        {/* 4. Alert Section */}
        <Text style={styles.sectionLabel}>Alerts</Text>
        <View style={styles.alertCard}>
          <Ionicons name="alert-circle" size={20} color={THEME.warning} />
          <Text style={styles.alertText}>Amoxicillin 250mg is below 10 units</Text>
        </View>

        {/* 5. Quick Actions */}
        <View style={styles.sectionLabelRow}>
          <Ionicons name="cube-outline" size={16} color={THEME.textSecondary} />
          <Text style={styles.sectionLabelText}>Quick Actions</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionScroll}>
          <ActionBtn icon="qr-code-outline" label="Scan QR" color={THEME.primary} />
          <ActionBtn icon="add-outline" label="Add Med" color={THEME.secondary} />
          <ActionBtn icon="list-outline" label="Inventory" color={THEME.textSecondary} />
        </ScrollView>

        {/* 6. Recent Activity */}
        <View style={styles.sectionLabelRow}>
          <Ionicons name="clipboard-outline" size={16} color={THEME.textSecondary} />
          <Text style={styles.sectionLabelText}>Recent Activity</Text>
        </View>
        <View style={styles.activityList}>
          <ActivityItem title="Patient John" sub="Prescription Dispensed" time="10:30 AM" icon="checkmark-circle" color={THEME.primary} />
          <ActivityItem title="Paracetamol" sub="Stock Updated (+50)" time="09:15 AM" icon="sync-outline" color={THEME.secondary} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Helper Components ---

const StatCard = ({ icon, value, label, trend, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconBg, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {trend && <Text style={[styles.trendText, { color: THEME.primary }]}>{trend}</Text>}
  </View>
);

const ActionBtn = ({ icon, label, color }: any) => (
  <TouchableOpacity style={styles.actionBtn}>
    <View style={[styles.actionIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={22} color={THEME.white} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const ActivityItem = ({ title, sub, time, icon, color }: any) => (
  <View style={styles.activityItem}>
    <Ionicons name={icon} size={24} color={color} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activitySub}>{sub}</Text>
    </View>
    <Text style={styles.activityTime}>{time}</Text>
  </View>
);

const chartConfig = {
  backgroundGradientFrom: "#FFF",
  backgroundGradientTo: "#FFF",
  color: (opacity = 1) => `rgba(43, 182, 115, ${opacity})`,
  strokeWidth: 3,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  propsForDots: { r: "4", strokeWidth: "2", stroke: "#2BB673" }
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingTop: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: THEME.white, justifyContent: "center", alignItems: "center" },
  centerGroup: { flex: 1, alignItems: "flex-start", marginLeft: 12 },
  rightGroup: { flexDirection: "row", gap: 10 },
  greeting: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  dateText: { marginTop: 2, fontSize: 12, color: THEME.textSecondary, fontWeight: "600" },
  dot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.danger, borderWidth: 2, borderColor: THEME.white },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: (width - 44) / 2, backgroundColor: THEME.white, padding: 16, borderRadius: THEME.cardRadius, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  iconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary },
  statLabel: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  trendText: { fontSize: 10, fontWeight: '700', marginTop: 4 },

  chartCard: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, padding: 20, marginBottom: 24 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  filterRow: { flexDirection: 'row', gap: 12 },
  filterText: { fontSize: 12, fontWeight: '700', color: THEME.textSecondary },
  activeFilter: { color: THEME.primary },
  chartStyle: { marginLeft: -16, marginTop: 10 },

  sectionLabel: { fontSize: 14, fontWeight: '800', color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionLabelText: { fontSize: 14, fontWeight: '800', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF7E6', padding: 16, borderRadius: 16, marginBottom: 24 },
  alertText: { fontSize: 13, fontWeight: '600', color: THEME.warning },

  actionScroll: { marginBottom: 24 },
  actionBtn: { alignItems: 'center', marginRight: 20 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '700', color: THEME.textPrimary },

  activityList: { backgroundColor: THEME.white, borderRadius: THEME.cardRadius, padding: 16 },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.background },
  activityTitle: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary },
  activitySub: { fontSize: 12, color: THEME.textSecondary },
  activityTime: { fontSize: 11, color: THEME.textSecondary, fontWeight: '600' },
});
