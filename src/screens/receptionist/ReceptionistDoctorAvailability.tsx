import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getSocket } from "../../services/socket";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import { fetchReceptionSessionAvailabilityState } from "../../services/receptionistSessionService";

type Props = NativeStackScreenProps<
  ReceptionistStackParamList,
  "ReceptionistDoctorAvailability"
>;

type AvailabilityItem = {
  id: number | string;
  day?: string | null;
  day_of_week?: number | null;
  start_time: string;
  end_time: string;
  max_patients?: number | null;
  is_active?: boolean;
};

type AvailabilityStateKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

type AvailabilityStateResponse = {
  availability?: Partial<Record<AvailabilityStateKey, Array<{ id: string; start: string; end: string }>>>;
};

type DayGroup = {
  key: number;
  name: string;
  slots: AvailabilityItem[];
};

const THEME = {
  primary: "#2F6FED",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  softGreen: "#DCFCE7",
  softBlue: "#EEF4FF",
  successText: "#0F9F6E",
};

const DAY_ORDER: Array<{ key: number; name: string }> = [
  { key: 1, name: "Monday" },
  { key: 2, name: "Tuesday" },
  { key: 3, name: "Wednesday" },
  { key: 4, name: "Thursday" },
  { key: 5, name: "Friday" },
  { key: 6, name: "Saturday" },
  { key: 0, name: "Sunday" },
];

const DAY_KEY_BY_AVAILABILITY_KEY: Record<AvailabilityStateKey, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");
  if (raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      return raw.trim();
    }
  }
  return `${fallback} (HTTP ${response.status})`;
};

const formatTime = (value: string) => String(value || "").slice(0, 5);

const formatLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDayKey = (item: AvailabilityItem) => {
  if (typeof item.day_of_week === "number" && Number.isInteger(item.day_of_week)) {
    if (item.day_of_week >= 0 && item.day_of_week <= 6) {
      return item.day_of_week;
    }
    if (item.day_of_week === 7) {
      return 0;
    }
  }

  const normalizedDay = String(item.day || "").trim().toLowerCase();
  const match = DAY_ORDER.find((day) => day.name.toLowerCase() === normalizedDay);
  return match?.key ?? null;
};

const nextDateForDay = (dayOfWeek: number) => {
  const today = new Date();
  const result = new Date(today);
  const currentDay = result.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7;
  result.setDate(result.getDate() + daysUntil);
  return formatLocalDateKey(result);
};

