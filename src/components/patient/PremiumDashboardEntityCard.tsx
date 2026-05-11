import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
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

export default function PremiumDashboardEntityCard({ 
  title, subtitle, status, metadata, icon, imageUrl, onPress 
}: Props) {
  const isLive = status === "Queue Live";
  
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.cardShell}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name={icon || "business"} size={32} color="#CBD5E1" />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(15, 23, 42, 0.7)"]}
          style={styles.imageOverlay}
        />
        {status && (
          <View style={[styles.statusBadge, isLive && styles.liveBadge]}>
            {isLive && <View style={styles.liveDot} />}
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.subtitleRow}>
          <Ionicons name="location-sharp" size={12} color="#94A3B8" />
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        
        {metadata && (
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>{metadata}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardShell: { 
    width: 260, 
    marginRight: 20, 
    backgroundColor: "#FFFFFF", 
    borderRadius: 35, 
    padding: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 6,
  },
  imageContainer: { 
    width: "100%", 
    height: 150, 
    borderRadius: 28, 
    overflow: "hidden", 
    backgroundColor: "#F8FAFC" 
  },
  image: { width: "100%", height: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  statusBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveBadge: { backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  statusText: { color: "#0F172A", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  content: { paddingHorizontal: 12, paddingVertical: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  subtitleRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  subtitle: { fontSize: 13, color: "#64748B", fontWeight: "500" },
  metaContainer: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "#F1F5F9" },
  metaText: { fontSize: 11, fontWeight: "700", color: "#475569" },
});
