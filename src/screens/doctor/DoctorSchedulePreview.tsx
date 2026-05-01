import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const THEME = {
  background: "#F8FAFC",
  white: "#FFFFFF",
  textDark: "#0F172A",
  textGray: "#64748B",
  accentBlue: "#3B82F6",
  softBlue: "#EFF6FF",
  border: "#E2E8F0",
  success: "#10B981",
};

type Shift = {
  day: string;
  start_time: string;
  end_time: string;
  max_patients?: number | null;
};

type Props = {
  shifts?: Shift[];
  onConfirm?: () => void;
  onClose?: () => void;
};

const formatTime = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
};

export default function DoctorSchedulePreview({ shifts: propShifts, onConfirm, onClose }: Props) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const shifts = useMemo<Shift[]>(
    () => (Array.isArray(propShifts) ? propShifts : Array.isArray(route.params?.shifts) ? route.params.shifts : []),
    [propShifts, route.params?.shifts]
  );
  const handleClose = onClose || (() => navigation.goBack());
  const handleConfirm = onConfirm || (() => navigation.goBack());
  const totalHours = shifts.reduce((acc, shift) => {
    const start = new Date(`1970-01-01T${shift.start_time}`);
    const end = new Date(`1970-01-01T${shift.end_time}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return acc;
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return acc + Math.max(0, diff);
  }, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleClose}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Schedule</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleClose}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
          <View style={styles.heroInfo}>
            <Text style={styles.heroLabel}>Total Working Hours</Text>
            <Text style={styles.heroValue}>
              {totalHours.toFixed(1)}h <Text style={styles.heroSub}>/ week</Text>
            </Text>
          </View>
          <View style={styles.heroIconBox}>
            <Ionicons name="calendar" size={28} color={THEME.white} />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Active Shifts</Text>

        {shifts.map((shift, index) => (
          <View key={`${shift.day}-${index}`} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.dotIndicator}>
                <View style={styles.innerDot} />
              </View>
              {index !== shifts.length - 1 && <View style={styles.connectorLine} />}
            </View>

            <TouchableOpacity style={styles.shiftCard} activeOpacity={0.9}>
              <View style={styles.cardTop}>
                <Text style={styles.dayText}>{shift.day}</Text>
                <View style={styles.locationBadge}>
                  <Text style={styles.locationText}>Clinic</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={16} color={THEME.accentBlue} />
                  <Text style={styles.timeText}>
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </Text>
                </View>
                <View style={styles.capacityRow}>
                  <Ionicons name="people-outline" size={16} color={THEME.textGray} />
                  <Text style={styles.capacityText}>
                    {shift.max_patients ?? "Not set"} Patients
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ))}

        {!onConfirm && shifts.length > 0 ? (
          <TouchableOpacity style={styles.doneButton} activeOpacity={0.9} onPress={handleConfirm}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        ) : null}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: THEME.textDark },
  backBtn: { width: 44, height: 44, justifyContent: "center" },
  editBtn: { backgroundColor: THEME.softBlue, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  editBtnText: { color: THEME.accentBlue, fontWeight: "700" },

  body: { flex: 1, backgroundColor: THEME.background },
  container: { padding: 24 },

  heroCard: {
    backgroundColor: THEME.textDark,
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  heroInfo: {
    flex: 1,
    paddingRight: 16,
  },
  heroLabel: { color: THEME.white, opacity: 0.7, fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  heroValue: { color: THEME.white, fontSize: 28, fontWeight: "800", marginTop: 4 },
  heroSub: { fontSize: 14, fontWeight: "400", opacity: 0.6 },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  sectionLabel: { fontSize: 14, fontWeight: "800", color: THEME.textGray, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 },

  timelineItem: { flexDirection: "row" },
  timelineLeft: { width: 40, alignItems: "center" },
  dotIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.accentBlue },
  connectorLine: { width: 2, flex: 1, backgroundColor: THEME.border, marginVertical: 4 },

  shiftCard: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  dayText: { fontSize: 16, fontWeight: "800", color: THEME.textDark },
  locationBadge: { backgroundColor: THEME.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  locationText: { fontSize: 10, fontWeight: "700", color: THEME.textGray },

  cardBody: { gap: 8 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeText: { fontSize: 14, fontWeight: "700", color: THEME.textDark },
  capacityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  capacityText: { fontSize: 13, color: THEME.textGray, fontWeight: "500" },
  doneButton: {
    backgroundColor: THEME.accentBlue,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  doneButtonText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
