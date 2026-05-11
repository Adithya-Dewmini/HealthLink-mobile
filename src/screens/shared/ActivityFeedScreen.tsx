import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { patientTheme } from "../../constants/patientTheme";
import { getActivityFeed, type ActivityItem } from "../../services/activityService";
import { onNotificationCreated, onOrderUpdated } from "../../services/socketService";

const THEME = {
  ...patientTheme.colors,
  primary: "#0F172A",
  accent: "#38BDF8",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  textMain: "#0F172A",
  textMuted: "#64748B",
};

const formatGroupLabel = (value: string) => {
  const current = new Date();
  const target = new Date(value);
  const days = Math.floor((current.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return target.toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" });
};

const activityIcon = (item: ActivityItem): keyof typeof Ionicons.glyphMap => {
  if (item.orderId) return "receipt-outline";
  if (item.prescriptionId) return "document-text-outline";
  if (item.queueId) return "people-outline";
  return "pulse-outline";
};

export default function ActivityFeedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const title = route.params?.title || "Activity";
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (nextPage: number, mode: "initial" | "refresh" | "append") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "append") setLoadingMore(true);
      setError(null);

      const data = await getActivityFeed(nextPage, 20);
      setPage(data.page);
      setHasMore(data.items.length >= 20);
      setItems((current) =>
        mode === "append"
          ? [
              ...current,
              ...data.items.filter((item: ActivityItem) => !current.some((existing) => existing.id === item.id)),
            ]
          : data.items
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load activity");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPage(1, "initial");
      return undefined;
    }, [loadPage])
  );

  React.useEffect(() => {
    const refresh = () => {
      void loadPage(1, "refresh");
    };
    const offOrder = onOrderUpdated(refresh);
    const offNotification = onNotificationCreated(refresh);
    return () => {
      offOrder();
      offNotification();
    };
  }, [loadPage]);

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, ActivityItem[]>();
    for (const item of items) {
      const key = formatGroupLabel(item.createdAt);
      const existing = grouped.get(key) ?? [];
      existing.push(item);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries());
  }, [items]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[THEME.primary, "#1E293B"]} style={styles.headerBackground} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color={THEME.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerButtonGhost}>
            <Ionicons name="time-outline" size={18} color={THEME.white} />
          </View>
        </View>

        <View style={styles.heroCardShell}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Live Feed</Text>
            <Text style={styles.heroTitle}>Your activity timeline</Text>
            <Text style={styles.heroBody}>
              Orders, prescriptions, and queue changes are grouped here as they happen.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={THEME.accent} />
            <Text style={styles.helperText}>Loading activity</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void loadPage(1, "refresh")} />
            }
          >
            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {groupedItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="pulse-outline" size={28} color={THEME.accent} />
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptyText}>Your orders, prescriptions, and queue activity will appear here.</Text>
              </View>
            ) : (
              groupedItems.map(([group, values]) => (
                <View key={group} style={styles.groupBlock}>
                  <Text style={styles.groupTitle}>{group}</Text>
                  {values.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemIcon}>
                        <Ionicons name={activityIcon(item)} size={18} color={THEME.accent} />
                      </View>
                      <View style={styles.itemBody}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemText}>{item.description || "Activity recorded"}</Text>
                        <Text style={styles.itemTime}>
                          {new Date(item.createdAt).toLocaleTimeString("en-LK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}

            {hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => void loadPage(page + 1, "append")}
                disabled={loadingMore}
                accessibilityLabel="Load more activity"
              >
                <Text style={styles.loadMoreText}>{loadingMore ? "Loading..." : "Load more"}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  headerBackground: { position: "absolute", top: 0, width: "100%", height: 220, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16 },
  headerButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  headerButtonGhost: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: THEME.white, fontSize: 18, fontWeight: "800" },
  heroCardShell: { paddingHorizontal: 24, paddingTop: 8 },
  heroCard: { backgroundColor: THEME.white, borderRadius: 30, padding: 22, borderWidth: 1, borderColor: "#E2E8F0" },
  heroLabel: { fontSize: 11, fontWeight: "900", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2 },
  heroTitle: { fontSize: 28, fontWeight: "900", color: THEME.textMain, marginTop: 8 },
  heroBody: { fontSize: 14, lineHeight: 21, color: THEME.textMuted, marginTop: 14 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  helperText: { fontSize: 14, color: THEME.textMuted },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36 },
  errorCard: { flexDirection: "row", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 16, padding: 14, marginBottom: 16 },
  errorText: { flex: 1, color: "#B91C1C", fontSize: 14 },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "800", color: THEME.textMain },
  emptyText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: THEME.textMuted, textAlign: "center" },
  groupBlock: { marginBottom: 18 },
  groupTitle: { fontSize: 13, fontWeight: "900", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  itemCard: { flexDirection: "row", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", padding: 16, marginBottom: 10 },
  itemIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "800", color: THEME.textMain },
  itemText: { marginTop: 5, fontSize: 13, lineHeight: 19, color: THEME.textMuted },
  itemTime: { marginTop: 8, fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  loadMoreButton: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE" },
  loadMoreText: { fontSize: 14, fontWeight: "800", color: "#0369A1" },
});
