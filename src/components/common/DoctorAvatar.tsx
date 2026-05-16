import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doctorColors, doctorRadius } from "../../constants/doctorTheme";
import { getDisplayInitials } from "../../utils/imageUtils";

type Props = {
  name?: string | null;
  imageUrl?: string | null;
  size?: number;
  fallbackLabel?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  backgroundColor?: string;
};

export default function DoctorAvatar({
  name,
  imageUrl,
  size = 44,
  fallbackLabel = "DR",
  iconName = "person-outline",
  backgroundColor = doctorColors.liveBg,
}: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const initials = getDisplayInitials(name, fallbackLabel);

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      {initials ? (
        <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.32) }]}>{initials}</Text>
      ) : (
        <Ionicons name={iconName} size={Math.max(18, size * 0.46)} color={doctorColors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: "#D9E7E7",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(44,140,137,0.12)",
    overflow: "hidden",
  },
  initials: {
    color: doctorColors.primary,
    fontWeight: "800",
  },
});
