import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { connectSocket, getSocket } from "../../services/socket";

type ApptStatus = "waiting" | "checked-in" | "with-doctor" | "done";

type Appointment = {
  id: string;
  patient: string;
  doctor: string;
  time: string;
  status: ApptStatus;
};

const appointments: Appointment[] = [
  { id: "AP-401", patient: "Amaya Perera", doctor: "Dr. Silva", time: "09:15", status: "with-doctor" },
  { id: "AP-402", patient: "Ruwan Jayasinghe", doctor: "Dr. Fernando", time: "09:45", status: "checked-in" },
  { id: "AP-403", patient: "Ishara Fernando", doctor: "Dr. Silva", time: "10:10", status: "waiting" },
  { id: "AP-404", patient: "Dilani Senanayake", doctor: "Dr. Perera", time: "10:45", status: "waiting" },
  { id: "AP-405", patient: "Nuwan Alwis", doctor: "Dr. Fernando", time: "11:15", status: "done" },
];

export default function Home() {
  const waiting = useMemo(() => appointments.filter((a) => a.status === "waiting").length, []);
  const checkedIn = useMemo(() => appointments.filter((a) => a.status === "checked-in").length, []);
  const done = useMemo(() => appointments.filter((a) => a.status === "done").length, []);

  useEffect(() => {
    connectSocket("http://172.20.10.4:5050");
    const socket = getSocket();
    if (!socket) return;
    socket.emit("joinReceptionRoom");
    socket.on("queueUpdated", (data: any) => {
      if (data?.type === "QUEUE_STARTED") {
        Alert.alert("Queue Started", "The clinic queue has started.");
      }
      if (data?.type === "CLINIC_ENDED") {
        Alert.alert("Clinic Ended", "Today's clinic session has ended.");
      }
    });
    return () => {
      socket.off("queueUpdated");
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 28 }}
        bounces={false}
      >
        <Text style={styles.heading}>Dashboard</Text>
        <Text style={styles.subheading}>Today&apos;s appointment desk view</Text>

        <View style={styles.metricsRow}>
          <MetricCard label="Appointments today" value={appointments.length.toString()} icon="calendar-outline" color="#1976D2" />
          <MetricCard label="Current queue" value={waiting.toString()} icon="time-outline" color="#FFA000" />
          <MetricCard label="Checked-in" value={checkedIn.toString()} icon="people-outline" color="#2E7D32" />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today&apos;s appointments</Text>
            <Text style={styles.cardCount}>{appointments.length} total</Text>
          </View>
          {appointments.map((appt) => (
            <View key={appt.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{appt.patient}</Text>
                <Text style={styles.rowMeta}>{appt.id} • {appt.doctor}</Text>
              </View>
              <View style={styles.timeWrap}>
                <Ionicons name="time-outline" size={14} color="#0F1E2E" />
                <Text style={styles.timeText}>{appt.time}</Text>
              </View>
              <StatusPill status={appt.status} />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Summary of patients</Text>
            <Text style={styles.cardCount}>Live</Text>
          </View>
          <View style={styles.summaryRow}>
            <SummaryItem label="Waiting" value={waiting.toString()} color="#FFA000" icon="hourglass-outline" />
            <SummaryItem label="Checked-in" value={checkedIn.toString()} color="#1976D2" icon="checkmark-done-outline" />
            <SummaryItem label="Completed" value={done.toString()} color="#2E7D32" icon="checkmark-outline" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: `${color}55` }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: ApptStatus }) {
  const map = {
    waiting: { text: "Waiting", color: "#FFA000" },
    "checked-in": { text: "Checked-in", color: "#1976D2" },
    "with-doctor": { text: "With doctor", color: "#7B1FA2" },
    done: { text: "Done", color: "#2E7D32" },
  };
  const { text, color } = map[status];
  return (
    <View style={[styles.statusPill, { borderColor: color, backgroundColor: `${color}12` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{text}</Text>
    </View>
  );
}

function SummaryItem({ label, value, color, icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <View style={styles.summaryItem}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 0,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  subheading: {
    color: "#5A6676",
    marginBottom: 14,
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E4E9F2",
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F1E2E",
  },
  metricLabel: {
    color: "#5A6676",
    marginTop: 2,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#1C1C1C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F1E2E",
  },
  cardCount: {
    color: "#5A6676",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F6",
  },
  rowTitle: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  rowMeta: {
    color: "#5A6676",
    marginTop: 3,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E9F2",
  },
  timeText: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E4E9F2",
    alignItems: "flex-start",
    gap: 6,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#5A6676",
    fontWeight: "700",
  },
});
