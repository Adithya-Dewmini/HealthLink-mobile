import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type SharedPrescriptionMedicineCardData = {
  medicineName: string;
  meta?: string | null;
  instructions?: string | null;
  currentStock: number;
  requiredQuantity?: number | null;
  dispensedQuantity?: number | null;
  remainingQuantity?: number | null;
  lowStockAlert?: boolean | null;
  demandCount?: number | null;
  substitutions?: Array<{
    medicineId: number;
    medicineName: string;
    availableStock: number;
    unitPrice: number | null;
    matchType?: string;
    matchLabel?: string;
    requiresPharmacistReview?: boolean;
  }> | null;
};

type InteractiveProps = {
  selected: boolean;
  disabled?: boolean;
  quantity: number;
  maxQuantity: number;
  unitPrice?: number;
  onToggle: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
};

type FooterPill = {
  label: string;
  tone: "warning" | "neutral" | "success";
};

type Props = {
  item: SharedPrescriptionMedicineCardData;
  interactive?: InteractiveProps;
  warningMessage?: string | null;
  footerPill?: FooterPill | null;
};

const THEME = {
  white: "#FFFFFF",
  textPrimary: "#122033",
  textSecondary: "#64748B",
  danger: "#EF4444",
  dangerTint: "#FEF2F2",
  successTint: "#E9F8F1",
  primary: "#2BB673",
  warningBg: "#FFF7ED",
  warningText: "#C2410C",
  neutralBg: "#EEF2F7",
  border: "#EEF2F7",
};