export default function ReceptionistDoctorAvailability({ navigation, route }: Props) {
  const hasScheduleAccess = useReceptionPermissionGuard("schedule", "schedule_management", true);
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasScheduleAccess) {
    return (
      <ReceptionAccessNotAssigned message="Doctor schedule management has not been assigned to your account." />
    );
  }

  const loadAvailability = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const payload = (await fetchReceptionSessionAvailabilityState(
          route.params.doctorUserId
        )) as AvailabilityStateResponse;
        const normalizedItems = Object.entries(payload.availability || {}).flatMap(
          ([dayKeyName, slots]) => {
            const dayKey = DAY_KEY_BY_AVAILABILITY_KEY[dayKeyName as AvailabilityStateKey];
            return (Array.isArray(slots) ? slots : []).map((slot) => ({
              id: Number(slot.id) || slot.id,
              day: DAY_ORDER.find((item) => item.key === dayKey)?.name ?? null,
              day_of_week: dayKey,
              start_time: slot.start,
              end_time: slot.end,
              is_active: true,
            }));
          }
        );
        setItems(
          normalizedItems.filter((item) => item && item.is_active !== false)
        );
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load availability");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params.doctorUserId]
  );

  useEffect(() => {
    void loadAvailability("initial");
  }, [loadAvailability]);

  useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = (payload?: { doctorId?: number | string; type?: string }) => {
      if (payload?.type !== "availability") {
        return;
      }

      if (Number(payload?.doctorId) !== route.params.doctorUserId) {
        return;
      }

      void loadAvailability("refresh");
    };

    socket.on("schedule:update", handleScheduleUpdate);
    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
    };
  }, [loadAvailability, route.params.doctorUserId]);

  const weeklyAvailability = useMemo<DayGroup[]>(() => {
    const grouped = new Map<number, AvailabilityItem[]>();

    items.forEach((item) => {
      const dayKey = normalizeDayKey(item);
      if (dayKey == null) return;
      const current = grouped.get(dayKey) || [];
      current.push(item);
      grouped.set(dayKey, current);
    });

    return DAY_ORDER.map((day) => ({
      key: day.key,
      name: day.name,
      slots: (grouped.get(day.key) || []).sort((left, right) =>
        `${left.start_time}`.localeCompare(`${right.start_time}`)
      ),
    }));
  }, [items]);

  const firstAvailableSlot = useMemo(() => {
    for (const day of weeklyAvailability) {
      if (day.slots.length > 0) {
        return { day, slot: day.slots[0] };
      }
    }
    return null;
  }, [weeklyAvailability]);

  const hasAvailability = items.length > 0;
  const title = useMemo(
    () => route.params.doctorName || "Doctor Availability",
    [route.params.doctorName]
  );

  const handleCreateSession = useCallback(() => {
    if (!firstAvailableSlot) {
      return;
    }

    navigation.navigate("ReceptionistDoctorSessionManagement", {
      doctorId: route.params.doctorId,
      doctorUserId: route.params.doctorUserId,
      doctorName: route.params.doctorName,
      specialization: route.params.specialization,
      initialTab: "manual",
      suggestedDate: nextDateForDay(firstAvailableSlot.day.key),
      suggestedStartTime: formatTime(firstAvailableSlot.slot.start_time),
      suggestedEndTime: formatTime(firstAvailableSlot.slot.end_time),
      suggestedMaxPatients:
        typeof firstAvailableSlot.slot.max_patients === "number"
          ? firstAvailableSlot.slot.max_patients
          : null,
    });
  }, [
    firstAvailableSlot,
    navigation,
    route.params.doctorId,
    route.params.doctorName,
    route.params.doctorUserId,
    route.params.specialization,
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Doctor Availability</Text>
          <Text style={styles.headerSub}>{title}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAvailability("refresh")} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load availability</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : !hasAvailability ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Doctor hasn&apos;t set availability yet</Text>
            <Text style={styles.stateText}>
              Ask doctor to update availability from their panel before creating sessions.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Weekly availability</Text>
              <Text style={styles.introText}>
                Review the doctor&apos;s weekly working windows before creating clinic sessions.
              </Text>
            </View>

            {weeklyAvailability.map((day) => (
              <View key={day.key} style={styles.dayCard}>
                <Text style={styles.dayTitle}>{day.name}</Text>
                {day.slots.length === 0 ? (
                  <Text style={styles.unavailableText}>Unavailable</Text>
                ) : (
                  <View style={styles.slotList}>
                    {day.slots.map((slot) => (
                      <View key={slot.id} style={styles.slotPill}>
                        <Text style={styles.slotText}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.ctaButton} onPress={handleCreateSession}>
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.ctaText}>Manage Sessions</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: THEME.white,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { marginTop: 2, fontSize: 13, color: THEME.textSecondary },
  content: { padding: 20, paddingBottom: 36 },
  centerState: { paddingTop: 80, alignItems: "center" },
  stateCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  stateTitle: { fontSize: 18, fontWeight: "800", color: THEME.textPrimary },
  stateText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: THEME.textSecondary },
  introCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  introText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textSecondary,
  },
  dayCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  slotList: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.softGreen,
  },
  slotText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.successText,
  },
  unavailableText: {
    marginTop: 10,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  ctaButton: {
    marginTop: 8,
    height: 50,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
