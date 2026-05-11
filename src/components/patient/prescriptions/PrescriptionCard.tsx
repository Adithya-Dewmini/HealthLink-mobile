import React, { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MedicineItem, { type PrescriptionMedicine } from "./MedicineItem";
import ProgressBar from "./ProgressBar";
import { patientTheme } from "../../../constants/patientTheme";

const THEME = patientTheme.colors;

export type PrescriptionCardData = {
  id: string;
  title: string;
  doctorName: string;
  specialization: string;
  prescribedAt: string | null;
  status: "ACTIVE" | "COMPLETED";
  medicines: PrescriptionMedicine[];
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

function PrescriptionCardComponent({
  item,
}: {
  item: PrescriptionCardData;
}) {
  const totalDays = useMemo(
    () => Math.max(item.medicines.reduce((max, med) => Math.max(max, med.duration), 0), 0),
    [item.medicines]
  );

  const daysPassed = useMemo(() => {
    if (!item.prescribedAt || totalDays <= 0) return 0;
    const start = new Date(item.prescribedAt);
    if (Number.isNaN(start.getTime())) return 0;
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(0, Math.min(diff, totalDays));
  }, [item.prescribedAt, totalDays]);

  const progress = totalDays > 0 ? daysPassed / totalDays : 0;
  const isActive = item.status === "ACTIVE";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.docIconBox}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={24}
            color={THEME.primary}
          />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.completedBadge]}>
              <Text style={[styles.statusText, isActive ? styles.activeBadgeText : styles.completedBadgeText]}>
                {item.status}
              </Text>
            </View>
          </View>
          <Text style={styles.doctorName}>
            {item.doctorName} • <Text style={styles.specialtyText}>{item.specialization}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons
          name="calendar-clear-outline"
          size={14}
          color={THEME.textSecondary}
        />
        <Text style={styles.metaText}>{formatDate(item.prescribedAt)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.medsHeader}>
        <Text style={styles.sectionLabel}>Medications</Text>
        {totalDays > 0 ? (
          <Text style={styles.progressText}>
            Day {Math.max(daysPassed, 1)} of {totalDays}
          </Text>
        ) : null}
      </View>

      {item.medicines.map((medicine, index) => (
        <MedicineItem key={`${item.id}-${medicine.name}-${index}`} item={medicine} />
      ))}

      {totalDays > 0 ? <ProgressBar progress={progress} /> : null}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionSecondary}>
          <Ionicons name="qr-code-outline" size={18} color={THEME.primary} />
          <Text style={styles.actionSecondaryText}>View QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPrimary}>
          <MaterialCommunityIcons name="pill" size={18} color={THEME.white} />
          <Text style={styles.actionPrimaryText}>Track Prescription</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.fullWidthBtn}>
        <Ionicons name="storefront-outline" size={18} color={THEME.textPrimary} />
        <Text style={styles.fullWidthBtnText}>Check Availability</Text>
      </TouchableOpacity>
    </View>
  );
}

export default memo(PrescriptionCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    ...patientTheme.shadows.soft,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: { flex: 1, marginLeft: 12 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
    flex: 1,
    paddingRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: { backgroundColor: THEME.successSoft },
  completedBadge: { backgroundColor: THEME.graySoft },
  statusText: { fontSize: 10, fontWeight: "900" },
  activeBadgeText: { color: THEME.success },
  completedBadgeText: { color: THEME.textSecondary },
  doctorName: {
    fontSize: 14,
    color: THEME.textPrimary,
    marginTop: 4,
    fontWeight: "600",
  },
  specialtyText: { color: THEME.textSecondary, fontWeight: "400" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 6 },
  metaText: { fontSize: 12, color: THEME.textSecondary, flex: 1 },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 15 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
  },
  medsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressText: { fontSize: 12, fontWeight: "800", color: THEME.primary },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  actionPrimary: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionPrimaryText: { color: THEME.white, fontWeight: "800" },
  actionSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.softAqua,
    backgroundColor: THEME.highlight,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  actionSecondaryText: { color: THEME.primary, fontWeight: "800" },
  fullWidthBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.highlight,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  fullWidthBtnText: {
    color: THEME.textPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
});
