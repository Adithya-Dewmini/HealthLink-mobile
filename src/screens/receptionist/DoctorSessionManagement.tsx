import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  createReceptionManualSession,
  fetchReceptionSessionAvailability,
  fetchReceptionSessionAvailabilityState,
  fetchReceptionSessionRoutine,
  fetchReceptionSessionSchedules,
  saveReceptionSessionRoutine,
  updateReceptionSession,
} from "../../services/receptionistSessionService";
import { getSocket } from "../../services/socket";

type Props = NativeStackScreenProps<
  ReceptionistStackParamList,
  "ReceptionistDoctorSessionManagement"
>;

type ScreenTab = "routine" | "manual";
type PickerTarget =
  | { type: "manual-date" }
  | { type: "manual-start" }
  | { type: "manual-end" }
  | { type: "routine-start"; dayKey: number; shiftId: string; openEndAfterConfirm?: boolean }
  | { type: "routine-end"; dayKey: number; shiftId: string }
  | null;

type ScheduleItem = {
  id: number;
  doctor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
  clinic_name: string | null;
  source?: "routine" | "manual";
};

type RoutineApiShift = {
  id: string;
  clinicId: string;
  clinicName: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
};

type RoutineApiDay = {
  day: string;
  dayKey: number;
  routines: RoutineApiShift[];
};

type RoutineShift = {
  localId: string;
  routineId?: string;
  startTime: Date;
  endTime: Date;
};

type RoutineDayState = {
  dayOfWeek: number;
  label: string;
  doctorAvailable: boolean;
  availabilityWindows: AvailabilityItem[];
  enabled: boolean;
  shifts: RoutineShift[];
};

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

type SessionSuggestion = {
  label: string;
  start: string;
  end: string;
  durationMinutes: number;
  slotDuration: number;
  maxPatients: number;
};

type RoutineGeneratePayload = {
  weeks?: number;
  routine: Array<{
    day: string;
    dayOfWeek: number;
    shifts: Array<{
      start: string;
      end: string;
    }>;
  }>;
  slotDuration: number;
  maxPatients: number;
};

const WEEK_DAYS = [
  { day: "Sunday", dayKey: 0 },
  { day: "Monday", dayKey: 1 },
  { day: "Tuesday", dayKey: 2 },
  { day: "Wednesday", dayKey: 3 },
  { day: "Thursday", dayKey: 4 },
  { day: "Friday", dayKey: 5 },
  { day: "Saturday", dayKey: 6 },
] as const;

// UI day mapping is Sunday=0 through Saturday=6.
const DAY_KEY_BY_AVAILABILITY_KEY: Record<AvailabilityStateKey, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const SLOT_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");
  if (raw.trim().length > 0) {
    const normalized = raw.trim();
    if (normalized.startsWith("<!DOCTYPE") || normalized.startsWith("<html")) {
      return "Schedule service is not available. Please try again.";
    }

    try {
      const parsed = JSON.parse(normalized) as {
        message?: unknown;
        error?: unknown;
        details?: unknown;
      };
      if (Array.isArray(parsed.details) && parsed.details.length > 0) {
        const details = parsed.details.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        );
        if (details.length > 0) {
          const prefix =
            typeof parsed.message === "string" && parsed.message.trim() ? `${parsed.message}\n` : "";
          return `${prefix}${details.join("\n")}`;
        }
      }
      if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    } catch {
      return "Schedule service is not available. Please try again.";
    }
  }
  return `${fallback} (HTTP ${response.status})`;
};

const formatLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateString = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const parseTimeToDate = (value: string) => {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  const date = new Date();
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
};

