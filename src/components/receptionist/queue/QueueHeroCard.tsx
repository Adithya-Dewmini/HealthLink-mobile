import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const THEME = {
  primary: "#2196F3",
  secondary: "#2BB673",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  softBlue: "#E3F2FD",
  softSuccess: "#E8F8EF",
};

type Props = {
  doctorName: string;
  sessionLabel: string;
  startTimeLabel: string;
  patientCountLabel: string;
  isQueueLive: boolean;
};

function QueueHeroCardComponent({
  doctorName,
  sessionLabel,
  startTimeLabel,
  patientCountLabel,
  isQueueLive,
}: Props) {
  return (
    <LinearGradient
      colors={[THEME.softBlue, "#DBEAFE"]}
      style={styles.heroCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.heroRow}>
        <View style={styles.heroHeaderText}>
          <Text style={styles.heroTitle}>{doctorName}</Text>
          <Text style={styles.heroSub}>{sessionLabel}</Text>
        </View>
        <View style={styles.heroStatus}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isQueueLive ? THEME.secondary : "#CBD5E1" },
            ]}
          />
          <Text
            style={[
              styles.heroStatusText,
              { color: isQueueLive ? THEME.secondary : THEME.textSecondary },
            ]}
          >
            {isQueueLive ? "LIVE" : "NOT STARTED"}
          </Text>
        </View>
      </View>

      <View style={styles.heroStats}>
        <View style={styles.heroStatBlock}>
          <Text style={styles.heroStatVal}>{startTimeLabel}</Text>
          <Text style={styles.heroStatLabel}>Start Time</Text>
        </View>
        <View style={styles.vLine} />
        <View style={styles.heroStatBlock}>
          <Text style={styles.heroStatVal}>{patientCountLabel}</Text>
          <Text style={styles.heroStatLabel}>Patients</Text>
        </View>
        <MaterialCommunityIcons
          name="stethoscope"
          size={34}
          color="rgba(33, 150, 243, 0.18)"
          style={styles.heroIcon}
        />
      </View>
    </LinearGradient>
  );
}

export default memo(QueueHeroCardComponent);

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroHeaderText: {
    flex: 1,
    paddingRight: 8,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  heroSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 4 },
  heroStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softSuccess,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  heroStatusText: { fontWeight: "800", fontSize: 10 },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 16,
  },
  heroStatBlock: {
    minWidth: 76,
  },
  heroStatVal: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  heroStatLabel: { fontSize: 11, color: THEME.textSecondary, marginTop: 2 },
  vLine: { width: 1, height: 30, backgroundColor: "#BFDBFE" },
  heroIcon: { marginLeft: "auto" },
});
