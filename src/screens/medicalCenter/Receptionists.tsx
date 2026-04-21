import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { MedicalCenterStackParamList } from "../../types/navigation";

const THEME = {
  primary: "#2F6FED",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  success: "#10B981",
  danger: "#EF4444",
  softBlue: "#EFF6FF",
  softGreen: "#DCFCE7",
  softRed: "#FEE2E2",
};

type Receptionist = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  permissions: string[];
  isPasswordSet: boolean;
};

type FilterValue = "all" | "active" | "disabled";

const FILTERS: Array<{ key: FilterValue; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
];

export default function MedicalCenterReceptionists() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MedicalCenterStackParamList>>();
  const tabBarHeight = useBottomTabBarHeight();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceptionists = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/center/receptionists");
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data.message || "Failed to load receptionists");
      }

      const mapped = (Array.isArray(data) ? data : []).map((item: any): Receptionist => ({
        id: String(item.id),
        name: String(item.name || "Receptionist"),
        email: String(item.email || ""),
        phone: String(item.phone || "No phone added"),
        isActive: String(item.status || "ACTIVE").toUpperCase() === "ACTIVE",
        isPasswordSet: Boolean(item.is_password_set),
        permissions:
          item.is_password_set === false
            ? ["Invite Pending"]
            : ["Queue Access", "Appointments", "Check-in"],
      }));

      setReceptionists(mapped);
    } catch (error) {
      console.log("Load receptionists error:", error);
      setReceptionists([]);
      Alert.alert("Error", "Unable to load receptionists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchReceptionists();
    }, [fetchReceptionists])
  );

  const stats = useMemo(() => {
    const total = receptionists.length;
    const active = receptionists.filter((item) => item.isActive).length;
    const disabled = total - active;
    return { total, active, disabled };
  }, [receptionists]);

  const filteredReceptionists = useMemo(() => {
    const query = search.trim().toLowerCase();

    return receptionists.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.phone.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query);

      if (activeFilter === "active") return matchesSearch && item.isActive;
      if (activeFilter === "disabled") return matchesSearch && !item.isActive;
      return matchesSearch;
    });
  }, [activeFilter, receptionists, search]);

  const toggleReceptionist = async (receptionistId: string, isActive: boolean) => {
    try {
      const response = await apiFetch(`/api/center/receptionists/${receptionistId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isActive ? "INACTIVE" : "ACTIVE",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update receptionist status");
      }

      setReceptionists((current) =>
        current.map((item) =>
          item.id === receptionistId ? { ...item, isActive: !item.isActive } : item
        )
      );
    } catch (error: any) {
      Alert.alert("Update Failed", error?.message || "Unable to update status.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="menu-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Receptionists</Text>
          <Text style={styles.headerSubtitle}>Manage clinic staff</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="options-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={THEME.primary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search receptionist..."
              placeholderTextColor={THEME.textSecondary}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter-outline" size={20} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.statsRow}>
          <StatsCard
            icon="people-outline"
            label="Total"
            value={String(stats.total)}
            tint="#DBEAFE"
            color={THEME.primary}
          />
          <StatsCard
            icon="checkmark-circle-outline"
            label="Active"
            value={String(stats.active)}
            tint={THEME.softGreen}
            color={THEME.success}
          />
          <StatsCard
            icon="power-outline"
            label="Disabled"
            value={String(stats.disabled)}
            tint={THEME.softRed}
            color={THEME.danger}
          />
        </View>

        <Text style={styles.sectionLabel}>Receptionist List</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : filteredReceptionists.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={32} color={THEME.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No receptionists found</Text>
            <Text style={styles.emptyText}>
              Start by adding new staff members to your clinic.
            </Text>
          </View>
        ) : (
          filteredReceptionists.map((item) => (
            <ReceptionistCard
              key={item.id}
              receptionist={item}
              onToggle={() => toggleReceptionist(item.id, item.isActive)}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 36 }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("MedicalCenterAddReceptionist")}
      >
        <Ionicons name="add" size={30} color={THEME.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatsCard({
  icon,
  label,
  value,
  tint,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
  color: string;
}) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  );
}

function ReceptionistCard({
  receptionist,
  onToggle,
}: {
  receptionist: Receptionist;
  onToggle: () => void;
}) {
  const initials = receptionist.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const badgeStyles = receptionist.isActive
    ? { bg: THEME.softGreen, text: THEME.success, label: "Active" }
    : { bg: THEME.softRed, text: THEME.danger, label: "Disabled" };

  const getPermissionStyles = (permission: string) => {
    if (permission.toLowerCase().includes("queue")) {
      return { backgroundColor: "#E0F2FE", color: "#0369A1" };
    }
    if (permission.toLowerCase().includes("appointment")) {
      return { backgroundColor: "#EDE9FE", color: "#6D28D9" };
    }
    if (permission.toLowerCase().includes("billing")) {
      return { backgroundColor: "#FEF3C7", color: "#B45309" };
    }
    if (permission.toLowerCase().includes("check-in")) {
      return { backgroundColor: "#DCFCE7", color: "#15803D" };
    }
    if (permission.toLowerCase().includes("invite")) {
      return { backgroundColor: "#FEF3C7", color: "#B45309" };
    }
    return { backgroundColor: THEME.softBlue, color: THEME.primary };
  };

  return (
    <TouchableOpacity activeOpacity={0.96} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.name}>{receptionist.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeStyles.bg }]}>
              <Text style={[styles.statusText, { color: badgeStyles.text }]}>
                {badgeStyles.label}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={14} color={THEME.textSecondary} />
            <Text style={styles.infoText}>{receptionist.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color={THEME.textSecondary} />
            <Text style={styles.infoText}>{receptionist.phone}</Text>
          </View>
        </View>
      </View>

      <View style={styles.permissionsRow}>
        {receptionist.permissions.map((permission) => {
          const permissionStyles = getPermissionStyles(permission);

          return (
            <View
              key={permission}
              style={[styles.permissionChip, { backgroundColor: permissionStyles.backgroundColor }]}
            >
              <Text style={[styles.permissionChipText, { color: permissionStyles.color }]}>
                {permission}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.outlineButton}>
          <Ionicons name="create-outline" size={15} color={THEME.primary} />
          <Text style={styles.outlineButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.outlineButton} onPress={onToggle}>
          <Ionicons name="power-outline" size={15} color={THEME.textSecondary} />
          <Text style={styles.neutralButtonText}>
            {receptionist.isActive ? "Disable" : "Enable"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="shield-checkmark-outline" size={15} color={THEME.white} />
          <Text style={styles.primaryButtonText}>Permissions</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
  },
  headerText: { flex: 1, marginHorizontal: 14 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: THEME.textSecondary },
  content: { padding: 20, paddingBottom: 110 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  searchBar: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: THEME.textPrimary },
  filterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  filterPills: { gap: 10, paddingTop: 16, paddingBottom: 10 },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterPillActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  filterPillText: { fontSize: 13, fontWeight: "700", color: THEME.textSecondary },
  filterPillTextActive: { color: THEME.white },
  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 6 },
  statsCard: {
    flex: 1,
    minHeight: 100,
    borderRadius: 18,
    padding: 16,
    backgroundColor: THEME.white,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statsValue: { fontSize: 22, fontWeight: "800" },
  statsLabel: { marginTop: 4, fontSize: 12, color: THEME.textSecondary },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 14,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDEBFF",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: THEME.primary },
  cardBody: { flex: 1, marginLeft: 14 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { flex: 1, fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: "800" },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  infoText: { marginLeft: 8, fontSize: 13, color: THEME.textSecondary },
  permissionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  permissionChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  permissionChipText: { fontSize: 12, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  outlineButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  outlineButtonText: { fontSize: 12, fontWeight: "700", color: THEME.primary },
  neutralButtonText: { fontSize: 12, fontWeight: "700", color: THEME.textSecondary },
  primaryButton: {
    flex: 1.25,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: THEME.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryButtonText: { fontSize: 12, fontWeight: "700", color: THEME.white },
  emptyState: {
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF2F7",
  },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  emptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    color: THEME.textSecondary,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.success,
    shadowColor: THEME.success,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