const formatTime = (value?: Date | string | null) => {
  if (value instanceof Date) {
    return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (typeof value === "string") {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return "--:--";
};

const toApiTime = (value: Date) => formatTime(value);

const formatReadableDate = (value: Date | string) => {
  const parsed = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(parsed.getTime())) return typeof value === "string" ? value : formatLocalDateKey(new Date());
  return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = String(value || "")
    .slice(0, 5)
    .split(":")
    .map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const minutesToTime = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

const minutesBetween = (startTime: Date, endTime: Date) =>
  Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

const calculateSlots = (startTime: Date, endTime: Date, slotDuration: number) => {
  if (slotDuration <= 0) return 0;
  const totalMinutes = minutesBetween(startTime, endTime);
  return totalMinutes > 0 ? Math.floor(totalMinutes / slotDuration) : 0;
};

const getDayKeyFromDate = (value: Date) => value.getDay();

const numericInput = (value: string) => value.replace(/[^0-9]/g, "");

const nearestSlotDuration = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return SLOT_DURATION_OPTIONS[0];
  return SLOT_DURATION_OPTIONS.reduce((closest, current) =>
    Math.abs(current - value) < Math.abs(closest - value) ? current : closest
  );
};

const makeShiftId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeAvailabilityState = (payload: AvailabilityStateResponse | null | undefined) => {
  const byDay = new Map<number, AvailabilityItem[]>();
  (Object.entries(payload?.availability || {}) as Array<
    [AvailabilityStateKey, Array<{ id: string; start: string; end: string }>]
  >).forEach(([dayKeyName, slots]) => {
    const dayKey = DAY_KEY_BY_AVAILABILITY_KEY[dayKeyName];
    byDay.set(
      dayKey,
      (Array.isArray(slots) ? slots : []).map((slot) => ({
        id: slot.id,
        day: WEEK_DAYS[dayKey]?.day ?? null,
        day_of_week: dayKey,
        start_time: slot.start,
        end_time: slot.end,
        is_active: true,
      }))
    );
  });
  return byDay;
};

const getAvailabilityWindowsForDay = (availabilityByDay: Map<number, AvailabilityItem[]>, dayKey: number) =>
  availabilityByDay.get(dayKey) ?? [];

const isShiftInsideAvailability = (
  dayKey: number,
  startTime: string,
  endTime: string,
  availabilityByDay: Map<number, AvailabilityItem[]>
) => {
  const requestedStart = parseTimeToMinutes(startTime);
  const requestedEnd = parseTimeToMinutes(endTime);
  if (requestedStart === null || requestedEnd === null || requestedStart >= requestedEnd) return false;
  return getAvailabilityWindowsForDay(availabilityByDay, dayKey).some((window) => {
    const windowStart = parseTimeToMinutes(window.start_time);
    const windowEnd = parseTimeToMinutes(window.end_time);
    return (
      windowStart !== null &&
      windowEnd !== null &&
      requestedStart >= windowStart &&
      requestedEnd <= windowEnd
    );
  });
};

const getDefaultShiftForDay = (
  dayKey: number,
  availabilityByDay: Map<number, AvailabilityItem[]>,
  existingShifts: RoutineShift[] = []
): RoutineShift | null => {
  const availabilityWindows = getAvailabilityWindowsForDay(availabilityByDay, dayKey);
  const firstWindow = availabilityWindows[0];
  if (!firstWindow) return null;

  const preferredDuration = (() => {
    const source = existingShifts[existingShifts.length - 1];
    if (source) {
      return Math.max(15, minutesBetween(source.startTime, source.endTime));
    }
    const startMinutes = parseTimeToMinutes(firstWindow.start_time);
    const endMinutes = parseTimeToMinutes(firstWindow.end_time);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return 60;
    }
    return Math.min(60, endMinutes - startMinutes);
  })();

  const normalizedExisting = existingShifts
    .map((shift) => ({
      start: parseTimeToMinutes(toApiTime(shift.startTime)),
      end: parseTimeToMinutes(toApiTime(shift.endTime)),
    }))
    .filter(
      (shift): shift is { start: number; end: number } =>
        shift.start !== null && shift.end !== null && shift.end > shift.start
    )
    .sort((left, right) => left.start - right.start);

  for (const window of availabilityWindows) {
    const windowStart = parseTimeToMinutes(window.start_time);
    const windowEnd = parseTimeToMinutes(window.end_time);
    if (windowStart === null || windowEnd === null || windowEnd <= windowStart) {
      continue;
    }

    let cursor = windowStart;
    const dayShifts = normalizedExisting.filter(
      (shift) => shift.end > windowStart && shift.start < windowEnd
    );

    for (const shift of dayShifts) {
      if (cursor + preferredDuration <= shift.start) {
        return {
          localId: makeShiftId(),
          startTime: parseTimeToDate(minutesToTime(cursor)),
          endTime: parseTimeToDate(minutesToTime(cursor + preferredDuration)),
        };
      }
      cursor = Math.max(cursor, shift.end);
    }

    if (cursor + preferredDuration <= windowEnd) {
      return {
        localId: makeShiftId(),
        startTime: parseTimeToDate(minutesToTime(cursor)),
        endTime: parseTimeToDate(minutesToTime(cursor + preferredDuration)),
      };
    }
  }

  return {
    localId: makeShiftId(),
    startTime: parseTimeToDate(firstWindow.start_time),
    endTime: parseTimeToDate(firstWindow.end_time),
  };
};

const buildRoutineDaysState = (
  payload: RoutineApiDay[],
  availabilityByDay: Map<number, AvailabilityItem[]>
): RoutineDayState[] => {
  const byDay = new Map(payload.map((item) => [item.dayKey, item]));
  return WEEK_DAYS.map((item) => {
    const source = byDay.get(item.dayKey);
    const availabilityWindows = getAvailabilityWindowsForDay(availabilityByDay, item.dayKey);
    const doctorAvailable = availabilityWindows.length > 0;
    return {
      dayOfWeek: item.dayKey,
      label: item.day,
      doctorAvailable,
      availabilityWindows,
      enabled: doctorAvailable && Boolean(source?.routines.length),
      shifts:
        source?.routines.map((shift) => ({
          localId: makeShiftId(),
          routineId: shift.id,
          startTime: parseTimeToDate(shift.startTime),
          endTime: parseTimeToDate(shift.endTime),
        })) ?? [],
    };
  });
};

const buildSuggestionLabel = (startMinutes: number) => {
  if (startMinutes < 12 * 60) return "Morning Session";
  if (startMinutes < 17 * 60) return "Afternoon Session";
  return "Evening Session";
};

const buildSessionSuggestions = (
  availability: AvailabilityItem[],
  existingSessions: ScheduleItem[],
  selectedDate: Date
): SessionSuggestion[] => {
  const dayKey = getDayKeyFromDate(selectedDate);
  const matchingAvailability = availability
    .filter((slot) => slot.is_active !== false && slot.day_of_week === dayKey)
    .map((slot) => ({
      start: parseTimeToMinutes(slot.start_time),
      end: parseTimeToMinutes(slot.end_time),
      maxPatients: typeof slot.max_patients === "number" ? slot.max_patients : null,
    }))
    .filter(
      (
        slot
      ): slot is {
        start: number;
        end: number;
        maxPatients: number | null;
      } => typeof slot.start === "number" && typeof slot.end === "number" && slot.end > slot.start
    );

  const conflicts = existingSessions
    .map((session) => ({
      start: parseTimeToMinutes(session.start_time),
      end: parseTimeToMinutes(session.end_time),
    }))
    .filter(
      (slot): slot is { start: number; end: number } =>
        typeof slot.start === "number" && typeof slot.end === "number" && slot.end > slot.start
    );

  const suggestions: SessionSuggestion[] = [];

  matchingAvailability.forEach((slot) => {
    let cursor = slot.start;
    conflicts.forEach((conflict) => {
      if (conflict.end <= cursor || conflict.start >= slot.end) return;
      if (conflict.start > cursor) {
        const durationMinutes = conflict.start - cursor;
        if (durationMinutes >= 60) {
          const targetMaxPatients = slot.maxPatients && slot.maxPatients > 0 ? slot.maxPatients : Math.max(1, Math.floor(durationMinutes / 15));
          const slotDuration = nearestSlotDuration(durationMinutes / targetMaxPatients);
          suggestions.push({
            label: buildSuggestionLabel(cursor),
            start: minutesToTime(cursor),
            end: minutesToTime(conflict.start),
            durationMinutes,
            slotDuration,
            maxPatients: Math.max(1, Math.floor(durationMinutes / slotDuration)),
          });
        }
      }
      cursor = Math.max(cursor, conflict.end);
    });
    if (cursor < slot.end) {
      const durationMinutes = slot.end - cursor;
      if (durationMinutes >= 60) {
        const targetMaxPatients = slot.maxPatients && slot.maxPatients > 0 ? slot.maxPatients : Math.max(1, Math.floor(durationMinutes / 15));
        const slotDuration = nearestSlotDuration(durationMinutes / targetMaxPatients);
        suggestions.push({
          label: buildSuggestionLabel(cursor),
          start: minutesToTime(cursor),
          end: minutesToTime(slot.end),
          durationMinutes,
          slotDuration,
          maxPatients: Math.max(1, Math.floor(durationMinutes / slotDuration)),
        });
      }
    }
  });

  return suggestions;
};

