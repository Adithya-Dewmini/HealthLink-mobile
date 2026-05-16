import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useReceptionActiveTask } from "../../hooks/useReceptionActiveTask";
import { fetchReceptionPatients } from "../../services/receptionService";
import { useAuth } from "../../utils/AuthContext";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import { getFriendlyError } from "../../utils/friendlyErrors";
import type { ReceptionistTabParamList } from "../../types/navigation";

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
};

type PatientItem = {
  id: number;
  name: string;
  phone: string | null;
  last_visit: string | null;
  is_recent: boolean;
};

export default function PatientsScreen() {
  useReceptionActiveTask("patients");
  const navigation = useNavigation<BottomTabNavigationProp<ReceptionistTabParamList>>();
  const { receptionistPermissions } = useAuth();
  const canViewPatients =
    receptionistPermissions.check_in || receptionistPermissions.appointments;
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchReceptionPatients();
      setPatients(Array.isArray(data) ? (data as PatientItem[]) : []);
      setError(null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load patients."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPatients("initial");
    }, [loadPatients])
  );

  if (!canViewPatients) {
    return (
      <ReceptionAccessNotAssigned message="Patient records are available only for assigned appointments or check-in work." />
    );
  }

  const filteredPatients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return patients;
    }

    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(normalizedSearch) ||
        String(patient.phone || "").toLowerCase().includes(normalizedSearch)
    );
  }, [patients, search]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Patients</Text>
          <Text style={styles.subtitle}>Search patients created through clinic visits</Text>
        </View>
        <TouchableOpacity
          style={[styles.headerButton, !receptionistPermissions.check_in && { opacity: 0.45 }]}
          onPress={() => navigation.navigate("ReceptionistRegistration")}
          disabled={!receptionistPermissions.check_in}
        >
          <Ionicons name="person-add-outline" size={22} color={THEME.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPatients("refresh")} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={THEME.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholder="Search by name or phone"
              placeholderTextColor={THEME.textSecondary}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Patients unavailable</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={THEME.border} />
              <Text style={styles.emptyTitle}>No patients found</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.metaText}>{item.phone || "No phone number"}</Text>
              <Text style={styles.metaText}>Last visit: {item.last_visit || "N/A"}</Text>
            </View>
            {item.is_recent ? (
              <View style={styles.recentBadge}>
                <Text style={styles.recentBadgeText}>Recent</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, backgroundColor: THEME.white, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  title: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, paddingBottom: 36 },
  searchBar: { flexDirection: "row", alignItems: "center", height: 50, borderRadius: 16, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 14, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: THEME.textPrimary },
  centerState: { paddingVertical: 72, alignItems: "center" },
  errorCard: { backgroundColor: "#FEF2F2", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#B91C1C" },
  errorText: { marginTop: 8, fontSize: 13, color: "#991B1B" },
  emptyState: { paddingTop: 72, alignItems: "center" },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  card: { backgroundColor: THEME.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#E3F2FD", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: THEME.primary },
  patientName: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  metaText: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  recentBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E8F8EF" },
  recentBadgeText: { fontSize: 11, fontWeight: "800", color: "#2BB673" },
});
