import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleSession } from "../../screens/doctor/scheduleTypes";

export type ScheduleSessionCardProps = {
  session: ScheduleSession;
  isNextSession?: boolean;
};

function ScheduleSessionCardComponent({
  session,
  isNextSession = false,
}: ScheduleSessionCardProps) {
  const isCompleted = session.status === "Completed";
  const isActive = session.status === "Active";
  const isMissed = session.status === "Missed";

  return (
    <View style={[styles.card, isNextSession && styles.nextCard]}>
      <View style={styles.topRow}>
        <Text style={styles.clinicName}>{session.clinicName}</Text>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.activeBadge : isCompleted ? styles.completedBadge : isMissed ? styles.missedBadge : styles.upcomingBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isActive ? styles.activeText : isCompleted ? styles.completedText : isMissed ? styles.missedText : styles.upcomingText,
            ]}
          >
            {session.status}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={15} color="#64748B" />
          <Text style={styles.metaText}>
            {session.startTime} - {session.endTime}
          </Text>
        </View>

        <View style={styles.patientBadge}>
          <Text style={styles.patientBadgeText}>{session.patientCount} Patients</Text>
        </View>
      </View>

      {isNextSession ? (
        <View style={styles.nextBadge}>
          <Ionicons name="sparkles-outline" size={14} color="#1D4ED8" />
          <Text style={styles.nextBadgeText}>Next Session</Text>
        </View>
      ) : null}
    </View>
  );
}

export default memo(ScheduleSessionCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  nextCard: {
    borderColor: "#BFDBFE",
    backgroundColor: "#F8FBFF",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  clinicName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  upcomingBadge: {
    backgroundColor: "#DBEAFE",
  },
  activeBadge: {
    backgroundColor: "#E0F2FE",
  },
  completedBadge: {
    backgroundColor: "#E2E8F0",
  },
  missedBadge: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  upcomingText: {
    color: "#1D4ED8",
  },
  activeText: {
    color: "#0369A1",
  },
  completedText: {
    color: "#475569",
  },
  missedText: {
    color: "#B91C1C",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: "#64748B",
  },
  patientBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  patientBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  nextBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 14,
  },
  nextBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
});
