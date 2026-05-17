import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { patientTheme } from "../../constants/patientTheme";
import type { PatientStackParamList } from "../../types/navigation";
import { getMyOrders, type OrderSummary } from "../../services/commerceService";
import { ORDER_STATUS_META } from "../../components/orders/orderFlow";
import {
  onOrderUpdated,
  subscribeToOrderRoom,
  subscribeToPatientRealtime,
  unsubscribeFromOrderRoom,
} from "../../services/socketService";
import { AuthContext } from "../../utils/AuthContext";
import {
  PatientEmptyState,
  PatientErrorState,
} from "../../components/patient/PatientFeedback";

const THEME = patientTheme.colors;

const formatPrice = (value: number) =>
  `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const buildOrderItemKey = (item: OrderSummary["items"][number], index: number) =>
  `${item.id}-${item.marketplaceProductId}-${item.name}-${index}`;

const formatOrderDate = (value: string) =>
  new Date(value).toLocaleDateString("en-LK", {
    month: "short",
    day: "numeric",
  });

const getPharmacyInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "PH";

type OrderTabKey = "pending" | "confirmed" | "completed";

const ORDER_TAB_CONFIG: Array<{ key: OrderTabKey; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
];

const getOrderTabKey = (status: OrderSummary["status"]): OrderTabKey => {
  if (status === "pending_payment" || status === "pending" || status === "awaiting_substitution_approval") {
    return "pending";
  }

  if (
    status === "confirmed" ||
    status === "preparing" ||
    status === "partially_ready" ||
    status === "ready_for_pickup" ||
    status === "out_for_delivery"
  ) {
    return "confirmed";
  }

  return "completed";
};

export default function OrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderTabKey>("pending");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyOrders();
      setOrders(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
      return undefined;
    }, [loadOrders])
  );

  useEffect(() => {
    const patientId = user?.id;
    if (!patientId) return;

    void subscribeToPatientRealtime(patientId);
    for (const order of orders) {
      void subscribeToOrderRoom(order.id);
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

    return () => {
      off();
      for (const order of orders) {
        unsubscribeFromOrderRoom(order.id);
      }
    };
  }, [orders, user?.id]);

  const tabCounts = useMemo(() => {
    return orders.reduce<Record<OrderTabKey, number>>(
      (acc, order) => {
        acc[getOrderTabKey(order.status)] += 1;
        return acc;
      },
      { pending: 0, confirmed: 0, completed: 0 }
    );
  }, [orders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => getOrderTabKey(order.status) === activeTab),
    [activeTab, orders]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate("Cart")}>
          <Ionicons name="cart-outline" size={22} color={THEME.navy} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Loading orders</Text>
        </View>
      ) : error ? (
        <PatientErrorState message={error} onRetry={() => void loadOrders()} />
      ) : orders.length === 0 ? (
        <PatientEmptyState
          icon="receipt-outline"
          title="No orders yet"
          message="Completed checkouts will appear here with live status tracking."
          actionLabel="Browse Pharmacies"
          onAction={() => navigation.navigate("PharmacyMarketplace")}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tabsWrap}>
            {ORDER_TAB_CONFIG.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                  activeOpacity={0.88}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.tabCountPill, active && styles.tabCountPillActive]}>
                    <Text style={[styles.tabCount, active && styles.tabCountActive]}>
                      {tabCounts[tab.key]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyTabState}>
              <Text style={styles.emptyTabTitle}>
                {activeTab === "pending"
                  ? "No pending orders"
                  : activeTab === "confirmed"
                    ? "No confirmed orders"
                    : "No completed orders"}
              </Text>
              <Text style={styles.emptyTabText}>
                {activeTab === "pending"
                  ? "Awaiting payment and approval orders will appear here."
                  : activeTab === "confirmed"
                    ? "Orders being prepared, picked up, or delivered will appear here."
                    : "Finished, delivered, cancelled, and rejected orders will appear here."}
              </Text>
            </View>
          ) : filteredOrders.map((order) => {
            const meta = ORDER_STATUS_META[order.status];
            const previewItems = order.items.slice(0, 3);
            const remainingCount = Math.max(order.items.length - previewItems.length, 0);
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.storeLeft}>
                    <View style={styles.storeAvatar}>
                      <Text style={styles.storeAvatarText}>{getPharmacyInitials(order.pharmacyName)}</Text>
                    </View>
                    <View style={styles.storeCopy}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{order.pharmacyName}</Text>
                      <Text style={styles.cardSub}>
                        {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"} • {order.items.length} item{order.items.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="arrow-forward" size={18} color={THEME.navy} />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardMetaRow}>
                  <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <View style={styles.metaTrail}>
                    <View style={styles.orderIdPill}>
                      <Text style={styles.orderIdPillText}>Order #{order.id}</Text>
                    </View>
                    <Text style={styles.dateChip}>{formatOrderDate(order.createdAt)}</Text>
                  </View>
                </View>

                {order.prescriptionId ? (
                  <View style={styles.rxRow}>
                    <Ionicons name="document-text-outline" size={14} color={THEME.modernAccentDark} />
                    <Text style={styles.rxText}>Prescription #{order.prescriptionId}</Text>
                  </View>
                ) : null}

                {order.fulfillmentType === "delivery" && order.deliveryAddress ? (
                  <View style={styles.deliveryCard}>
                    <Ionicons name="location-outline" size={16} color={THEME.modernAccentDark} />
                    <Text style={styles.deliveryText}>
                      {[
                        order.deliveryAddress.line1,
                        order.deliveryAddress.line2,
                        order.deliveryAddress.city,
                        order.deliveryAddress.district,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                ) : null}

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.previewRail}
                >
                  {previewItems.map((item, index) => (
                    <View key={buildOrderItemKey(item, index)} style={styles.previewCard}>
                      <View style={styles.previewImageWrap}>
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} style={styles.previewImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.previewImageFallback}>
                            <Ionicons name="medical-outline" size={24} color="#94A3B8" />
                          </View>
                        )}
                        <View style={styles.previewQtyBadge}>
                          <Text style={styles.previewQtyText}>{item.quantity}</Text>
                        </View>
                      </View>
                      <Text style={styles.previewItemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.previewItemPrice}>{formatPrice(item.totalPrice)}</Text>
                    </View>
                  ))}
                  {remainingCount > 0 ? (
                    <View style={styles.moreItemsCard}>
                      <Text style={styles.moreItemsValue}>+{remainingCount}</Text>
                      <Text style={styles.moreItemsLabel}>more items</Text>
                    </View>
                  ) : null}
                </ScrollView>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.footerLabel}>Order total</Text>
                    <Text style={styles.totalText}>{formatPrice(order.total)}</Text>
                  </View>
                  <View style={styles.footerRight}>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
                    >
                      <Text style={styles.reviewBtnText}>Open order</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: THEME.navy },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  helperText: { fontSize: 15, color: THEME.textSecondary },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 24 },
  tabsWrap: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 4,
    gap: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 62,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: THEME.navy,
  },
  tabText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    color: "#64748B",
    textAlign: "center",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabCountPill: {
    marginTop: 6,
    minWidth: 28,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountPillActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  tabCount: {
    fontSize: 12,
    fontWeight: "900",
    color: "#475569",
  },
  tabCountActive: {
    color: "#FFFFFF",
  },
  emptyTabState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 20,
    marginBottom: 12,
  },
  emptyTabTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.navy,
  },
  emptyTabText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  storeLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  storeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  storeAvatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: THEME.modernAccentDark,
  },
  storeCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  cardTitle: { fontSize: 17, lineHeight: 21, fontWeight: "900", color: THEME.navy, letterSpacing: -0.4 },
  cardSub: { marginTop: 4, fontSize: 13, lineHeight: 18, color: THEME.textSecondary, fontWeight: "700" },
  cardMetaRow: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 1,
  },
  statusText: { fontSize: 12, fontWeight: "800" },
  metaTrail: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  orderIdPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  orderIdPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.textSecondary,
  },
  arrowBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChip: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  rxRow: {
    marginTop: -2,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rxText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.modernAccentDark,
  },
  deliveryCard: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deliveryText: { flex: 1, fontSize: 12, color: THEME.textSecondary },
  previewRail: {
    paddingTop: 2,
    paddingBottom: 4,
    gap: 12,
  },
  previewCard: {
    width: 130,
  },
  previewImageWrap: {
    width: "100%",
    height: 102,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 8,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  previewQtyBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewQtyText: {
    fontSize: 12,
    fontWeight: "900",
    color: THEME.navy,
  },
  previewItemName: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    color: THEME.navy,
    minHeight: 34,
  },
  previewItemPrice: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  moreItemsCard: {
    width: 112,
    height: 102,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  moreItemsValue: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.navy,
  },
  moreItemsLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalText: { marginTop: 4, fontSize: 20, fontWeight: "900", color: THEME.navy, letterSpacing: -0.4 },
  footerRight: { alignItems: "flex-end", gap: 8 },
  reviewBtn: {
    height: 42,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF6FF",
  },
  reviewBtnText: { fontSize: 13, fontWeight: "800", color: THEME.modernAccentDark },
});
