import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Appointment = {
  id: string;
  patient: string;
  doctor: string;
  time: string;
  status: "confirmed" | "rescheduled" | "cancelled";
};

const sampleAppointments: Appointment[] = [
  { id: "AP-501", patient: "Amaya Perera", doctor: "Dr. Silva", time: "09:30", status: "confirmed" },
  { id: "AP-502", patient: "Ruwan Jayasinghe", doctor: "Dr. Fernando", time: "10:00", status: "rescheduled" },
  { id: "AP-503", patient: "Ishara Fernando", doctor: "Dr. Silva", time: "10:45", status: "confirmed" },
  { id: "AP-504", patient: "Dilani Senanayake", doctor: "Dr. Perera", time: "11:15", status: "cancelled" },
];

export default function AppointmentManagement() {
  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(
    () =>
      sampleAppointments.filter(
        (appt) =>
          appt.patient.toLowerCase().includes(filter.toLowerCase()) ||
          appt.id.toLowerCase().includes(filter.toLowerCase())
      ),
    [filter]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 28 }}
        bounces={false}
      >
        <Text style={styles.heading}>Appointment Management</Text>
        <Text style={styles.subheading}>Create, reschedule, or cancel bookings</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Create appointment</Text>
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={14} color="#1976D2" />
              <Text style={styles.badgeText}>New booking</Text>
            </View>
          </View>

          <LabeledInput label="Patient name" value={patient} onChangeText={setPatient} placeholder="Enter patient name" />
          <LabeledInput label="Doctor" value={doctor} onChangeText={setDoctor} placeholder="Assign doctor" />
          <LabeledInput label="Time" value={time} onChangeText={setTime} placeholder="e.g. 10:30" />
          <LabeledInput
            label="Notes (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Extra info for the doctor"
          />

          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Save appointment</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Edit / reschedule</Text>
            <View style={styles.badge}>
              <Ionicons name="create-outline" size={14} color="#1976D2" />
              <Text style={styles.badgeText}>Live list</Text>
            </View>
          </View>

          <LabeledInput
            label="Search by name or ID"
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter appointments"
          />

          {filtered.map((appt) => (
            <View key={appt.id} style={styles.apptRow}>
              <View style={styles.apptHeader}>
                <View>
                  <Text style={styles.apptTitle}>{appt.patient}</Text>
                  <Text style={styles.apptMeta}>{appt.id} • {appt.doctor}</Text>
                </View>
                <StatusPill status={appt.status} />
              </View>
              <View style={styles.apptBody}>
                <View style={styles.timeChip}>
                  <Ionicons name="time-outline" size={14} color="#0F1E2E" />
                  <Text style={styles.timeText}>{appt.time}</Text>
                </View>
                <View style={styles.actionsRow}>
                  <ActionButton label="Reschedule" icon="time-outline" />
                  <ActionButton label="Cancel booking" icon="close-circle-outline" type="danger" />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: Appointment["status"] }) {
  const map = {
    confirmed: { text: "Confirmed", color: "#2E7D32" },
    rescheduled: { text: "Rescheduled", color: "#FFA000" },
    cancelled: { text: "Cancelled", color: "#D14343" },
  };
  const { text, color } = map[status];
  return (
    <View style={[styles.statusPill, { borderColor: color, backgroundColor: `${color}12` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{text}</Text>
    </View>
  );
}

function ActionButton({ label, icon, type }: { label: string; icon: any; type?: "danger" }) {
  const color = type === "danger" ? "#D14343" : "#1976D2";
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#1976D2",
    fontWeight: "700",
  },
  label: {
    fontWeight: "700",
    color: "#0F1E2E",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E4E9F2",
    color: "#0F1E2E",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#1976D2",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  apptRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F6",
    gap: 10,
  },
  apptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  apptTitle: {
    fontWeight: "800",
    color: "#0F1E2E",
  },
  apptMeta: {
    color: "#5A6676",
    marginTop: 2,
  },
  apptBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: "#E4E9F2",
  },
  timeText: {
    color: "#0F1E2E",
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  actionText: {
    fontWeight: "700",
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
});
