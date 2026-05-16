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
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { patientTheme } from "../../constants/patientTheme";
import type { PatientStackParamList } from "../../types/navigation";
import {
  getOrderDetails,
  getOrderTimeline,
  startOrderPaymentCheckout,
  type OrderSummary,
} from "../../services/commerceService";
import type { ActivityItem } from "../../services/activityService";
import { onOrderUpdated, subscribeToOrderRoom, unsubscribeFromOrderRoom } from "../../services/socketService";
import OrderTimeline from "../../components/orders/OrderTimeline";
import { ORDER_STATUS_META } from "../../components/orders/orderFlow";
import { PatientErrorState } from "../../components/patient/PatientFeedback";

const THEME = patientTheme.colors;

const formatPrice = (value: number) =>
  `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPaymentStatus = (status: string | null | undefined) =>
  String(status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());

export default function OrderDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "OrderDetails">>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [timeline, setTimeline] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const [orderData, timelineData] = await Promise.all([getOrderDetails(orderId), getOrderTimeline(orderId)]);
      setOrder(orderData);
      setTimeline(timelineData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load order");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
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

  const statusMeta = useMemo(
    () => (order ? ORDER_STATUS_META[order.status] : null),
    [order]
  );

  const handleResumePayment = useCallback(async () => {
    if (!order) return;
    try {
      setError(null);
      const session = await startOrderPaymentCheckout(order.id);
      navigation.navigate("PaymentStatus", {
        orderId: order.id,
        checkoutUrl: session.hosted_url,
        autoOpenCheckout: true,
      });
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Unable to continue payment");
    }
  }, [navigation, order]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Loading order details</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={THEME.navy} />
          </TouchableOpacity>
        </View>
        <PatientErrorState message={error} onRetry={() => void loadOrder()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate("Orders")}>
          <Ionicons name="receipt-outline" size={22} color={THEME.navy} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrder("refresh")} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Pharmacy order</Text>
          <Text style={styles.heroTitle}>{order.pharmacyName}</Text>
          <Text style={styles.heroMeta}>
            Order #{order.id}
            {order.prescriptionId ? ` • Prescription #${order.prescriptionId}` : ""}
          </Text>
          {statusMeta ? (
            <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
              <Ionicons name={statusMeta.icon as any} size={14} color={statusMeta.color} />
              <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          ) : null}
          <OrderTimeline order={order} />
        </View>

        {error ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fulfillment</Text>
          <Text style={styles.primaryValue}>{order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}</Text>
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
              <Text style={styles.blockLabel}>Delivery address</Text>
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
              <Text style={styles.blockLabel}>Pharmacy note</Text>
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
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Method</Text>
            <Text style={styles.summaryValue}>
              {order.paymentMethod === "online" ? "Online payment" : "Cash / Pay at pharmacy"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text
              style={[
                styles.summaryValue,
                order.paymentStatus === "paid"
                  ? styles.paymentSuccess
                  : order.paymentStatus === "failed" || order.paymentStatus === "cancelled"
                    ? styles.paymentDanger
                    : styles.paymentPending,
              ]}
            >
              {formatPaymentStatus(order.paymentStatus)}
            </Text>
          </View>
          {order.paidAt ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid at</Text>
              <Text style={styles.summaryValue}>{new Date(order.paidAt).toLocaleString("en-LK")}</Text>
            </View>
          ) : null}
          {order.invoice ? (
            <View style={styles.detailBlock}>
              <Text style={styles.blockLabel}>Invoice</Text>
              <Text style={styles.blockText}>{order.invoice.invoiceNo}</Text>
              <TouchableOpacity
                style={styles.inlineActionButton}
                onPress={() => navigation.navigate("InvoiceScreen", { orderId: order.id })}
              >
                <Ionicons name="document-text-outline" size={16} color={THEME.modernAccentDark} />
                <Text style={styles.inlineActionText}>View invoice</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {order.paymentMethod === "online" && order.paymentStatus !== "paid" ? (
            <TouchableOpacity style={styles.inlinePrimaryButton} onPress={() => void handleResumePayment()}>
              <Ionicons name="card-outline" size={16} color="#FFFFFF" />
              <Text style={styles.inlinePrimaryButtonText}>Continue payment</Text>
            </TouchableOpacity>
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
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Savings</Text>
            <Text style={styles.summaryValue}>-{formatPrice(order.discountTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
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
            <Text style={styles.emptyText}>Timeline updates will appear here.</Text>
          )}
        </View>

        {order.status === "awaiting_substitution_approval" ? (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate("SubstitutionApproval", { orderId: order.id })}
          >
            <Text style={styles.ctaButtonText}>Review substitution request</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 32 }} />
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
    borderColor: THEME.border,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: THEME.navy },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  helperText: { fontSize: 15, color: THEME.textSecondary },
  content: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 20,
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
    marginTop: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, color: THEME.danger, fontSize: 14, lineHeight: 20 },
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: THEME.navy, marginBottom: 12 },
  primaryValue: { fontSize: 18, fontWeight: "800", color: THEME.modernAccentDark },
  metaText: { marginTop: 6, fontSize: 13, color: THEME.textSecondary },
  detailBlock: { marginTop: 14 },
  blockLabel: { fontSize: 12, fontWeight: "800", color: THEME.textMuted, textTransform: "uppercase" },
  blockText: { marginTop: 6, fontSize: 14, lineHeight: 21, color: THEME.navy },
  lineItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  itemName: { fontSize: 15, fontWeight: "700", color: THEME.navy },
  itemMeta: { marginTop: 4, fontSize: 12, color: THEME.textSecondary },
  itemTotal: { fontSize: 14, fontWeight: "800", color: THEME.navy },
  summaryDivider: { marginTop: 14, marginBottom: 4, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  summaryLabel: { fontSize: 14, color: THEME.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: "700", color: THEME.navy },
  paymentPending: { color: "#0369A1" },
  paymentSuccess: { color: "#166534" },
  paymentDanger: { color: "#B91C1C" },
  totalLabel: { fontSize: 15, fontWeight: "800", color: THEME.navy },
  totalValue: { fontSize: 17, fontWeight: "800", color: THEME.modernAccentDark },
  inlineActionButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#ECFDF5",
  },
  inlineActionText: { fontSize: 13, fontWeight: "800", color: THEME.modernAccentDark },
  inlinePrimaryButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: THEME.modernAccentDark,
  },
  inlinePrimaryButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  timelineRow: { flexDirection: "row", gap: 12, paddingBottom: 16 },
  timelineRowLast: { paddingBottom: 0 },
  timelineRail: { alignItems: "center", width: 18 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: THEME.modernAccentDark, marginTop: 4 },
  timelineLine: { flex: 1, width: 2, backgroundColor: "#DCE6F0", marginTop: 4 },
  timelineBody: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: "800", color: THEME.navy },
  timelineDescription: { marginTop: 4, fontSize: 13, lineHeight: 19, color: THEME.textSecondary },
  timelineDate: { marginTop: 6, fontSize: 12, color: THEME.textMuted },
  emptyText: { fontSize: 14, color: THEME.textSecondary },
  ctaButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.modernAccentDark,
  },
  ctaButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
