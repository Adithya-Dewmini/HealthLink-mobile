import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MedicineRecommendation } from "../../services/chatbotApi";
import { patientTheme } from "../../constants/patientTheme";

const THEME = patientTheme.colors;

type Props = {
  item: MedicineRecommendation;
  onPressViewDetails: (item: MedicineRecommendation) => void;
  onPressPrimary: (item: MedicineRecommendation) => void;
};

const STOCK_META: Record<
  MedicineRecommendation["stockStatus"],
  { label: string; bg: string; text: string }
> = {
  IN_STOCK: { label: "In stock", bg: THEME.successSoft, text: THEME.success },
  LOW_STOCK: { label: "Low stock", bg: THEME.warningSoft, text: THEME.warning },
  OUT_OF_STOCK: { label: "Out of stock", bg: THEME.dangerSoft, text: THEME.danger },
  UNKNOWN: { label: "Availability unknown", bg: THEME.softGray, text: THEME.textSecondary },
};

export default function MedicineResultCard({ item, onPressViewDetails, onPressPrimary }: Props) {
  const stockMeta = STOCK_META[item.stockStatus];
  const primaryLabel = item.requiresPrescription
    ? "Use Prescription"
    : item.stockStatus === "OUT_OF_STOCK"
      ? "Search Pharmacy"
      : "Add to Cart";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="medkit-outline" size={20} color={THEME.primary} />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.name}>{item.medicineName}</Text>
          {!!item.genericName ? <Text style={styles.meta}>{item.genericName}</Text> : null}
          {!!item.brandName ? <Text style={styles.meta}>{item.brandName}</Text> : null}
          {!!item.category ? <Text style={styles.meta}>{item.category}</Text> : null}
          {!!item.pharmacyName ? <Text style={styles.meta}>{item.pharmacyName}</Text> : null}
        </View>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: stockMeta.bg }]}>
          <Text style={[styles.badgeText, { color: stockMeta.text }]}>{stockMeta.label}</Text>
        </View>
        {item.requiresPrescription ? (
          <View style={[styles.badge, styles.badgePrescription]}>
            <Text style={[styles.badgeText, styles.badgePrescriptionText]}>Prescription</Text>
          </View>
        ) : null}
      </View>

      {typeof item.price === "number" ? (
        <Text style={styles.price}>
          {(item.currency || "LKR").toUpperCase()} {item.price.toFixed(2)}
        </Text>
      ) : null}

      {!!item.safetyNote ? <Text style={styles.safety}>{item.safetyNote}</Text> : null}
      {!!item.matchReason ? <Text style={styles.reason}>{item.matchReason}</Text> : null}
      {typeof item.matchConfidence === "number" ? (
        <Text style={styles.confidence}>Match confidence {Math.round(item.matchConfidence)}/10</Text>
      ) : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => onPressViewDetails(item)} activeOpacity={0.88}>
          <Text style={styles.secondaryButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onPressPrimary(item)} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  image: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: THEME.highlight,
  },
  imageFallback: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: THEME.highlight,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    lineHeight: 22,
    color: THEME.textPrimary,
    fontWeight: "800",
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  badgePrescription: {
    backgroundColor: THEME.highlight,
  },
  badgePrescriptionText: {
    color: THEME.primary,
  },
  price: {
    fontSize: 18,
    color: THEME.primary,
    fontWeight: "900",
  },
  safety: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  reason: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  confidence: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: THEME.highlight,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
