import React from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PharmacyPrescription } from "../../services/pharmacyApi";

const THEME = {
  primary: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#122033",
  textSecondary: "#64748B",
  border: "#E2E8F0",
};

type Props = {
  visible: boolean;
  prescription: PharmacyPrescription | null;
  loading?: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export default function PrescriptionModal({
  visible,
  prescription,
  loading = false,
  onClose,
  onContinue,
}: Props) {
  const items = prescription?.items ?? [];
  const patientName = prescription?.prescription?.patientName || `Prescription #${prescription?.prescription?.id ?? "-"}`;
  const doctorName = prescription?.prescription?.doctorName || "Doctor details unavailable";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Prescription Review</Text>
                <Text style={styles.subtitle}>Confirm items before dispensing</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color={THEME.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Patient</Text>
                <Text style={styles.infoValue}>{patientName}</Text>
                <Text style={styles.metaText}>Doctor: {doctorName}</Text>
                <Text style={styles.metaText}>
                  Medicines: {items.length}
                </Text>
              </View>

              {items.map((item) => (
                <View key={item.id} style={styles.medicineCard}>
                  <View style={styles.cardTop}>
                    <Text style={styles.medicineName}>{item.medicineName}</Text>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockText}>
                        {item.availableStock ?? 0} in stock
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detailText}>Dosage: {item.dosage || "N/A"}</Text>
                  <Text style={styles.detailText}>Frequency: {item.frequency || "N/A"}</Text>
                  <Text style={styles.detailText}>
                    Required Qty: {item.duration || "1 course"}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueBtn, !prescription && styles.disabledBtn]}
                onPress={onContinue}
                disabled={!prescription || loading}
              >
                <Text style={styles.continueText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "82%",
    backgroundColor: THEME.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingBottom: 12,
    gap: 12,
  },
  infoCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
  },
  infoLabel: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  infoValue: {
    color: THEME.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  metaText: {
    color: THEME.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  medicineCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  medicineName: {
    flex: 1,
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  stockBadge: {
    backgroundColor: "#E9F8F1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stockText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  detailText: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  cancelText: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  continueText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
