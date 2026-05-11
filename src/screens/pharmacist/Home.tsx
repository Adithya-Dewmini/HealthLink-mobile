import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import { PharmacyGlassCard, PHARMACY_PANEL_THEME, PharmacyPanelHeader } from "../../components/pharmacist/PharmacyPanelUI";
import { getPharmacyAnalyticsDashboard, type PharmacyAnalyticsDashboard } from "../../services/pharmacyAnalyticsService";

const formatMoney = (value: number) => `LKR ${Math.round(value).toLocaleString("en-LK")}`;

const riskTone = {
  low: {
    shell: "rgba(52, 211, 153, 0.12)",
    border: "rgba(52, 211, 153, 0.24)",
    text: "#6EE7B7",
  },
  medium: {
    shell: "rgba(251, 146, 60, 0.12)",
    border: "rgba(251, 146, 60, 0.24)",
    text: "#FDBA74",
  },
  high: {
    shell: "rgba(251, 113, 133, 0.12)",
    border: "rgba(251, 113, 133, 0.24)",
    text: "#FDA4AF",
  },
} as const;

export default function PharmacyDashboard() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [dashboard, setDashboard] = useState<PharmacyAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const data = await getPharmacyAnalyticsDashboard();
      setDashboard(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
      return undefined;
    }, [loadDashboard])
  );

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const chartLabels = useMemo(
    () =>
      dashboard?.orderTrends.slice(-7).map((item) =>
        new Date(item.date).toLocaleDateString("en-US", { weekday: "narrow" })
      ) ?? ["M", "T", "W", "T", "F", "S", "S"],
    [dashboard?.orderTrends]
  );

  const chartValues = useMemo(
    () => dashboard?.orderTrends.slice(-7).map((item) => item.revenue || item.orderCount) ?? [0, 0, 0, 0, 0, 0, 0],
    [dashboard?.orderTrends]
  );

  const forecastSpotlight = dashboard?.forecastHighlights[0] ?? null;
  const lowStockSpotlight = dashboard?.lowStockMedicines[0] ?? null;
  const topMedicine = dashboard?.topMedicines[0] ?? null;
  const chartWidth = Math.max(width - 72, 220);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PHARMACY_PANEL_THEME.cyan} />
          <Text style={styles.loadingText}>Loading pharmacy command center</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard("refresh")} tintColor="#67E8F9" />}
      >
        <PharmacyPanelHeader
          eyebrow="HealthLink Pharmacy"
          title="Dashboard"
          subtitle="Monitor fulfillment pace, revenue, forecast pressure, and inventory risk from one cleaner control surface."
          right={
            <View style={styles.headerActionColumn}>
              <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.navigate("PharmacySettings")}>
                <Ionicons name="settings-outline" size={18} color={PHARMACY_PANEL_THEME.white} />
              </TouchableOpacity>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>{todayLabel}</Text>
              </View>
            </View>
          }
          footer={
            <View style={styles.headerStatsRow}>
              <HeaderPill icon="pulse-outline" label={`${dashboard?.overview.pendingOrders ?? 0} live orders`} />
              <HeaderPill icon="shield-checkmark-outline" label={`${dashboard?.overview.fulfillmentSuccessRate ?? 0}% success`} />
              <HeaderPill icon="warning-outline" label={`${dashboard?.lowStockMedicines.length ?? 0} stock alerts`} />
            </View>
          }
        />

        <View style={styles.metricGrid}>
          <MetricCard
            icon="cash-outline"
            tone="sky"
            label="Revenue Closed"
            value={formatMoney(dashboard?.overview.totalRevenue ?? 0)}
            detail={`${dashboard?.overview.completedOrders ?? 0} completed orders`}
          />
          <MetricCard
            icon="receipt-outline"
            tone="violet"
            label="Active Queue"
            value={String(dashboard?.overview.pendingOrders ?? 0)}
            detail={`${dashboard?.overview.totalOrders ?? 0} total orders`}
          />
          <MetricCard
            icon="flask-outline"
            tone="emerald"
            label="Prescription Volume"
            value={String(dashboard?.overview.prescriptionVolume ?? 0)}
            detail={`${dashboard?.overview.cancellationRate ?? 0}% cancellation rate`}
          />
          <MetricCard
            icon="alert-circle-outline"
            tone="amber"
            label="Low Stock Risk"
            value={String(dashboard?.lowStockMedicines.length ?? 0)}
            detail="Lines that need attention soon"
          />
        </View>

        <PharmacyGlassCard style={styles.chartCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Revenue Momentum</Text>
              <Text style={styles.sectionTitle}>7-day operating trend</Text>
            </View>
            <View style={styles.rangeChip}>
              <Text style={styles.rangeChipText}>7D</Text>
            </View>
          </View>
          <LineChart
            data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
            width={chartWidth}
            height={180}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLabels={false}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </PharmacyGlassCard>

        <View style={styles.dualColumnSection}>
          <PharmacyGlassCard style={styles.primaryColumn}>
            <Text style={styles.sectionEyebrow}>Fulfillment Shortcuts</Text>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.actionList}>
              <ActionCard
                icon="qr-code-outline"
                title="Scan Prescription"
                detail="Open the scanner and pull medicine lines faster."
                onPress={() => navigation.navigate("PharmacyScanner")}
              />
              <ActionCard
                icon="add-outline"
                title="Add Medicine"
                detail="Create a new inventory line or update available stock."
                onPress={() => navigation.navigate("PharmacyAddMedicine")}
              />
              <ActionCard
                icon="receipt-outline"
                title="Review Orders"
                detail="Jump into pickup and delivery handoff queues."
                onPress={() => navigation.navigate("PharmacyReports")}
              />
            </View>
          </PharmacyGlassCard>

          <View style={styles.secondaryColumn}>
            <PharmacyGlassCard style={styles.signalCard}>
              <Text style={styles.sectionEyebrow}>Forecast Watch</Text>
              <Text style={styles.signalTitle}>
                {forecastSpotlight ? forecastSpotlight.name : "No forecast pressure right now"}
              </Text>
              <Text style={styles.signalBody}>
                {forecastSpotlight
                  ? `Predicted demand ${forecastSpotlight.predictedDemand}. Reorder ${forecastSpotlight.recommendedReorderQuantity} units before the queue tightens.`
                  : "Demand signals will appear here when the analytics model flags upcoming pressure."}
              </Text>
              {forecastSpotlight ? (
                <View
                  style={[
                    styles.riskBadge,
                    {
                      backgroundColor: riskTone[forecastSpotlight.shortageRisk].shell,
                      borderColor: riskTone[forecastSpotlight.shortageRisk].border,
                    },
                  ]}
                >
                  <Text style={[styles.riskBadgeText, { color: riskTone[forecastSpotlight.shortageRisk].text }]}>
                    {forecastSpotlight.shortageRisk} risk
                  </Text>
                </View>
              ) : null}
            </PharmacyGlassCard>

            <PharmacyGlassCard style={styles.signalCard}>
              <Text style={styles.sectionEyebrow}>Inventory Signal</Text>
              <Text style={styles.signalTitle}>
                {lowStockSpotlight ? lowStockSpotlight.name : "Inventory looks stable"}
              </Text>
              <Text style={styles.signalBody}>
                {lowStockSpotlight
                  ? `${lowStockSpotlight.availableStock} units available after reservations. Replenish before this affects storefront availability.`
                  : "No urgent stock issues were detected in the current feed."}
              </Text>
            </PharmacyGlassCard>
          </View>
        </View>

        <PharmacyGlassCard>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Performance Snapshot</Text>
              <Text style={styles.sectionTitle}>Top medicine today</Text>
            </View>
            {topMedicine ? (
              <View style={styles.topPerformerBadge}>
                <Ionicons name="trending-up-outline" size={14} color={PHARMACY_PANEL_THEME.cyan} />
                <Text style={styles.topPerformerText}>Lead seller</Text>
              </View>
            ) : null}
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.performanceRow}>
            <View style={styles.performanceMetric}>
              <Text style={styles.performanceValue}>{topMedicine?.name ?? "Waiting for completed orders"}</Text>
              <Text style={styles.performanceLabel}>
                {topMedicine ? `${topMedicine.quantitySold} units sold` : "Sales data will populate here"}
              </Text>
            </View>
            <View style={styles.performanceMetricRight}>
              <Text style={styles.performanceValue}>{topMedicine ? formatMoney(topMedicine.revenue) : "LKR 0"}</Text>
              <Text style={styles.performanceLabel}>Revenue contribution</Text>
            </View>
          </View>
        </PharmacyGlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.headerPill}>
      <Ionicons name={icon} size={14} color="#B6E6FF" />
      <Text style={styles.headerPillText}>{label}</Text>
    </View>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: "sky" | "violet" | "emerald" | "amber";
  value: string;
}) {
  const tones = {
    sky: {
      shell: "rgba(56, 189, 248, 0.13)",
      border: "rgba(103, 232, 249, 0.16)",
      icon: "#7DD3FC",
      iconShell: "rgba(56, 189, 248, 0.14)",
    },
    violet: {
      shell: "rgba(96, 165, 250, 0.12)",
      border: "rgba(96, 165, 250, 0.16)",
      icon: "#93C5FD",
      iconShell: "rgba(96, 165, 250, 0.14)",
    },
    emerald: {
      shell: "rgba(52, 211, 153, 0.12)",
      border: "rgba(52, 211, 153, 0.16)",
      icon: "#86EFAC",
      iconShell: "rgba(52, 211, 153, 0.14)",
    },
    amber: {
      shell: "rgba(251, 146, 60, 0.12)",
      border: "rgba(251, 146, 60, 0.16)",
      icon: "#FDBA74",
      iconShell: "rgba(251, 146, 60, 0.14)",
    },
  } as const;

  const palette = tones[tone];

  return (
    <View style={[styles.metricCard, { backgroundColor: palette.shell, borderColor: palette.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: palette.iconShell }]}>
        <Ionicons name={icon} size={18} color={palette.icon} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function ActionCard({
  detail,
  icon,
  onPress,
  title,
}: {
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.actionCardLeft}>
        <View style={styles.actionIconWrap}>
          <Ionicons name={icon} size={18} color={PHARMACY_PANEL_THEME.white} />
        </View>
        <View style={styles.actionCardText}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDetail}>{detail}</Text>
        </View>
      </View>
      <Ionicons name="arrow-forward" size={18} color={PHARMACY_PANEL_THEME.cyan} />
    </TouchableOpacity>
  );
}