const hasOverlappingRoutineShifts = (shifts: RoutineShift[]) => {
  const normalized = shifts
    .map((shift) => ({
      start: parseTimeToMinutes(toApiTime(shift.startTime)),
      end: parseTimeToMinutes(toApiTime(shift.endTime)),
    }))
    .filter(
      (shift): shift is { start: number; end: number } =>
        shift.start !== null && shift.end !== null && shift.end > shift.start
    )
    .sort((left, right) => left.start - right.start);

  for (let index = 0; index < normalized.length - 1; index += 1) {
    if (normalized[index].end > normalized[index + 1].start) {
      return true;
    }
  }

  return false;
};

const getRoutineShiftCapacity = (shift: RoutineShift, slotDuration: number) =>
  calculateSlots(shift.startTime, shift.endTime, slotDuration);

const getRoutineMaxAllowedPatients = (
  routineDays: RoutineDayState[],
  slotDuration: number
) => {
  if (slotDuration <= 0) return 0;

  const capacities = routineDays
    .filter((day) => day.enabled && day.doctorAvailable)
    .flatMap((day) => day.shifts.map((shift) => getRoutineShiftCapacity(shift, slotDuration)))
    .filter((capacity) => capacity > 0);

  if (capacities.length === 0) return 0;
  return Math.min(...capacities);
};

