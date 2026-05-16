import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import {
  PharmacyGlassCard,
  PharmacyMetricCard,
  PharmacyScreenBackground,
  PharmacySectionHeader,
} from "../../components/pharmacist/PharmacyPanelUI";
import { getPharmacyAnalyticsDashboard, type PharmacyAnalyticsDashboard } from "../../services/pharmacyAnalyticsService";
import { pharmacyTheme } from "../../theme/pharmacyTheme";

const PHARMACY_DASHBOARD_HERO_BANNER = require("../../../assets/images/pharmacy_dashboard_hero_banner.png");

const formatMoney = (value: number) => `LKR ${Math.round(value || 0).toLocaleString("en-LK")}`;

const getRiskPalette = (risk: "low" | "medium" | "high") => {
  if (risk === "high") {
    return {
      shell: "#FEE2E2",
      border: "#FECACA",
      text: pharmacyTheme.colors.danger,
    };
  }

  if (risk === "medium") {
    return {
      shell: "#FFF1D6",
      border: "#FFD69B",
      text: pharmacyTheme.colors.orange,
    };
  }

  return {
    shell: "#DCF7EB",
    border: "#B7E8D1",
    text: pharmacyTheme.colors.success,
  };
};

export default function PharmacyDashboard() {
  const navigation = useNavigation<any>();
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

  const trendSeries = useMemo(() => {
    const points = dashboard?.orderTrends.slice(-7) ?? [];
    const revenueTotal = points.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const usesRevenue = revenueTotal > 0;
    const values = points.map((item) => (usesRevenue ? item.revenue || 0 : item.orderCount || 0));
    const labels = points.map((item) =>
      new Date(item.date).toLocaleDateString("en-US", { weekday: "narrow" })
    );

    return {
      labels,
      values,
      metricLabel: usesRevenue ? "Revenue" : "Orders",
      totalLabel: usesRevenue
        ? formatMoney(revenueTotal)
        : `${values.reduce((sum, value) => sum + value, 0)} orders`,
    };
  }, [dashboard?.orderTrends]);

  const liveOrders = dashboard?.overview.pendingOrders ?? 0;
  const successRate = dashboard?.overview.fulfillmentSuccessRate ?? 0;
  const stockAlerts = dashboard?.lowStockMedicines.length ?? 0;
  const forecastSpotlight = dashboard?.forecastHighlights[0] ?? null;
  const lowStockSpotlight = dashboard?.lowStockMedicines[0] ?? null;
  const topMedicine = dashboard?.topMedicines[0] ?? null;
  const extraStockRisks = Math.max(stockAlerts - 1, 0);
  const forecastPalette = getRiskPalette(forecastSpotlight?.shortageRisk ?? "low");

  if (loading) {
    return (
      <PharmacyScreenBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={pharmacyTheme.colors.orange} />
            <Text style={styles.loadingTitle}>Loading dashboard</Text>
          </View>
        </SafeAreaView>
      </PharmacyScreenBackground>
    );
  }

  return (
    <PharmacyScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadDashboard("refresh")}
              tintColor={pharmacyTheme.colors.orange}
            />
          }
        >
          <ImageBackground
            source={PHARMACY_DASHBOARD_HERO_BANNER}
            resizeMode="contain"
            imageStyle={styles.heroBannerImage}
            style={styles.heroBanner}
          >
            <View style={styles.heroBannerOverlay}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroActions}>
                  <TouchableOpacity
                    accessibilityLabel="Open pharmacy settings"
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate("PharmacySettings")}
                    style={styles.settingsButton}
                  >
                    <Ionicons name="settings-outline" size={18} color={pharmacyTheme.colors.navy} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <HeroPill icon="pulse-outline" label={`${liveOrders} live orders`} />
                <HeroPill icon="shield-checkmark-outline" label={`${successRate}% success`} />
                <HeroPill icon="warning-outline" label={`${stockAlerts} stock alerts`} />
              </View>
            </View>
          </ImageBackground>

          <View style={styles.sectionBlock}>
            <PharmacySectionHeader
              eyebrow="Shortcuts"
              title="Quick actions"
            />
            <View style={styles.quickActionCircleGrid}>
              <QuickActionCircle
                accent="yellow"
                icon="qr-code-outline"
                label="Scan QR"
                onPress={() => navigation.navigate("PharmacyScanner")}
              />
              <QuickActionCircle
                accent="orange"
                icon="add-outline"
                label="Add Medicine"
                onPress={() => navigation.navigate("PharmacyAddMedicine")}
              />
              <QuickActionCircle
                accent="indigo"
                icon="albums-outline"
                label="Inventory"
                onPress={() => navigation.navigate("PharmacyInventory")}
              />
              <QuickActionCircle
                accent="peach"
                icon="receipt-outline"
                label="Orders"
                onPress={() => navigation.navigate("PharmacyReports")}
              />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <PharmacySectionHeader
              eyebrow="Overview"
              title="Daily snapshot"
            />
            <View style={styles.metricGrid}>
              <PharmacyMetricCard
                accent="yellow"
                detail={`${dashboard?.overview.completedOrders ?? 0} completed orders`}
                icon="cash-outline"
                label="Revenue Closed"
                style={[styles.metricGridItem, styles.metricCardWarm]}
                value={formatMoney(dashboard?.overview.totalRevenue ?? 0)}
              />
              <PharmacyMetricCard
                accent="indigo"
                detail={`${dashboard?.overview.totalOrders ?? 0} total orders`}
                icon="receipt-outline"
                label="Active Queue"
                style={[styles.metricGridItem, styles.metricCardCool]}
                value={String(liveOrders)}
              />
              <PharmacyMetricCard
                accent="success"
                detail={`${dashboard?.overview.cancellationRate ?? 0}% cancellation rate`}
                icon="flask-outline"
                label="Prescription Volume"
                style={[styles.metricGridItem, styles.metricCardMint]}
                value={String(dashboard?.overview.prescriptionVolume ?? 0)}
              />
              <PharmacyMetricCard
                accent="orange"
                detail="Lines needing attention soon"
                icon="alert-circle-outline"
                label="Low Stock Risk"
                style={[styles.metricGridItem, styles.metricCardPeach]}
                value={String(stockAlerts)}
              />
            </View>
          </View>

          <PharmacyGlassCard style={styles.chartCard}>
            <PharmacySectionHeader
              eyebrow="Revenue Momentum"
              title="7-day operating trend"
              right={
                <View style={styles.rangeBadge}>
                  <Text style={styles.rangeBadgeText}>7D</Text>
                </View>
              }
            />
            <TrendCard
              labels={trendSeries.labels}
              values={trendSeries.values}
              metricLabel={trendSeries.metricLabel}
              totalLabel={trendSeries.totalLabel}
            />
          </PharmacyGlassCard>

          <View style={styles.signalRow}>
            <PharmacyGlassCard style={styles.signalCard}>
              <PharmacySectionHeader
                eyebrow="Forecast Pressure"
                title="Forecast pressure"
              />
              {forecastSpotlight ? (
                <>
                  <View style={styles.signalMetricRow}>
                    <Text style={styles.signalHeadline} numberOfLines={1}>
                      {forecastSpotlight.name}
                    </Text>
                    <StatusChip
                      label={`${forecastSpotlight.shortageRisk} risk`}
                      backgroundColor={forecastPalette.shell}
                      borderColor={forecastPalette.border}
                      textColor={forecastPalette.text}
                    />
                  </View>
                  <View style={styles.signalStatsRow}>
                    <SignalStat label="Demand" value={String(forecastSpotlight.predictedDemand)} />
                    <SignalStat label="Reorder" value={`${forecastSpotlight.recommendedReorderQuantity}u`} />
                  </View>
                </>
              ) : (
                <View style={styles.compactStateRow}>
                  <StatusChip
                    label="Stable"
                    backgroundColor="#DCF7EB"
                    borderColor="#B7E8D1"
                    textColor={pharmacyTheme.colors.success}
                  />
                  <Text style={styles.compactStateText}>Stable forecast</Text>
                </View>
              )}
            </PharmacyGlassCard>
          </View>

          <View style={styles.sectionBlock}>
            <PharmacySectionHeader
              eyebrow="Stock Risk"
              title="Low stock products"
            />
            <PharmacyGlassCard style={styles.stockHighlightCard}>
              {lowStockSpotlight ? (
                <>
                  <View style={styles.stockRiskTopRow}>
                    <MedicineThumb imageUrl={lowStockSpotlight.imageUrl ?? null} name={lowStockSpotlight.name} />
                    <View style={styles.stockRiskCopy}>
                      <View style={styles.signalMetricRow}>
                        <Text style={styles.signalHeadline} numberOfLines={1}>
                          {lowStockSpotlight.name}
                        </Text>
                        <StatusChip
                          label="Low stock"
                          backgroundColor="#FFF1D6"
                          borderColor="#FFD69B"
                          textColor={pharmacyTheme.colors.orange}
                        />
                      </View>
                      <View style={styles.stockValueRow}>
                        <Text style={styles.stockValue}>{lowStockSpotlight.availableStock}</Text>
                        <Text style={styles.stockValueUnit}>units left</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.signalFooterRow}>
                    <Text style={styles.signalFooterText}>
                      Reserved {lowStockSpotlight.reservedQuantity}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.compactStateRow}>
                  <StatusChip
                    label="Stable"
                    backgroundColor="#EAF2FF"
                    borderColor="#D6E1F5"
                    textColor={pharmacyTheme.colors.indigo}
                  />
                  <Text style={styles.compactStateText}>No critical stock risk</Text>
                </View>
              )}
            </PharmacyGlassCard>
          </View>

          <View style={styles.sectionBlock}>
            <PharmacySectionHeader
              eyebrow="Recent Activity"
              title="Recent activity"
            />

            {topMedicine ? (
              <PharmacyGlassCard style={styles.recentHighlightCard}>
                <View style={styles.stockRiskTopRow}>
                  <MedicineThumb imageUrl={topMedicine.imageUrl ?? null} name={topMedicine.name || "Medicine"} />
                  <View style={styles.stockRiskCopy}>
                    <View style={styles.signalMetricRow}>
                      <Text style={styles.signalHeadline} numberOfLines={1}>
                        {topMedicine.name || "Medicine unavailable"}
                      </Text>
                      <StatusChip
                        label="Top item"
                        backgroundColor="#EAF2FF"
                        borderColor="#D6E1F5"
                        textColor={pharmacyTheme.colors.indigo}
                      />
                    </View>
                    <View style={styles.stockValueRow}>
                      <Text style={styles.stockValue}>{topMedicine.quantitySold ?? 0}</Text>
                      <Text style={styles.stockValueUnit}>units sold</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.signalFooterRow}>
                  <Text style={styles.signalFooterText}>Today</Text>
                  <Text style={styles.recentRevenueText}>{formatMoney(topMedicine.revenue ?? 0)}</Text>
                </View>
              </PharmacyGlassCard>
            ) : (
              <PharmacyGlassCard style={styles.recentHighlightCard}>
                <View style={styles.emptyOrderState}>
                  <View style={styles.emptyOrderIconWrap}>
                    <Ionicons name="receipt-outline" size={16} color={pharmacyTheme.colors.orange} />
                  </View>
                  <Text style={styles.emptyOrderTitle}>No recent activity yet</Text>
                </View>
              </PharmacyGlassCard>
            )}
          </View>

          {error ? (
            <View style={styles.notice}>
              <Ionicons name="alert-circle-outline" size={18} color={pharmacyTheme.colors.danger} />
              <Text style={styles.noticeText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </PharmacyScreenBackground>
  );
}

function HeroPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.heroPill}>
      <Ionicons name={icon} size={14} color={pharmacyTheme.colors.navy} />
      <Text style={styles.heroPillText}>{label}</Text>
    </View>
  );
}

