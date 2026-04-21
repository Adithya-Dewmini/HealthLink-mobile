import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#2563EB",
  background: "#F9FAFB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "#E5E7EB",
};

export default function PharmacyStoreScreen() {
  const navigation = useNavigation<any>();
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView stickyHeaderIndices={[2]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Image
            source={{
              uri:
                "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?q=80&w=1000&auto=format&fit=crop",
            }}
            style={styles.bannerImage}
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={THEME.white} />
          </TouchableOpacity>

          <View style={styles.storeInfoCard}>
            <Text style={styles.storeName}>Lanka Pharmacy - Central</Text>
            <View style={styles.metaRow}>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>4.8 (500+ ratings)</Text>
              </View>
              <View style={styles.dot} />
              <Text style={styles.metaText}>0.8 km away</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="call-outline" size={18} color={THEME.primary} />
                <Text style={styles.actionBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="navigate-outline" size={18} color={THEME.primary} />
                <Text style={styles.actionBtnText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="share-outline" size={18} color={THEME.primary} />
                <Text style={styles.actionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={THEME.textSecondary} />
            <TextInput
              placeholder="Search medicines in this store"
              style={styles.searchInput}
              placeholderTextColor={THEME.textSecondary}
            />
          </View>
        </View>

        <View style={styles.categoryWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {["All", "Pain Relief", "Vitamins", "Antibiotics", "Baby Care"].map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.categoryTab, activeCategory === cat && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === cat && styles.activeTabText,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.productList}>
          <ProductCard
            name="Panadol Advance"
            desc="500mg • 12 Tablets"
            price="Rs. 180.00"
            status="In Stock"
            color={THEME.success}
          />
          <ProductCard
            name="Amoxicillin"
            desc="250mg • Capsule"
            price="Rs. 45.00/unit"
            status="Low Stock"
            color={THEME.warning}
          />
          <ProductCard
            name="Vitamin C 1000mg"
            desc="Effervescent • 10 Tabs"
            price="Rs. 950.00"
            status="In Stock"
            color={THEME.success}
          />
          <ProductCard
            name="Ibuprofen 200mg"
            desc="Pain Relief • 10 Tablets"
            price="Rs. 220.00"
            status="Out of Stock"
            color={THEME.danger}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cartBtn}>
          <Text style={styles.cartBtnText}>View Cart (0 Items)</Text>
          <Text style={styles.cartPrice}>Rs. 0.00</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const ProductCard = ({ name, desc, price, status, color }: any) => (
  <View style={styles.productCard}>
    <View style={styles.productLeft}>
      <View style={styles.productImagePlaceholder}>
        <MaterialCommunityIcons name="pill" size={24} color={THEME.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>{name}</Text>
        <Text style={styles.productDesc}>{desc}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{status}</Text>
        </View>
      </View>
    </View>
    <View style={styles.productRight}>
      <Text style={styles.priceText}>{price}</Text>
      <TouchableOpacity style={styles.addBtn}>
        <Text style={styles.addBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  headerSection: { height: 280, backgroundColor: THEME.white },
  bannerImage: { width: "100%", height: 200 },
  backBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  storeInfoCard: {
    position: "absolute",
    bottom: 0,
    width: width - 40,
    alignSelf: "center",
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  storeName: { fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ratingBox: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, fontWeight: "700", color: THEME.textPrimary },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: THEME.border, marginHorizontal: 8 },
  metaText: { fontSize: 13, color: THEME.textSecondary },
  actionRow: { flexDirection: "row", marginTop: 15, gap: 15 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: THEME.primary },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: THEME.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: { marginLeft: 10, fontSize: 15, flex: 1, color: THEME.textPrimary },
  categoryWrapper: { backgroundColor: THEME.background, paddingBottom: 10 },
  categoryScroll: { paddingHorizontal: 20 },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activeTab: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  categoryText: { fontSize: 14, fontWeight: "700", color: THEME.textSecondary },
  activeTabText: { color: THEME.white },
  productList: { paddingHorizontal: 20, marginTop: 10 },
  productCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  productLeft: { flexDirection: "row", flex: 1, gap: 12 },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  productName: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  productDesc: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "800" },
  productRight: { alignItems: "flex-end", justifyContent: "space-between" },
  priceText: { fontSize: 15, fontWeight: "800", color: THEME.textPrimary },
  addBtn: { backgroundColor: THEME.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: THEME.white, fontWeight: "800", fontSize: 12 },
  footer: {
    position: "absolute",
    bottom: 0,
    width,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  cartBtn: {
    backgroundColor: THEME.textPrimary,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  cartBtnText: { color: THEME.white, fontWeight: "800", fontSize: 15 },
  cartPrice: { color: THEME.white, fontWeight: "800", fontSize: 15 },
});