export default function DoctorSessionManagement({ navigation, route }: Props) {
  const hasScheduleAccess = useReceptionPermissionGuard("schedule", "schedule_management", true);
  const suggestionAppliedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<ScreenTab>("routine");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [routineDays, setRoutineDays] = useState<RoutineDayState[]>(() =>
    WEEK_DAYS.map((item) => ({
      dayOfWeek: item.dayKey,
      label: item.day,
      doctorAvailable: false,
      availabilityWindows: [],
      enabled: false,
      shifts: [],
    }))
  );
  const [routineAvailabilityByDay, setRoutineAvailabilityByDay] = useState<Map<number, AvailabilityItem[]>>(
    () => new Map()
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [availabilityItems, setAvailabilityItems] = useState<AvailabilityItem[]>([]);
  const [manualSuggestions, setManualSuggestions] = useState<SessionSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [routineSettings, setRoutineSettings] = useState({
    slotDuration: "15",
    maxPatients: "16",
  });
  const [manualForm, setManualForm] = useState({
    date: new Date(),
    start_time: parseTimeToDate("09:00"),
    end_time: parseTimeToDate("13:00"),
    slot_duration: "15",
    max_patients: "16",
  });

  if (!hasScheduleAccess) {
    return (
      <ReceptionAccessNotAssigned message="Doctor schedule management has not been assigned to your account." />
    );
  }

  useEffect(() => {
    if (suggestionAppliedRef.current) return;
    if (!route.params.initialTab && !route.params.suggestedStartTime && !route.params.suggestedEndTime) {
      return;
    }
    suggestionAppliedRef.current = true;
    if (route.params.initialTab) setActiveTab(route.params.initialTab);
    if (route.params.suggestedStartTime && route.params.suggestedEndTime) {
      setManualForm((current) => ({
        ...current,
        date: parseDateString(route.params.suggestedDate),
        start_time: parseTimeToDate(route.params.suggestedStartTime || "09:00"),
        end_time: parseTimeToDate(route.params.suggestedEndTime || "13:00"),
        slot_duration:
          typeof route.params.suggestedSlotDuration === "number" && route.params.suggestedSlotDuration > 0
            ? String(route.params.suggestedSlotDuration)
            : current.slot_duration,
        max_patients:
          typeof route.params.suggestedMaxPatients === "number" && route.params.suggestedMaxPatients > 0
            ? String(route.params.suggestedMaxPatients)
            : current.max_patients,
      }));
      setShowManualForm(true);
    }
  }, [route.params]);

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const selectedDate = formatLocalDateKey(manualForm.date);
        const [
          schedulePayload,
          routinePayload,
          availabilityPayload,
          manualAvailabilityPayload,
        ] = (await Promise.all([
          fetchReceptionSessionSchedules(route.params.doctorUserId, true),
          fetchReceptionSessionRoutine(route.params.doctorUserId),
          fetchReceptionSessionAvailabilityState(route.params.doctorUserId),
          fetchReceptionSessionAvailability(route.params.doctorUserId, selectedDate),
        ])) as [
          ScheduleItem[],
          RoutineApiDay[],
          AvailabilityStateResponse,
          AvailabilityItem[],
        ];

        const normalizedSchedules = Array.isArray(schedulePayload) ? schedulePayload : [];
        setItems(normalizedSchedules);
        const nextAvailability = normalizeAvailabilityState(availabilityPayload);
        setRoutineAvailabilityByDay(nextAvailability);
        setRoutineDays(
          buildRoutineDaysState(Array.isArray(routinePayload) ? routinePayload : [], nextAvailability)
        );

        const normalizedManualAvailability = Array.isArray(manualAvailabilityPayload)
          ? manualAvailabilityPayload.map((slot) => ({
              ...slot,
              day_of_week:
                typeof slot.day_of_week === "number" ? slot.day_of_week : getDayKeyFromDate(manualForm.date),
            }))
          : [];
        setAvailabilityItems(normalizedManualAvailability);
        setManualSuggestions(
          buildSessionSuggestions(
            normalizedManualAvailability,
            normalizedSchedules.filter(
              (session) => session.is_active !== false && String(session.date) === selectedDate
            ),
            manualForm.date
          )
        );
        setSuggestionsError(null);

        const firstShift = routinePayload.flatMap((day) => day.routines).find(Boolean);
        if (firstShift) {
          setRoutineSettings({
            slotDuration: String(firstShift.slotDuration),
            maxPatients: String(firstShift.maxPatients),
          });
        }
      } catch (error) {
        Alert.alert("Schedule Error", error instanceof Error ? error.message : "Failed to load schedule data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [manualForm.date, route.params.doctorUserId]
  );

  useEffect(() => {
    void loadData("initial");
  }, [loadData]);

  useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = (payload?: { doctorId?: number | string; medicalCenterId?: string | null }) => {
      if (payload?.doctorId && Number(payload.doctorId) !== route.params.doctorUserId) {
        return;
      }
      void loadData("refresh");
    };

    socket.on("schedule:update", handleScheduleUpdate);
    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
    };
  }, [loadData, route.params.doctorUserId]);

  const loadManualSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const selectedDate = formatLocalDateKey(manualForm.date);
      const availabilityPayload = (await fetchReceptionSessionAvailability(
        route.params.doctorUserId,
        selectedDate
      )) as AvailabilityItem[];
      const normalizedAvailability = Array.isArray(availabilityPayload)
        ? availabilityPayload.map((slot) => ({
            ...slot,
            day_of_week:
              typeof slot.day_of_week === "number" ? slot.day_of_week : getDayKeyFromDate(manualForm.date),
          }))
        : [];
      const normalizedSessions = items.filter(
        (session) => session.is_active !== false && String(session.date) === selectedDate
      );
      setAvailabilityItems(normalizedAvailability);
      setManualSuggestions(buildSessionSuggestions(normalizedAvailability, normalizedSessions, manualForm.date));
      setSuggestionsError(null);
    } catch (error) {
      setManualSuggestions([]);
      setSuggestionsError(
        error instanceof Error ? error.message : "Failed to generate session suggestions"
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }, [items, manualForm.date, route.params.doctorUserId]);

  useEffect(() => {
    void loadManualSuggestions();
  }, [loadManualSuggestions]);

  const routineSlotDurationValue = useMemo(() => Number(routineSettings.slotDuration) || 0, [routineSettings.slotDuration]);
  const routineMaxPatientsValue = useMemo(() => Number(routineSettings.maxPatients) || 0, [routineSettings.maxPatients]);
  const routineMaxAllowedPatients = useMemo(
    () => getRoutineMaxAllowedPatients(routineDays, routineSlotDurationValue),
    [routineDays, routineSlotDurationValue]
  );
  const manualSlotDurationValue = useMemo(() => Number(manualForm.slot_duration) || 0, [manualForm.slot_duration]);
  const manualMaxPatientsValue = useMemo(() => Number(manualForm.max_patients) || 0, [manualForm.max_patients]);
  const manualTotalMinutes = useMemo(() => minutesBetween(manualForm.start_time, manualForm.end_time), [manualForm.end_time, manualForm.start_time]);
  const manualSlotCount = useMemo(() => calculateSlots(manualForm.start_time, manualForm.end_time, manualSlotDurationValue), [manualForm.end_time, manualForm.start_time, manualSlotDurationValue]);
  const selectedDayAvailability = useMemo(
    () => availabilityItems.filter((slot) => slot.is_active !== false),
    [availabilityItems]
  );

  const routineValidationMessage = useMemo(() => {
    if (routineSlotDurationValue <= 0) return "Routine slot duration must be greater than 0.";
    const activeDays = routineDays.filter((day) => day.enabled && day.doctorAvailable);
    if (activeDays.length === 0) return "Turn on at least one working day.";
    if (routineMaxPatientsValue <= 0) return "Routine max patients must be greater than 0.";

    for (const day of activeDays) {
      if (day.availabilityWindows.length === 0) return `${day.label} is not available in the doctor's schedule.`;
      if (day.shifts.length === 0) return `${day.label}: add at least one shift.`;
      if (hasOverlappingRoutineShifts(day.shifts)) {
        return `${day.label} has overlapping routine shifts.`;
      }
      for (const shift of day.shifts) {
        const shiftStart = toApiTime(shift.startTime);
        const shiftEnd = toApiTime(shift.endTime);
        const totalMinutes = minutesBetween(shift.startTime, shift.endTime);
        if (totalMinutes <= 0) return "Routine shift end time must be later than start time.";
        if (!isShiftInsideAvailability(day.dayOfWeek, shiftStart, shiftEnd, routineAvailabilityByDay)) {
          return `${day.label} ${shiftStart}-${shiftEnd} is outside availability.`;
        }
        const slotCount = calculateSlots(shift.startTime, shift.endTime, routineSlotDurationValue);
        if (slotCount <= 0) return "Routine shift is too short for the selected slot duration.";
        if (routineMaxPatientsValue > slotCount) {
          return `${day.label} ${shiftStart}-${shiftEnd} supports only ${slotCount} patients with ${routineSlotDurationValue}-minute slots.`;
        }
      }
    }

    return null;
  }, [routineAvailabilityByDay, routineDays, routineMaxPatientsValue, routineSlotDurationValue]);

  useEffect(() => {
    if (routineSlotDurationValue <= 0 || routineMaxAllowedPatients <= 0) {
      return;
    }

    if (routineMaxPatientsValue <= 0 || routineMaxPatientsValue > routineMaxAllowedPatients) {
      setRoutineSettings((current) => {
        const currentValue = Number(current.maxPatients) || 0;
        if (currentValue > 0 && currentValue <= routineMaxAllowedPatients) {
          return current;
        }

        return {
          ...current,
          maxPatients: String(routineMaxAllowedPatients),
        };
      });
    }
  }, [routineMaxAllowedPatients, routineMaxPatientsValue, routineSlotDurationValue]);

  const manualValidationMessage = useMemo(() => {
    if (manualTotalMinutes <= 0) return "End time must be later than start time.";
    if (manualSlotDurationValue <= 0) return "Slot duration must be greater than 0.";
    if (manualSlotCount <= 0) return "Time range is too short for the selected slot duration.";
    if (manualMaxPatientsValue <= 0) return "Max patients must be greater than 0.";
    if (manualMaxPatientsValue > manualSlotCount) return "Max patients cannot exceed available slots.";
    return null;
  }, [manualMaxPatientsValue, manualSlotCount, manualSlotDurationValue, manualTotalMinutes]);

  const toggleRoutineDay = useCallback(
    (dayKey: number, value: boolean) => {
      if (getAvailabilityWindowsForDay(routineAvailabilityByDay, dayKey).length === 0) return;
      setRoutineDays((current) =>
        current.map((day) =>
          day.dayOfWeek === dayKey
            ? {
                ...day,
                enabled: value,
                shifts:
                  value && day.shifts.length === 0
                    ? [getDefaultShiftForDay(dayKey, routineAvailabilityByDay, day.shifts)].filter(
                        (shift): shift is RoutineShift => Boolean(shift)
                      )
                    : day.shifts,
              }
            : day
        )
      );
    },
    [routineAvailabilityByDay]
  );

  const addShift = useCallback(
    (dayKey: number) => {
      setRoutineDays((current) =>
        current.map((day) => {
          if (day.dayOfWeek !== dayKey || !day.enabled || !day.doctorAvailable) {
            return day;
          }
          const defaultShift = getDefaultShiftForDay(dayKey, routineAvailabilityByDay, day.shifts);
          if (!defaultShift) {
            return day;
          }
          return { ...day, shifts: [...day.shifts, defaultShift] };
        })
      );
    },
    [routineAvailabilityByDay]
  );

  const removeShift = useCallback((dayKey: number, shiftId: string) => {
    setRoutineDays((current) =>
      current.map((day) =>
        day.dayOfWeek === dayKey
          ? { ...day, shifts: day.shifts.filter((shift) => shift.localId !== shiftId) }
          : day
      )
    );
  }, []);

  const updateRoutineShift = useCallback((dayKey: number, shiftId: string, changes: Partial<RoutineShift>) => {
    setRoutineDays((current) =>
      current.map((day) =>
        day.dayOfWeek === dayKey
          ? {
              ...day,
              shifts: day.shifts.map((shift) => (shift.localId === shiftId ? { ...shift, ...changes } : shift)),
            }
          : day
      )
    );
  }, []);

  const saveRoutine = useCallback(async () => {
    if (savingRoutine || routineValidationMessage) {
      if (routineValidationMessage) Alert.alert("Routine Validation", routineValidationMessage);
      return;
    }

    setSavingRoutine(true);
    try {
      const routinePayload: RoutineGeneratePayload["routine"] = routineDays
        .filter((day) => day.enabled && day.doctorAvailable && day.shifts.length > 0)
        .map((day) => ({
          day: day.label,
          dayOfWeek: day.dayOfWeek,
          shifts: day.shifts.map((shift) => ({
            start: toApiTime(shift.startTime),
            end: toApiTime(shift.endTime),
          })),
        }));

      await saveReceptionSessionRoutine(route.params.doctorUserId, {
        weeks: 4,
        routine: routinePayload,
        slotDuration: routineSlotDurationValue,
        maxPatients: routineMaxPatientsValue,
      } satisfies RoutineGeneratePayload);
      await loadData("refresh");
      Alert.alert("Routine Saved", "Routine saved successfully.");
    } catch (error) {
      Alert.alert("Routine Save Failed", error instanceof Error ? error.message : "Failed to save routine");
    } finally {
      setSavingRoutine(false);
    }
  }, [
    loadData,
    route.params.doctorUserId,
    routineDays,
    routineMaxPatientsValue,
    routineSlotDurationValue,
    routineValidationMessage,
    savingRoutine,
  ]);

  const createManualSession = useCallback(async () => {
    if (savingManual || manualValidationMessage || !showManualForm) {
      if (manualValidationMessage) Alert.alert("Validation", manualValidationMessage);
      return;
    }

    setSavingManual(true);
    try {
      const payload = {
        date: formatLocalDateKey(manualForm.date),
        start_time: toApiTime(manualForm.start_time),
        end_time: toApiTime(manualForm.end_time),
        slot_duration: manualSlotDurationValue,
        max_patients: manualMaxPatientsValue,
      };
      if (typeof route.params.editScheduleId === "number") {
        await updateReceptionSession(route.params.editScheduleId, {
          doctorId: route.params.doctorUserId,
          ...payload,
        });
      } else {
        await createReceptionManualSession(route.params.doctorUserId, payload);
      }

      await loadData("refresh");
      await loadManualSuggestions();
      Alert.alert(
        typeof route.params.editScheduleId === "number" ? "Session Updated" : "Session Created",
        typeof route.params.editScheduleId === "number"
          ? "Custom session updated successfully."
          : "Custom session added successfully."
      );
    } catch (error) {
      Alert.alert("Create Failed", error instanceof Error ? error.message : "Failed to create custom session");
    } finally {
      setSavingManual(false);
    }
  }, [
    loadData,
    loadManualSuggestions,
    manualForm.date,
    manualForm.end_time,
    manualForm.start_time,
    manualMaxPatientsValue,
    manualSlotDurationValue,
    manualValidationMessage,
    route.params.doctorUserId,
    savingManual,
    showManualForm,
  ]);

  const applySuggestion = useCallback((suggestion: SessionSuggestion) => {
    setManualForm((current) => ({
      ...current,
      start_time: parseTimeToDate(suggestion.start),
      end_time: parseTimeToDate(suggestion.end),
      slot_duration: String(suggestion.slotDuration),
      max_patients: String(suggestion.maxPatients),
    }));
    setShowManualForm(true);
  }, []);

  const handleManualMaxPatientsChange = useCallback(
    (value: string) => {
      const sanitized = numericInput(value);
      setManualForm((prev) => ({ ...prev, max_patients: sanitized }));
      const nextMaxPatients = Number(sanitized);
      if (!Number.isFinite(nextMaxPatients) || nextMaxPatients <= 0 || manualTotalMinutes <= 0) return;
      const derivedDuration = nearestSlotDuration(manualTotalMinutes / nextMaxPatients);
      const derivedSlots = calculateSlots(manualForm.start_time, manualForm.end_time, derivedDuration);
      setManualForm((prev) => ({
        ...prev,
        slot_duration: String(derivedDuration),
        max_patients: String(Math.min(nextMaxPatients, derivedSlots || nextMaxPatients)),
      }));
    },
    [manualForm.end_time, manualForm.start_time, manualTotalMinutes]
  );

  const handlePickerConfirm = useCallback(
    (selectedValue: Date) => {
      if (!pickerTarget) return;
      if (pickerTarget.type === "manual-date") {
        setManualForm((prev) => ({ ...prev, date: selectedValue }));
      } else if (pickerTarget.type === "manual-start") {
        setManualForm((prev) => ({ ...prev, start_time: selectedValue }));
      } else if (pickerTarget.type === "manual-end") {
        setManualForm((prev) => ({ ...prev, end_time: selectedValue }));
      } else if (pickerTarget.type === "routine-start") {
        updateRoutineShift(pickerTarget.dayKey, pickerTarget.shiftId, { startTime: selectedValue });
        if (pickerTarget.openEndAfterConfirm) {
          setPickerTarget({
            type: "routine-end",
            dayKey: pickerTarget.dayKey,
            shiftId: pickerTarget.shiftId,
          });
          return;
        }
      } else if (pickerTarget.type === "routine-end") {
        updateRoutineShift(pickerTarget.dayKey, pickerTarget.shiftId, { endTime: selectedValue });
      }
      setPickerTarget(null);
    },
    [pickerTarget, updateRoutineShift]
  );

  const pickerMode = pickerTarget?.type === "manual-date" ? "date" : "time";
  const pickerDate =
    pickerTarget?.type === "manual-date"
      ? manualForm.date
      : pickerTarget?.type === "manual-start"
        ? manualForm.start_time
        : pickerTarget?.type === "manual-end"
          ? manualForm.end_time
          : pickerTarget?.type === "routine-start" || pickerTarget?.type === "routine-end"
            ? (() => {
                const day = routineDays.find((item) => item.dayOfWeek === pickerTarget.dayKey);
                const shift = day?.shifts.find((item) => item.localId === pickerTarget.shiftId);
                return pickerTarget.type === "routine-start"
                  ? shift?.startTime || new Date()
                  : shift?.endTime || new Date();
              })()
            : new Date();

  const routineSaveDisabled = savingRoutine || !!routineValidationMessage;
  const manualSaveDisabled = savingManual || !!manualValidationMessage || !showManualForm;
  const todayKey = useMemo(() => formatLocalDateKey(new Date()), []);
  const todaySessionCount = useMemo(
    () => items.filter((item) => item.is_active !== false && String(item.date) === todayKey).length,
    [items, todayKey]
  );
  const totalSessionCount = useMemo(
    () => items.filter((item) => item.is_active !== false).length,
    [items]
  );
  const nextSession = useMemo(
    () =>
      items
        .filter((item) => item.is_active !== false && String(item.date) >= todayKey)
        .sort((left, right) =>
          `${left.date} ${left.start_time}`.localeCompare(`${right.date} ${right.start_time}`)
        )[0] || null,
    [items, todayKey]
  );
  const clinicBadge = useMemo(() => {
    const clinicName = items.find((item) => item.clinic_name)?.clinic_name || "HealthLink";
    return clinicName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [items]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{"\u2190"}</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Manage Sessions</Text>
          <Text style={styles.headerSubtitle}>{route.params.doctorName || "Doctor"}</Text>
        </View>
        <View style={styles.clinicBadge}>
          <Text style={styles.clinicBadgeText}>{clinicBadge || "HL"}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData("refresh")} />}
      >
        <View style={styles.doctorCard}>
          <View style={styles.doctorTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(route.params.doctorName || "Doctor")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("") || "DR"}
              </Text>
            </View>
            <View style={styles.doctorCopy}>
              <Text style={styles.doctorName}>{route.params.doctorName || "Doctor"}</Text>
              <Text style={styles.doctorSpecialization}>
                {route.params.specialization || "Clinic specialist"}
              </Text>
            </View>
            <View style={styles.liveDot} />
          </View>

          <View style={styles.summaryStatsRow}>
            <SummaryStat label="Today" value={String(todaySessionCount)} />
            <SummaryDivider />
            <SummaryStat label="Total" value={String(totalSessionCount)} />
            <SummaryDivider />
            <SummaryStat label="Next" value={nextSession ? formatTime(nextSession.start_time) : "--:--"} />
          </View>
        </View>

        <View style={styles.tabContainer}>
          {(["routine", "manual"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === "routine" ? "Routine Session" : "Manual Session"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "routine" ? (
          <View>
            <InfoCard text="Generates schedule for the next 4 weeks." />

            <View style={styles.settingsRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Slot Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  value={routineSettings.slotDuration}
                  onChangeText={(value) =>
                    setRoutineSettings((prev) => ({ ...prev, slotDuration: numericInput(value) }))
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Max Patients</Text>
                <TextInput
                  style={styles.input}
                  value={routineSettings.maxPatients}
                  onChangeText={(value) =>
                    setRoutineSettings((prev) => ({ ...prev, maxPatients: numericInput(value) }))
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            {routineMaxAllowedPatients > 0 ? (
              <Text style={styles.helperCaption}>
                Current enabled shifts support up to {routineMaxAllowedPatients} patients with {routineSlotDurationValue}-minute slots.
              </Text>
            ) : null}

            {routineDays.map((day) => {
              return (
                <View
                  key={day.dayOfWeek}
                  style={[
                    styles.dayCard,
                    !day.doctorAvailable && styles.dayCardDisabled,
                    day.enabled && day.doctorAvailable && styles.dayCardActive,
                  ]}
                >
                  <View style={styles.dayHeader}>
                    <View style={styles.dayTitleRow}>
                      <Text style={[styles.dayName, !day.doctorAvailable && styles.mutedText]}>
                        {day.label}
                      </Text>
                      {!day.doctorAvailable ? (
                        <View style={styles.offDutyChip}>
                          <Text style={styles.offDutyText}>Off Duty</Text>
                        </View>
                      ) : null}
                    </View>
                    <Switch
                      value={day.enabled}
                      onValueChange={(value) => toggleRoutineDay(day.dayOfWeek, value)}
                      disabled={!day.doctorAvailable}
                      trackColor={{ false: "#E2E8F0", true: "#90E0EF" }}
                      thumbColor={day.enabled ? "#0077B6" : "#94A3B8"}
                    />
                  </View>

                  {!day.doctorAvailable ? (
                    <Text style={styles.mutedText}>No doctor availability</Text>
                  ) : (
                    <>
                      <Text style={styles.availabilityText}>
                        Availability:{" "}
                        {day.availabilityWindows
                          .map((window) => `${formatTime(window.start_time)} - ${formatTime(window.end_time)}`)
                          .join("  •  ")}
                      </Text>
                      <View style={styles.timelineTrack}>
                        {day.availabilityWindows.map((window) => (
                          <View key={`${day.dayOfWeek}-${window.id}`} style={styles.timelineBlock}>
                            <Text style={styles.timelineText}>
                              {formatTime(window.start_time)}-{formatTime(window.end_time)}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {day.enabled ? (
                        <View style={styles.shiftContent}>
                          <View style={styles.shiftSummary}>
                            <Text style={styles.shiftCountText}>
                              {day.shifts.length} shift configured
                            </Text>
                            <TouchableOpacity onPress={() => addShift(day.dayOfWeek)}>
                              <Text style={styles.addShiftText}>+ Add Shift</Text>
                            </TouchableOpacity>
                          </View>
                          {day.shifts.map((shift) => {
                            const shiftStart = formatTime(shift.startTime);
                            const shiftEnd = formatTime(shift.endTime);
                            const shiftError = isShiftInsideAvailability(
                              day.dayOfWeek,
                              shiftStart,
                              shiftEnd,
                              routineAvailabilityByDay
                            )
                              ? null
                              : `${shiftStart}-${shiftEnd} is outside availability.`;

                            return (
                              <View key={shift.localId}>
                                <View style={styles.shiftRow}>
                                  <TouchableOpacity
                                    style={styles.shiftRowMain}
                                    onPress={() =>
                                      setPickerTarget({
                                        type: "routine-start",
                                        dayKey: day.dayOfWeek,
                                        shiftId: shift.localId,
                                        openEndAfterConfirm: true,
                                      })
                                    }
                                  >
                                    <Text style={styles.shiftTime}>
                                      {shiftStart} - {shiftEnd}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.shiftRemoveButton}
                                    onPress={() => removeShift(day.dayOfWeek, shift.localId)}
                                  >
                                    <Text style={styles.shiftRemoveText}>×</Text>
                                  </TouchableOpacity>
                                </View>
                                {shiftError ? <Text style={styles.validationText}>{shiftError}</Text> : null}
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.mutedText}>No clinic session assigned</Text>
                      )}
                    </>
                  )}
                </View>
              );
            })}

            {routineValidationMessage ? <Text style={styles.validationText}>{routineValidationMessage}</Text> : null}
          </View>
        ) : (
          <View>
            <View style={styles.manualCard}>
              <Text style={styles.cardTitle}>Add Custom Session</Text>
              <Text style={styles.helperText}>Use manual sessions for one-off overrides or exceptions.</Text>

              <View style={styles.field}>
                <Text style={styles.inputLabel}>Session Date</Text>
                <TouchableOpacity style={styles.input} onPress={() => setPickerTarget({ type: "manual-date" })}>
                  <Text style={styles.inputDisplayText}>{formatReadableDate(manualForm.date)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.manualCard}>
              <Text style={styles.subTitle}>Doctor Availability</Text>
              <View style={styles.availabilityRow}>
                {selectedDayAvailability.length === 0 ? (
                  <Text style={styles.mutedText}>No doctor availability</Text>
                ) : (
                  selectedDayAvailability.map((slot) => (
                    <AvailabilityChip
                      key={String(slot.id)}
                      time={`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                    />
                  ))
                )}
              </View>
            </View>

            <Text style={styles.sectionHeader}>Suggested Sessions</Text>
            {suggestionsError ? <Text style={styles.validationText}>{suggestionsError}</Text> : null}
            {suggestionsLoading ? (
              <View style={styles.suggestedCard}>
                <ActivityIndicator color="#0077B6" />
              </View>
            ) : manualSuggestions.length === 0 ? (
              <View style={styles.suggestedCard}>
                <View>
                  <Text style={styles.dayName}>No suggestions</Text>
                  <Text style={styles.mutedText}>Choose custom times below</Text>
                </View>
              </View>
            ) : (
              manualSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={`${suggestion.start}-${suggestion.end}-${index}`}
                  style={styles.suggestedCard}
                  onPress={() => applySuggestion(suggestion)}
                >
                  <View>
                    <Text style={styles.dayName}>{suggestion.label}</Text>
                    <Text style={styles.shiftTime}>
                      {suggestion.start} - {suggestion.end}
                    </Text>
                    <Text style={styles.mutedText}>
                      {suggestion.durationMinutes} min · {suggestion.slotDuration} min slots · {suggestion.maxPatients} patients
                    </Text>
                  </View>
                  <View style={styles.addButtonCircle}>
                    <Text style={styles.whitePlus}>+</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            <View style={styles.manualCard}>
              <TouchableOpacity style={styles.customButton} onPress={() => setShowManualForm((current) => !current)}>
                <Text style={styles.addShiftText}>{showManualForm ? "Hide Custom Session" : "Custom Session"}</Text>
              </TouchableOpacity>

              {showManualForm ? (
                <>
                  <View style={styles.settingsRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <TouchableOpacity style={styles.input} onPress={() => setPickerTarget({ type: "manual-start" })}>
                        <Text style={styles.inputDisplayText}>{formatTime(manualForm.start_time)}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <TouchableOpacity style={styles.input} onPress={() => setPickerTarget({ type: "manual-end" })}>
                        <Text style={styles.inputDisplayText}>{formatTime(manualForm.end_time)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingsRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Slot Duration (min)</Text>
                      <TextInput
                        style={styles.input}
                        value={manualForm.slot_duration}
                        onChangeText={(value) => setManualForm((prev) => ({ ...prev, slot_duration: numericInput(value) || "0" }))}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Max Patients</Text>
                      <TextInput
                        style={styles.input}
                        value={manualForm.max_patients}
                        onChangeText={handleManualMaxPatientsChange}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {manualValidationMessage ? <Text style={styles.validationText}>{manualValidationMessage}</Text> : null}
                </>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (activeTab === "routine" ? routineSaveDisabled : manualSaveDisabled) && styles.saveButtonDisabled,
          ]}
          onPress={() => {
            if (activeTab === "routine") void saveRoutine();
            else void createManualSession();
          }}
          disabled={activeTab === "routine" ? routineSaveDisabled : manualSaveDisabled}
        >
          {activeTab === "routine" && savingRoutine ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : activeTab === "manual" && savingManual ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
          {activeTab === "routine" ? "Generate Routine Schedules" : "Save Custom Session"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={Boolean(pickerTarget)}
        mode={pickerMode}
        date={pickerDate}
        is24Hour={pickerMode === "time"}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerTarget(null)}
      />
    </SafeAreaView>
  );
}

function InfoCard({ text }: { text: string }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIconCircle}>
        <Text style={styles.infoIconText}>i</Text>
      </View>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function AvailabilityChip({ time }: { time: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{time}</Text>
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function SummaryDivider() {
  return <View style={styles.summaryDivider} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FCFD" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#F8FCFD",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  backButtonText: { fontSize: 20, color: "#03045E" },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#03045E" },
  headerSubtitle: { fontSize: 14, color: "#64748B", marginTop: 2 },
  clinicBadge: {
    minWidth: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  clinicBadgeText: { fontSize: 13, fontWeight: "800", color: "#3B82F6" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 140 },
  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  doctorTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#0369A1", fontWeight: "800", fontSize: 18 },
  doctorCopy: { flex: 1, marginLeft: 16 },
  doctorName: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  doctorSpecialization: { fontSize: 14, color: "#64748B", marginTop: 4 },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
  },
  summaryStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 12, color: "#64748B", marginBottom: 6 },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  summaryDivider: { width: 1, height: 26, backgroundColor: "#E2E8F0" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    marginBottom: 20,
    borderRadius: 16,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: "center", borderRadius: 12 },
  activeTab: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 2 },
    }),
  },
  tabText: { fontWeight: "700", color: "#64748B", fontSize: 14 },
  activeTabText: { color: "#03045E" },
  infoCard: {
    backgroundColor: "#E0F2FE",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  infoIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00B4D8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoIconText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  infoText: { flex: 1, color: "#03045E", fontSize: 14, lineHeight: 20 },
  settingsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, color: "#64748B", marginBottom: 8, fontWeight: "600" },
  helperCaption: {
    marginTop: -8,
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    minHeight: 48,
    color: "#0F172A",
    justifyContent: "center",
  },
  inputDisplayText: { color: "#0F172A", fontSize: 16 },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: { elevation: 3 },
    }),
  },
  dayCardActive: { borderColor: "#90E0EF", borderWidth: 2 },
  dayCardDisabled: { backgroundColor: "#F1F5F9", opacity: 0.65 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  dayTitleRow: { flexDirection: "row", alignItems: "center" },
  dayName: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginRight: 10 },
  mutedText: { color: "#94A3B8", fontSize: 14 },
  offDutyChip: {
    alignSelf: "flex-start",
    backgroundColor: "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  offDutyText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  availabilityRow: { flexDirection: "row", alignItems: "center", marginTop: 8, flexWrap: "wrap" },
  availabilityText: { fontSize: 13, color: "#64748B", marginBottom: 14 },
  timelineTrack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  timelineBlock: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timelineText: { fontSize: 12, fontWeight: "700", color: "#1D4ED8" },
  chip: { backgroundColor: "#CAF0F8", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, marginLeft: 5, marginBottom: 6 },
  chipText: { fontSize: 12, color: "#0077B6", fontWeight: "600" },
  shiftContent: { marginTop: 15, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 15 },
  shiftSummary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  shiftCountText: { fontWeight: "600", color: "#0F172A" },
  addShiftText: { color: "#0077B6", fontWeight: "bold" },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FCFD",
    padding: 0,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  shiftRowMain: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  shiftTime: { fontSize: 15, fontWeight: "700", color: "#03045E" },
  shiftRemoveButton: {
    width: 48,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
  },
  shiftRemoveText: { fontSize: 22, lineHeight: 22, color: "#94A3B8" },
  manualCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 5, color: "#0F172A" },
  subTitle: { fontSize: 18, fontWeight: "700", marginBottom: 5, color: "#0F172A" },
  helperText: { color: "#64748B", marginBottom: 15 },
  sectionHeader: { fontSize: 16, fontWeight: "700", marginVertical: 10, color: "#64748B" },
  suggestedCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  addButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0077B6",
    alignItems: "center",
    justifyContent: "center",
  },
  whitePlus: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold" },
  customButton: {
    minHeight: 42,
    borderRadius: 10,
    justifyContent: "center",
  },
  field: { marginTop: 4 },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
      },
      android: { elevation: 4 },
    }),
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  validationText: { color: "#EF4444", fontSize: 12, marginBottom: 12, fontWeight: "600" },
});
