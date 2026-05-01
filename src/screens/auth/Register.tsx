import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthHeader from "../../components/auth/AuthHeader";
import { AUTH_COLORS } from "../../components/auth/authTheme";

const roles = [
  {
    key: "patient",
    label: "Patient",
    description: "Book appointments, view queues, and manage your healthcare.",
    icon: "person-circle-outline" as const,
  },
  {
    key: "doctor",
    label: "Doctor",
    description: "Join the platform, manage consultations, and review appointments.",
    icon: "medkit-outline" as const,
  },
  {
    key: "pharmacist",
    label: "Pharmacist",
    description: "Handle prescriptions, inventory, and dispensing workflows.",
    icon: "flask-outline" as const,
  },
  {
    key: "medical-center",
    label: "Medical Center",
    description: "Create a clinic workspace and manage staff operations.",
    icon: "business-outline" as const,
  },
];

function RoleCard({
  icon,
  label,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.card}
        onPress={onPress}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
      >
        <View style={styles.cardIconWrap}>
          <Ionicons name={icon} size={24} color={AUTH_COLORS.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{label}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={AUTH_COLORS.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function Register({ navigation }: any) {
  const goToForm = (role: string) => {
    switch (role) {
      case "patient":
        navigation.navigate("RegisterPatient");
        break;
      case "doctor":
        navigation.navigate("RegisterDoctor");
        break;
      case "pharmacist":
        navigation.navigate("RegisterPharmacist");
        break;
      case "medical-center":
        navigation.navigate("RegisterMedicalCenter");
        break;
      default:
        break;
    }
  };

  return (
    <AuthLayout>
        <AuthHeader
          icon="apps-outline"
          title="Choose your role"
          subtitle="Select the account type that matches how you use HealthLink."
        />

        {roles.map((role) => (
          <RoleCard
            key={role.key}
            icon={role.icon}
            label={role.label}
            description={role.description}
            onPress={() => goToForm(role.key)}
          />
        ))}

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginText}>Already registered? Log in</Text>
        </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: AUTH_COLORS.primaryDark,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardIconWrap: {
    backgroundColor: AUTH_COLORS.background,
    padding: 10,
    borderRadius: 12,
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AUTH_COLORS.primaryDark,
  },
  cardDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: AUTH_COLORS.textSecondary,
  },
  loginText: {
    color: AUTH_COLORS.primaryDark,
    textAlign: "center",
    marginTop: 18,
    fontSize: 15,
    fontWeight: "600",
  },
});
