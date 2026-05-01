import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CalendarDayItem from "../../components/schedule/CalendarDayItem";
import ScheduleSessionCard from "../../components/schedule/ScheduleSessionCard";
import type { ScheduleDayGroup, ScheduleSession } from "./scheduleTypes";

type CalendarCell = {
  key: string;
  dayNumber?: number;
  isoDate?: string;
  isCurrentMonth: boolean;
};

type DoctorCalendarScreenProps = {
  schedule: ScheduleDayGroup[];
  isLoading?: boolean;
  hasAvailability?: boolean;
  errorMessage?: string | null;
  onMonthChange?: (month: string) => void;
  onRetry?: () => void;
  onGoToAvailability?: () => void;
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DoctorCalendarScreen({
  schedule,
  isLoading = false,
  hasAvailability = true,
  errorMessage = null,
  onMonthChange,
  onRetry,
  onGoToAvailability,
}: DoctorCalendarScreenProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const normalizedSchedule = useMemo(
    () =>
      schedule.map((day) => ({
        date: day.date,
        sessions: [...day.sessions].sort((left, right) =>
          `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`)
        ),
      })),
    [schedule]
  );

  const sessionsByDate = useMemo(
    () =>
      normalizedSchedule.reduce<Record<string, ScheduleSession[]>>((accumulator, day) => {
        accumulator[day.date] = day.sessions;
        return accumulator;
      }, {}),
    [normalizedSchedule]
  );

  const markedDates = useMemo(() => {
    return normalizedSchedule.reduce<Record<string, { marked: true; dotColor: string }>>(
      (accumulator, day) => {
        const dominantStatus = getDominantStatus(day.sessions);
        accumulator[day.date] = {
          marked: true,
          dotColor: getDotColor(dominantStatus),
        };
        return accumulator;
      },
      {}
    );
  }, [normalizedSchedule]);

  const calendarCells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);
  const selectedSessions = useMemo(
    () =>
      sessionsByDate[selectedDate] ?? [],
    [selectedDate, sessionsByDate]
  );
  const nextSessionId = useMemo(() => {
    const allSessions = normalizedSchedule.flatMap((day) => day.sessions);
    const upcoming = [...allSessions]
      .filter((session) => session.status === "Upcoming" || session.status === "Active")
      .sort((left, right) =>
        `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`)
      )[0];
    return upcoming?.id;
  }, [normalizedSchedule]);

  const handleChangeMonth = useCallback((delta: number) => {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }, []);

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [currentMonth]
  );
  const monthKey = useMemo(
    () =>
      `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`,
    [currentMonth]
  );

  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(monthKey);
    }
  }, [monthKey, onMonthChange]);

  const renderDay = useCallback(
    ({ item }: { item: CalendarCell }) => (
      <CalendarDayItem
        dayNumber={item.dayNumber}
        isCurrentMonth={item.isCurrentMonth}
        isSelected={item.isoDate === selectedDate}
        isToday={item.isoDate === new Date().toISOString().slice(0, 10)}
        hasSessions={item.isoDate ? Boolean(sessionsByDate[item.isoDate]?.length) : false}
        dotColor={item.isoDate ? markedDates[item.isoDate]?.dotColor : undefined}
        onPress={item.isoDate ? () => setSelectedDate(item.isoDate!) : undefined}
      />
    ),
    [markedDates, selectedDate, sessionsByDate]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.monthCard}>
        <TouchableOpacity
          style={styles.monthNavButton}
          activeOpacity={0.85}
          onPress={() => handleChangeMonth(-1)}
        >
          <Ionicons name="chevron-back" size={18} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.monthLabel}>{monthLabel}</Text>

        <TouchableOpacity style={styles.monthNavButton} activeOpacity={0.85} onPress={() => handleChangeMonth(1)}>
          <Ionicons name="chevron-forward" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((day) => (
            <Text key={day} style={styles.weekDayLabel}>
              {day}
            </Text>
          ))}
        </View>

        <FlatList
          data={calendarCells}
          keyExtractor={(item) => item.key}
          numColumns={7}
          scrollEnabled={false}
          renderItem={renderDay}
          contentContainerStyle={styles.gridContent}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sessions</Text>
      </View>

      {!hasAvailability ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={18} color="#94A3B8" />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyStateTitle}>No availability set</Text>
            <Text style={styles.emptyStateText}>
              Set your weekly availability before clinic sessions can be mapped cleanly.
            </Text>
          </View>
          {onGoToAvailability ? (
            <TouchableOpacity style={styles.inlineActionButton} activeOpacity={0.88} onPress={onGoToAvailability}>
              <Text style={styles.inlineActionButtonText}>Go to Availability</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {errorMessage && !isLoading ? (
        <View style={styles.errorState}>
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>Schedule sync failed</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
          {onRetry ? (
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.88} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingStateText}>Loading sessions</Text>
        </View>
      ) : null}

      <FlatList
        data={selectedSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ScheduleSessionCard session={item} isNextSession={item.id === nextSessionId} />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.sessionSeparator} />}
        ListEmptyComponent={
          isLoading || errorMessage ? null : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="calendar" size={34} color="#10B981" />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyStateTitle}>No sessions scheduled</Text>
                <Text style={styles.emptyStateText}>No sessions scheduled for this day.</Text>
              </View>
            </View>
          )
        }
      />
    </ScrollView>
  );
}

function getDominantStatus(sessions: ScheduleSession[]) {
  const statuses = new Set(sessions.map((session) => session.status));
  if (statuses.has("Missed")) return "Missed";
  if (statuses.has("Active")) return "Active";
  if (statuses.has("Upcoming")) return "Upcoming";
  return "Completed";
}

function getDotColor(status: ScheduleSession["status"]) {
  switch (status) {
    case "Active":
      return "#2563EB";
    case "Completed":
      return "#94A3B8";
    case "Missed":
      return "#EF4444";
    default:
      return "#4CAF50";
  }
}

function buildCalendarCells(currentMonth: Date): CalendarCell[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const normalizedStart = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < normalizedStart; index += 1) {
    cells.push({
      key: `empty-start-${index}`,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoDate = new Date(year, month, day).toISOString().slice(0, 10);
    cells.push({
      key: isoDate,
      dayNumber: day,
      isoDate,
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      isCurrentMonth: false,
    });
  }

  return cells;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  monthCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  calendarCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  gridContent: {
    paddingTop: 4,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  sessionSeparator: {
    height: 12,
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  loadingStateText: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyCopy: {
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  inlineActionButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineActionButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  errorState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 12,
  },
  errorCopy: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991B1B",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B91C1C",
  },
});
