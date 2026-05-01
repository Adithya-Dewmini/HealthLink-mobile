import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchDoctorSessionsRange } from "../../services/doctorScheduleService";
import type { ScheduleSession } from "./scheduleTypes";

type WeekScheduleTabProps = {
  onRetry?: () => void;
};

type DaySection = {
  key: string;
  title: string;
  date: string;
  isToday: boolean;
  sessions: ScheduleSession[];
};

export default function WeekScheduleTab({ onRetry }: WeekScheduleTabProps) {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekRange = useMemo(() => {
    const start = formatIsoDate(weekStart);
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);
    return {
      start,
      end: formatIsoDate(endDate),
      label: formatWeekRange(weekStart, endDate),
    };
  }, [weekStart]);

  const loadWeekSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDoctorSessionsRange(weekRange.start, weekRange.end);
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weekly sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [weekRange.end, weekRange.start]);

  useEffect(() => {
    void loadWeekSessions();
  }, [loadWeekSessions]);

  const groupedDays = useMemo<DaySection[]>(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const isoDate = formatIsoDate(date);
      return {
        key: isoDate,
        title: date.toLocaleDateString(undefined, { weekday: "long" }),
        date: isoDate,
        isToday: isoDate === formatIsoDate(new Date()),
        sessions: sessions.filter((session) => session.date === isoDate),
      };
    });
  }, [sessions, weekStart]);

  const handleChangeWeek = useCallback((delta: number) => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 7);
      return getStartOfWeek(next);
    });
  }, []);

  const renderDaySection = useCallback(
    ({ item }: { item: DaySection }) => (
      <View style={styles.daySection}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{item.title}</Text>
          <Text style={styles.dayDate}>
            {new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>

        {item.sessions.length === 0 ? (
          <View style={styles.emptyDayCard}>
            <Text style={styles.emptyDayText}>No sessions</Text>
            <TouchableOpacity activeOpacity={0.85}>
              <Text style={styles.addSessionText}>+ Add Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          item.sessions.map((session) => (
            <View
              key={session.id}
              style={[styles.sessionCard, item.isToday && styles.todaySessionCard]}
            >
              <Text style={styles.clinicName}>{session.clinicName}</Text>
              <Text style={styles.time}>
                {session.startTime} – {session.endTime}
              </Text>
              <Text style={styles.meta}>
                {session.patientCount} patients
                {typeof session.slotDuration === "number"
                  ? ` • ${session.slotDuration} min slots`
                  : ""}
              </Text>
            </View>
          ))
        )}
      </View>
    ),
    []
  );

  const wholeWeekEmpty = !loading && !error && groupedDays.every((day) => day.sessions.length === 0);

  return (
    <View style={styles.container}>
      <View style={styles.weekHeaderCard}>
        <TouchableOpacity
          style={styles.weekNavButton}
          activeOpacity={0.85}
          onPress={() => handleChangeWeek(-1)}
        >
          <Ionicons name="chevron-back" size={18} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.weekRangeLabel}>{weekRange.label}</Text>

        <TouchableOpacity
          style={styles.weekNavButton}
          activeOpacity={0.85}
          onPress={() => handleChangeWeek(1)}
        >
          <Ionicons name="chevron-forward" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Could not load weekly sessions</Text>
          <Text style={styles.feedbackText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.88}
            onPress={onRetry || loadWeekSessions}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading weekly sessions</Text>
        </View>
      ) : null}

      {!loading && !error && wholeWeekEmpty ? (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>No sessions scheduled this week</Text>
          <Text style={styles.feedbackText}>
            There are no clinic sessions assigned for this week yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedDays}
          keyExtractor={(item) => item.key}
          renderItem={renderDaySection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function getStartOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + diff);
  return next;
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatWeekRange(start: Date, end: Date) {
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  weekRangeLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  listContent: {
    paddingBottom: 24,
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  dayDate: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyDayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyDayText: {
    fontSize: 14,
    color: "#64748B",
  },
  addSessionText: {
    marginTop: 8,
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  todaySessionCard: {
    borderWidth: 1,
    borderColor: "#60A5FA",
    backgroundColor: "#F8FBFF",
  },
  clinicName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  time: {
    marginTop: 4,
    fontSize: 14,
    color: "#0F172A",
  },
  meta: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 13,
  },
  feedbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
});
