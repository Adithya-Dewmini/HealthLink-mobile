import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PatientAssistantSessionCard } from "../../services/chatbotApi";

type Props = {
  session: PatientAssistantSessionCard;
  onPress: () => void;
};

export default function SessionResultCard({ session, onPress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Ionicons name="medkit-outline" size={16} color="#0F766E" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.doctor}>{session.doctorName}</Text>
          <Text style={styles.specialty}>{session.specialty}</Text>
        </View>
      </View>

      <View style={styles.metaWrap}>
        <Text style={styles.meta}>{session.medicalCenterName}</Text>
        <Text style={styles.meta}>
          {session.date} at {session.time}
        </Text>
        {typeof session.availableSlots === "number" ? (
          <Text style={styles.meta}>Available slots: {session.availableSlots}</Text>
        ) : null}
      </View>

      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.88}>
        <Text style={styles.buttonText}>Select</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    padding: 13,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F9F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  doctor: {
    fontSize: 16,
    color: "#16324A",
    fontWeight: "800",
  },
  specialty: {
    marginTop: 2,
    fontSize: 14,
    color: "#0F766E",
    fontWeight: "700",
  },
  metaWrap: {
    gap: 4,
    marginBottom: 12,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5F7185",
    fontWeight: "600",
  },
  button: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#0F5E78",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
