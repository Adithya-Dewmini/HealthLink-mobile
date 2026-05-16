import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PharmacyRecommendation } from "../../services/chatbotApi";

type Props = {
  item: PharmacyRecommendation;
  onPress: (item: PharmacyRecommendation) => void;
};

export default function PharmacyResultCard({ item, onPress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="storefront-outline" size={18} color="#0F766E" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{item.pharmacyName}</Text>
          {!!item.address ? <Text style={styles.meta}>{item.address}</Text> : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.openStatus ? <Text style={styles.meta}>{item.openStatus}</Text> : null}
        {typeof item.distanceKm === "number" ? <Text style={styles.meta}>{item.distanceKm.toFixed(1)} km</Text> : null}
        {typeof item.availableItems === "number" ? (
          <Text style={styles.meta}>{item.availableItems} matching items</Text>
        ) : null}
      </View>

      <TouchableOpacity style={styles.button} onPress={() => onPress(item)} activeOpacity={0.88}>
        <Text style={styles.buttonText}>Check Availability</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E8F9F7",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: "#16324A",
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5F7185",
    fontWeight: "600",
  },
  button: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#0F5E78",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
