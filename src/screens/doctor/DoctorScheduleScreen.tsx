import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DoctorAvailabilityScreen from "./DoctorAvailabilityScreen";
import DoctorCalendarScreen from "./DoctorCalendarScreen";
import RoutineTab from "./RoutineTab";
import type { AvailabilityMap, DayKey, ScheduleDayGroup } from "./scheduleTypes";
import {
  fetchDoctorAvailability,
  fetchDoctorSchedule,
  saveDoctorAvailability,
} from "../../services/doctorScheduleService";
import { getSocket } from "../../services/socket";

type ScheduleTabKey = "availability" | "calendar" | "routine";

const SEGMENTS: Array<{ key: ScheduleTabKey; label: string }> = [
  { key: "availability", label: "Availability" },
  { key: "calendar", label: "Calendar" },
  { key: "routine", label: "Routine" },
];

const INITIAL_AVAILABILITY: AvailabilityMap = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const AVAILABILITY_CACHE_KEY = "doctor_schedule_availability";
const scheduleCacheKey = (month: string) => `doctor_schedule_month_${month}`;

export default function DoctorScheduleScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<ScheduleTabKey>("availability");
  const [availability, setAvailability] = useState<AvailabilityMap>(INITIAL_AVAILABILITY);
  const [enabledDays, setEnabledDays] = useState<Record<DayKey, boolean>>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [schedule, setSchedule] = useState<ScheduleDayGroup[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const hasAvailability = useMemo(
    () => Object.values(availability).some((slots) => slots.length > 0),
    [availability]
  );

  const loadAvailability = useCallback(async () => {
    try {
      const data = await fetchDoctorAvailability();
      setAvailability(data.availability);
      setEnabledDays({
        monday: data.enabledDays.includes("monday"),
        tuesday: data.enabledDays.includes("tuesday"),
        wednesday: data.enabledDays.includes("wednesday"),
        thursday: data.enabledDays.includes("thursday"),
        friday: data.enabledDays.includes("friday"),
        saturday: data.enabledDays.includes("saturday"),
        sunday: data.enabledDays.includes("sunday"),
      });
      setSyncBanner(null);
      await AsyncStorage.setItem(AVAILABILITY_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      const cached = await AsyncStorage.getItem(AVAILABILITY_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as { availability: AvailabilityMap; availableToday: boolean; enabledDays?: DayKey[] };
        setAvailability(data.availability);
        setEnabledDays({
          monday: Boolean(data.enabledDays?.includes("monday")),
          tuesday: Boolean(data.enabledDays?.includes("tuesday")),
          wednesday: Boolean(data.enabledDays?.includes("wednesday")),
          thursday: Boolean(data.enabledDays?.includes("thursday")),
          friday: Boolean(data.enabledDays?.includes("friday")),
          saturday: Boolean(data.enabledDays?.includes("saturday")),
          sunday: Boolean(data.enabledDays?.includes("sunday")),
        });
        setSyncBanner("Showing cached availability");
        return;
      }

      Alert.alert("Availability Unavailable", error instanceof Error ? error.message : "Failed to load availability");
    }
  }, []);

  const loadSchedule = useCallback(async (month: string) => {
    setIsLoadingSchedule(true);
    try {
      const data = await fetchDoctorSchedule(month);
      setSchedule(data);
      setSyncBanner(null);
      setScheduleError(null);
      await AsyncStorage.setItem(scheduleCacheKey(month), JSON.stringify(data));
    } catch (error) {
      const cached = await AsyncStorage.getItem(scheduleCacheKey(month));
      if (cached) {
        setSchedule(JSON.parse(cached) as ScheduleDayGroup[]);
        setSyncBanner("Showing cached schedule");
        setScheduleError(error instanceof Error ? error.message : "Failed to load schedule");
      } else {
        setScheduleError(error instanceof Error ? error.message : "Failed to load schedule");
      }
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    void loadSchedule(currentMonth);
  }, [currentMonth, loadSchedule]);

  useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = () => {
      void loadSchedule(currentMonth);
      void loadAvailability();
    };
    const handleQueueUpdate = (data?: { scheduleId?: number | string; patientsCount?: number }) => {
      if (data?.scheduleId && typeof data.patientsCount === "number") {
        const nextPatientCount = data.patientsCount;
        setSchedule((current) =>
          current.map((day) => ({
            ...day,
            sessions: day.sessions.map((session) =>
              session.id === String(data.scheduleId)
                ? { ...session, patientCount: nextPatientCount }
                : session
            ),
          }))
        );
        return;
      }

      void loadSchedule(currentMonth);
    };

    socket.on("schedule:update", handleScheduleUpdate);
    socket.on("queue:update", handleQueueUpdate);

    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
      socket.off("queue:update", handleQueueUpdate);
    };
  }, [currentMonth, loadAvailability, loadSchedule]);

  const handleSaveAvailability = useCallback(async () => {
    setIsSaving(true);
    try {
      const data = await saveDoctorAvailability(
        availability,
        (Object.keys(enabledDays) as DayKey[]).filter((dayKey) => enabledDays[dayKey])
      );
      setAvailability(data.availability);
      setEnabledDays({
        monday: data.enabledDays.includes("monday"),
        tuesday: data.enabledDays.includes("tuesday"),
        wednesday: data.enabledDays.includes("wednesday"),
        thursday: data.enabledDays.includes("thursday"),
        friday: data.enabledDays.includes("friday"),
        saturday: data.enabledDays.includes("saturday"),
        sunday: data.enabledDays.includes("sunday"),
      });
      await AsyncStorage.setItem(AVAILABILITY_CACHE_KEY, JSON.stringify(data));
      setSyncBanner(null);
      Alert.alert("Availability Saved", "Your weekly availability has been updated.");
    } catch (error) {
      setSyncBanner("Changes saved locally. Sync failed.");
      Alert.alert("Save Failed", error instanceof Error ? error.message : "Failed to save availability");
    } finally {
      setIsSaving(false);
    }
  }, [availability, enabledDays]);

  const handleAvailabilityChange = useCallback((next: AvailabilityMap) => {
    setAvailability(next);
  }, []);

  const handleEnabledDaysChange = useCallback((next: Record<DayKey, boolean>) => {
    setEnabledDays(next);
  }, []);

  const handleRetrySchedule = useCallback(() => {
    void loadSchedule(currentMonth);
  }, [currentMonth, loadSchedule]);

  const handleGoToAvailability = useCallback(() => {
    setActiveTab("availability");
  }, []);

  const previewShifts = useMemo(() => {
    const dayLabels: Record<DayKey, string> = {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    };

    return (Object.keys(availability) as DayKey[]).flatMap((dayKey) =>
      availability[dayKey].map((slot) => ({
        day: dayLabels[dayKey],
        start_time: slot.start,
        end_time: slot.end,
      }))
    );
  }, [availability]);

  const handleOpenPreview = useCallback(() => {
    if (previewShifts.length === 0) {
      Alert.alert("No Shifts Yet", "Add at least one availability shift before previewing.");
      return;
    }

    navigation.navigate("DoctorSchedulePreview", {
      shifts: previewShifts,
    });
  }, [navigation, previewShifts]);

  const availabilityHeader = useMemo(
    () => (
      <View style={styles.availabilityIntro}>
        {(Object.values(enabledDays).some(Boolean) === false || !hasAvailability) ? (
          <View style={styles.availabilityHelperPill}>
            <Text style={styles.availabilityHelperText}>
              Start by selecting your working days and adding shifts.
            </Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.previewButton} activeOpacity={0.9} onPress={handleOpenPreview}>
          <Ionicons name="eye-outline" size={18} color="#2563EB" />
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>
      </View>
    ),
    [enabledDays, handleOpenPreview, hasAvailability]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.segmentedControl}>
          {SEGMENTS.map((segment) => {
            const isActive = segment.key === activeTab;
            return (
              <TouchableOpacity
                key={segment.key}
                style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
                activeOpacity={0.9}
                onPress={() => setActiveTab(segment.key)}
              >
                <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                  {segment.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {syncBanner ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>{syncBanner}</Text>
          </View>
        ) : null}

        <View style={styles.contentWrap}>
          {activeTab === "availability" ? (
            <>
              <DoctorAvailabilityScreen
                availability={availability}
                enabledDays={enabledDays}
                isSaving={isSaving}
                headerComponent={availabilityHeader}
                onAvailabilityChange={handleAvailabilityChange}
                onEnabledDaysChange={handleEnabledDaysChange}
                onSave={handleSaveAvailability}
              />
            </>
          ) : (
            activeTab === "calendar" ? (
              <DoctorCalendarScreen
                schedule={schedule}
                isLoading={isLoadingSchedule}
                hasAvailability={hasAvailability}
                errorMessage={scheduleError}
                onMonthChange={setCurrentMonth}
                onRetry={handleRetrySchedule}
                onGoToAvailability={handleGoToAvailability}
              />
            ) : (
              <RoutineTab onPreview={handleOpenPreview} />
            )
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  screen: {
    flex: 1,
    padding: 16,
  },
  availabilityIntro: {
    marginBottom: 14,
    alignItems: "stretch",
  },
  availabilityHelperPill: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  availabilityHelperText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    paddingHorizontal: 2,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 18,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 12,
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentLabelActive: {
    color: "#0F172A",
  },
  infoBanner: {
    marginBottom: 12,
    backgroundColor: "#DBEAFE",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#1D4ED8",
  },
  contentWrap: {
    flex: 1,
    minHeight: 0,
  },
});
