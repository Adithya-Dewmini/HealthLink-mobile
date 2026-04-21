import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2196F3",
  primaryDark: "#1D4ED8",
  secondary: "#2BB673",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  softBlue: "#E3F2FD",
};

type Doctor = {
  id: string;
  name: string;
  specialty: string;
};

const DOCTORS: Doctor[] = [
  { id: "1", name: "Dr. Silva", specialty: "Cardiologist" },
  { id: "2", name: "Dr. Perera", specialty: "Dermatologist" },
  { id: "3", name: "Dr. Fernando", specialty: "General Physician" },
];

const DATES = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17"];
const SLOTS = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "02:00 PM", "02:30 PM"];

export default function AppointmentBooking() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const isFormValid = Boolean(selectedDoc && selectedDate && selectedTime);

  const selectedDoctor = useMemo(
    () => DOCTORS.find((doctor) => doctor.id === selectedDoc) ?? null,
    [selectedDoc]
  );

  const footerPadding = insets.bottom + tabBarHeight + 16;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Book Appointment</Text>
          <Text style={styles.subtitle}>Assist patient booking</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="calendar-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPadding + 84 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Select Doctor</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DOCTORS}
          contentContainerStyle={styles.listPadding}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const active = selectedDoc === item.id;
            return (
              <TouchableOpacity
                style={[styles.docCard, active && styles.activeDocCard]}
                onPress={() => setSelectedDoc(item.id)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(3)}</Text>
                </View>
                <Text style={styles.docName}>{item.name}</Text>
                <Text style={styles.docSpec}>{item.specialty}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text style={styles.sectionLabel}>Select Date</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DATES}
          contentContainerStyle={styles.listPadding}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const active = selectedDate === item;
            return (
              <TouchableOpacity
                style={[styles.datePill, active && styles.activePill]}
                onPress={() => setSelectedDate(item)}
              >
                <Text style={[styles.dateText, active && styles.activeText]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text style={styles.sectionLabel}>Available Slots</Text>
        <View style={styles.slotGrid}>
          {SLOTS.map((slot) => {
            const active = selectedTime === slot;
            return (
              <TouchableOpacity
                key={slot}
                style={[styles.slot, active && styles.activeSlot]}
                onPress={() => setSelectedTime(slot)}
              >
                <Text style={[styles.slotText, active && styles.activeSlotText]}>{slot}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isFormValid ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.sumLabel}>Appointment Summary</Text>
              <Ionicons name="clipboard-outline" size={20} color={THEME.textSecondary} />
            </View>
            <Text style={styles.sumText}>
              {selectedDate} • {selectedTime}
            </Text>
            <Text style={styles.sumText}>With {selectedDoctor?.name}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPadding }]}>
        <TouchableOpacity
          disabled={!isFormValid}
          style={[styles.confirmBtn, !isFormValid && styles.disabledConfirmBtn]}
        >
          <LinearGradient
            colors={isFormValid ? [THEME.primary, THEME.primaryDark] : ["#CBD5E1", "#CBD5E1"]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.btnText}>Book Appointment</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingBottom: 40 },
  listPadding: { paddingHorizontal: 16, gap: 14 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  docCard: {
    width: 130,
    minHeight: 156,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  activeDocCard: { borderColor: THEME.primary },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: { fontWeight: "800", color: THEME.primary },
  docName: { fontSize: 15, fontWeight: "800", color: THEME.textPrimary, textAlign: "center" },
  docSpec: { fontSize: 12, color: THEME.textSecondary, textAlign: "center", marginTop: 2 },
  datePill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activePill: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  dateText: { fontWeight: "700", color: THEME.textSecondary },
  activeText: { color: THEME.white },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10 },
  slot: {
    width: (width - 64) / 3,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: THEME.white,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeSlot: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  slotText: { fontWeight: "700", color: THEME.textPrimary },
  activeSlotText: { color: THEME.white },
  summaryCard: {
    backgroundColor: THEME.white,
    margin: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sumLabel: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },
  sumText: { fontSize: 14, color: THEME.textSecondary, marginTop: 4 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: THEME.white,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  confirmBtn: { height: 52, borderRadius: 26, overflow: "hidden" },
  disabledConfirmBtn: { opacity: 0.6 },
  gradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  btnText: { color: THEME.white, fontSize: 16, fontWeight: "800" },
});
