import React, { useCallback, useEffect, useState } from "react";
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
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { patientTheme } from "../../constants/patientTheme";
import type { PatientStackParamList } from "../../types/navigation";
import { addToCart, getCart } from "../../services/commerceService";
import { getProductDetails, type MarketplaceStoreProduct } from "../../services/marketplaceService";
import { PatientEmptyState, PatientErrorState } from "../../components/patient/PatientFeedback";

const THEME = patientTheme.colors;

const formatPrice = (value: number) =>
  `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PharmacyProductDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "PharmacyProductDetails">>();
  const { productId } = route.params;

  const [product, setProduct] = useState<MarketplaceStoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductDetails(productId);
      setProduct(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load product details");
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = useCallback(async () => {
    try {
      const cart = await getCart();
      setCartCount(cart.itemCount);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    void loadProduct();
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      void loadCartCount();
      return undefined;
    }, [loadCartCount])
  );

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      setBusy(true);
      setError(null);
      setSuccessMessage(null);
      const cart = await addToCart(product.id, 1);
      setCartCount(cart.itemCount);
      setSuccessMessage(`${product.name} added to cart`);
    } catch (cartError) {
      setError(cartError instanceof Error ? cartError.message : "Unable to add product to cart");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Loading product details</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={THEME.navy} />
          </TouchableOpacity>
        </View>
        <PatientErrorState
          title="Product unavailable"
          message={error}
          onRetry={() => void loadProduct()}
        />
      </SafeAreaView>
    );
  }

  const displayPrice = product.discountPrice ?? product.price;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate("Cart")}>
          <Ionicons name="cart-outline" size={22} color={THEME.navy} />
          {cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons name="medkit-outline" size={50} color={THEME.navy} />
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.category}>{product.category || "Healthcare"}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.subtitle}>
            {[product.genericName, product.brand].filter(Boolean).join(" • ") || "Pharmacy item"}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(displayPrice)}</Text>
            {product.discountPrice ? (
              <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>
            ) : null}
          </View>

          <View style={styles.badgeRow}>
            <View style={[styles.pill, product.inStock ? styles.pillSuccess : styles.pillMuted]}>
              <Text style={[styles.pillText, product.inStock ? styles.pillTextSuccess : styles.pillTextMuted]}>
                {product.inStock
                  ? `${product.stockQuantity} units in stock`
                  : "Currently unavailable"}
              </Text>
            </View>
            {product.requiresPrescription ? (
              <View style={[styles.pill, styles.pillDark]}>
                <Text style={[styles.pillText, styles.pillTextLight]}>Prescription required</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>About this product</Text>
          <Text style={styles.description}>
            {product.description || "This product is listed by the pharmacy storefront."}
          </Text>

          {error ? (
            <View style={styles.inlineNotice}>
              <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
              <Text style={styles.inlineNoticeText}>{error}</Text>
            </View>
          ) : null}
          {successMessage ? (
            <View style={[styles.inlineNotice, styles.inlineSuccess]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#0F8A5F" />
              <Text style={[styles.inlineNoticeText, styles.inlineSuccessText]}>{successMessage}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={[
            styles.addButton,
            (!product.inStock || product.requiresPrescription || busy) && styles.addButtonDisabled,
          ]}
          onPress={() => void handleAddToCart()}
          disabled={!product.inStock || product.requiresPrescription || busy}
        >
          <Text style={styles.addButtonText}>
            {product.requiresPrescription
              ? "Prescription Required"
              : busy
                ? "Adding..."
                : "Add to Cart"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Cart")}>
          <Text style={styles.secondaryButtonText}>View Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  helperText: {
    fontSize: 15,
    color: THEME.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
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
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  content: {
    padding: 20,
    paddingBottom: 180,
  },
  hero: {
    height: 280,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  panel: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  category: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: THEME.modernAccentDark,
  },
  name: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: THEME.navy,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: "900",
    color: THEME.navy,
  },
  originalPrice: {
    fontSize: 15,
    color: THEME.textMuted,
    textDecorationLine: "line-through",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillSuccess: {
    backgroundColor: "#E7F7EF",
  },
  pillMuted: {
    backgroundColor: "#E5E7EB",
  },
  pillDark: {
    backgroundColor: "#0F172A",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  pillTextSuccess: {
    color: "#0F8A5F",
  },
  pillTextMuted: {
    color: "#475569",
  },
  pillTextLight: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    marginTop: 24,
    fontSize: 17,
    fontWeight: "800",
    color: THEME.navy,
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    color: THEME.textSecondary,
  },
  inlineNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
  },
  inlineNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.danger,
  },
  inlineSuccess: {
    backgroundColor: "#ECFDF5",
  },
  inlineSuccessText: {
    color: "#0F8A5F",
  },
  bottomDock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 10,
  },
  addButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: THEME.modernAccentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    opacity: 0.55,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: THEME.modernAccentDark,
    fontSize: 15,
    fontWeight: "800",
  },
});
