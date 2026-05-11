import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type CartSummary,
} from "../../services/commerceService";
import {
  getPharmacyStore,
  type MarketplaceStore,
  type MarketplaceStoreProduct,
} from "../../services/marketplaceService";

const { width } = Dimensions.get("window");
const THEME = patientTheme.colors;
const CARD_GAP = 16;
const GRID_CARD_WIDTH = (width - 20 * 2 - CARD_GAP) / 2;
const HERO_HEIGHT = 360;

type ProductCategory = string;

const formatPrice = (value: number) =>
  `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PharmacyStoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "PharmacyStore">>();
  const { pharmacyId } = route.params;
  const insets = useSafeAreaInsets();

  const [store, setStore] = useState<MarketplaceStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("All");
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [cartBusyId, setCartBusyId] = useState<string | null>(null);

  const loadStore = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await getPharmacyStore(pharmacyId);
      setStore(response);
    } catch (error) {
      setStore(null);
      setLoadError(
        error instanceof Error ? error.message : "Unable to load the pharmacy storefront."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStore();
  }, [pharmacyId]);

  const loadCart = useCallback(async () => {
    try {
      const response = await getCart();
      setCart(response);
      setCartError(null);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Unable to load cart");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCart();
      return undefined;
    }, [loadCart])
  );

  const categoryTabs = useMemo(
    () => ["All", ...(store?.categories || [])],
    [store?.categories]
  );

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const products = store?.products || [];

    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        (product.genericName || "").toLowerCase().includes(query) ||
        (product.brand || "").toLowerCase().includes(query) ||
        (product.category || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchText, store?.products]);

  const featuredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const products = store?.featuredProducts || [];

    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        (product.genericName || "").toLowerCase().includes(query) ||
        (product.brand || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchText, store?.featuredProducts]);

  const cartCounts = useMemo(
    () =>
      Object.fromEntries(
        (cart?.items ?? []).map((item) => [item.product.id, item.quantity])
      ) as Record<string, number>,
    [cart?.items]
  );

  const cartCount = cart?.itemCount ?? 0;
  const cartTotal = cart?.total ?? 0;

  const heroImage =
    store?.pharmacy.coverImageUrl ||
    store?.pharmacy.imageUrl ||
    store?.pharmacy.logoUrl ||
    "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=80";

  const handleAddToCart = async (product: MarketplaceStoreProduct) => {
    try {
      setCartBusyId(product.id);
      const nextCart = await addToCart(product.id, 1);
      setCart(nextCart);
      setCartError(null);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Unable to add product to cart");
    } finally {
      setCartBusyId(null);
    }
  };

  const handleRemoveFromCart = async (productId: string) => {
    const cartItem = cart?.items.find((item) => item.product.id === productId);
    if (!cartItem) return;

    try {
      setCartBusyId(productId);
      const nextCart =
        cartItem.quantity <= 1
          ? await removeCartItem(cartItem.id)
          : await updateCartItem(cartItem.id, cartItem.quantity - 1);
      setCart(nextCart);
      setCartError(null);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Unable to remove product from cart");
    } finally {
      setCartBusyId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.loadingText}>Loading pharmacy storefront</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={32} color={THEME.danger} />
          <Text style={styles.emptyTitle}>Storefront unavailable</Text>
          <Text style={styles.emptyText}>
            {loadError || "The storefront could not be loaded right now."}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void loadStore()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safe}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        overScrollMode="never"
      >
        <View
          style={[
            styles.hero,
            {
              height: HERO_HEIGHT + insets.top,
            },
          ]}
        >
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
          <LinearGradient
            colors={["rgba(8,15,28,0.18)", "rgba(10,16,31,0.8)", "rgba(10,16,31,0.98)"]}
            style={styles.heroOverlay}
          />

          <View style={[styles.heroTopRow, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={26} color={THEME.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroIconBtn}>
              <Ionicons name="ellipsis-horizontal" size={24} color={THEME.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.storeIdentity}>
            <View style={styles.storeAvatarRing}>
              <Image source={{ uri: heroImage }} style={styles.storeAvatar} />
            </View>
            <Text style={styles.storeName}>{store.pharmacy.name || "Pharmacy"}</Text>
            <Text style={styles.storeMeta}>
              {store.pharmacy.status || "Open now"} • {store.pharmacy.location || "Sri Lanka"} •{" "}
              {store.pharmacy.rating ? `${store.pharmacy.rating.toFixed(1)} rating` : "Trusted partner"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.stickyShell,
            {
              marginTop: -40,
            },
          ]}
        >
          <View style={[styles.statusBarCover, { height: Math.max(insets.top - 10, 8) }]} />
          <View style={styles.stickyPanel}>
            {loadError || cartError ? (
              <View style={styles.noticeBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#8A5A00" />
                <Text style={styles.noticeText}>{loadError || cartError}</Text>
              </View>
            ) : null}

            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={23} color="#4B5563" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={`Search ${store.pharmacy.name || "pharmacy"}`}
                  placeholderTextColor="#4B5563"
                  style={styles.searchInput}
                />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              {categoryTabs.map((category) => {
                const active = activeCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setActiveCategory(category)}
                    style={styles.categoryTab}
                  >
                    <Text style={[styles.categoryText, active && styles.activeCategoryText]}>
                      {category}
                    </Text>
                    <View style={[styles.categoryUnderline, active && styles.categoryUnderlineActive]} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.body}>
          {featuredProducts.length > 0 && activeCategory === "All" && searchText.trim().length === 0 ? (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured products</Text>
                <View style={styles.sectionArrow}>
                  <Ionicons name="sparkles-outline" size={22} color={THEME.textPrimary} />
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sectionRail}
              >
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compact
                    count={cartCounts[product.id] ?? 0}
                    busy={cartBusyId === product.id}
                    onAdd={() => void handleAddToCart(product)}
                    onRemove={() => void handleRemoveFromCart(product.id)}
                    onView={() =>
                      navigation.navigate("PharmacyProductDetails", {
                        productId: product.id,
                        pharmacyId: product.pharmacyId,
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.gridSection}>
            <Text style={styles.sectionTitle}>
              {searchText.trim().length > 0
                ? "Search results"
                : activeCategory === "All"
                  ? "All products"
                  : activeCategory}
            </Text>
            {filteredProducts.length > 0 ? (
              <View style={styles.gridWrap}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    count={cartCounts[product.id] ?? 0}
                    busy={cartBusyId === product.id}
                    onAdd={() => void handleAddToCart(product)}
                    onRemove={() => void handleRemoveFromCart(product.id)}
                    onView={() =>
                      navigation.navigate("PharmacyProductDetails", {
                        productId: product.id,
                        pharmacyId: product.pharmacyId,
                      })
                    }
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={32} color={THEME.textMuted} />
                <Text style={styles.emptyTitle}>No products available</Text>
                <Text style={styles.emptyText}>
                  Try another category or search term.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <View style={styles.cartDock}>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate("Cart")}
          >
            <View>
              <Text style={styles.cartPrimary}>View Cart</Text>
              <Text style={styles.cartSecondary}>{cartCount} items ready</Text>
            </View>
            <Text style={styles.cartTotal}>{formatPrice(cartTotal)}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ProductCard({
  product,
  count,
  busy,
  onAdd,
  onRemove,
  onView,
  compact = false,
}: {
  product: MarketplaceStoreProduct;
  count: number;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onView: () => void;
  compact?: boolean;
}) {
  const displayPrice = product.discountPrice ?? product.price;
  const subtitle = [product.genericName, product.brand].filter(Boolean).join(" • ") || product.category || "Healthcare";

  return (
    <View style={[styles.productCard, compact ? styles.productCardCompact : styles.productCardGrid]}>
      <View style={styles.productImageShell}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={styles.productImageFallback}>
            <Ionicons name="medkit-outline" size={28} color="#0F172A" />
          </View>
        )}
        {count > 0 ? (
          <TouchableOpacity
            style={[styles.removeBtn, busy && styles.addBtnDisabled]}
            onPress={onRemove}
            disabled={busy}
          >
            <Ionicons name={busy ? "time-outline" : "remove"} size={20} color="#111111" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.addBtn, !product.inStock && styles.addBtnDisabled]}
          onPress={onAdd}
          disabled={!product.inStock || busy}
        >
          <Ionicons
            name={busy ? "time-outline" : product.inStock ? "add" : "remove"}
            size={20}
            color="#111111"
          />
        </TouchableOpacity>
        {count > 0 ? (
          <View style={styles.quantityBubble}>
            <Text style={styles.quantityText}>{count}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.productInfo}>
        <Text style={[styles.priceText, product.discountPrice ? styles.priceTextDeal : null]}>
          {formatPrice(displayPrice)}
        </Text>
        {product.discountPrice ? (
          <Text style={styles.originalPrice}>{formatPrice(product.price)}</Text>
        ) : null}
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productSubtitle}>{subtitle}</Text>
        <TouchableOpacity onPress={onView} style={styles.detailsLink}>
          <Text style={styles.detailsLinkText}>View details</Text>
        </TouchableOpacity>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badgePill,
              product.inStock ? styles.badgePillBuyAgain : styles.badgePillMuted,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                product.inStock ? styles.badgeTextSuccess : styles.badgeTextMuted,
              ]}
            >
              {product.inStock ? `${product.stockQuantity} in stock` : "Out of stock"}
            </Text>
          </View>
          {product.requiresPrescription ? (
            <View style={[styles.badgePill, styles.badgePillDeal]}>
              <Text style={[styles.badgeText, styles.badgeTextLight]}>Rx required</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 120,
    backgroundColor: "#FFFFFF",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
  },
  loadingText: {
    fontSize: 15,
    color: THEME.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  hero: {
    height: HERO_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  heroIconBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(7, 11, 19, 0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  storeIdentity: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 110,
  },
  storeAvatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 4,
    marginBottom: 18,
  },
  storeAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 41,
  },
  storeName: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.7,
  },
  storeMeta: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    fontWeight: "400",
    paddingHorizontal: 20,
  },
  stickyShell: {
    backgroundColor: "#FFFFFF",
    marginTop: -24,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: "hidden",
  },
  statusBarCover: {
    backgroundColor: "#FFFFFF",
  },
  stickyPanel: {
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
  },
  noticeBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFF7E8",
    borderWidth: 1,
    borderColor: "#F2D39B",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#8A5A00",
    fontWeight: "500",
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  searchBar: {
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "400",
  },
  categoryTabs: {
    paddingHorizontal: 10,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: "center",
    marginHorizontal: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  activeCategoryText: {
    color: "#000000",
    fontWeight: "700",
  },
  categoryUnderline: {
    height: 4,
    width: 64,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginTop: 12,
  },
  categoryUnderlineActive: {
    backgroundColor: "#000000",
  },
  body: {
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
  },
  sectionBlock: {
    marginBottom: 28,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionArrow: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F4",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionRail: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  gridSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    paddingTop: 18,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
  },
  productCardCompact: {
    width: width * 0.58,
    marginRight: 14,
  },
  productCardGrid: {
    width: GRID_CARD_WIDTH,
  },
  productImageShell: {
    width: "100%",
    aspectRatio: 0.95,
    borderRadius: 28,
    backgroundColor: "#F5F5F4",
    overflow: "hidden",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7E5E4",
  },
  addBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  quantityBubble: {
    position: "absolute",
    left: 12,
    bottom: 12,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  quantityText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  productInfo: {
    paddingTop: 14,
  },
  priceText: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  priceTextDeal: {
    color: "#B91C1C",
  },
  originalPrice: {
    marginTop: 2,
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  productName: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    color: "#0F172A",
  },
  productSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },
  detailsLink: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  detailsLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.modernAccentDark,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  badgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgePillDeal: {
    backgroundColor: "#111827",
  },
  badgePillBuyAgain: {
    backgroundColor: "#E7F7EF",
  },
  badgePillMuted: {
    backgroundColor: "#F3F4F6",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextLight: {
    color: "#FFFFFF",
  },
  badgeTextSuccess: {
    color: "#0F8A5F",
  },
  badgeTextMuted: {
    color: "#6B7280",
  },
  emptyState: {
    paddingVertical: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
  cartDock: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 16,
  },
  cartBtn: {
    backgroundColor: "#111827",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartPrimary: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  cartSecondary: {
    marginTop: 3,
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
  },
  cartTotal: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
