import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  getPharmacyOrderDetails,
  getPharmacyOrderTimeline,
  updatePharmacyOrderStatus,
  type OrderStatus,
  type OrderSummary,
} from "../../services/commerceService";
import type { ActivityItem } from "../../services/activityService";
import {
  onOrderUpdated,
  subscribeToOrderRoom,
  unsubscribeFromOrderRoom,
} from "../../services/socketService";
import OrderTimeline from "../../components/orders/OrderTimeline";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_META,
  getAllowedNextStatuses,
} from "../../components/orders/orderFlow";

const formatPrice = (value: number) =>
  `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PharmacyOrderDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const orderId = Number(route.params?.orderId ?? 0);

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [timeline, setTimeline] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyStatus, setBusyStatus] = useState<OrderStatus | null>(null);

  const loadOrder = useCallback(async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const [orderData, timelineData] = await Promise.all([
        getPharmacyOrderDetails(orderId),
        getPharmacyOrderTimeline(orderId),
      ]);
      setOrder(orderData);
      setTimeline(timelineData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load pharmacy order");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!orderId) return;

    void subscribeToOrderRoom(orderId);
    const off = onOrderUpdated((payload) => {
      if (payload.order.id !== orderId) return;
      setOrder(payload.order);
      void loadOrder("refresh");
    });

    return () => {
      off();
      unsubscribeFromOrderRoom(orderId);
    };
  }, [loadOrder, orderId]);

  const allowedNextStatuses = useMemo(
    () => (order ? getAllowedNextStatuses(order) : []),
    [order]
  );

  const handleStatusUpdate = async (status: OrderStatus) => {
    if (!order) return;
    try {
      setBusyStatus(status);
      setError(null);
      const updated = await updatePharmacyOrderStatus(order.id, status);
      setOrder(updated);
      const nextTimeline = await getPharmacyOrderTimeline(order.id);
      setTimeline(nextTimeline);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update order");
    } finally {
      setBusyStatus(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#2BB673" />
          <Text style={styles.helperText}>Loading order workspace</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={30} color="#B91C1C" />
          <Text style={styles.errorText}>{error || "Order not found"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadOrder()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusMeta = ORDER_STATUS_META[order.status];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrder("refresh")} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Fulfillment queue</Text>
          <Text style={styles.heroTitle}>{order.pharmacyName}</Text>
          <Text style={styles.heroMeta}>
            {order.fulfillmentType === "delivery" ? "Delivery order" : "Pickup order"}
            {order.prescriptionId ? ` • Prescription #${order.prescriptionId}` : ""}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon as any} size={14} color={statusMeta.color} />
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
          <OrderTimeline order={order} />
        </View>

        {error ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <Text style={styles.primaryValue}>{order.patientName || "Patient order"}</Text>
          {order.patientEmail ? <Text style={styles.metaText}>{order.patientEmail}</Text> : null}
          <Text style={styles.metaText}>
            Created{" "}
            {new Date(order.createdAt).toLocaleString("en-LK", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {order.deliveryAddress ? (
            <View style={styles.detailBlock}>
              <Text style={styles.blockLabel}>Delivery destination</Text>
              <Text style={styles.blockText}>
                {[
                  order.deliveryAddress.line1,
                  order.deliveryAddress.line2,
                  order.deliveryAddress.city,
                  order.deliveryAddress.district,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {order.deliveryContactName ? (
                <Text style={styles.blockText}>
                  {order.deliveryContactName}
                  {order.deliveryContactPhone ? ` • ${order.deliveryContactPhone}` : ""}
                </Text>
              ) : null}
            </View>
          ) : null}
          {order.notes ? (
            <View style={styles.detailBlock}>
              <Text style={styles.blockLabel}>Patient note</Text>
              <Text style={styles.blockText}>{order.notes}</Text>
            </View>
          ) : null}
          {order.deliveryNotes ? (
            <View style={styles.detailBlock}>
              <Text style={styles.blockLabel}>Delivery note</Text>
              <Text style={styles.blockText}>{order.deliveryNotes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {item.quantity} x {item.name}
                </Text>
                <Text style={styles.itemMeta}>
                  {formatPrice(item.unitPrice)}
                  {item.requiresPrescription ? " • Prescription item" : ""}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatPrice(item.totalPrice)}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {allowedNextStatuses.length ? (
            <View style={styles.actionWrap}>
              {allowedNextStatuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.actionBtn, busyStatus === status && styles.actionBtnDisabled]}
                  disabled={busyStatus !== null}
                  onPress={() => void handleStatusUpdate(status)}
                >
                  <Text style={styles.actionBtnText}>
                    {busyStatus === status ? "Updating..." : ORDER_STATUS_LABELS[status]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.metaText}>No further status updates are available for this order.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {timeline.length ? (
            timeline.map((entry, index) => (
              <View key={entry.id} style={[styles.timelineRow, index === timeline.length - 1 && styles.timelineRowLast]}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{entry.title}</Text>
                  {entry.description ? <Text style={styles.timelineDescription}>{entry.description}</Text> : null}
                  <Text style={styles.timelineDate}>
                    {new Date(entry.createdAt).toLocaleString("en-LK", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.metaText}>Timeline updates will appear here.</Text>
          )}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
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
    paddingVertical: 8,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerSpacer: { width: 42, height: 42 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  helperText: { fontSize: 14, color: "#64748B" },
  errorText: { fontSize: 14, lineHeight: 20, color: "#B91C1C", textAlign: "center" },
  retryButton: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2BB673",
  },
  retryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 18,
  },
  eyebrow: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTitle: { marginTop: 8, fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  heroMeta: { marginTop: 8, fontSize: 14, color: "#CBD5E1" },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: { fontSize: 12, fontWeight: "800" },
  notice: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 12,
  },
  noticeText: { flex: 1, color: "#B91C1C", fontSize: 13, lineHeight: 18 },
  sectionCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A", marginBottom: 12 },
  primaryValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  metaText: { marginTop: 4, fontSize: 13, color: "#64748B" },
  detailBlock: { marginTop: 12 },
  blockLabel: { fontSize: 12, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase" },
  blockText: { marginTop: 6, fontSize: 14, lineHeight: 21, color: "#0F172A" },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  itemName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  itemMeta: { marginTop: 4, fontSize: 12, color: "#64748B" },
  itemTotal: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  summaryDivider: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12 },
  summaryLabel: { fontSize: 14, color: "#64748B" },
  totalValue: { fontSize: 17, fontWeight: "800", color: "#2BB673" },
  actionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionBtn: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6F7EF",
  },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: { fontSize: 13, fontWeight: "800", color: "#0F8A5F" },
  timelineRow: { flexDirection: "row", gap: 12, paddingBottom: 16 },
  timelineRowLast: { paddingBottom: 0 },
  timelineRail: { alignItems: "center", width: 18 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2BB673", marginTop: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: "#DCE6F0", marginTop: 4 },
  timelineBody: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  timelineDescription: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#64748B" },
  timelineDate: { marginTop: 6, fontSize: 12, color: "#94A3B8" },
});
