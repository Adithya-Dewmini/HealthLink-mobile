import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import OrderTimeline from "../../components/orders/OrderTimeline";
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
export default function OrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const { user } = React.useContext(AuthContext);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          {orders.map((order) => {
            const meta = ORDER_STATUS_META[order.status];
            return (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.cardTitle}>{order.pharmacyName}</Text>
                    <Text style={styles.cardSub}>
                      Order #{order.id}
                      {order.prescriptionId ? ` • Prescription #${order.prescriptionId}` : ""}
                    </Text>
                    <Text style={styles.fulfillmentMeta}>
                      {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
                      {order.deliveryContactName ? ` • ${order.deliveryContactName}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <OrderTimeline order={order} />

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

                {order.items.slice(0, 3).map((item, index) => (
                  <View key={buildOrderItemKey(item, index)} style={styles.lineItem}>
                    <Text style={styles.lineItemName}>
                      {item.quantity} x {item.name}
                    </Text>
                    <Text style={styles.lineItemPrice}>{formatPrice(item.totalPrice)}</Text>
                  </View>
                ))}

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    {new Date(order.createdAt).toLocaleDateString("en-LK", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <View style={styles.footerRight}>
                    <Text style={styles.totalText}>{formatPrice(order.total)}</Text>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
                    >
                      <Text style={styles.reviewBtnText}>View details</Text>
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
  content: { padding: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: THEME.navy },
  cardSub: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  fulfillmentMeta: { marginTop: 6, fontSize: 12, fontWeight: "700", color: THEME.textMuted },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: { fontSize: 12, fontWeight: "800" },
  deliveryCard: {
    marginTop: -2,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deliveryText: { flex: 1, fontSize: 12, color: THEME.textSecondary },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  lineItemName: { flex: 1, fontSize: 14, color: THEME.navy, paddingRight: 8 },
  lineItemPrice: { fontSize: 14, fontWeight: "700", color: THEME.navy },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  dateText: { fontSize: 13, color: THEME.textSecondary },
  totalText: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  footerRight: { alignItems: "flex-end", gap: 8 },
  reviewBtn: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6F7EF",
  },
  reviewBtnText: { fontSize: 12, fontWeight: "800", color: "#0F8A5F" },
});
