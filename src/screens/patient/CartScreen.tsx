import React, { useCallback, useState } from "react";
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
import {
  getCart,
  removeCartItem,
  updateCartItem,
  type CartItem,
  type CartSummary,
} from "../../services/commerceService";
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

export default function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCart();
      setCart(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load cart");
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

  const handleQuantityChange = async (item: CartItem, nextQuantity: number) => {
    try {
      setBusyItemId(item.id);
      setError(null);
      const nextCart = await updateCartItem(item.id, nextQuantity);
      setCart(nextCart);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update cart item");
    } finally {
      setBusyItemId(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      setBusyItemId(itemId);
      setError(null);
      const nextCart = await removeCartItem(itemId);
      setCart(nextCart);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove cart item");
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate("Orders")}>
          <Ionicons name="receipt-outline" size={22} color={THEME.navy} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Loading cart</Text>
        </View>
      ) : error && !(cart?.items.length ?? 0) ? (
        <PatientErrorState message={error} onRetry={() => void loadCart()} />
      ) : !(cart?.items.length ?? 0) ? (
        <PatientEmptyState
          icon="cart-outline"
          title="Your cart is empty"
          message="Add products from a pharmacy storefront to begin checkout."
          actionLabel="Browse Pharmacies"
          onAction={() => navigation.navigate("PharmacyMarketplace")}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.pharmacyBanner}>
              <Text style={styles.pharmacyEyebrow}>Single-store checkout</Text>
              <Text style={styles.pharmacyName}>{cart?.pharmacyName || "Pharmacy"}</Text>
              <Text style={styles.pharmacyNote}>
                This cart only supports one pharmacy at a time to keep reservation and fulfillment stable.
              </Text>
            </View>

            {error ? (
              <View style={styles.notice}>
                <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
                <Text style={styles.noticeText}>{error}</Text>
              </View>
            ) : null}

            {cart?.items.map((item) => {
              const busy = busyItemId === item.id;
              return (
                <View key={item.id} style={styles.itemCard}>
                  {item.product.imageUrl ? (
                    <Image source={{ uri: item.product.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemFallback}>
                      <Ionicons name="medkit-outline" size={26} color={THEME.navy} />
                    </View>
                  )}

                  <View style={styles.itemBody}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    <Text style={styles.itemMeta}>
                      {[item.product.genericName, item.product.brand].filter(Boolean).join(" • ") ||
                        item.product.category ||
                        "Healthcare"}
                    </Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.unitPrice)}</Text>
                    <View style={styles.stockRow}>
                      <Text style={styles.stockText}>
                        {item.product.availableStock} available for checkout
                      </Text>
                      {item.product.requiresPrescription ? (
                        <Text style={styles.rxText}>Rx required</Text>
                      ) : null}
                    </View>

                    <View style={styles.itemFooter}>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => void handleQuantityChange(item, Math.max(1, item.quantity - 1))}
                          disabled={busy || item.quantity <= 1}
                        >
                          <Ionicons name="remove" size={18} color={THEME.navy} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => void handleQuantityChange(item, item.quantity + 1)}
                          disabled={busy || item.quantity >= item.product.availableStock}
                        >
                          <Ionicons name="add" size={18} color={THEME.navy} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity onPress={() => void handleRemove(item.id)} disabled={busy}>
                        <Text style={styles.removeText}>{busy ? "Updating..." : "Remove"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

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
            <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate("Checkout")}>
              <Text style={styles.checkoutBtnText}>Continue to Checkout</Text>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.navy,
  },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  helperText: { fontSize: 15, color: THEME.textSecondary },
  content: { padding: 20, paddingBottom: 220 },
  pharmacyBanner: {
    backgroundColor: "#0F172A",
    borderRadius: 28,
    padding: 20,
  },
  pharmacyEyebrow: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  pharmacyName: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  pharmacyNote: {
    marginTop: 8,
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
  },
  notice: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, color: THEME.danger, fontSize: 14, lineHeight: 20 },
  itemCard: {
    flexDirection: "row",
    gap: 14,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  itemImage: { width: 96, height: 96, borderRadius: 20 },
  itemFallback: {
    width: 96,
    height: 96,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  itemBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  itemMeta: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  itemPrice: { marginTop: 8, fontSize: 17, fontWeight: "800", color: THEME.modernAccentDark },
  stockRow: { marginTop: 8, gap: 4 },
  stockText: { fontSize: 12, fontWeight: "700", color: "#0F8A5F" },
  rxText: { fontSize: 12, fontWeight: "700", color: THEME.danger },
  itemFooter: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { minWidth: 18, textAlign: "center", fontSize: 15, fontWeight: "800", color: THEME.navy },
  removeText: { color: THEME.danger, fontSize: 13, fontWeight: "800" },
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
    alignItems: "center",
    marginBottom: 8,
  },
  summaryRowTotal: {
    marginTop: 4,
    marginBottom: 14,
  },
  summaryLabel: { fontSize: 14, color: THEME.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: "700", color: THEME.navy },
  totalLabel: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  totalValue: { fontSize: 18, fontWeight: "900", color: THEME.navy },
  checkoutBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.modernAccentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
