import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface QueueCardProps {
  name: string;
  spec: string;
  status: "LIVE" | "UPCOMING" | "ENDED";
  token: string;
  waiting: number;
  eta: string;
}

const STATUS_COLORS = {
  LIVE: "#10B981",
  UPCOMING: "#F59E0B",
  ENDED: "#EF4444",
} as const;

function QueueCardComponent({ name, spec, status, token, waiting, eta }: QueueCardProps) {
  const statusColor = STATUS_COLORS[status];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.spec}>{spec}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{token}</Text>
          <Text style={styles.statLabel}>Token</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{waiting}</Text>
          <Text style={styles.statLabel}>Waiting</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{eta}</Text>
          <Text style={styles.statLabel}>Wait</Text>
        </View>
      </View>
    </View>
  );
}

export default memo(QueueCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
  },
  spec: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
});
