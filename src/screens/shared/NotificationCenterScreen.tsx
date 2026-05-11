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
import {
  getNotifications,
  markNotificationAsRead,
  type NotificationItem,
} from "../../services/notificationCenterService";
import { onNotificationCreated } from "../../services/socketService";

const THEME = {
  ...patientTheme.colors,
  primary: "#0F172A",
  accent: "#38BDF8",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  textMain: "#0F172A",
  textMuted: "#64748B",
};

type NotificationPanel = "patient" | "doctor" | "pharmacy" | "medical_center" | "receptionist";

type NotificationRouteParams = {
  title?: string;
  panel?: NotificationPanel;
};

const PANEL_COPY: Record<
  NotificationPanel,
  {
    heroTitle: string;
    heroBody: string;
  }
> = {
  patient: {
    heroTitle: "Your updates",
    heroBody: "Orders, prescriptions, and health-related alerts arrive here in real time.",
  },
  doctor: {
    heroTitle: "Doctor updates",
    heroBody: "Queue changes, bookings, and clinical workflow notifications appear here.",
  },
  pharmacy: {
    heroTitle: "Pharmacy updates",
    heroBody: "Incoming orders, fulfillment changes, and store alerts arrive here first.",
  },
  medical_center: {
    heroTitle: "Center updates",
    heroBody: "Staff activity, schedules, and admin alerts are collected here.",
  },
  receptionist: {
    heroTitle: "Reception updates",
    heroBody: "Queue movement, session changes, and front-desk activity arrive here.",
  },
};

const formatRelativeSection = (value: string) => {
  const createdAt = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays <= 7) return "This Week";
  return "Earlier";
};

const formatTime = (value: string) =>
  new Date(value).toLocaleString("en-LK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const notificationIconByType = (type: string): keyof typeof Ionicons.glyphMap => {
  if (type.includes("delivery")) return "bicycle-outline";
  if (type.includes("pickup")) return "bag-check-outline";
  if (type.includes("substitution")) return "swap-horizontal-outline";
  if (type.includes("prescription")) return "document-text-outline";
  if (type.includes("order")) return "receipt-outline";
  return "notifications-outline";
};

export default function NotificationCenterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params || {}) as NotificationRouteParams;
  const panel = params.panel || "patient";
  const copy = useMemo(() => PANEL_COPY[panel] || PANEL_COPY.patient, [panel]);
  const title = params.title || "Notifications";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications("initial");
      return undefined;
    }, [loadNotifications])
  );

  React.useEffect(() => {
    const off = onNotificationCreated((payload) => {
      const incoming = payload.notification as NotificationItem;
      setNotifications((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)]);
      setUnreadCount((current) => current + 1);
    });
    return off;
  }, []);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, NotificationItem[]>();
    for (const item of notifications) {
      const key = formatRelativeSection(item.createdAt);
      const existing = groups.get(key) ?? [];
      existing.push(item);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [notifications]);

  const handleMarkRead = useCallback(async (notification: NotificationItem) => {
    if (notification.isRead) return;
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markNotificationAsRead(notification.id);
    } catch {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item))
      );
      setUnreadCount((current) => current + 1);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[THEME.primary, "#1E293B"]} style={styles.headerBackground} />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <Ionicons name="chevron-back" size={22} color={THEME.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerBadgeShell}>
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            ) : (
              <View style={styles.headerButtonGhost}>
                <Ionicons name="mail-open-outline" size={18} color={THEME.white} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.heroCardShell}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />
            <View style={styles.heroGridLine} />

            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>Notification Center</Text>
                <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{unreadCount} unread</Text>
              </View>
            </View>

            <Text style={styles.heroBody}>{copy.heroBody}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={THEME.accent} />
            <Text style={styles.helperText}>Loading notifications</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void loadNotifications("refresh")} />
            }
          >
            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {groupedNotifications.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconPlate}>
                  <Ionicons name="notifications-off-outline" size={24} color={THEME.accent} />
                </View>
                <Text style={styles.emptyCardTitle}>No notifications yet</Text>
                <Text style={styles.emptyCardBody}>New activity will show up here when it becomes available.</Text>
              </View>
            ) : (
              groupedNotifications.map(([group, items]) => (
                <View key={group} style={styles.groupBlock}>
                  <Text style={styles.sectionTitle}>{group}</Text>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.notificationCard, !item.isRead && styles.notificationUnread]}
                      activeOpacity={0.9}
                      onPress={() => void handleMarkRead(item)}
                    >
                      <View style={styles.notificationIconShell}>
                        <Ionicons name={notificationIconByType(item.type)} size={18} color={THEME.accent} />
                      </View>
                      <View style={styles.notificationBody}>
                        <View style={styles.notificationHeaderRow}>
                          <Text style={styles.notificationTitle}>{item.title}</Text>
                          {!item.isRead ? <View style={styles.notificationDot} /> : null}
                        </View>
                        <Text style={styles.notificationText}>{item.body}</Text>
                        <Text style={styles.notificationTime}>{formatTime(item.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  headerBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 220,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeShell: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerButtonGhost: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    minWidth: 42,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: "900", color: THEME.accent },
  headerTitle: { color: THEME.white, fontSize: 18, fontWeight: "800" },
  heroCardShell: { paddingHorizontal: 24, paddingTop: 8 },
  heroCard: {
    backgroundColor: THEME.white,
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    overflow: "hidden",
  },
  heroGlowOne: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    right: -26,
    top: -30,
    backgroundColor: "rgba(56, 189, 248, 0.10)",
  },
  heroGlowTwo: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    left: -18,
    bottom: -24,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  heroGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
    backgroundColor: "rgba(56, 189, 248, 0.14)",
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroTitle: { fontSize: 28, fontWeight: "900", color: THEME.textMain, marginTop: 8 },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: THEME.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroBody: { fontSize: 14, lineHeight: 21, color: THEME.textMuted, marginTop: 14 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  helperText: { fontSize: 14, color: THEME.textMuted },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36 },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: "#B91C1C", fontSize: 14 },
  groupBlock: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  notificationCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 12,
  },
  notificationUnread: {
    borderColor: "#BAE6FD",
    backgroundColor: "#F8FCFF",
  },
  notificationIconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  notificationBody: { flex: 1 },
  notificationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  notificationTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: THEME.textMain },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.accent,
  },
  notificationText: { marginTop: 5, fontSize: 13, lineHeight: 19, color: THEME.textMuted },
  notificationTime: { marginTop: 8, fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    alignItems: "center",
  },
  emptyIconPlate: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  emptyCardTitle: { marginTop: 16, fontSize: 19, fontWeight: "900", color: THEME.textMain },
  emptyCardBody: { marginTop: 8, fontSize: 14, lineHeight: 21, color: THEME.textMuted, textAlign: "center" },
});
