import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MedicalCenterStackParamList } from "../../types/navigation";
import {
  createClinicSpecialty,
  deleteClinicSpecialty,
  fetchSpecialties,
  type Specialty,
} from "../../services/specialtiesService";

type Props = NativeStackScreenProps<MedicalCenterStackParamList, "MedicalCenterSpecialties">;

const THEME = {
  primary: "#2F6FED",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  softBlue: "#EEF4FF",
  danger: "#DC2626",
  softRed: "#FEE2E2",
};

export default function SpecialtiesScreen({ navigation }: Props) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [draftName, setDraftName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSpecialties = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchSpecialties();
      setSpecialties(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load specialties");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSpecialties("initial");
  }, [loadSpecialties]);

  const handleCreate = useCallback(async () => {
    const value = draftName.trim();
    if (!value || saving) {
      return;
    }

    setSaving(true);
    try {
      const created = await createClinicSpecialty(value);
      setSpecialties((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setDraftName("");
      setError(null);
    } catch (createError) {
      Alert.alert("Add Specialty", createError instanceof Error ? createError.message : "Failed to add specialty");
    } finally {
      setSaving(false);
    }
  }, [draftName, saving]);

  const confirmDelete = useCallback((specialty: Specialty) => {
    Alert.alert(
      "Delete Specialty",
      `Remove ${specialty.name}? Doctors assigned to it will need a new specialty.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(specialty.id);
            try {
              await deleteClinicSpecialty(specialty.id);
              setSpecialties((current) => current.filter((item) => item.id !== specialty.id));
            } catch (deleteError) {
              Alert.alert(
                "Delete Specialty",
                deleteError instanceof Error ? deleteError.message : "Failed to delete specialty"
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Specialties</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.composerCard}>
        <Text style={styles.sectionLabel}>Add Specialty</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Enter specialty name"
            placeholderTextColor={THEME.textSecondary}
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.addButton, (!draftName.trim() || saving) && styles.addButtonDisabled]}
            onPress={() => void handleCreate()}
            disabled={!draftName.trim() || saving}
          >
            {saving ? <ActivityIndicator color={THEME.white} /> : <Text style={styles.addButtonText}>+ Add Specialty</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={specialties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadSpecialties("refresh")} />}
          ListHeaderComponent={
            error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Could not load specialties</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="medkit-outline" size={28} color={THEME.textSecondary} />
              <Text style={styles.emptyTitle}>No specialties added yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemBadge}>
                <Ionicons name="medkit-outline" size={16} color={THEME.primary} />
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemMeta}>Clinic specialty</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(item)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={THEME.danger} />
                ) : (
                  <Ionicons name="trash-outline" size={18} color={THEME.danger} />
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSpacer: { width: 42, height: 42 },
  composerCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: THEME.textSecondary, marginBottom: 10 },
  inputRow: { gap: 12 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    color: THEME.textPrimary,
    backgroundColor: THEME.background,
  },
  addButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: { opacity: 0.65 },
  addButtonText: { fontSize: 14, fontWeight: "800", color: THEME.white },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 20, paddingTop: 16, paddingBottom: 40, gap: 12 },
  errorCard: {
    backgroundColor: THEME.softRed,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 16,
    marginBottom: 12,
  },
  errorTitle: { fontSize: 15, fontWeight: "800", color: THEME.danger },
  errorText: { marginTop: 6, color: "#991B1B" },
  emptyCard: {
    alignItems: "center",
    padding: 28,
    borderRadius: 16,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  itemBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.softBlue,
  },
  itemCopy: { flex: 1, marginLeft: 12 },
  itemTitle: { fontSize: 15, fontWeight: "800", color: THEME.textPrimary },
  itemMeta: { marginTop: 4, fontSize: 12, color: THEME.textSecondary },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.softRed,
  },
});
