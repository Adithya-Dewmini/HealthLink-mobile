import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../config/api";

type PatientProfile = {
  name?: string;
  email?: string;
  phone?: string;
};

const PRIMARY = "#1976D2";
const BG = "#F5F7FA";
const TEXT = "#0F1E2E";
const MUTED = "#5A6676";

export default function Profile() {
  const [profile, setProfile] = useState<PatientProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      const res = await apiFetch("/api/patients/me");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to load profile");
        setLoading(false);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.log("Profile fetch error:", err);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={[styles.helper, { marginTop: 8 }]}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color="#D14343" />
        <Text style={[styles.helper, { color: "#D14343", marginTop: 8 }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 16 }]}
          onPress={fetchProfile}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Your contact details</Text>

      <View style={styles.card}>
        <InfoRow label="Name" value={profile.name} />
        <InfoRow label="Phone" value={profile.phone} />
        <InfoRow label="Email" value={profile.email} />
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 14,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e3e3e3",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: {
    color: MUTED,
    fontSize: 14,
  },
  rowValue: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 15,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
    padding: 24,
  },
  helper: {
    color: MUTED,
    textAlign: "center",
  },
  button: {
    height: 48,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
