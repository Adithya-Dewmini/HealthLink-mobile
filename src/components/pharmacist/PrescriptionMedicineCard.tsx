import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PharmacyPrescriptionDetailItem } from "../../services/pharmacyApi";

const THEME = {
  white: "#FFFFFF",
  textPrimary: "#122033",
  textSecondary: "#64748B",
  danger: "#EF4444",
  dangerTint: "#FEF2F2",
  successTint: "#E9F8F1",
  primary: "#2BB673",
};

type Props = {
  item: PharmacyPrescriptionDetailItem;
};

export default function PrescriptionMedicineCard({ item }: Props) {
  const insufficient = item.currentStock < item.requiredQuantity;

  return (
    <View style={[styles.medicineCard, insufficient && styles.medicineCardAlert]}>
      <View style={styles.medicineHeader}>
        <View style={styles.medicineTitleWrap}>
          <Text style={styles.medicineName}>{item.medicineName}</Text>
          <Text style={styles.medicineMeta}>
            {[item.dosage, item.frequency].filter(Boolean).join(" • ") || "Dose unavailable"}
          </Text>
          {item.instructions ? (
            <Text style={styles.instructions}>{item.instructions}</Text>
          ) : null}
        </View>
        <View style={[styles.stockBadge, insufficient ? styles.stockBadgeDanger : styles.stockBadgeOk]}>
          <Text
            style={[
              styles.stockBadgeText,
              insufficient ? styles.stockBadgeTextDanger : styles.stockBadgeTextOk,
            ]}
          >
            {insufficient ? "Insufficient" : "Ready"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Required</Text>
          <Text style={styles.statValue}>{item.requiredQuantity}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Current Stock</Text>
          <Text style={[styles.statValue, insufficient && styles.statValueDanger]}>
            {item.currentStock}
          </Text>
        </View>
      </View>

      {insufficient ? (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={16} color={THEME.danger} />
          <Text style={styles.warningText}>Not enough stock to dispense this medicine.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  medicineCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  medicineCardAlert: {
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
  },
  medicineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  medicineTitleWrap: { flex: 1 },
  medicineName: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  medicineMeta: { fontSize: 13, color: THEME.textSecondary, marginTop: 4, lineHeight: 18 },
  instructions: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stockBadgeOk: { backgroundColor: THEME.successTint },
  stockBadgeDanger: { backgroundColor: THEME.dangerTint },
  stockBadgeText: { fontSize: 11, fontWeight: "800" },
  stockBadgeTextOk: { color: THEME.primary },
  stockBadgeTextDanger: { color: THEME.danger },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statBlock: {
    flex: 1,
    backgroundColor: "#F7F9FB",
    borderRadius: 14,
    padding: 12,
  },
  statLabel: { fontSize: 12, color: THEME.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  statValueDanger: { color: THEME.danger },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    color: THEME.danger,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
});
