import React, { useMemo } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import QueueHeroCard from "../../components/receptionist/queue/QueueHeroCard";
import QueueListItem from "../../components/receptionist/queue/QueueListItem";
import {
  DEFAULT_RECEPTION_QUEUE,
  normalizeReceptionQueueData,
} from "../../utils/receptionistQueue";

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  muted: "#E2E8F0",
  tabInactive: "#F1F5F9",
};

export default function QueueManagement() {
  const queueState = useMemo(
    () => normalizeReceptionQueueData(DEFAULT_RECEPTION_QUEUE),
    []
  );

  if (!queueState.ok) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.errorTitle}>Queue unavailable</Text>
          <Text style={styles.errorMessage}>{queueState.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const queue = queueState.data;
  const listData = queue.isQueueLive ? queue.patients : [];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Queue Management</Text>
          <Text style={styles.headerSub}>Real-time patient flow</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.heroContainer}>
        <QueueHeroCard
          doctorName={queue.doctorName}
          sessionLabel={queue.sessionLabel}
          startTimeLabel={queue.startTimeLabel}
          patientCountLabel={queue.patientCountLabel}
          isQueueLive={queue.isQueueLive}
        />
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <QueueListItem
            item={item}
            isActive={Boolean(queue.activePatientId && item.id === queue.activePatientId)}
          />
        )}
        ListHeaderComponent={
          listData.length > 0 ? <Text style={styles.sectionTitle}>Queue List</Text> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={72} color={THEME.muted} />
            <Text style={styles.emptyTitle}>No active queue</Text>
            <Text style={styles.emptyText}>Start a new clinic session to begin patient flow.</Text>
            <TouchableOpacity style={styles.startBtn}>
              <Text style={styles.startBtnText}>Start Queue</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerAction}>
          <Text style={styles.footerBtnText}>End Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerAction, styles.footerPrimary]}>
          <Text style={styles.footerPrimaryText}>Next Patient</Text>
        </TouchableOpacity>
      </View>

      <StatusBar barStyle="dark-content" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: THEME.white,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.tabInactive,
    justifyContent: "center",
    alignItems: "center",
  },
  heroContainer: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    padding: 16,
    backgroundColor: THEME.white,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  footerAction: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.tabInactive,
  },
  footerPrimary: { backgroundColor: THEME.primary },
  footerBtnText: { fontWeight: "800", fontSize: 14, color: THEME.textSecondary },
  footerPrimaryText: { fontWeight: "800", fontSize: 14, color: THEME.white },
  emptyState: { alignItems: "center", marginTop: 96, paddingHorizontal: 24 },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  startBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  startBtnText: { color: THEME.white, fontWeight: "800" },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  errorMessage: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
  },
});
