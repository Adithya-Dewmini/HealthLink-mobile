import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getPharmacyOrders, type OrderSummary } from "../../services/commerceService";
import { onOrderUpdated, subscribeToPharmacyRealtime } from "../../services/socketService";
import { ORDER_STATUS_LABELS, ORDER_STATUS_META, getAllowedNextStatuses } from "../../components/orders/orderFlow";
import { PharmacyGlassCard, PHARMACY_PANEL_THEME, PharmacyPanelHeader } from "../../components/pharmacist/PharmacyPanelUI";

type OrderTab = "all" | "pending" | "completed" | "cancelled" | "partial";
type FulfillmentFilter = "all" | "pickup" | "delivery" | "prescription";

const ORDER_TABS: Array<{ key: OrderTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "partial", label: "Partial" },
];

const FULFILLMENT_FILTERS: Array<{ key: FulfillmentFilter; label: string }> = [
  { key: "all", label: "All types" },
  { key: "pickup", label: "Pickup" },
  { key: "delivery", label: "Delivery" },
  { key: "prescription", label: "Prescription" },
];

const formatPrice = (value: number) =>
  `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const matchesTab = (order: OrderSummary, tab: OrderTab) => {
  switch (tab) {
    case "pending":
      return [
        "pending",
        "confirmed",
        "preparing",
        "awaiting_substitution_approval",
        "ready_for_pickup",
        "out_for_delivery",
      ].includes(order.status);
    case "completed":
      return order.status === "completed" || order.status === "delivered";
    case "cancelled":
      return order.status === "cancelled";
    case "partial":
      return order.status === "partially_ready";
    case "all":
    default:
      return true;
  }
};

const matchesFulfillmentFilter = (order: OrderSummary, filter: FulfillmentFilter) => {
  switch (filter) {
    case "pickup":
      return order.fulfillmentType === "pickup";
    case "delivery":
      return order.fulfillmentType === "delivery";
    case "prescription":
      return Boolean(order.prescriptionId);
    case "all":
    default:
      return true;
  }
};

export default function OrderManagementScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<OrderTab>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");

  const loadOrders = useCallback(async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const data = await getPharmacyOrders();
      setOrders(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
      return undefined;
    }, [loadOrders])
  );

  useEffect(() => {
    const pharmacyId = orders[0]?.pharmacyId;
    if (pharmacyId) {
      void subscribeToPharmacyRealtime(pharmacyId);
    }
    const off = onOrderUpdated((payload) => {
      setOrders((current) => {
        const existingIndex = current.findIndex((item) => item.id === payload.order.id);
        if (existingIndex === -1) {
          return [payload.order, ...current];
        }
        const next = [...current];
        next[existingIndex] = payload.order;
        return next;
      });
    });

    return off;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return orders.filter((order) => {
      if (!matchesTab(order, activeTab)) return false;
      if (!matchesFulfillmentFilter(order, fulfillmentFilter)) return false;

      if (!query) return true;

      const haystack = [
        `order ${order.id}`,
        order.patientName || "",
        order.patientEmail || "",
        order.pharmacyName,
        order.notes || "",
        order.prescriptionId ? `prescription ${order.prescriptionId}` : "",
        ...order.items.map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTab, fulfillmentFilter, orders, searchText]);

  const tabCounts = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((order) => matchesTab(order, "pending")).length,
      completed: orders.filter((order) => matchesTab(order, "completed")).length,
      cancelled: orders.filter((order) => matchesTab(order, "cancelled")).length,
      partial: orders.filter((order) => matchesTab(order, "partial")).length,
    }),
    [orders]
  );

  const summary = useMemo(() => {
    const activeQueue = orders.filter((order) =>
      ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"].includes(order.status)
    ).length;
    const delivery = orders.filter((order) => order.fulfillmentType === "delivery").length;
    const pickup = orders.filter((order) => order.fulfillmentType === "pickup").length;
    const prescription = orders.filter((order) => Boolean(order.prescriptionId)).length;

    return { activeQueue, delivery, pickup, prescription };
  }, [orders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={PHARMACY_PANEL_THEME.cyan} />
          <Text style={styles.helperText}>Loading pharmacy orders</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders("refresh")} tintColor="#67E8F9" />}
      >
        <PharmacyPanelHeader
          eyebrow="HealthLink Pharmacy"
          title="Orders"
          subtitle="Coordinate pickup, delivery, and prescription fulfillment with a clearer command queue."
          footer={
            <View style={styles.summaryRow}>
              <SummaryTile label="Live queue" value={summary.activeQueue} icon="pulse-outline" tone="sky" />
              <SummaryTile label="Pickup" value={summary.pickup} icon="storefront-outline" tone="emerald" />
              <SummaryTile label="Delivery" value={summary.delivery} icon="navigate-outline" tone="violet" />
              <SummaryTile label="Rx orders" value={summary.prescription} icon="flask-outline" tone="amber" />
            </View>
          }
        />

        <PharmacyGlassCard style={styles.toolbarCard}>
          <View style={styles.searchShell}>
            <Ionicons name="search-outline" size={18} color="#9FB1C5" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search order, patient, prescription, or medicine"
              placeholderTextColor="#6E859D"
              style={styles.searchInput}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {ORDER_TABS.map((tab) => {
              const active = activeTab === tab.key;
              const count = tabCounts[tab.key];
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabChip, active && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{tab.label}</Text>
                  <View style={[styles.tabCountBubble, active && styles.tabCountBubbleActive]}>
                    <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FULFILLMENT_FILTERS.map((filter) => {
              const active = fulfillmentFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFulfillmentFilter(filter.key)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </PharmacyGlassCard>

        {error ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color="#FECACA" />
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        {filteredOrders.length === 0 ? (
          <PharmacyGlassCard style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={34} color="#A5B4C6" />
            <Text style={styles.emptyTitle}>
              {orders.length === 0 ? "No marketplace orders yet" : "No matching orders"}
            </Text>
            <Text style={styles.helperText}>
              {orders.length === 0
                ? "New patient orders will appear here."
                : "Try another tab, search term, or fulfillment filter."}
            </Text>
          </PharmacyGlassCard>
        ) : (
          filteredOrders.map((order) => {
            const colorMeta = ORDER_STATUS_META[order.status];
            const nextStatuses = getAllowedNextStatuses(order);
            const heroItem = order.items[0];

            return (
              <PharmacyGlassCard key={order.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.orderTitle}>Order #{order.id}</Text>
                      {order.prescriptionId ? (
                        <View style={styles.rxTag}>
                          <Text style={styles.rxTagText}>Rx</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.orderSub}>
                      {order.patientName || "Patient order"}
                      {order.patientEmail ? ` • ${order.patientEmail}` : ""}
                    </Text>
                    <Text style={styles.orderSub}>
                      {order.items.length} items • {order.fulfillmentType === "delivery" ? "Delivery order" : "Pickup order"} •{" "}
                      {formatDateTime(order.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: colorMeta.bg }]}>
                    <Text style={[styles.statusText, { color: colorMeta.color }]}>{ORDER_STATUS_LABELS[order.status]}</Text>
                  </View>
                </View>

                <View style={styles.summaryBand}>
                  <View style={styles.summaryBandLeft}>
                    <Text style={styles.summaryBandTitle}>
                      {heroItem ? `${heroItem.quantity} x ${heroItem.name}` : "Order items"}
                    </Text>
                    <Text style={styles.summaryBandMeta}>
                      {order.notes ||
                        (order.fulfillmentType === "delivery" ? "No delivery instructions attached" : "No pickup note attached")}
                    </Text>
                  </View>
                  <Text style={styles.summaryBandPrice}>{formatPrice(order.total)}</Text>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons
                      name={order.fulfillmentType === "delivery" ? "navigate-outline" : "storefront-outline"}
                      size={14}
                      color={PHARMACY_PANEL_THEME.cyan}
                    />
                    <Text style={styles.metaPillText}>
                      {order.fulfillmentType === "delivery" ? "Delivery handoff" : "Pickup handoff"}
                    </Text>
                  </View>
                  {nextStatuses[0] ? (
                    <View style={styles.metaPill}>
                      <Ionicons name="flash-outline" size={14} color={PHARMACY_PANEL_THEME.cyan} />
                      <Text style={styles.metaPillText}>Next: {ORDER_STATUS_LABELS[nextStatuses[0]]}</Text>
                    </View>
                  ) : null}
                </View>

                {order.deliveryAddress ? (
                  <View style={styles.addressCard}>
                    <Ionicons name="location-outline" size={16} color={PHARMACY_PANEL_THEME.cyan} />
                    <Text style={styles.addressText}>
                      {[order.deliveryAddress.line1, order.deliveryAddress.city, order.deliveryAddress.district]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate("PharmacyOrderDetails", { orderId: order.id })}
                  >
                    <Text style={styles.reviewBtnText}>Review order</Text>
                    <Ionicons name="arrow-forward" size={16} color={PHARMACY_PANEL_THEME.background} />
                  </TouchableOpacity>
                  <Text style={styles.updatedAtText}>Updated {formatDateTime(order.updatedAt)}</Text>
                </View>
              </PharmacyGlassCard>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({
  icon,
  label,
  tone,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: "sky" | "emerald" | "violet" | "amber";
  value: number;
}) {
  const tones = {
    sky: { shell: "rgba(56, 189, 248, 0.12)", icon: "#7DD3FC" },
    emerald: { shell: "rgba(52, 211, 153, 0.12)", icon: "#86EFAC" },
    violet: { shell: "rgba(96, 165, 250, 0.12)", icon: "#93C5FD" },
    amber: { shell: "rgba(251, 146, 60, 0.12)", icon: "#FDBA74" },
  } as const;

  return (
    <View style={[styles.summaryTile, { backgroundColor: tones[tone].shell }]}>
      <Ionicons name={icon} size={16} color={tones[tone].icon} />
      <Text style={styles.summaryTileValue}>{value}</Text>
      <Text style={styles.summaryTileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PHARMACY_PANEL_THEME.background,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  helperText: {
    fontSize: 14,
    color: "#AFC1D5",
    textAlign: "center",
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryTile: {
    minWidth: "47%",
    borderRadius: 20,
    padding: 14,
  },
  summaryTileValue: {
    marginTop: 10,
    color: PHARMACY_PANEL_THEME.white,
    fontSize: 21,
    fontWeight: "800",
  },
  summaryTileLabel: {
    marginTop: 4,
    color: "#BDD0E4",
    fontSize: 12,
    fontWeight: "700",
  },
  toolbarCard: {
    gap: 12,
  },
  searchShell: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PHARMACY_PANEL_THEME.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: PHARMACY_PANEL_THEME.white,
  },
  tabRow: {
    gap: 10,
    paddingTop: 4,
    paddingRight: 12,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tabChipActive: {
    backgroundColor: "rgba(103, 232, 249, 0.14)",
    borderColor: "rgba(103, 232, 249, 0.2)",
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#AFC1D5",
  },
  tabChipTextActive: {
    color: PHARMACY_PANEL_THEME.white,
  },
  tabCountBubble: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tabCountBubbleActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D7E3F0",
  },
  tabCountTextActive: {
    color: PHARMACY_PANEL_THEME.white,
  },
  filterRow: {
    gap: 10,
    paddingRight: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  filterChipActive: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.18)",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8EA3B9",
  },
  filterChipTextActive: {
    color: "#DFF7FF",
  },
  notice: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(127, 29, 29, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.18)",
    borderRadius: 16,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    color: "#FECACA",
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PHARMACY_PANEL_THEME.white,
    textAlign: "center",
  },
  card: {
    gap: 14,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTopLeft: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: PHARMACY_PANEL_THEME.white,
  },
  rxTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(99, 102, 241, 0.14)",
  },
  rxTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#C7D2FE",
  },
  orderSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#AFC1D5",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  summaryBand: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryBandLeft: {
    flex: 1,
  },
  summaryBandTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: PHARMACY_PANEL_THEME.white,
  },
  summaryBandMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#9FB1C5",
    lineHeight: 18,
  },
  summaryBandPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DFF7FF",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaPillText: {
    fontSize: 12,
    color: "#C6D4E2",
    fontWeight: "700",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.12)",
    padding: 13,
  },
  addressText: {
    flex: 1,
    color: "#D8F5FF",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },
  reviewBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: PHARMACY_PANEL_THEME.background,
  },
  updatedAtText: {
    color: "#8EA3B9",
    fontSize: 11,
    fontWeight: "700",
  },
});
