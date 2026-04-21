import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { apiFetch } from "../../config/api";

const THEME = {
  primary: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#122033",
  textMuted: "#6B7280",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "#E0E6ED",
  cardRadius: 18,
};

type InventoryMedicine = {
  id: number;
  name: string;
  category_id?: number | null;
  category_name: string | null;
  brand_id?: number | null;
  brand_name?: string | null;
  description?: string | null;
  image_url?: string | null;
  quantity: number | null;
  price: number | null;
  expiry_date: string | null;
};

type ActionType = "delete" | "restock" | null;

const formatMoney = (value: number | null | undefined) => {
  console.log("PRICE:", value, typeof value);
  const numericValue = Number(value);

  if (value === undefined || value === null || Number.isNaN(numericValue)) {
    return "LKR -";
  }

  return `LKR ${numericValue.toFixed(2)}`;
};

const formatDate = (value: string | null) => {
  if (!value) return "No expiry";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const getDaysUntilExpiry = (value: string | null) => {
  if (!value) return null;
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return null;

  const now = new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getMedicineStatus = (medicine: InventoryMedicine) => {
  const quantity = medicine.quantity ?? 0;
  const daysUntilExpiry = getDaysUntilExpiry(medicine.expiry_date);

  if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
    return {
      label: daysUntilExpiry < 0 ? "Expired" : "Expiring Soon",
      color: THEME.danger,
      tint: "#FEE2E2",
    };
  }

  if (quantity <= 10) {
    return {
      label: quantity <= 0 ? "Out of Stock" : "Low Stock",
      color: THEME.warning,
      tint: "#FEF3C7",
    };
  }

  return {
    label: "Healthy Stock",
    color: THEME.primary,
    tint: "#DCFCE7",
  };
};

export default function InventoryScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState("");
  const [medicines, setMedicines] = useState<InventoryMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [restockMedicine, setRestockMedicine] = useState<InventoryMedicine | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const requestIdRef = useRef(0);

  const loadInventory = useCallback(async (showSpinner = true) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      if (showSpinner) setLoading(true);
      setError(null);

      const response = await apiFetch("/api/pharmacy/inventory");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load inventory");
      }

      if (requestId !== requestIdRef.current) return;
      setMedicines(Array.isArray(data?.medicines) ? data.medicines : []);
      setHasLoadedOnce(true);
    } catch (fetchError: any) {
      if (requestId !== requestIdRef.current) return;
      setError(fetchError?.message || "Failed to load inventory");
    } finally {
      if (requestId !== requestIdRef.current) return;
      if (showSpinner) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnce) {
        loadInventory(false);
      }
    }, [hasLoadedOnce, loadInventory])
  );

  const filteredMedicines = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return medicines;

    return medicines.filter((medicine) =>
      [medicine.name, medicine.category_name || "", medicine.brand_name || ""].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [deferredSearch, medicines]);

  const summary = useMemo(() => {
    const total = medicines.length;
    const lowStock = medicines.filter((medicine) => (medicine.quantity ?? 0) <= 10).length;
    const expiringSoon = medicines.filter((medicine) => {
      const days = getDaysUntilExpiry(medicine.expiry_date);
      return days !== null && days <= 30;
    }).length;

    return { total, lowStock, expiringSoon };
  }, [medicines]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInventory(false);
  }, [loadInventory]);

  const handleEdit = useCallback((medicine: InventoryMedicine) => {
    navigation.navigate("PharmacyAddMedicine", { medicine });
  }, [navigation]);

  const openRestockModal = useCallback((medicine: InventoryMedicine) => {
    setRestockMedicine(medicine);
    setRestockQuantity("");
    setRestockModalVisible(true);
  }, []);

  const closeRestockModal = () => {
    if (actionType === "restock") return;
    setRestockModalVisible(false);
    setRestockMedicine(null);
    setRestockQuantity("");
  };

  const handleRestockSubmit = async () => {
    if (!restockMedicine) return;

    const quantity = Number(restockQuantity);
    if (!restockQuantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert("Validation", "Enter a valid restock quantity.");
      return;
    }

    try {
      setActionLoadingId(restockMedicine.id);
      setActionType("restock");

      const response = await apiFetch(`/api/pharmacy/medicines/${restockMedicine.id}/restock`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to restock medicine");
      }

      setMedicines((current) =>
        current.map((item) => (item.id === restockMedicine.id ? { ...item, ...data.medicine } : item))
      );
      setRestockModalVisible(false);
      setRestockMedicine(null);
      setRestockQuantity("");
      Toast.show({ type: "success", text1: "Stock updated" });
    } catch (restockError: any) {
      Alert.alert("Restock failed", restockError?.message || "Unable to update stock.");
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  const handleDelete = (medicine: InventoryMedicine) => {
    Alert.alert(
      "Delete Medicine",
      "Are you sure you want to delete this medicine?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(medicine.id);
              setActionType("delete");

              const response = await apiFetch(`/api/pharmacy/medicines/${medicine.id}`, {
                method: "DELETE",
              });
              const data = await response.json();

              if (!response.ok) {
                throw new Error(data?.message || "Failed to delete medicine");
              }

              setMedicines((current) => current.filter((item) => item.id !== medicine.id));
              Toast.show({ type: "success", text1: "Medicine deleted" });
            } catch (deleteError: any) {
              Alert.alert("Delete failed", deleteError?.message || "Unable to delete medicine.");
            } finally {
              setActionLoadingId(null);
              setActionType(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          <Text style={styles.headerSub}>Manage your medicine stock</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.centerText}>Loading inventory...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color={THEME.danger} />
          <Text style={styles.errorTitle}>Unable to load inventory</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadInventory()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />
          }
        >
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color={THEME.textMuted} />
              <TextInput
                placeholder="Search medicine..."
                style={styles.searchInput}
                placeholderTextColor={THEME.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn} onPress={onRefresh}>
              <Ionicons name="filter-outline" size={20} color={THEME.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <StatBox label="Total" count={summary.total} color={THEME.textPrimary} />
            <StatBox label="Low Stock" count={summary.lowStock} color={THEME.warning} />
            <StatBox label="Expiring" count={summary.expiringSoon} color={THEME.danger} />
          </View>

          <Text style={styles.sectionLabel}>Medicine List</Text>

          {filteredMedicines.length ? (
            filteredMedicines.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                onEdit={handleEdit}
                onRestock={openRestockModal}
                onDelete={handleDelete}
                loadingAction={actionLoadingId === medicine.id ? actionType : null}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={28} color={THEME.textMuted} />
              <Text style={styles.emptyTitle}>No medicines found</Text>
              <Text style={styles.emptyText}>Try another search or add a new medicine.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("PharmacyAddMedicine")}
      >
        <Ionicons name="add" size={30} color={THEME.white} />
      </TouchableOpacity>

      <Modal
        visible={restockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRestockModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restock Medicine</Text>
            <Text style={styles.modalSubtitle}>
              {restockMedicine ? `Add stock for ${restockMedicine.name}` : "Enter quantity"}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter quantity"
              placeholderTextColor={THEME.textMuted}
              keyboardType="number-pad"
              value={restockQuantity}
              onChangeText={(value) => setRestockQuantity(value.replace(/[^0-9]/g, ""))}
              editable={actionType !== "restock"}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeRestockModal}
                disabled={actionType === "restock"}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleRestockSubmit}
                disabled={actionType === "restock"}
              >
                {actionType === "restock" ? (
                  <ActivityIndicator color={THEME.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Update Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatBox({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statCount, { color }]}>{String(count).padStart(2, "0")}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MedicineCard({
  medicine,
  onEdit,
  onRestock,
  onDelete,
  loadingAction,
}: {
  medicine: InventoryMedicine;
  onEdit: (medicine: InventoryMedicine) => void;
  onRestock: (medicine: InventoryMedicine) => void;
  onDelete: (medicine: InventoryMedicine) => void;
  loadingAction: ActionType;
}) {
  const status = getMedicineStatus(medicine);
  const quantity = medicine.quantity ?? 0;
  const expiryDays = getDaysUntilExpiry(medicine.expiry_date);
  const isDeleting = loadingAction === "delete";
  const isRestocking = loadingAction === "restock";

  return (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.medName}>{medicine.name}</Text>
          <Text style={styles.medType}>{medicine.category_name || "Uncategorized"}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: status.tint }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Quantity</Text>
          <Text style={[styles.infoValue, { color: status.color }]}>{quantity}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Price</Text>
          <Text style={styles.infoValue}>{formatMoney(medicine.price)}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>Expiry Date</Text>
          <Text
            style={[
              styles.infoValue,
              expiryDays !== null && expiryDays <= 30 ? { color: THEME.danger } : null,
            ]}
          >
            {formatDate(medicine.expiry_date)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(medicine)} disabled={!!loadingAction}>
          <Ionicons name="create-outline" size={18} color={THEME.textMuted} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.restockBtn]}
          onPress={() => onRestock(medicine)}
          disabled={!!loadingAction}
        >
          {isRestocking ? (
            <ActivityIndicator size="small" color={THEME.primary} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={18} color={THEME.primary} />
              <Text style={[styles.actionText, styles.restockText]}>Restock</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(medicine)} disabled={!!loadingAction}>
          {isDeleting ? (
            <ActivityIndicator size="small" color={THEME.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={THEME.danger} />
              <Text style={[styles.actionText, { color: THEME.danger }]}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: "center",
    backgroundColor: THEME.white,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  searchRow: { flexDirection: "row", paddingVertical: 20, gap: 12 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: { marginLeft: 10, fontSize: 15, color: THEME.textPrimary, flex: 1 },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  statCount: { fontSize: 20, fontWeight: "800" },
  statLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 4,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textMuted,
    textTransform: "uppercase",
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitleWrap: { flex: 1, paddingRight: 12 },
  medName: { fontSize: 17, fontWeight: "800", color: THEME.textPrimary },
  medType: { fontSize: 13, color: THEME.textMuted, marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  infoGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 11, color: THEME.textMuted, fontWeight: "700", textTransform: "uppercase" },
  infoValue: { fontSize: 14, fontWeight: "700", color: THEME.textPrimary, marginTop: 4 },
  divider: { height: 1, backgroundColor: THEME.background, marginVertical: 15 },
  cardActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, minWidth: 72 },
  restockBtn: { backgroundColor: "#E0F5EB", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  restockText: { color: THEME.primary },
  actionText: { fontSize: 13, fontWeight: "700", color: THEME.textMuted },
  fab: {
    position: "absolute",
    bottom: 110,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: THEME.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  centerText: {
    color: THEME.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  retryButton: {
    marginTop: 6,
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: {
    color: THEME.white,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    color: THEME.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  modalSubtitle: {
    marginTop: 6,
    color: THEME.textMuted,
    lineHeight: 20,
  },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    color: THEME.textPrimary,
    fontSize: 15,
  },
  modalActions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelButton: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalCancelText: {
    color: THEME.textMuted,
    fontWeight: "700",
  },
  modalConfirmButton: {
    minWidth: 120,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  modalConfirmText: {
    color: THEME.white,
    fontWeight: "800",
  },
});
