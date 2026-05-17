import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { patientTheme } from "../../constants/patientTheme";
import { getDoctorFallbackImage } from "../../utils/imageUtils";

const THEME = patientTheme.colors;

type Props = {
  name: string;
  specialty?: string | null;
  locationLabel?: string | null;
  experienceLabel?: string | null;
  imageUrl?: string | null;
  gender?: string | null;
  verified?: boolean;
  compact?: boolean;
};

export default function PatientDoctorInfoCard({
  name,
  specialty,
  locationLabel,
  experienceLabel,
  imageUrl,
  gender,
  verified = false,
  compact = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [gender, imageUrl]);

  const hasRemoteImage = typeof imageUrl === "string" && imageUrl.trim().length > 0 && !imageFailed;
  const imageSource = hasRemoteImage ? { uri: imageUrl } : getDoctorFallbackImage(gender);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatarPlaceholder}>
          {hasRemoteImage ? null : (
            <LinearGradient colors={[THEME.modernAccent, "#0EA5E9"]} style={styles.avatarGradient} />
          )}
          <Image
            source={imageSource}
            style={[styles.image, compact ? styles.imageCompact : null, !hasRemoteImage ? styles.imageFallback : null]}
            resizeMode={hasRemoteImage ? "cover" : "contain"}
            onError={() => setImageFailed(true)}
          />
          {!hasRemoteImage ? (
            <View style={styles.fallbackAccent}>
              <MaterialCommunityIcons
                name="doctor"
                size={compact ? 18 : 20}
                color="#FFFFFF"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#0F9D58" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.specialty} numberOfLines={1}>
            {specialty || "General Physician"}
          </Text>

          {locationLabel ? (
            <View style={styles.locationPill}>
              <Ionicons name="location-outline" size={12} color={THEME.modernAccent} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
          ) : null}

          {experienceLabel ? <Text style={styles.metaText}>{experienceLabel}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.modernSurface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.modernBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    marginRight: 15,
    position: "relative",
  },
  avatarGradient: {
    position: "absolute",
    inset: 0,
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 20,
    marginRight: 15,
    backgroundColor: "#F3F4F6",
  },
  imageFallback: {
    backgroundColor: "#F5FBFF",
    padding: 4,
  },
  imageCompact: {
    width: 60,
    height: 60,
    borderRadius: 18,
  },
  fallbackAccent: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.modernAccent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  copy: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  name: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "700",
    color: THEME.modernText,
  },
  specialty: {
    fontSize: 14,
    color: THEME.modernMuted,
    marginTop: 3,
    marginBottom: 8,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  locationText: {
    fontSize: 12,
    color: THEME.modernAccent,
    marginLeft: 4,
    fontWeight: "600",
    flexShrink: 1,
  },
  metaText: {
    marginTop: 8,
    fontSize: 13,
    color: THEME.modernMuted,
  },
  verifiedBadge: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E9F8EF",
  },
  verifiedText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F9D58",
  },
});