function QuickActionCircle({
  accent,
  icon,
  label,
  onPress,
}: {
  accent: "yellow" | "orange" | "indigo" | "peach";
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const palette = {
    yellow: { bg: "#FFF0CC", color: pharmacyTheme.colors.yellow },
    orange: { bg: "#FFE1D1", color: pharmacyTheme.colors.orange },
    indigo: { bg: "#E6E1FF", color: pharmacyTheme.colors.indigo },
    peach: { bg: "#FFF2E6", color: "#CC7A26" },
  } as const;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.quickActionCircleItem}
    >
      <View style={[styles.quickActionCircleIconWrap, { backgroundColor: palette[accent].bg }]}>
        <Ionicons name={icon} size={22} color={palette[accent].color} />
      </View>
      <Text style={styles.quickActionCircleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TrendCard({
  labels,
  metricLabel,
  totalLabel,
  values,
}: {
  labels: string[];
  metricLabel: string;
  totalLabel: string;
  values: number[];
}) {
  const hasData = values.length > 0 && values.some((value) => value > 0);

  if (!hasData) {
    return (
      <View style={styles.trendFallbackRow}>
        <Text style={styles.trendFallbackText}>No weekly trend yet</Text>
      </View>
    );
  }

  const width = 320;
  const height = 148;
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 28;
  const innerHeight = height - paddingTop - paddingBottom;
  const innerWidth = width - paddingX * 2;
  const maxValue = Math.max(...values, 1);

  const points = values.map((value, index) => {
    const x = paddingX + (values.length === 1 ? innerWidth / 2 : (innerWidth * index) / (values.length - 1));
    const y = paddingTop + innerHeight - (value / maxValue) * innerHeight;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  return (
    <View style={styles.trendWrap}>
      <View style={styles.trendHeaderRow}>
        <View>
          <Text style={styles.trendMetricLabel}>{metricLabel}</Text>
          <Text style={styles.trendMetricValue}>{totalLabel}</Text>
        </View>
      </View>

      <View style={styles.trendCanvas}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFB97A" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#FFB97A" stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {[0.25, 0.5, 0.75].map((guide) => (
            <Line
              key={guide}
              x1={paddingX}
              x2={width - paddingX}
              y1={paddingTop + innerHeight * guide}
              y2={paddingTop + innerHeight * guide}
              stroke="#EEF2F8"
              strokeWidth="1"
            />
          ))}

          <Path d={areaPath} fill="url(#trendFill)" />
          <Path d={linePath} fill="none" stroke="#FF8A2A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point, index) => (
            <Circle key={index} cx={point.x} cy={point.y} r="4.5" fill="#FFFFFF" stroke="#FF8A2A" strokeWidth="2.5" />
          ))}
        </Svg>
      </View>

      <View style={styles.trendLabelsRow}>
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.trendLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function StatusChip({
  backgroundColor,
  borderColor,
  label,
  textColor,
}: {
  backgroundColor: string;
  borderColor: string;
  label: string;
  textColor: string;
}) {
  return (
    <View style={[styles.statusChip, { backgroundColor, borderColor }]}>
      <Text style={[styles.statusChipText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function SignalStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.signalStat}>
      <Text style={styles.signalStatLabel}>{label}</Text>
      <Text style={styles.signalStatValue}>{value}</Text>
    </View>
  );
}

function MedicineThumb({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.medicineThumb}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={styles.medicineThumbFallback}>
      <Ionicons name="medkit-outline" size={22} color={pharmacyTheme.colors.orange} />
      <Text style={styles.medicineThumbFallbackText} numberOfLines={2}>
        {name
          .split(" ")
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("") || "RX"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: pharmacyTheme.spacing.md,
    paddingBottom: 136,
    gap: 20,
  },
  heroBanner: {
    width: "100%",
    height: 210,
    borderRadius: pharmacyTheme.radii.xlarge,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  heroBannerImage: {
    borderRadius: pharmacyTheme.radii.xlarge,
  },
  heroBannerOverlay: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    gap: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: pharmacyTheme.spacing.xxl,
  },
  loadingTitle: {
    marginTop: pharmacyTheme.spacing.md,
    color: pharmacyTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  heroActions: {
    alignItems: "flex-end",
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: pharmacyTheme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: pharmacyTheme.spacing.sm,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: pharmacyTheme.spacing.xs,
    backgroundColor: pharmacyTheme.colors.card,
    borderRadius: pharmacyTheme.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroPillText: {
    color: pharmacyTheme.colors.navy,
    fontSize: 12,
    fontWeight: "800",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricGridItem: {
    width: "48.2%",
    minHeight: 164,
  },
  metricCardWarm: {
    backgroundColor: "#FFF8EE",
    borderColor: "#F6E0BF",
  },
  metricCardCool: {
    backgroundColor: "#F2F6FF",
    borderColor: "#D8E4FA",
  },
  metricCardMint: {
    backgroundColor: "#EFFAF4",
    borderColor: "#CFEEDC",
  },
  metricCardPeach: {
    backgroundColor: "#FFF2EA",
    borderColor: "#FFD6C1",
  },
  sectionBlock: {
    gap: 14,
  },
  quickActionCircleGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  quickActionCircleItem: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    minWidth: 72,
  },
  quickActionCircleIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F4E7D4",
    ...pharmacyTheme.shadows.soft,
  },
  quickActionCircleLabel: {
    color: pharmacyTheme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 14,
  },
  chartCard: {
    paddingBottom: 16,
  },
  rangeBadge: {
    borderRadius: pharmacyTheme.radii.pill,
    backgroundColor: "#FFF0CC",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rangeBadgeText: {
    color: pharmacyTheme.colors.orange,
    fontSize: 12,
    fontWeight: "800",
  },
  trendWrap: {
    marginTop: 16,
    gap: 12,
  },
  trendHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trendMetricLabel: {
    color: pharmacyTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  trendMetricValue: {
    marginTop: 4,
    color: "#18213D",
    fontSize: 19,
    fontWeight: "700",
  },
  trendCanvas: {
    borderRadius: 24,
    backgroundColor: "#FCFDFF",
    borderWidth: 1,
    borderColor: "#E8EDF5",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  trendLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  trendLabel: {
    color: "#6C7892",
    fontSize: 11,
    fontWeight: "700",
  },
  trendFallbackRow: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8EDF5",
    backgroundColor: "#FCFDFF",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  trendFallbackText: {
    color: "#6C7892",
    fontSize: 14,
    fontWeight: "700",
  },
  signalRow: {
    gap: 12,
  },
  signalCard: {
    gap: 14,
    paddingBottom: 18,
  },
  stockHighlightCard: {
    gap: 14,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 28,
  },
  signalMetricRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  stockRiskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stockRiskCopy: {
    flex: 1,
    gap: 10,
  },
  signalHeadline: {
    flex: 1,
    color: "#18213D",
    fontSize: 15,
    fontWeight: "700",
  },
  statusChip: {
    borderRadius: pharmacyTheme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  signalStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  signalStat: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F9FBFF",
    borderWidth: 1,
    borderColor: "#E8EDF5",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  signalStatLabel: {
    color: "#6C7892",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  signalStatValue: {
    marginTop: 6,
    color: "#18213D",
    fontSize: 17,
    fontWeight: "800",
  },
  stockValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  medicineThumb: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "#F6E0BF",
  },
  medicineThumbFallback: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: "#FFF4E8",
    borderWidth: 1,
    borderColor: "#FFD7B8",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  medicineThumbFallbackText: {
    color: "#C96A10",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  stockValue: {
    color: "#18213D",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  stockValueUnit: {
    paddingBottom: 5,
    color: "#6C7892",
    fontSize: 13,
    fontWeight: "700",
  },
  signalFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  signalFooterText: {
    color: "#6C7892",
    fontSize: 13,
    fontWeight: "700",
  },
  compactStateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  compactStateText: {
    color: "#18213D",
    fontSize: 15,
    fontWeight: "700",
  },
  recentHighlightCard: {
    gap: 14,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 28,
  },
  recentRevenueText: {
    color: pharmacyTheme.colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyOrderState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyOrderIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "#FFF0CC",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyOrderTitle: {
    color: "#18213D",
    fontSize: 14,
    fontWeight: "700",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: pharmacyTheme.spacing.sm,
    borderRadius: pharmacyTheme.radii.medium,
    padding: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  noticeText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    lineHeight: 18,
  },
});
