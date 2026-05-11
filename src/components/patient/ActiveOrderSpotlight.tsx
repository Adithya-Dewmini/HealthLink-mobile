import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import {
  getMyOrders,
  type OrderSummary,
} from "../../services/commerceService";
import {
  onOrderUpdated,
  subscribeToOrderRoom,
  subscribeToPatientRealtime,
  unsubscribeFromOrderRoom,
} from "../../services/socketService";
import { AuthContext } from "../../utils/AuthContext";
import { getActiveTimelineStatuses, getTimelineSteps, ORDER_STATUS_META } from "../orders/orderFlow";

const THEME = patientTheme.colors;
const TERMINAL_STATUSES = new Set(["completed", "delivered", "cancelled"]);

const STATUS_COPY: Record<OrderSummary["status"], { title: string; subtitle: string }> = {
  pending: {
    title: "Order received",
    subtitle: "The pharmacy has your order and will review it shortly.",
  },
  confirmed: {
    title: "Pharmacy confirmed your order",
    subtitle: "Your medicines are accepted and queued for preparation.",
  },
  preparing: {
    title: "Preparing your medicines",
    subtitle: "The pharmacy is packing and checking your order now.",
  },
  awaiting_substitution_approval: {
    title: "Approval needed",
    subtitle: "A substitution request is waiting for your response.",
  },
  partially_ready: {
    title: "Part of your order is ready",
    subtitle: "Some items are available now while the rest is still pending.",
  },
  ready_for_pickup: {
    title: "Ready for pickup",
    subtitle: "Your order is ready at the pharmacy.",
  },
  out_for_delivery: {
    title: "On the way",
    subtitle: "Your delivery order is out for handoff.",
  },
  delivered: {
    title: "Delivered",
    subtitle: "Your order was delivered successfully.",
  },
  completed: {
    title: "Completed",
    subtitle: "Your order has been completed.",
  },
  cancelled: {
    title: "Cancelled",
    subtitle: "This order was cancelled.",
  },
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });

const pickActiveOrder = (orders: OrderSummary[]) =>
  orders.find((order) => !TERMINAL_STATUSES.has(order.status)) ?? null;

export default function ActiveOrderSpotlight() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const { user } = React.useContext(AuthContext);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadActiveOrder = useCallback(async () => {
    try {
      setLoading(true);
      const orders = await getMyOrders();
      const active = pickActiveOrder(orders);
      setOrder(active);
      if (active) {
        void subscribeToOrderRoom(active.id);
      }
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadActiveOrder();
      return undefined;
    }, [loadActiveOrder])
  );

  useEffect(() => {
    const patientId = user?.id;
    if (!patientId) return;

    void subscribeToPatientRealtime(patientId);
    if (order?.id) {
      void subscribeToOrderRoom(order.id);
    }

    const off = onOrderUpdated((payload) => {
      if (TERMINAL_STATUSES.has(payload.order.status)) {
        setOrder((current) => (current?.id === payload.order.id ? null : current));
        return;
      }

      setOrder(payload.order);
    });

    return () => {
      off();
      if (order?.id) {
        unsubscribeFromOrderRoom(order.id);
      }
    };
  }, [order?.id, user?.id]);

  const progress = useMemo(() => {
    if (!order) return { steps: [], activeSteps: [] as string[] };
    return {
      steps: getTimelineSteps(order),
      activeSteps: getActiveTimelineStatuses(order),
    };
  }, [order]);

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color={THEME.modernAccentDark} />
        <Text style={styles.loadingText}>Checking active orders</Text>
      </View>
    );
  }

  if (!order) {
    return null;
  }

  const statusMeta = ORDER_STATUS_META[order.status];
  const copy = STATUS_COPY[order.status];

  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.92}
      onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
    >
      <View style={styles.shell}>
        <LinearGradient
          colors={[THEME.blue, THEME.modernAccentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBand}
        >
          <View style={styles.topRow}>
            <View>
              <Text style={styles.eyebrow}>Live order</Text>
              <Text style={styles.pharmacyName}>{order.pharmacyName}</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusChipText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.mapMock}>
              <View style={styles.routeLine} />
              <View style={styles.routeDotStart} />
              <View style={styles.routeDotEnd} />
              <Ionicons
                name={order.fulfillmentType === "delivery" ? "bicycle-outline" : "bag-handle-outline"}
                size={16}
                color="#FFFFFF"
                style={styles.routeIcon}
              />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{copy.title}</Text>
              <Text style={styles.cardSubtitle}>{copy.subtitle}</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            {progress.steps.map((step) => {
              const active = progress.activeSteps.includes(step);
              return <View key={step} style={[styles.progressBar, active && styles.progressBarActive]} />;
            })}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={13} color={THEME.blue} />
              <Text style={styles.metaPillText}>Updated {formatTime(order.updatedAt)}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons
                name={order.fulfillmentType === "delivery" ? "navigate-outline" : "walk-outline"}
                size={13}
                color={THEME.blue}
              />
              <Text style={styles.metaPillText}>
                {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
            >
              <Ionicons name="locate-outline" size={15} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Track</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate("Orders")}>
              <Text style={styles.secondaryActionText}>Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  loadingCard: {
    marginBottom: 12,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.modernBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: "700",
  },
  shell: {
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.borderStrong,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  headerBand: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  pharmacyName: {
    marginTop: 4,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  cardTop: {
    gap: 12,
  },
  mapMock: {
    height: 82,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    position: "relative",
  },
  routeLine: {
    position: "absolute",
    top: 39,
    left: 18,
    right: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#0F172A",
    transform: [{ rotate: "-8deg" }],
  },
  routeDotStart: {
    position: "absolute",
    left: 20,
    top: 33,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.blue,
    borderWidth: 3,
    borderColor: "#EAFBFF",
  },
  routeDotEnd: {
    position: "absolute",
    right: 20,
    top: 28,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  routeIcon: {
    position: "absolute",
    left: "48%",
    top: 29,
    backgroundColor: THEME.blue,
    padding: 5,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardCopy: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  progressBarActive: {
    backgroundColor: THEME.blue,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.navy,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: THEME.blue,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryAction: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
});
