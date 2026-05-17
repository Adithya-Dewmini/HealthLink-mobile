import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  status: "Open" | "Closed" | "Queue Live" | null;
  metadata: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

const getStatusTone = (status: Props["status"]) => {
  switch (status) {
    case "Queue Live":
      return {
        bg: "#FFF1F2",
        border: "#FECDD3",
        text: "#BE123C",
        dot: "#EF4444",
      };
    case "Open":
      return {
        bg: "rgba(255,255,255,0.94)",
        border: "rgba(255,255,255,0.82)",
        text: "#0F766E",
        dot: "#10B981",
      };
    case "Closed":
      return {
        bg: "rgba(255,255,255,0.94)",
        border: "rgba(255,255,255,0.82)",
        text: "#475569",
        dot: "#94A3B8",
      };
    default:
      return {
        bg: "rgba(255,255,255,0.94)",
        border: "rgba(255,255,255,0.82)",
        text: "#0F172A",
        dot: "#38BDF8",
      };
  }
};

export default function PremiumDashboardEntityCard({
  title,
  subtitle,
  status,
  metadata,
  icon,
  imageUrl,
  onPress,
}: Props) {
  const tone = getStatusTone(status);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.cardShell}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name={icon || "business-outline"} size={34} color="#A8B6C7" />
          </View>
        )}

        <LinearGradient
          colors={["rgba(2, 6, 23, 0.02)", "rgba(2, 6, 23, 0.12)", "rgba(2, 6, 23, 0.42)"]}
          locations={[0, 0.55, 1]}
          style={styles.imageOverlay}
        />

        {status ? (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: tone.bg,
                borderColor: tone.border,
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: tone.dot }]} />
            <Text style={[styles.statusText, { color: tone.text }]}>{status}</Text>
          </View>
        ) : null}

        <View style={styles.iconChip}>
          <Ionicons name={icon || "business-outline"} size={16} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.contentTopRow}>
          <View style={styles.copyBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.subtitleRow}>
              <Ionicons name="location-sharp" size={13} color="#7C8EA3" />
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.arrowPill}>
            <Ionicons name="arrow-forward" size={15} color="#0F172A" />
          </View>
        </View>

        {metadata ? (
          <View style={styles.metaRow}>
            <View style={styles.metaContainer}>
              <Text style={styles.metaText}>{metadata}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    width: 266,
    marginRight: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7EEF6",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  imageContainer: {
    width: "100%",
    height: 118,
    overflow: "hidden",
    backgroundColor: "#EEF4FA",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FA",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  iconChip: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  contentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  copyBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  subtitle: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  arrowPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#E5EDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaContainer: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F4F8FC",
    borderWidth: 1,
    borderColor: "#E8F0F6",
  },
  metaText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
});
