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
  danger: "#EF4444",
  ended: "#9CA3AF",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  softBlue: "#DBEAFE",
  softTeal: "#CCFBF1",
  softAmber: "#FEF3C7",
  softGreen: "#DCFCE7",
  softGray: "#F3F4F6",
  softRed: "#FEE2E2",
};

type QueueStatus = "LIVE" | "UPCOMING" | "ENDED";
type DateMode = "today" | "future";

type QueueItem = {
  id: string;
  doctorName: string;
  specialization: string;
  status: QueueStatus;
  currentPatient: string;
  token: string;
  waitingCount: number;
  eta: string;
};

const QUEUES: QueueItem[] = [
  {
    id: "1",
    doctorName: "Dr. Aruna Silva",
    specialization: "Cardiology",
    status: "LIVE",
    currentPatient: "Nimal Perera",
    token: "A-12",
    waitingCount: 8,
    eta: "25 mins",
  },
  {
    id: "2",
    doctorName: "Dr. Sarah Perera",
    specialization: "Dermatology",
    status: "UPCOMING",
    currentPatient: "Queue not started",
    token: "B-05",
    waitingCount: 3,
    eta: "45 mins",
  },
  {
    id: "3",
    doctorName: "Dr. Mohan Dias",
    specialization: "General Medicine",
    status: "ENDED",
    currentPatient: "Session completed",
    token: "C-18",
    waitingCount: 0,
    eta: "-",
  },
];

