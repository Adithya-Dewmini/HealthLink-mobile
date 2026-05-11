import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleSession } from "../../screens/doctor/scheduleTypes";
import ScheduleStatusBadge from "./ScheduleStatusBadge";
import { doctorColors, getDoctorStatusTone } from "../../constants/doctorTheme";

export type ScheduleSessionCardProps = {
  session: ScheduleSession;
  isNextSession?: boolean;
};

function ScheduleSessionCardComponent({
  session,
  isNextSession = false,
}: ScheduleSessionCardProps) {
  const statusTone = getDoctorStatusTone(session.status);
  const patientLabel =
    session.patientCount === 1 ? "1 booking" : `${session.patientCount} bookings`;

  return (
    <View style={[styles.card, isNextSession && styles.nextCard]}>
      <View style={styles.topRow}>
        <Text style={styles.clinicName}>{session.clinicName}</Text>
        <ScheduleStatusBadge label={session.status} tone={statusTone} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={15} color={doctorColors.textSecondary} />
          <Text style={styles.metaText}>
            {session.startTime} - {session.endTime}
          </Text>
        </View>

        <View style={styles.patientBadge}>
          <Text style={styles.patientBadgeText}>{patientLabel}</Text>
        </View>
      </View>

      {isNextSession ? (
        <View style={styles.nextBadge}>
          <Ionicons name="sparkles-outline" size={14} color={doctorColors.deep} />
          <Text style={styles.nextBadgeText}>Next Session</Text>
        </View>
      ) : null}
    </View>
  );
}

export default memo(ScheduleSessionCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: doctorColors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: doctorColors.border,
    shadowColor: doctorColors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  nextCard: {
    borderColor: "#BEE7E5",
    backgroundColor: "#F4FBFB",
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
    fontWeight: "700",
    color: doctorColors.textPrimary,
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
    color: doctorColors.textSecondary,
  },
  patientBadge: {
    backgroundColor: "#EAF6F5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  patientBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: doctorColors.primary,
  },
  nextBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#DFF4F2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 14,
  },
  nextBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: doctorColors.deep,
  },
});
