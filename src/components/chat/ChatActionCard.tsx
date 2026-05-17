import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PatientChatbotAction } from "../../services/chatbotApi";
import { patientTheme } from "../../constants/patientTheme";

const THEME = patientTheme.colors;

type Props = {
  action: PatientChatbotAction;
  onPress: () => void;
  subtitle?: string;
};

const ACTION_META: Record<
  PatientChatbotAction["type"],
  { icon: keyof typeof Ionicons.glyphMap; title: string; accent: string; urgent?: boolean }
> = {
  OPEN_DOCTOR_SEARCH: { icon: "search", title: "Find suitable doctors", accent: THEME.primary },
  SHOW_SESSION_RESULTS: { icon: "calendar-outline", title: "Available sessions", accent: THEME.info },
  SELECT_SESSION: { icon: "checkmark-circle-outline", title: "Choose this session", accent: THEME.info },
  CONFIRM_BOOKING: { icon: "shield-checkmark-outline", title: "Confirm appointment", accent: THEME.primary },
  OPEN_QUEUE: { icon: "time-outline", title: "Check your queue", accent: THEME.primaryBlue },
  OPEN_APPOINTMENTS: { icon: "calendar-clear-outline", title: "View appointments", accent: THEME.primaryBlue },
  OPEN_PRESCRIPTIONS: { icon: "receipt-outline", title: "View prescriptions", accent: THEME.info },
  OPEN_MEDICAL_RECORDS: { icon: "document-text-outline", title: "Medical records", accent: THEME.info },
  SHOW_MEDICINE_RESULTS: { icon: "medkit-outline", title: "Medicine results", accent: THEME.primary },
  SHOW_PHARMACY_RESULTS: { icon: "storefront-outline", title: "Pharmacy results", accent: THEME.info },
  OPEN_PHARMACY_SEARCH: { icon: "search-outline", title: "Search pharmacies", accent: THEME.info },
  OPEN_PHARMACY_PRODUCT: { icon: "cube-outline", title: "View product details", accent: THEME.info },
  ADD_TO_CART: { icon: "cart-outline", title: "Add item to cart", accent: THEME.primary },
  CONFIRM_ADD_TO_CART: { icon: "checkmark-done-outline", title: "Confirm cart item", accent: THEME.primary },
  OPEN_CART: { icon: "cart-outline", title: "Open cart", accent: THEME.primaryBlue },
  OPEN_ORDER_STATUS: { icon: "receipt-outline", title: "Track medicine orders", accent: THEME.primaryBlue },
  OPEN_PRESCRIPTION_ORDER: { icon: "qr-code-outline", title: "Prescription fulfilment", accent: THEME.info },
  BOOK_DOCTOR_FOR_MEDICINE: { icon: "medkit-outline", title: "Book a doctor", accent: THEME.primary },
  CALL_EMERGENCY: { icon: "warning-outline", title: "Urgent care needed", accent: THEME.danger, urgent: true },
  ASK_FOLLOW_UP: { icon: "chatbubble-ellipses-outline", title: "Tell MediMate more", accent: THEME.info },
  CLEAR_CONTEXT: { icon: "trash-outline", title: "Clear chat context", accent: THEME.textMuted },
};

export default function ChatActionCard({ action, onPress, subtitle }: Props) {
  const meta = ACTION_META[action.type];
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={meta.title}
      style={[styles.card, meta.urgent ? styles.cardUrgent : null]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${meta.accent}16` }]}>
        <Ionicons name={meta.icon} size={18} color={meta.accent} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{meta.title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.cta, { backgroundColor: meta.accent }]}>
        <Text style={styles.ctaText}>{action.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 13,
  },
  cardUrgent: {
    backgroundColor: "#FFF4F4",
    borderColor: "#F8C9C9",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    color: THEME.textPrimary,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  cta: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
