import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

const THEME = {
  primary: "#2563EB",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  softBlue: "#EFF6FF",
};

export type PrescriptionMedicine = {
  name: string;
  dosage: string;
  frequency: string;
  duration: number;
};

function MedicineItemComponent({ item }: { item: PrescriptionMedicine }) {
  return (
    <View style={styles.medRow}>
      <View style={styles.content}>
        <Text style={styles.medName}>{item.name}</Text>
        <Text style={styles.medFreq}>{item.frequency || "No schedule specified"}</Text>
      </View>
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{item.dosage}</Text>
        </View>
        {item.duration > 0 ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{`${item.duration} day${item.duration === 1 ? "" : "s"}`}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default memo(MedicineItemComponent);

const styles = StyleSheet.create({
  medRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  content: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  medFreq: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  chip: {
    backgroundColor: THEME.softBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: { fontSize: 11, fontWeight: "700", color: THEME.primary },
});
