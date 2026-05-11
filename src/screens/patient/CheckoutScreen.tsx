import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { patientTheme } from "../../constants/patientTheme";
import type { PatientStackParamList } from "../../types/navigation";
import { checkoutCart, getCart, type CartSummary } from "../../services/commerceService";
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

export default function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [notes, setNotes] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("");
  const [deliveryContactName, setDeliveryContactName] = useState("");
  const [deliveryContactPhone, setDeliveryContactPhone] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCart();
      setCart(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load checkout");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCart();
      return undefined;
    }, [loadCart])
  );

  const handleCheckout = async () => {
    if (fulfillmentType === "delivery") {
      if (!deliveryLine1.trim()) {
        setError("Delivery address is required");
        return;
      }
      if (!deliveryContactName.trim()) {
        setError("Delivery contact name is required");
        return;
      }
      if (!deliveryContactPhone.trim()) {
        setError("Delivery contact phone is required");
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      const order = await checkoutCart({
        fulfillmentType,
        notes,
        deliveryAddress:
          fulfillmentType === "delivery"
            ? {
                line1: deliveryLine1,
                city: deliveryCity || null,
                district: deliveryDistrict || null,
              }
            : null,
        deliveryContactName: fulfillmentType === "delivery" ? deliveryContactName : null,
        deliveryContactPhone: fulfillmentType === "delivery" ? deliveryContactPhone : null,
        deliveryNotes: fulfillmentType === "delivery" ? deliveryNotes : null,
      });
      navigation.replace("OrderDetails", { orderId: order.id });
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Preparing checkout</Text>
        </View>
      ) : error && !(cart?.items.length ?? 0) ? (
        <PatientErrorState message={error} onRetry={() => void loadCart()} />
      ) : !(cart?.items.length ?? 0) ? (
        <PatientEmptyState
          icon="bag-handle-outline"
          title="No items ready for checkout"
          message="Your cart is empty."
          actionLabel="Back to Cart"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.fulfillmentCard}>
              <Text style={styles.eyebrow}>Fulfillment</Text>
              <Text style={styles.cardTitle}>Choose how you receive this order</Text>
              <Text style={styles.cardText}>
                Pickup stays available, and delivery is pharmacy-managed without a separate rider flow.
              </Text>
              <View style={styles.fulfillmentToggleRow}>
                {(["pickup", "delivery"] as const).map((option) => {
                  const active = fulfillmentType === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.fulfillmentToggle, active && styles.fulfillmentToggleActive]}
                      onPress={() => setFulfillmentType(option)}
                    >
                      <Text style={[styles.fulfillmentToggleText, active && styles.fulfillmentToggleTextActive]}>
                        {option === "pickup" ? "Pickup" : "Delivery"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Order summary</Text>
              {cart?.items.map((item) => (
                <View key={item.id} style={styles.summaryItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity} x {formatPrice(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatPrice(item.totalPrice)}</Text>
                </View>
              ))}
            </View>

            {fulfillmentType === "delivery" ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Delivery details</Text>
                <TextInput
                  value={deliveryLine1}
                  onChangeText={setDeliveryLine1}
                  placeholder="Address line 1"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.inlineInput}
                />
                <TextInput
                  value={deliveryCity}
                  onChangeText={setDeliveryCity}
                  placeholder="City"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.inlineInput}
                />
                <TextInput
                  value={deliveryDistrict}
                  onChangeText={setDeliveryDistrict}
                  placeholder="District"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.inlineInput}
                />
                <TextInput
                  value={deliveryContactName}
                  onChangeText={setDeliveryContactName}
                  placeholder="Contact name"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.inlineInput}
                />
                <TextInput
                  value={deliveryContactPhone}
                  onChangeText={setDeliveryContactPhone}
                  placeholder="Contact phone"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="phone-pad"
                  style={styles.inlineInput}
                />
                <TextInput
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                  placeholder="Gate, landmark, or apartment note"
                  placeholderTextColor={THEME.textMuted}
                  multiline
                  style={styles.notesInput}
                />
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{fulfillmentType === "delivery" ? "Order note" : "Pickup note"}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={
                  fulfillmentType === "delivery"
                    ? "Add a note for the pharmacy"
                    : "Add pickup instructions or a note for the pharmacy"
                }
                placeholderTextColor={THEME.textMuted}
                multiline
                style={styles.notesInput}
              />
            </View>

            {error ? (
              <View style={styles.notice}>
                <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
                <Text style={styles.noticeText}>{error}</Text>
              </View>
            ) : null}

            <View style={{ height: 180 }} />
          </ScrollView>

          <View style={styles.summaryDock}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPrice(cart?.subtotal ?? 0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Savings</Text>
              <Text style={styles.summaryValue}>-{formatPrice(cart?.discountTotal ?? 0)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(cart?.total ?? 0)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.placeOrderBtn, submitting && styles.placeOrderBtnDisabled]}
              onPress={() => void handleCheckout()}
              disabled={submitting}
            >
              <Text style={styles.placeOrderBtnText}>
                {submitting
                  ? "Placing order..."
                  : fulfillmentType === "delivery"
                    ? "Place Delivery Order"
                    : "Place Pickup Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
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
  headerSpacer: { width: 42, height: 42 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: THEME.navy },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  helperText: { fontSize: 15, color: THEME.textSecondary },
  content: { padding: 20, paddingBottom: 220 },
  fulfillmentCard: {
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
  cardTitle: { marginTop: 8, color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  cardText: { marginTop: 8, color: "#CBD5E1", fontSize: 14, lineHeight: 22 },
  fulfillmentToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  fulfillmentToggle: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  fulfillmentToggleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  fulfillmentToggleText: { fontSize: 14, fontWeight: "800", color: "#CBD5E1" },
  fulfillmentToggleTextActive: { color: "#0F172A" },
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: THEME.navy, marginBottom: 12 },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  itemName: { fontSize: 15, fontWeight: "700", color: THEME.navy },
  itemMeta: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  itemTotal: { fontSize: 15, fontWeight: "800", color: THEME.navy },
  inlineInput: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    color: THEME.navy,
    fontSize: 15,
    marginBottom: 10,
  },
  notesInput: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    textAlignVertical: "top",
    color: THEME.navy,
    fontSize: 15,
  },
  notice: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, color: THEME.danger, fontSize: 14, lineHeight: 20 },
  summaryDock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryRowTotal: { marginTop: 4, marginBottom: 14 },
  summaryLabel: { fontSize: 14, color: THEME.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: "700", color: THEME.navy },
  totalLabel: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  totalValue: { fontSize: 18, fontWeight: "900", color: THEME.navy },
  placeOrderBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.modernAccentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  placeOrderBtnDisabled: { opacity: 0.65 },
  placeOrderBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