const chartConfig = {
  backgroundGradientFrom: "transparent",
  backgroundGradientTo: "transparent",
  color: (opacity = 1) => `rgba(103, 232, 249, ${opacity})`,
  labelColor: () => "#94A3B8",
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#67E8F9",
    fill: "#0F172A",
  },
  propsForBackgroundLines: {
    strokeDasharray: "",
    stroke: "rgba(148, 163, 184, 0.08)",
  },
  decimalPlaces: 0,
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PHARMACY_PANEL_THEME.background,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: PHARMACY_PANEL_THEME.text,
    fontSize: 14,
    fontWeight: "600",
  },
  headerActionColumn: {
    alignItems: "flex-end",
    gap: 10,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  dateBadgeText: {
    color: PHARMACY_PANEL_THEME.text,
    fontSize: 11,
    fontWeight: "700",
  },
  headerStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerPillText: {
    color: "#E0F2FE",
    fontSize: 12,
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48.3%",
    minHeight: 142,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  metricLabel: {
    color: PHARMACY_PANEL_THEME.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 8,
    color: PHARMACY_PANEL_THEME.white,
    fontSize: 22,
    fontWeight: "800",
  },
  metricDetail: {
    marginTop: 6,
    color: "#C7D2E1",
    fontSize: 12,
    lineHeight: 17,
  },
  chartCard: {
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionEyebrow: {
    color: "#8AA4C1",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    marginTop: 6,
    color: PHARMACY_PANEL_THEME.white,
    fontSize: 22,
    fontWeight: "800",
  },
  rangeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: PHARMACY_PANEL_THEME.border,
  },
  rangeChipText: {
    color: PHARMACY_PANEL_THEME.cyan,
    fontSize: 12,
    fontWeight: "800",
  },
  chart: {
    marginTop: 18,
    marginLeft: -20,
    borderRadius: 18,
  },
  dualColumnSection: {
    gap: 12,
  },
  primaryColumn: {
    gap: 14,
  },
  secondaryColumn: {
    gap: 12,
  },
  actionList: {
    marginTop: 12,
    gap: 12,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionCardLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56, 189, 248, 0.2)",
  },
  actionCardText: {
    flex: 1,
  },
  actionTitle: {
    color: PHARMACY_PANEL_THEME.white,
    fontSize: 16,
    fontWeight: "700",
  },
  actionDetail: {
    marginTop: 4,
    color: "#AFC1D5",
    fontSize: 12,
    lineHeight: 17,
  },
  signalCard: {
    minHeight: 150,
  },
  signalTitle: {
    marginTop: 10,
    color: PHARMACY_PANEL_THEME.white,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  signalBody: {
    marginTop: 8,
    color: "#B8C6D8",
    fontSize: 13,
    lineHeight: 20,
  },
  riskBadge: {
    alignSelf: "flex-start",
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  topPerformerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: PHARMACY_PANEL_THEME.border,
  },
  topPerformerText: {
    color: PHARMACY_PANEL_THEME.text,
    fontSize: 12,
    fontWeight: "700",
  },
  errorCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(127, 29, 29, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.22)",
  },
  errorText: {
    flex: 1,
    color: "#FECACA",
    fontSize: 13,
    lineHeight: 18,
  },
  performanceRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  performanceMetric: {
    flex: 1,
  },
  performanceMetricRight: {
    alignItems: "flex-end",
  },
  performanceValue: {
    color: PHARMACY_PANEL_THEME.white,
    fontSize: 18,
    fontWeight: "800",
  },
  performanceLabel: {
    marginTop: 6,
    color: "#AFC1D5",
    fontSize: 12,
  },
});
