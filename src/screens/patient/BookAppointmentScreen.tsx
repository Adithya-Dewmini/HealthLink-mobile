import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E3F2FD",
  accentGreen: "#4CAF50",
  softGreen: "#E8F5E9",
  accentAmber: "#FF9800",
  softAmber: "#FFF3E0",
  accentCoral: "#FF5252",
  softCoral: "#FFEBEE",
  border: "#E0E6ED",
  shadow: "#000",
};

export default function BookAppointmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const generateRollingDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: String(date.getDate()).padStart(2, "0"),
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }
    return dates;
  };

  const [dates] = useState(generateRollingDates());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState("10:00 AM");

  const isSameDay = (date1: Date, date2: Date) =>
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();

  const isToday = isSameDay(selectedDate, new Date());
  const { width } = Dimensions.get("window");

  const slots = [
    "09:00 AM", "09:30 AM", "10:00 AM",
    "10:30 AM", "11:00 AM", "11:30 AM",
    "02:00 PM", "02:30 PM", "03:00 PM",
  ];

  // Mocked availability / queue state
  const doctorAvailable = true;
  const queueFull = false;

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirm = () => {
    setShowConfirmModal(false);
    // TODO: call API (joinQueue / bookToken)
    navigation.navigate("AppointmentSummaryScreen", {
      doctorName: "Dr. Silva",
      clinicName: "Family Care Clinic",
      specialty: "General Physician",
      date: selectedDate.toISOString(),
      clinicTime: selectedSlot,
      tokenNumber: "13",
      nowServing: "08",
      estimatedWait: "25 min",
      queueOpensAt: "8:45 AM",
    });
  };


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={THEME.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book your appointment</Text>
        <TouchableOpacity style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color={THEME.textGray} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Doctor Identity Card */}
        <View style={styles.doctorCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
               <Ionicons name="person" size={32} color={THEME.accentBlue} />
            </View>
            <View style={styles.onlineBadge} />
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docName}>Dr. Silva</Text>
            <Text style={styles.docSpec}>General Physician • Cardiologist</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text style={styles.ratingText}>4.9 (120 Reviews)</Text>
            </View>
          </View>
        </View>

        {/* Calendar Strip */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Select Date</Text>
            <Text style={styles.monthLabel}>March 2026</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {dates.map((item) => {
              const itemDate = new Date(item.year, item.month, Number(item.date));
              const isActive = isSameDay(selectedDate, itemDate);
              return (
                <TouchableOpacity
                  key={item.date}
                  onPress={() => setSelectedDate(itemDate)}
                  style={[styles.dateCard, isActive && styles.activeDateCard]}
                >
                  <Text style={[styles.dateDay, isActive && styles.activeText]}>{item.day}</Text>
                  <Text style={[styles.dateNumber, isActive && styles.activeText]}>{item.date}</Text>
                  {isActive && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Availability Logic */}
        {!doctorAvailable ? (
          <DoctorNotAvailableCard />
        ) : !isToday ? (
          <View style={styles.futureCard}>
            <View style={styles.futureHeaderRow}>
              <Text style={styles.futureTitle}>Available Slots</Text>
              <Text style={styles.futureMonth}>
                {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
            </View>

            <View style={styles.futureExtraTop}>
              <Text style={styles.futureExtraLabel}>Expected Queue Opens At</Text>
              <Text style={styles.futureExtraValue}>8:45 AM</Text>
            </View>

            <View style={styles.futureSlotGrid}>
              {slots.map((time) => {
                const isSelected = selectedSlot === time;
                return (
                  <TouchableOpacity
                    key={time}
                    onPress={() => setSelectedSlot(time)}
                    style={[
                      styles.futureSlotCard,
                      isSelected && styles.futureSlotCardActive,
                      { width: (width - 110) / 3 },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={isSelected ? THEME.white : THEME.accentBlue}
                    />
                    <Text style={[styles.futureSlotTimeText, isSelected && styles.futureTextWhite]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.futureFooter}>
              <View style={styles.futureSummaryInfo}>
                <Text style={styles.futureSummaryLabel}>Selected Slot</Text>
                <Text style={styles.futureSummaryValue}>
                  {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {selectedSlot}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.futureConfirmBtn}
                onPress={() => setShowConfirmModal(true)}
              >
                <Ionicons name="arrow-forward" size={24} color={THEME.white} />
              </TouchableOpacity>
            </View>
          </View>
        ) : queueFull ? (
          <QueueFullCard />
        ) : (
          <QueueStatusCard />
        )}

        {/* Selection Summary */}
        <View style={styles.summaryBox}>
          <Ionicons name="calendar" size={20} color={THEME.accentBlue} />
          <Text style={styles.summaryText}>
            Booking for{" "}
            <Text style={styles.boldText}>
              {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          </Text>
        </View>

      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.mainActionBtn}
          onPress={() => setShowConfirmModal(true)}
        >
          <Text style={styles.actionBtnText}>
            {isToday ? "Join Queue" : "Book Token For This Day"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={THEME.white} />
        </TouchableOpacity>
      </View>

      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrapper}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="calendar-outline" size={32} color={THEME.accentBlue} />
              </View>
            </View>

            <Text style={styles.modalTitle}>
              {isToday ? "Confirm Queue Join" : "Confirm Appointment"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isToday
                ? "Your token and estimated wait will be confirmed."
                : "Please review your appointment details before confirming."}
            </Text>

            <View style={styles.modalInfoCard}>
              {isToday ? (
                <>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="ticket-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>Your Token: 13</Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="time-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>Estimated Wait: 25 min</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="calendar-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>
                      Date: {selectedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="time-outline" size={18} color={THEME.accentBlue} />
                    <Text style={styles.modalInfoText}>Queue opens at 8:45 AM</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={[styles.modalBtn, styles.modalSecondaryBtn]}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={[styles.modalBtn, styles.modalPrimaryBtn]}>
                <Text style={styles.modalPrimaryText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  scroll: { backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  infoBtn: { padding: 4 },

  scrollContent: { padding: 20 },
  
  doctorCard: {
    flexDirection: "row",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 24,
    marginBottom: 25,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarContainer: { position: "relative" },
  avatar: { 
    width: 60, 
    height: 60, 
    borderRadius: 18, 
    backgroundColor: THEME.softBlue, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  onlineBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.accentGreen,
    borderWidth: 2,
    borderColor: THEME.white,
  },
  docInfo: { marginLeft: 16, flex: 1 },
  docName: { fontSize: 18, fontWeight: "bold", color: THEME.textDark },
  docSpec: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  ratingText: { fontSize: 12, color: THEME.textGray, marginLeft: 4 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  monthLabel: { fontSize: 14, color: THEME.accentBlue, fontWeight: "600" },

  dateScroll: { gap: 12 },
  dateCard: {
    width: 64,
    height: 88,
    borderRadius: 20,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeDateCard: { backgroundColor: THEME.accentBlue, borderColor: THEME.accentBlue },
  dateDay: { fontSize: 12, color: THEME.textGray, marginBottom: 4 },
  dateNumber: { fontSize: 18, fontWeight: "700", color: THEME.textDark },
  activeText: { color: THEME.white },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.white, marginTop: 6 },

  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softBlue,
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  summaryText: { fontSize: 14, color: THEME.textDark },
  boldText: { fontWeight: "700", color: THEME.accentBlue },

  queueCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  futureCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 18,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  futureHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  futureTitle: { fontSize: 17, fontWeight: "700", color: THEME.textDark },
  futureMonth: { fontSize: 13, color: THEME.accentBlue, fontWeight: "600" },
  futureTextWhite: { color: THEME.white },
  futureSlotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  futureSlotCard: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: THEME.white,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
  },
  futureSlotCardActive: {
    backgroundColor: THEME.textDark,
    borderColor: THEME.textDark,
  },
  futureSlotTimeText: { fontSize: 11, fontWeight: "700", color: THEME.textDark },
  futureExtraTop: { marginBottom: 12 },
  futureExtraLabel: { fontSize: 12, color: THEME.textGray, marginBottom: 4 },
  futureExtraValue: { fontSize: 16, fontWeight: "700", color: THEME.textDark, marginBottom: 10 },
  futureFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F3F7",
  },
  futureSummaryInfo: { flex: 1 },
  futureSummaryLabel: { fontSize: 11, color: THEME.textGray, textTransform: "uppercase", letterSpacing: 0.5 },
  futureSummaryValue: { fontSize: 15, fontWeight: "700", color: THEME.textDark, marginTop: 2 },
  futureConfirmBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.accentBlue,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  queueStatusCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    marginTop: 4,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  queueTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  queueTitle: { fontSize: 16, fontWeight: "700", color: THEME.textDark },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.accentGreen },
  liveText: { fontSize: 10, fontWeight: "800", color: THEME.accentGreen },
  queueStatusContainer: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  statusBox: { flex: 1, alignItems: "center" },
  statusLabel: { fontSize: 12, color: THEME.textGray, marginBottom: 5 },
  servingNumber: { fontSize: 28, fontWeight: "800", color: THEME.textDark },
  verticalDivider: { width: 1, height: "60%", backgroundColor: "#DDE3EB" },
  visualQueueContainer: { marginTop: 20, marginBottom: 15 },
  queueInfoText: { fontSize: 13, color: THEME.textGray, textAlign: "center", marginBottom: 12 },
  boldTextDark: { fontWeight: "700", color: THEME.textDark },
  indicatorTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  patientDot: { width: 12, height: 12, borderRadius: 6 },
  servingDot: { backgroundColor: THEME.accentGreen, width: 14, height: 14 },
  waitingDot: { backgroundColor: "#CBD5E0" },
  youAreNext: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.accentBlue,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: THEME.softBlue,
  },
  youText: { color: THEME.white, fontSize: 9, fontWeight: "bold" },
  infoFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F0F3F7",
    paddingTop: 15,
  },
  estTimeText: { fontSize: 13, color: THEME.textGray },
  noticeCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  noticeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  noticeTitle: { fontSize: 14, fontWeight: "700", color: THEME.textDark },
  noticeText: { fontSize: 13, color: THEME.textGray, lineHeight: 18 },
  unavailableCard: {
    backgroundColor: THEME.white,
    borderRadius: 30,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  unavailableHeader: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  unavailableIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: THEME.softAmber,
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableTitle: { fontSize: 17, fontWeight: "700", color: THEME.textDark },
  unavailableSub: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  unavailableDivider: { height: 1, backgroundColor: "#F0F3F7", marginVertical: 12 },
  unavailableInfoBox: {
    flexDirection: "row",
    backgroundColor: THEME.background,
    padding: 16,
    borderRadius: 18,
    gap: 10,
    marginBottom: 20,
  },
  unavailableInfoText: { flex: 1, fontSize: 13, color: THEME.textGray, lineHeight: 18 },
  unavailableBoldText: { fontWeight: "700", color: THEME.textDark },
  unavailableActions: { flexDirection: "row", gap: 12 },
  unavailableSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.border,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  unavailableSecondaryText: { fontSize: 14, fontWeight: "600", color: THEME.textDark },
  unavailablePrimaryBtn: {
    flex: 1.2,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.accentBlue,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
  },
  unavailablePrimaryText: { fontSize: 14, fontWeight: "700", color: THEME.white },
  unavailableLink: { marginTop: 20, alignItems: "center" },
  unavailableLinkText: { fontSize: 12, color: THEME.textGray },
  unavailableLinkAccent: { color: THEME.accentBlue, fontWeight: "700", textDecorationLine: "underline" },
  queueFullCard: {
    backgroundColor: THEME.white,
    borderRadius: 32,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  queueFullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  queueFullIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.softCoral,
    justifyContent: "center",
    alignItems: "center",
  },
  queueFullBadge: {
    backgroundColor: THEME.softCoral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  queueFullBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.accentCoral,
    textTransform: "uppercase",
  },
  queueFullContent: { marginBottom: 24 },
  queueFullTitle: { fontSize: 22, fontWeight: "bold", color: THEME.textDark, marginBottom: 8 },
  queueFullDesc: { fontSize: 14, color: THEME.textGray, lineHeight: 22 },
  queueFullBold: { fontWeight: "700", color: THEME.textDark },
  queueFullAltContainer: { gap: 12 },
  queueFullAltOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.background,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  queueFullAltIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  queueFullAltText: { flex: 1, marginLeft: 12 },
  queueFullAltTitle: { fontSize: 15, fontWeight: "700", color: THEME.textDark },
  queueFullAltSub: { fontSize: 12, color: THEME.textGray, marginTop: 2 },
  queueFullSupport: { marginTop: 24, alignItems: "center" },
  queueFullSupportText: { fontSize: 13, color: THEME.textGray },
  queueFullSupportLink: { color: THEME.accentBlue, fontWeight: "700" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: THEME.textDark, marginBottom: 8 },
  cardLine: { fontSize: 13, color: THEME.textGray, marginBottom: 4 },
  cardLineBold: { fontSize: 13, color: THEME.textDark, fontWeight: "700", marginBottom: 6 },
  cardDivider: { height: 1, backgroundColor: "#F0F3F7", marginVertical: 10 },
  primaryActionBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: THEME.textDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryActionText: { color: THEME.white, fontSize: 13, fontWeight: "700" },

  footer: {
    backgroundColor: THEME.white,
    padding: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  mainActionBtn: {
    backgroundColor: THEME.accentBlue,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  actionBtnText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: THEME.white,
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrapper: {
    marginTop: -55,
    backgroundColor: THEME.white,
    borderRadius: 30,
    padding: 8,
  },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: THEME.textDark, marginTop: 15 },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.textGray,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  modalInfoCard: {
    width: "100%",
    backgroundColor: THEME.background,
    borderRadius: 20,
    padding: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalInfoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalInfoText: { fontSize: 14, fontWeight: "600", color: THEME.textDark },
  modalDivider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalPrimaryBtn: {
    backgroundColor: THEME.accentBlue,
    shadowColor: THEME.accentBlue,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSecondaryBtn: {
    backgroundColor: THEME.white,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  modalPrimaryText: { color: THEME.white, fontSize: 16, fontWeight: "700" },
  modalSecondaryText: { color: THEME.textGray, fontSize: 16, fontWeight: "600" },
});

const QueueStatusCard = () => {
  const currentServing = 12;
  const queueLength = 8;
  const nextToken = currentServing + queueLength + 1;

  return (
    <View style={styles.queueStatusCard}>
      <View style={styles.queueHeader}>
        <View style={styles.queueTitleRow}>
          <Text style={styles.queueTitle}>Today's Queue</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Ionicons name="people-outline" size={22} color={THEME.accentBlue} />
      </View>

      <View style={styles.queueStatusContainer}>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Now Serving</Text>
          <Text style={styles.servingNumber}>{currentServing}</Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Next Token</Text>
          <Text style={[styles.servingNumber, { color: THEME.accentBlue }]}>
            {nextToken}
          </Text>
        </View>
      </View>

      <View style={styles.visualQueueContainer}>
        <Text style={styles.queueInfoText}>
          There are <Text style={styles.boldTextDark}>{queueLength} patients</Text> currently waiting.
        </Text>

        <View style={styles.indicatorTrack}>
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.patientDot,
                i === 0 ? styles.servingDot : styles.waitingDot,
              ]}
            />
          ))}
          <View style={styles.youAreNext}>
            <Text style={styles.youText}>You</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoFooter}>
        <Ionicons name="time-outline" size={16} color={THEME.textGray} />
        <Text style={styles.estTimeText}>
          Estimated wait time: <Text style={styles.boldTextDark}>~45 mins</Text>
        </Text>
      </View>
    </View>
  );
};

const DoctorNotAvailableCard = () => (
  <View style={styles.unavailableCard}>
    <View style={styles.unavailableHeader}>
      <View style={styles.unavailableIconBox}>
        <Ionicons name="alert-circle" size={24} color={THEME.accentAmber} />
      </View>
      <View>
        <Text style={styles.unavailableTitle}>Currently Unavailable</Text>
        <Text style={styles.unavailableSub}>Dr. Silva is not seeing patients today</Text>
      </View>
    </View>

    <View style={styles.unavailableDivider} />

    <View style={styles.unavailableInfoBox}>
      <Ionicons name="information-circle-outline" size={18} color={THEME.textGray} />
      <Text style={styles.unavailableInfoText}>
        The doctor is attending a medical conference and will return on
        <Text style={styles.unavailableBoldText}> Tuesday, March 17.</Text>
      </Text>
    </View>

    <View style={styles.unavailableActions}>
      <TouchableOpacity style={styles.unavailableSecondaryBtn}>
        <Ionicons name="notifications-outline" size={18} color={THEME.textDark} />
        <Text style={styles.unavailableSecondaryText}>Notify Me</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.unavailablePrimaryBtn}>
        <Text style={styles.unavailablePrimaryText}>View Others</Text>
        <Ionicons name="arrow-forward" size={18} color={THEME.white} />
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.unavailableLink}>
      <Text style={styles.unavailableLinkText}>
        Need urgent care? <Text style={styles.unavailableLinkAccent}>View Hospital ER</Text>
      </Text>
    </TouchableOpacity>
  </View>
);

const QueueFullCard = () => (
  <View style={styles.queueFullCard}>
    <View style={styles.queueFullHeader}>
      <View style={styles.queueFullIcon}>
        <Ionicons name="people" size={26} color={THEME.accentCoral} />
      </View>
      <View style={styles.queueFullBadge}>
        <Text style={styles.queueFullBadgeText}>Capacity Reached</Text>
      </View>
    </View>

    <View style={styles.queueFullContent}>
      <Text style={styles.queueFullTitle}>Queue is Full Today</Text>
      <Text style={styles.queueFullDesc}>
        The maximum limit of <Text style={styles.queueFullBold}>50 patients</Text> has been reached for
        walk-in tokens. No new tokens are being issued for today.
      </Text>
    </View>

    <View style={styles.queueFullAltContainer}>
      <TouchableOpacity style={styles.queueFullAltOption}>
        <View style={styles.queueFullAltIcon}>
          <Ionicons name="calendar-outline" size={20} color={THEME.accentBlue} />
        </View>
        <View style={styles.queueFullAltText}>
          <Text style={styles.queueFullAltTitle}>Book for Tomorrow</Text>
          <Text style={styles.queueFullAltSub}>Secure your spot early</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.queueFullAltOption}>
        <View style={styles.queueFullAltIcon}>
          <Ionicons name="notifications-outline" size={20} color={THEME.accentBlue} />
        </View>
        <View style={styles.queueFullAltText}>
          <Text style={styles.queueFullAltTitle}>Waiting List</Text>
          <Text style={styles.queueFullAltSub}>Get notified if a slot opens</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.queueFullSupport}>
      <Text style={styles.queueFullSupportText}>
        Need assistance? <Text style={styles.queueFullSupportLink}>Contact Reception</Text>
      </Text>
    </TouchableOpacity>
  </View>
);