export default function PrescriptionMedicineCard({
  item,
  interactive,
  warningMessage,
  footerPill,
}: Props) {
  const remainingQuantity =
    typeof item.remainingQuantity === "number"
      ? item.remainingQuantity
      : typeof item.requiredQuantity === "number"
        ? item.requiredQuantity - Number(item.dispensedQuantity ?? 0)
        : null;
  const insufficient =
    typeof remainingQuantity === "number" ? item.currentStock < remainingQuantity : item.currentStock <= 0;
  const statusLabel = insufficient ? "Insufficient" : "Ready";

  return (
    <View style={[styles.medicineCard, (insufficient || warningMessage) && styles.medicineCardAlert]}>
      <View style={styles.medicineHeader}>
        {interactive ? (
          <TouchableOpacity
            style={styles.checkboxWrap}
            onPress={interactive.onToggle}
            disabled={interactive.disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: interactive.selected, disabled: interactive.disabled }}
            accessibilityLabel={
              interactive.disabled
                ? `${item.medicineName} is unavailable`
                : interactive.selected
                  ? `Remove ${item.medicineName} from dispense`
                  : `Add ${item.medicineName} to dispense`
            }
          >
            <Ionicons
              name={interactive.selected ? "checkbox" : "square-outline"}
              size={24}
              color={interactive.selected ? THEME.primary : THEME.textSecondary}
            />
          </TouchableOpacity>
        ) : null}

        <View style={styles.medicineTitleWrap}>
          <Text style={styles.medicineName} numberOfLines={2}>
            {item.medicineName}
          </Text>
          {item.meta ? (
            <Text style={styles.medicineMeta} numberOfLines={2}>
              {item.meta}
            </Text>
          ) : null}
          {item.instructions ? <Text style={styles.instructions}>{item.instructions}</Text> : null}
        </View>

        <View style={styles.headerSide}>
          {interactive?.unitPrice != null ? (
            <Text style={styles.priceText} numberOfLines={1}>
              LKR {interactive.unitPrice.toFixed(2)}
            </Text>
          ) : null}
          <View style={[styles.stockBadge, insufficient ? styles.stockBadgeDanger : styles.stockBadgeOk]}>
            <Text
              style={[
                styles.stockBadgeText,
                insufficient ? styles.stockBadgeTextDanger : styles.stockBadgeTextOk,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {typeof item.requiredQuantity === "number" ? (
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Required</Text>
            <Text style={styles.statValue}>{item.requiredQuantity}</Text>
          </View>
        ) : null}

        {typeof remainingQuantity === "number" ? (
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={[styles.statValue, remainingQuantity > 0 && insufficient && styles.statValueDanger]}>
              {Math.max(0, remainingQuantity)}
            </Text>
          </View>
        ) : null}

        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Available Stock</Text>
          <Text style={[styles.statValue, insufficient && styles.statValueDanger]}>{item.currentStock}</Text>
        </View>

        {interactive ? (
          <View style={styles.quantityBlock}>
            <Text style={styles.statLabel}>Dispense Qty</Text>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  (!interactive.selected || interactive.quantity <= 1) && styles.qtyBtnDisabled,
                ]}
                onPress={interactive.onDecrease}
                disabled={!interactive.selected || interactive.quantity <= 1}
                accessibilityRole="button"
                accessibilityLabel={`Decrease quantity for ${item.medicineName}`}
              >
                <Ionicons name="remove" size={16} color={THEME.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{interactive.quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  (!interactive.selected || interactive.quantity >= interactive.maxQuantity) &&
                    styles.qtyBtnDisabled,
                ]}
                onPress={interactive.onIncrease}
                disabled={!interactive.selected || interactive.quantity >= interactive.maxQuantity}
                accessibilityRole="button"
                accessibilityLabel={`Increase quantity for ${item.medicineName}`}
              >
                <Ionicons name="add" size={16} color={THEME.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {warningMessage ? (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={16} color={THEME.warningText} />
          <Text style={styles.warningText}>{warningMessage}</Text>
        </View>
      ) : insufficient ? (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={16} color={THEME.danger} />
          <Text style={[styles.warningText, styles.warningTextDanger]}>
            Not enough stock to dispense this medicine.
          </Text>
        </View>
      ) : null}

      {item.lowStockAlert ? (
        <View style={styles.warningRow}>
          <Ionicons name="trending-up-outline" size={16} color={THEME.warningText} />
          <Text style={styles.warningText}>
            Low stock alert{item.demandCount ? ` based on ${item.demandCount} recent demand log${item.demandCount > 1 ? "s" : ""}` : ""}.
          </Text>
        </View>
      ) : null}

      {item.substitutions?.length ? (
        <View style={styles.substitutionBox}>
          <Text style={styles.substitutionTitle}>Possible substitutes in stock</Text>
          {item.substitutions.map((option) => (
            <View key={option.medicineId} style={styles.substitutionRow}>
              <View style={styles.substitutionCopy}>
                <Text style={styles.substitutionText} numberOfLines={1}>
                  {option.medicineName} • {option.availableStock} available
                </Text>
                <Text
                  style={[
                    styles.substitutionMatch,
                    option.requiresPharmacistReview && styles.substitutionMatchReview,
                  ]}
                  numberOfLines={2}
                >
                  {option.matchLabel || "Alternative option"}
                </Text>
              </View>
              {option.requiresPharmacistReview ? (
                <Ionicons name="shield-checkmark-outline" size={16} color={THEME.warningText} />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {footerPill ? (
        <View
          style={[
            styles.footerPill,
            footerPill.tone === "warning" && styles.footerPillWarning,
            footerPill.tone === "neutral" && styles.footerPillNeutral,
            footerPill.tone === "success" && styles.footerPillSuccess,
          ]}
        >
          <Text
            style={[
              styles.footerPillText,
              footerPill.tone === "warning" && styles.footerPillTextWarning,
              footerPill.tone === "neutral" && styles.footerPillTextNeutral,
              footerPill.tone === "success" && styles.footerPillTextSuccess,
            ]}
          >
            {footerPill.label}
          </Text>
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
    borderColor: THEME.border,
  },
  medicineCardAlert: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFFDF8",
  },
  medicineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  checkboxWrap: {
    paddingTop: 2,
  },
  medicineTitleWrap: { flex: 1 },
  headerSide: {
    alignItems: "flex-end",
    gap: 8,
  },
  medicineName: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  medicineMeta: { fontSize: 13, color: THEME.textSecondary, marginTop: 4, lineHeight: 18 },
  instructions: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  priceText: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 13,
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
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 },
  statBlock: {
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: "#F7F9FB",
    borderRadius: 14,
    padding: 12,
  },
  quantityBlock: {
    flexGrow: 1,
    flexBasis: "36%",
    backgroundColor: "#F7F9FB",
    borderRadius: 14,
    padding: 12,
  },
  statLabel: { fontSize: 12, color: THEME.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  statValueDanger: { color: THEME.danger },
  qtyControl: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.45,
  },
  qtyText: {
    minWidth: 18,
    textAlign: "center",
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    color: THEME.warningText,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  warningTextDanger: {
    color: THEME.danger,
  },
  footerPill: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  footerPillWarning: {
    backgroundColor: THEME.warningBg,
  },
  footerPillNeutral: {
    backgroundColor: THEME.neutralBg,
  },
  footerPillSuccess: {
    backgroundColor: THEME.successTint,
  },
  footerPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  footerPillTextWarning: {
    color: THEME.warningText,
  },
  footerPillTextNeutral: {
    color: THEME.textSecondary,
  },
  footerPillTextSuccess: {
    color: THEME.primary,
  },
  substitutionBox: {
    marginTop: 12,
    backgroundColor: "#F7F9FB",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  substitutionTitle: {
    color: THEME.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  substitutionText: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  substitutionRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    paddingTop: 4,
  },
  substitutionCopy: {
    flex: 1,
    minWidth: 0,
  },
  substitutionMatch: {
    marginTop: 2,
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  substitutionMatchReview: {
    color: THEME.warningText,
  },
});
