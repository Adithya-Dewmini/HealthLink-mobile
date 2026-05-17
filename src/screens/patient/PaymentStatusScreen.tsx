import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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
import type { PatientStackParamList } from "../../types/navigation";
import {
  getOrderDetails,
  getOrderPaymentStatus,
  startOrderPaymentCheckout,
  type OrderSummary,
  type PaymentStatusSummary,
} from "../../services/commerceService";
import { patientTheme } from "../../constants/patientTheme";
import { PatientErrorState } from "../../components/patient/PatientFeedback";

const THEME = patientTheme.colors;

const formatPrice = (value: number, currency = "LKR") =>
  `${currency} ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const STATUS_META: Record<
  string,
  { title: string; tone: string; bg: string; icon: keyof typeof Ionicons.glyphMap; description: string }
> = {
  pending: {
    title: "Waiting for confirmation",
    tone: "#0F766E",
    bg: "#ECFDF5",
    icon: "time-outline",
    description: "HealthLink is waiting for the verified gateway callback before confirming this payment.",
  },
  paid: {
    title: "Payment confirmed",
    tone: "#166534",
    bg: "#DCFCE7",
    icon: "checkmark-circle-outline",
    description: "The order is paid and the pharmacy can continue processing it.",
  },
  failed: {
    title: "Payment failed",
    tone: "#B91C1C",
    bg: "#FEE2E2",
    icon: "close-circle-outline",
    description: "The gateway did not confirm this payment. You can retry checkout.",
  },
  cancelled: {
    title: "Payment cancelled",
    tone: "#B45309",
    bg: "#FEF3C7",
    icon: "ban-outline",
    description: "This checkout was cancelled before confirmation.",
  },
  refunded: {
    title: "Payment refunded",
    tone: "#7C3AED",
    bg: "#EDE9FE",
    icon: "refresh-circle-outline",
    description: "The payment was reversed or refunded by the gateway.",
  },
};

export default function PaymentStatusScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "PaymentStatus">>();
  const { orderId, checkoutUrl, autoOpenCheckout } = route.params;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [payment, setPayment] = useState<PaymentStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollStartedAtRef = useRef<number | null>(null);
  const lastOpenedCheckoutUrlRef = useRef<string | null>(null);

  const openHostedCheckout = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error("Unable to open payment checkout");
      }

      await Linking.openURL(url);
    } catch (openError) {
      throw new Error(
        openError instanceof Error && openError.message.trim()
          ? openError.message
          : "Unable to open payment checkout"
      );
    }
  }, []);

  const loadStatus = useCallback(async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const [orderData, paymentData] = await Promise.all([
        getOrderDetails(orderId),
        getOrderPaymentStatus(orderId),
      ]);
      setOrder(orderData);
      setPayment(paymentData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payment status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!autoOpenCheckout || !checkoutUrl || lastOpenedCheckoutUrlRef.current === checkoutUrl) {
      return undefined;
    }

    lastOpenedCheckoutUrlRef.current = checkoutUrl;
    void openHostedCheckout(checkoutUrl).catch((openError) => {
      setError(openError instanceof Error ? openError.message : "Unable to open payment checkout");
    });

    return undefined;
  }, [autoOpenCheckout, checkoutUrl, openHostedCheckout]);

  useEffect(() => {
    if (!payment || payment.paymentStatus !== "pending") {
      pollStartedAtRef.current = null;
      setPollTimedOut(false);
      return undefined;
    }

    if (!pollStartedAtRef.current) {
      pollStartedAtRef.current = Date.now();
      setPollTimedOut(false);
    }

    const startedAt = pollStartedAtRef.current;

    const interval = setInterval(() => {
      if (Date.now() - startedAt >= 60_000) {
        setPollTimedOut(true);
        clearInterval(interval);
        return;
      }

      void loadStatus("refresh");
    }, 3000);

    return () => clearInterval(interval);
  }, [loadStatus, payment]);

  const handleRetry = async () => {
    try {
      setRetrying(true);
      setError(null);
      setPollTimedOut(false);
      pollStartedAtRef.current = Date.now();
      const session = await startOrderPaymentCheckout(orderId);
      lastOpenedCheckoutUrlRef.current = session.hostedUrl;
      await openHostedCheckout(session.hostedUrl);
      await loadStatus("refresh");
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to restart payment");
    } finally {
      setRetrying(false);
    }
  };

  const currentStatus = payment?.paymentStatus || order?.paymentStatus || "pending";
  const baseStatusMeta = STATUS_META[currentStatus] || STATUS_META.pending;
  const invoiceReady = Boolean(payment?.invoice?.id);
  const statusMeta =
    currentStatus === "pending" && pollTimedOut
      ? {
          ...baseStatusMeta,
          title: "Payment confirmation is still pending",
          description:
            payment?.message ||
            "The gateway return was received, but the verified backend callback has not completed yet. You can return to your order and check again shortly.",
        }
      : currentStatus === "pending"
        ? {
            ...baseStatusMeta,
            title: "Checking payment confirmation",
            description:
              payment?.message ||
              "Payment confirmation is still pending. You can return to the app and check order status anytime.",
          }
        : {
            ...baseStatusMeta,
            description: payment?.message || baseStatusMeta.description,
          };
  const canRetry =
    currentStatus === "failed" ||
    currentStatus === "cancelled" ||
    (currentStatus === "pending" && pollTimedOut);

  const issuedAt = useMemo(() => {
    const value = payment?.paidAt || payment?.payment?.verifiedAt || order?.paidAt || null;
    return value ? new Date(value).toLocaleString("en-LK") : null;
  }, [order?.paidAt, payment]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Checking payment confirmation</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order || !payment) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={THEME.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Status</Text>
          <View style={styles.headerSpacer} />
        </View>
        <PatientErrorState message={error} onRetry={() => void loadStatus()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Status</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadStatus("refresh")} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: statusMeta.bg }]}>
          <View style={[styles.heroIcon, { backgroundColor: "#FFFFFF" }]}>
            <Ionicons name={statusMeta.icon} size={26} color={statusMeta.tone} />
          </View>
          <Text style={[styles.heroEyebrow, { color: statusMeta.tone }]}>Order #{order.id}</Text>
          <Text style={styles.heroTitle}>{statusMeta.title}</Text>
          <Text style={styles.heroText}>{statusMeta.description}</Text>
        </View>

        {error ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Method</Text>
            <Text style={styles.summaryValue}>
              {payment.paymentMethod === "online" ? "Online payment" : "Cash / Pay at pharmacy"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={[styles.summaryValue, { color: statusMeta.tone }]}>{statusMeta.title}</Text>
          </View>
          {payment.message ? (
            <View style={styles.summaryMessageWrap}>
              <Text style={styles.summaryMessage}>{payment.message}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{formatPrice(payment.amount, payment.currency)}</Text>
          </View>
          {issuedAt ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Verified at</Text>
              <Text style={styles.summaryValue}>{issuedAt}</Text>
            </View>
          ) : null}
          {payment.gatewayPaymentId || payment.payment?.gatewayPaymentId ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gateway ref</Text>
              <Text style={styles.summaryValue}>{payment.gatewayPaymentId || payment.payment?.gatewayPaymentId}</Text>
            </View>
          ) : null}
          {pollTimedOut && currentStatus === "pending" ? (
            <View style={styles.pendingTimeoutCard}>
              <Ionicons name="time-outline" size={18} color="#0F766E" />
              <Text style={styles.pendingTimeoutText}>
                Payment confirmation is still pending. You can return to the app and check order status later.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order progress</Text>
          <Text style={styles.primaryValue}>{order.pharmacyName}</Text>
          <Text style={styles.metaText}>
            {order.fulfillmentType === "delivery" ? "Delivery order" : "Pickup order"} • {order.status.replace(/_/g, " ")}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Invoice</Text>
          {invoiceReady ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Invoice number</Text>
                <Text style={styles.summaryValue}>{payment.invoice?.invoiceNo}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount</Text>
                <Text style={styles.summaryValue}>
                  {formatPrice(payment.invoice?.amount ?? payment.invoice?.total ?? payment.amount, payment.invoice?.currency ?? payment.currency)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Status</Text>
                <Text style={styles.summaryValue}>{String(payment.invoice?.status || "issued").replace(/_/g, " ")}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Issued at</Text>
                <Text style={styles.summaryValue}>
                  {payment.invoice?.issuedAt ? new Date(payment.invoice.issuedAt).toLocaleString("en-LK") : "--"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Email status</Text>
                <Text style={styles.summaryValue}>
                  {payment.invoice?.emailedAt
                    ? `Sent ${new Date(payment.invoice.emailedAt).toLocaleString("en-LK")}`
                    : "Pending"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate("InvoiceScreen", { orderId })}
              >
                <Ionicons name="document-text-outline" size={18} color={THEME.modernAccentDark} />
                <Text style={styles.secondaryButtonText}>
                  View Invoice {payment.invoice?.invoiceNo ? `(${payment.invoice.invoiceNo})` : ""}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.metaText}>Invoice will appear after payment confirmation.</Text>
          )}
        </View>

        {canRetry ? (
          <TouchableOpacity style={styles.ctaButton} onPress={() => void handleRetry()} disabled={retrying}>
            {retrying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.ctaText}>
              {retrying ? "Opening checkout..." : currentStatus === "pending" ? "Retry Checkout" : "Retry Payment"}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.ghostButton}
          onPress={() => navigation.replace("OrderDetails", { orderId })}
        >
          <Text style={styles.ghostButtonText}>Back to Order</Text>
        </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: THEME.navy },
  headerSpacer: { width: 42, height: 42 },
  content: { padding: 20, paddingBottom: 32, gap: 16 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  helperText: { color: THEME.textMuted, fontSize: 14 },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    gap: 10,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEyebrow: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  heroTitle: { fontSize: 24, fontWeight: "900", color: THEME.navy },
  heroText: { fontSize: 14, lineHeight: 21, color: THEME.textMuted },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  summaryLabel: { fontSize: 13, color: THEME.textMuted },
  summaryValue: { flex: 1, textAlign: "right", fontSize: 14, fontWeight: "700", color: THEME.navy },
  summaryMessageWrap: {
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryMessage: { fontSize: 13, lineHeight: 18, color: THEME.textMuted },
  primaryValue: { fontSize: 17, fontWeight: "800", color: THEME.navy },
  metaText: { fontSize: 13, color: THEME.textMuted },
  pendingTimeoutCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pendingTimeoutText: { flex: 1, fontSize: 13, lineHeight: 18, color: "#0F766E" },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  noticeText: { flex: 1, fontSize: 13, color: THEME.navy },
  ctaButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.modernAccentDark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondaryButtonText: { color: THEME.modernAccentDark, fontSize: 14, fontWeight: "800" },
  ghostButton: {
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D6E4EA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  ghostButtonText: { color: THEME.navy, fontSize: 14, fontWeight: "700" },
});