export default function MedicalCenterQueueOverview() {
  const [dateMode, setDateMode] = useState<DateMode>("today");

  const stats = useMemo(() => {
    const activeQueues = QUEUES.filter((queue) => queue.status === "LIVE").length;
    const totalWaiting = QUEUES.reduce((sum, queue) => sum + queue.waitingCount, 0);
    const completedToday = 42;
    const avgWait = "18m";
    return { activeQueues, totalWaiting, completedToday, avgWait };
  }, []);

  const visibleQueues = useMemo(() => {
    if (dateMode === "future") {
      return QUEUES.filter((queue) => queue.status !== "ENDED");
    }
    return QUEUES;
  }, [dateMode]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Queue Monitor</Text>
          <Text style={styles.headerSubtitle}>Live clinic activity</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="refresh-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="filter-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modePill, dateMode === "today" && styles.modePillActive]}
            onPress={() => setDateMode("today")}
          >
            <Text style={[styles.modePillText, dateMode === "today" && styles.modePillTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, dateMode === "future" && styles.modePillActive]}
            onPress={() => setDateMode("future")}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={dateMode === "future" ? THEME.white : THEME.textSecondary}
            />
            <Text style={[styles.modePillText, dateMode === "future" && styles.modePillTextActive]}>
              Select Date
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatsCard
            icon="pulse-outline"
            value={String(stats.activeQueues)}
            label="Active Queues"
            tint={THEME.softBlue}
            iconColor={THEME.primary}
          />
          <StatsCard
            icon="people-outline"
            value={String(stats.totalWaiting)}
            label="Waiting Patients"
            tint={THEME.softTeal}
            iconColor="#0F766E"
          />
          <StatsCard
            icon="time-outline"
            value={stats.avgWait}
            label="Avg. Wait Time"
            tint={THEME.softAmber}
            iconColor={THEME.warning}
          />
          <StatsCard
            icon="checkmark-done-outline"
            value={String(stats.completedToday)}
            label="Completed Today"
            tint={THEME.softGreen}
            iconColor={THEME.success}
          />
        </View>

        <Text style={styles.sectionTitle}>Live Queues</Text>

        {visibleQueues.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-clear-outline" size={32} color={THEME.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No active queues found</Text>
            <Text style={styles.emptyText}>Start a clinic session to begin queue monitoring.</Text>
            <TouchableOpacity style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Start Clinic Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          visibleQueues.map((queue) => <QueueCard key={queue.id} queue={queue} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatsCard({
  icon,
  value,
  label,
  tint,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tint: string;
  iconColor: string;
}) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
}

function QueueCard({ queue }: { queue: QueueItem }) {
  const isLive = queue.status === "LIVE";
  const isUpcoming = queue.status === "UPCOMING";
  const isEnded = queue.status === "ENDED";
  const statusStyles =
    queue.status === "LIVE"
      ? {
          badge: styles.liveBadge,
          text: styles.liveBadgeText,
          pulse: styles.livePulse,
          border: styles.liveCardBorder,
          card: styles.liveCardSurface,
        }
      : queue.status === "UPCOMING"
        ? {
            badge: styles.upcomingBadge,
            text: styles.upcomingBadgeText,
            pulse: styles.upcomingPulse,
            border: styles.defaultCardBorder,
            card: null,
          }
        : {
            badge: styles.endedBadge,
            text: styles.endedBadgeText,
            pulse: styles.endedPulse,
            border: styles.defaultCardBorder,
            card: null,
          };

  return (
    <View style={[styles.queueCard, statusStyles.border, statusStyles.card]}>
      {isLive ? <View style={styles.liveAccentBar} /> : null}
      <View style={styles.queueHeader}>
        <View style={styles.queueHeaderCopy}>
          <Text style={styles.queueDoctor}>{queue.doctorName}</Text>
          <Text style={styles.queueSpecialization}>{queue.specialization}</Text>
        </View>
        <View style={[styles.statusBadge, statusStyles.badge]}>
          <View style={[styles.statusDot, statusStyles.pulse]} />
          <Text style={[styles.statusBadgeText, statusStyles.text]}>{queue.status}</Text>
        </View>
      </View>

      <View style={styles.currentPatientBox}>
        <View style={styles.currentPatientHeader}>
          <Text style={styles.currentPatientLabel}>Current Patient</Text>
          <Text style={styles.tokenLabel}>Token</Text>
        </View>
        <View style={styles.currentPatientRow}>
          <View style={styles.currentPatientInfo}>
            <Ionicons name="person-outline" size={18} color={THEME.primary} />
            <Text
              style={[
                styles.currentPatientName,
                !isLive && styles.currentPatientNameMuted,
              ]}
            >
              {queue.currentPatient}
            </Text>
          </View>
          <Text style={styles.tokenValue}>{queue.token}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaValue}>{queue.waitingCount}</Text>
          <Text style={styles.metaLabel}>Waiting</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaBlock}>
          <Text style={styles.metaEta}>{queue.eta}</Text>
          <Text style={styles.metaLabel}>ETA</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryAction}>
          <Ionicons name="eye-outline" size={15} color={THEME.white} />
          <Text style={styles.primaryActionText}>View Queue</Text>
        </TouchableOpacity>
        {isLive ? (
          <>
            <TouchableOpacity style={styles.secondaryAction}>
              <Ionicons name="pause-outline" size={15} color={THEME.textSecondary} />
              <Text style={styles.secondaryActionText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tertiaryAction}>
              <Ionicons name="stop-outline" size={15} color={THEME.danger} />
              <Text style={styles.tertiaryActionText}>End</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {isUpcoming ? (
          <>
            <TouchableOpacity style={styles.secondaryAction}>
              <Ionicons name="play-outline" size={15} color={THEME.textSecondary} />
              <Text style={styles.secondaryActionText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tertiaryActionMuted}>
              <Ionicons name="calendar-outline" size={15} color="#8B5E00" />
              <Text style={styles.tertiaryActionMutedText}>Reschedule</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {isEnded ? (
          <TouchableOpacity style={styles.endedAction}>
            <Ionicons name="document-text-outline" size={15} color={THEME.textSecondary} />
            <Text style={styles.secondaryActionText}>View Summary</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
  modeSwitch: {
    flexDirection: "row",
    gap: 10,
  },
  modePill: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modePillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  modePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  modePillTextActive: {
    color: THEME.white,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 18,
  },
  statsCard: {
    width: "48%",
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  statsLabel: {
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
  queueCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  defaultCardBorder: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  liveCardBorder: {
    borderWidth: 1,
    borderColor: "#D9E7FF",
  },
  liveCardSurface: {
    backgroundColor: "#FCFDFF",
    shadowColor: "#2563EB",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  liveAccentBar: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#2563EB",
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  queueHeaderCopy: {
    flex: 1,
    paddingRight: 12,
  },
  queueDoctor: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  queueSpecialization: {
    marginTop: 3,
    fontSize: 12,
    color: THEME.textSecondary,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveBadge: {
    backgroundColor: THEME.softGreen,
  },
  upcomingBadge: {
    backgroundColor: THEME.softAmber,
  },
  endedBadge: {
    backgroundColor: THEME.softGray,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  livePulse: {
    backgroundColor: THEME.success,
  },
  upcomingPulse: {
    backgroundColor: THEME.warning,
  },
  endedPulse: {
    backgroundColor: THEME.ended,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  liveBadgeText: {
    color: THEME.success,
  },
  upcomingBadgeText: {
    color: THEME.warning,
  },
  endedBadgeText: {
    color: THEME.ended,
  },
  currentPatientBox: {
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#E8EEF8",
  },
  currentPatientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currentPatientLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  currentPatientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 12,
  },
  currentPatientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  currentPatientName: {
    marginLeft: 8,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  currentPatientNameMuted: {
    color: THEME.textSecondary,
  },
  tokenValue: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.primary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  metaBlock: {
    flex: 1,
    alignItems: "center",
  },
  metaDivider: {
    width: 1,
    height: 34,
    backgroundColor: THEME.border,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  metaEta: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.warning,
  },
  metaLabel: {
    marginTop: 4,
    fontSize: 11,
    color: THEME.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  primaryAction: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: THEME.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.white,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  tertiaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: THEME.softRed,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tertiaryActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.danger,
  },
  tertiaryActionMuted: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tertiaryActionMutedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B5E00",
  },
  endedAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF2F7",
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    color: THEME.textSecondary,
  },
  emptyButton: {
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.white,
  },
});
