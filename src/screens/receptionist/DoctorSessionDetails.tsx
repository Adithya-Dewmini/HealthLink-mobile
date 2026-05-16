import React, { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import {
  formatSessionFullDateLabel,
  formatSessionTimeRangeLabel,
} from "../../utils/sessionPresentation";

type Props = NativeStackScreenProps<
  ReceptionistStackParamList,
  "ReceptionistDoctorSessionDetails"
>;

const THEME = {
  background: "#F4FAFC",
  surface: "#FFFFFF",
  textPrimary: "#122033",
  textSecondary: "#6B7280",
  border: "#E3ECF3",
  navy: "#0D1B7E",
  blue: "#0077B6",
  cyan: "#12B5D1",
  mint: "#0F9D74",
  amber: "#B45309",
  slate: "#64748B",
  softBlue: "#EAF6FF",
  softMint: "#EAFBF5",
  softAmber: "#FFF5E7",
  softSlate: "#F3F6F9",
  softRose: "#FFF1F2",
  rose: "#E11D48",
};

const formatSourceLabel = (source: string) => (source === "routine" ? "Weekly" : "Extra");

export default function DoctorSessionDetails({ navigation, route }: Props) {
  const { session, doctorName } = route.params;
  const attendeeRatio = session.maxPatients > 0 ? session.bookedCount / session.maxPatients : 0;
  const fillWidth = `${Math.max(0, Math.min(attendeeRatio, 1)) * 100}%` as DimensionValue;
  const detailsDoctorName = doctorName || session.doctorName || "Doctor";
  const sourceLabel = formatSourceLabel(session.source);
  const statusTone = getStatusTone(session.status);

  const occupancyLabel = useMemo(() => {
    if (session.bookedCount <= 0) return "No patients booked yet";
    if (session.availableSlots <= 0) return "Session is fully booked";
    return `${session.availableSlots} slots still open`;
  }, [session.availableSlots, session.bookedCount]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#F8FDFF", "#EAF8FF", "#DFF3FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.sessionOrb}>
              <Ionicons name="time-outline" size={24} color={THEME.navy} />
            </View>
            <View style={styles.heroBadges}>
              <Pill label={sourceLabel} tone="info" />
              <Pill label={session.status} tone={statusTone} />
            </View>
          </View>

          <Text style={styles.heroEyebrow}>Clinic Session</Text>
          <Text style={styles.heroTime}>{formatSessionTimeRangeLabel(session.startTime, session.endTime)}</Text>
          <Text style={styles.heroDate}>{formatSessionFullDateLabel(session.date)}</Text>

          <View style={styles.heroMetaRow}>
            <MetaChip icon="business-outline" label={session.clinicName || "Medical Center"} />
            <MetaChip icon="person-outline" label={detailsDoctorName} />
          </View>
        </LinearGradient>

        <View style={styles.statGrid}>
          <StatCard
            icon="timer-outline"
            value={`${session.slotDuration}m`}
            label="Slot Duration"
            surfaceColor={THEME.softBlue}
            iconColor={THEME.blue}
          />
          <StatCard
            icon="people-outline"
            value={String(session.maxPatients)}
            label="Capacity"
            surfaceColor={THEME.softMint}
            iconColor={THEME.mint}
          />
          <StatCard
            icon="checkmark-done-outline"
            value={String(session.bookedCount)}
            label="Booked"
            surfaceColor={THEME.softAmber}
            iconColor={THEME.amber}
          />
          <StatCard
            icon="sparkles-outline"
            value={String(session.availableSlots)}
            label="Available"
            surfaceColor={THEME.softSlate}
            iconColor={THEME.navy}
          />
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="bar-chart-outline"
            title="Capacity Snapshot"
            subtitle={occupancyLabel}
          />

          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {session.bookedCount}/{session.maxPatients} booked
            </Text>
            <Text style={styles.progressSubtle}>{session.availableSlots} open</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: fillWidth }]} />
          </View>

          <View style={styles.metricStrip}>
            <MiniMetric label="Source" value={sourceLabel} />
            <MiniMetric label="Status" value={session.status} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            icon="document-text-outline"
            title="Session Summary"
            subtitle="Primary schedule and clinic information"
          />

          <InfoRow icon="calendar-outline" label="Date" value={formatSessionFullDateLabel(session.date)} />
          <InfoRow icon="time-outline" label="Time" value={formatSessionTimeRangeLabel(session.startTime, session.endTime)} />
          <InfoRow icon="business-outline" label="Clinic" value={session.clinicName || "Medical Center"} />
          <InfoRow icon="person-outline" label="Doctor" value={detailsDoctorName} />
        </View>

        {__DEV__ ? (
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>Debug Session ID</Text>
            <Text style={styles.debugValue}>{session.id}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={18} color={THEME.navy} />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  surfaceColor,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  surfaceColor: string;
  iconColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: surfaceColor }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={THEME.blue} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "success" | "warning" | "muted" | "danger";
}) {
  const palette =
    tone === "success"
      ? { backgroundColor: THEME.softMint, color: THEME.mint }
      : tone === "warning"
        ? { backgroundColor: THEME.softAmber, color: THEME.amber }
        : tone === "danger"
          ? { backgroundColor: THEME.softRose, color: THEME.rose }
          : tone === "muted"
            ? { backgroundColor: THEME.softSlate, color: THEME.slate }
            : { backgroundColor: THEME.softBlue, color: THEME.blue };

  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.pillText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function MetaChip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={14} color={THEME.navy} />
      <Text style={styles.metaChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text style={styles.miniMetricValue}>{value}</Text>
    </View>
  );
}

function getStatusTone(status: string): "info" | "success" | "warning" | "muted" | "danger" {
  if (status === "Completed") return "success";
  if (status === "Full") return "warning";
  if (status === "Cancelled") return "danger";
  if (status === "Live") return "info";
  return "muted";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#091224",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: THEME.navy },
  headerSpacer: { width: 46, height: 46 },
  content: { padding: 20, paddingBottom: 34, gap: 16 },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#D8EBF8",
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sessionOrb: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    flex: 1,
  },
  heroEyebrow: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: THEME.cyan,
    textTransform: "uppercase",
  },
  heroTime: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: THEME.navy,
  },
  heroDate: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(13,27,126,0.08)",
  },
  metaChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    color: THEME.navy,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionCard: {
    backgroundColor: THEME.surface,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCopy: { flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  progressSubtle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  progressTrack: {
    marginTop: 14,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E8EEF4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: THEME.blue,
  },
  metricStrip: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  miniMetric: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: THEME.background,
    padding: 14,
  },
  miniMetricLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  miniMetricValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF3F7",
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  infoValue: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  debugCard: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    padding: 16,
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  debugValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "800",
    color: THEME.navy,
  },
});
