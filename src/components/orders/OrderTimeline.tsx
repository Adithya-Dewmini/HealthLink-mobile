import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { OrderSummary } from "../../services/commerceService";
import {
  ORDER_STATUS_LABELS,
  getActiveTimelineStatuses,
  getTimelineSteps,
} from "./orderFlow";

export default function OrderTimeline({ order }: { order: OrderSummary }) {
  const steps = getTimelineSteps(order);
  const activeStatuses = getActiveTimelineStatuses(order);

  return (
    <View style={styles.row}>
      {steps.map((step) => {
        const typedStep = step as OrderSummary["status"];
        const active = activeStatuses.includes(step);
        return (
          <View key={typedStep} style={styles.step}>
            <View style={[styles.dot, active && styles.dotActive]} />
            <Text style={[styles.label, active && styles.labelActive]}>
              {ORDER_STATUS_LABELS[typedStep]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 18,
    gap: 8,
  },
  step: { flex: 1, alignItems: "center" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  dotActive: {
    backgroundColor: "#0F8A5F",
    borderColor: "#0F8A5F",
  },
  label: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
    color: "#64748B",
  },
  labelActive: { color: "#0F172A" },
});
