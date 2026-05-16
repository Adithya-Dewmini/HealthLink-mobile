import React, { useCallback, useEffect, useState } from "react";
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
import type { PatientStackParamList } from "../../types/navigation";
import { getOrderInvoice, type InvoiceDetails } from "../../services/commerceService";
import { patientTheme } from "../../constants/patientTheme";
import { PatientErrorState } from "../../components/patient/PatientFeedback";

const THEME = patientTheme.colors;

const formatPrice = (value: number, currency = "LKR") =>
  `${currency} ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function InvoiceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "InvoiceScreen">>();
  const { orderId } = route.params;

  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvoice = useCallback(async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const data = await getOrderInvoice(orderId);
      setInvoice(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invoice");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Loading invoice</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={THEME.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={styles.headerSpacer} />
        </View>
        <PatientErrorState message={error} onRetry={() => void loadInvoice()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice</Text>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.replace("OrderDetails", { orderId })}
        >
          <Ionicons name="receipt-outline" size={22} color={THEME.navy} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadInvoice("refresh")} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Invoice</Text>
          <Text style={styles.heroTitle}>{invoice.invoice.invoiceNo}</Text>
          <Text style={styles.heroMeta}>
            Order #{invoice.order.id} • {new Date(invoice.invoice.issuedAt).toLocaleDateString("en-LK")}
          </Text>
        </View>

        {error ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pharmacy</Text>
          <Text style={styles.primaryValue}>{invoice.pharmacy.name}</Text>
          {invoice.pharmacy.address ? <Text style={styles.metaText}>{invoice.pharmacy.address}</Text> : null}
          {invoice.pharmacy.phone ? <Text style={styles.metaText}>{invoice.pharmacy.phone}</Text> : null}
          {invoice.pharmacy.email ? <Text style={styles.metaText}>{invoice.pharmacy.email}</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <Text style={styles.primaryValue}>{invoice.patient.name || "Patient"}</Text>
          {invoice.patient.phone ? <Text style={styles.metaText}>{invoice.patient.phone}</Text> : null}
          {invoice.patient.email ? <Text style={styles.metaText}>{invoice.patient.email}</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items</Text>
          {invoice.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {item.quantity} x {item.name}
                </Text>
                <Text style={styles.metaText}>
                  Requested {item.requestedQuantity} • Approved {item.approvedQuantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatPrice(item.totalPrice, invoice.invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Totals</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(invoice.invoice.subtotal, invoice.invoice.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={styles.summaryValue}>{formatPrice(invoice.invoice.deliveryFee, invoice.invoice.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service fee</Text>
            <Text style={styles.summaryValue}>{formatPrice(invoice.invoice.serviceFee, invoice.invoice.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>-{formatPrice(invoice.invoice.discount, invoice.invoice.currency)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(invoice.invoice.total, invoice.invoice.currency)}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Method</Text>
            <Text style={styles.summaryValue}>
              {invoice.order.paymentMethod === "online" ? "Online payment" : "Cash / Pay at pharmacy"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>{invoice.order.paymentStatus || "pending"}</Text>
          </View>
          {invoice.order.paidAt ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid at</Text>
              <Text style={styles.summaryValue}>{new Date(invoice.order.paidAt).toLocaleString("en-LK")}</Text>
            </View>
          ) : null}
        </View>
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
    backgroundColor: "#D1FAE5",
    gap: 8,
  },
  heroEyebrow: { fontSize: 12, fontWeight: "800", color: THEME.modernAccentDark, textTransform: "uppercase" },
  heroTitle: { fontSize: 24, fontWeight: "900", color: THEME.navy },
  heroMeta: { fontSize: 13, color: THEME.textMuted },
  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  primaryValue: { fontSize: 17, fontWeight: "800", color: THEME.navy },
  metaText: { fontSize: 13, color: THEME.textMuted },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  itemName: { fontSize: 14, fontWeight: "700", color: THEME.navy },
  itemTotal: { fontSize: 14, fontWeight: "800", color: THEME.navy },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  summaryLabel: { fontSize: 13, color: THEME.textMuted },
  summaryValue: { fontSize: 14, fontWeight: "700", color: THEME.navy },
  totalRow: { marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  totalLabel: { fontSize: 15, fontWeight: "800", color: THEME.navy },
  totalValue: { fontSize: 18, fontWeight: "900", color: THEME.modernAccentDark },
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
});
