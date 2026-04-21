import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const THEME = {
  primary: "#2563EB",
  success: "#10B981",
  warning: "#F59E0B",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  softBlue: "#DBEAFE",
  softGreen: "#DCFCE7",
  softAmber: "#FEF3C7",
  softSlate: "#E5E7EB",
};

type RangeKey = "7D" | "30D" | "Custom";

const RANGE_OPTIONS: RangeKey[] = ["7D", "30D", "Custom"];

const RANGE_DATA = {
  "7D": {
    dailyVisits: [48, 56, 52, 60, 64, 58, 62],
    waitTimes: [18, 16, 19, 15, 14, 17, 13],
    metrics: {
      dailyVisits: "62",
      avgWaitTime: "13m",
      totalAppointments: "402",
      queueEfficiency: "82%",
    },
    busiestDoctor: {
      name: "Dr. Silva",
      detail: "42 patients this week",
    },
    queueInsight: {
      efficiency: "82%",
      summary: "Good performance",
      tone: "Queue flow is stable with short waiting times.",
    },
  },
  "30D": {
    dailyVisits: [44, 49, 51, 48, 54, 58, 61],
    waitTimes: [20, 19, 18, 17, 16, 15, 14],
    metrics: {
      dailyVisits: "58",
      avgWaitTime: "14m",
      totalAppointments: "1,684",
      queueEfficiency: "79%",
    },
    busiestDoctor: {
      name: "Dr. Perera",
      detail: "168 patients this month",
    },
    queueInsight: {
      efficiency: "79%",
      summary: "Average performance",
      tone: "Queue flow is acceptable but peaks are increasing.",
    },
  },
  Custom: {
    dailyVisits: [40, 46, 43, 47, 52, 50, 54],
    waitTimes: [21, 20, 18, 17, 19, 16, 15],
    metrics: {
      dailyVisits: "54",
      avgWaitTime: "15m",
      totalAppointments: "286",
      queueEfficiency: "76%",
    },
    busiestDoctor: {
      name: "Dr. Fernando",
      detail: "31 patients in selected range",
    },
    queueInsight: {
      efficiency: "76%",
      summary: "Needs attention",
      tone: "Appointment clustering is increasing missed wait targets.",
    },
  },
} as const;

export default function MedicalCenterReports() {
  const [selectedRange, setSelectedRange] = useState<RangeKey>("7D");

  const report = useMemo(() => RANGE_DATA[selectedRange], [selectedRange]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Reports & Analytics</Text>
          <Text style={styles.headerSubtitle}>Clinic performance insights</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="filter-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="download-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.rangeRow}>
          {RANGE_OPTIONS.map((range) => {
            const isSelected = selectedRange === range;
            return (
              <TouchableOpacity
                key={range}
                style={[styles.rangePill, isSelected && styles.rangePillActive]}
                onPress={() => setSelectedRange(range)}
              >
                <Text style={[styles.rangePillText, isSelected && styles.rangePillTextActive]}>
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            icon="pulse-outline"
            label="Daily Visits"
            value={report.metrics.dailyVisits}
            tint={THEME.softBlue}
            iconColor={THEME.primary}
          />
          <MetricCard
            icon="time-outline"
            label="Avg Wait Time"
            value={report.metrics.avgWaitTime}
            tint={THEME.softAmber}
            iconColor={THEME.warning}
          />
          <MetricCard
            icon="calendar-outline"
            label="Total Appointments"
            value={report.metrics.totalAppointments}
            tint={THEME.softSlate}
            iconColor="#475569"
          />
          <MetricCard
            icon="flash-outline"
            label="Queue Efficiency"
            value={report.metrics.queueEfficiency}
            tint={THEME.softGreen}
            iconColor={THEME.success}
          />
        </View>

        <Text style={styles.sectionTitle}>Charts</Text>

        <ChartCard
          title="Daily Visits"
          subtitle="Visit trend across selected range"
          values={report.dailyVisits}
          barColor={THEME.primary}
          labels={["M", "T", "W", "T", "F", "S", "S"]}
        />

        <ChartCard
          title="Avg Wait Time"
          subtitle="Average queue waiting duration"
          values={report.waitTimes}
          barColor={THEME.success}
          labels={["M", "T", "W", "T", "F", "S", "S"]}
          suffix="m"
        />

        <Text style={styles.sectionTitle}>Insights</Text>

        <View style={styles.insightsRow}>
          <InsightCard
            icon="medkit-outline"
            title="Busiest Doctor"
            headline={report.busiestDoctor.name}
            detail={report.busiestDoctor.detail}
            tint={THEME.softBlue}
            iconColor={THEME.primary}
          />
          <InsightCard
            icon="speedometer-outline"
            title="Queue Efficiency"
            headline={report.queueInsight.efficiency}
            detail={report.queueInsight.summary}
            tint={THEME.softGreen}
            iconColor={THEME.success}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Interpretation</Text>
          <Text style={styles.summaryText}>{report.queueInsight.tone}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tint,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
  iconColor: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ChartCard({
  title,
  subtitle,
  values,
  barColor,
  labels,
  suffix = "",
}: {
  title: string;
  subtitle: string;
  values: readonly number[];
  barColor: string;
  labels: readonly string[];
  suffix?: string;
}) {
  const maxValue = Math.max(...values, 1);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>

      <View style={styles.chartArea}>
        {values.map((value, index) => (
          <View key={`${title}-${index}`} style={styles.chartColumn}>
            <Text style={styles.chartPointValue}>
              {value}
              {suffix}
            </Text>
            <View style={styles.chartTrack}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: `${(value / maxValue) * 100}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.chartLabel}>{labels[index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightCard({
  icon,
  title,
  headline,
  detail,
  tint,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  headline: string;
  detail: string;
  tint: string;
  iconColor: string;
}) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightHeadline}>{headline}</Text>
      <Text style={styles.insightDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
  },
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 10,
  },
  rangePill: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rangePillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  rangePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  rangePillTextActive: {
    color: THEME.white,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  metricCard: {
    width: "48%",
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    color: THEME.textSecondary,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 14,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  chartCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  chartSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: THEME.textSecondary,
  },
  chartArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 18,
  },
  chartColumn: {
    flex: 1,
    alignItems: "center",
  },
  chartPointValue: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  chartTrack: {
    width: 22,
    height: 100,
    borderRadius: 999,
    backgroundColor: "#EEF2F7",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    borderRadius: 999,
  },
  chartLabel: {
    marginTop: 8,
    fontSize: 11,
    color: THEME.textSecondary,
  },
  insightsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  insightHeadline: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  insightDetail: {
    marginTop: 6,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  summaryCard: {
    marginTop: 12,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  summaryText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: THEME.textSecondary,
  },
});
