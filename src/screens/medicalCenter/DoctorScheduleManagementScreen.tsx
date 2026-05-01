import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import type { MedicalCenterStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<MedicalCenterStackParamList, "MedicalCenterDoctorSchedule">;

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
  originalDayKey?: number;
  originalStartTime?: string;
  originalEndTime?: string;
  originalSlotDuration?: number;
  originalMaxPatients?: number;
};

type RoutineDayState = {
  day: string;
  dayKey: number;
  isActive: boolean;
  shifts: RoutineShift[];
};

type AvailabilityItem = {
  id: number;
  day?: string | null;
  day_of_week?: number | null;
  start_time: string;
  end_time: string;
  max_patients?: number | null;
  is_active?: boolean;
};

type ExistingSessionItem = {
  id: number;
  doctor_id: number;
  medical_center_id: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
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
  doctorId: number;
  clinicId?: string;
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

const THEME = {
  primary: "#2F6FED",
  background: "#F6F8FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  danger: "#EF4444",
  softBlue: "#EFF6FF",
  softGreen: "#DCFCE7",
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

const SLOT_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");
  if (raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    } catch {
      return raw.trim();
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

const todayDateString = () => formatLocalDateKey(new Date());

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
    const normalized = value.trim();
    if (!normalized) return "--:--";

    const timeFragment = normalized.includes("T") ? normalized.split("T")[1] ?? normalized : normalized;
    const match = timeFragment.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const [, hours, minutes] = match;
      return `${hours.padStart(2, "0")}:${minutes}`;
    }

    return normalized;
  }

  return "--:--";
};

const toApiTime = (value: Date) => formatTime(value);
const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = String(value || "")
    .slice(0, 5)
    .split(":")
    .map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};
const minutesToTime = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

const formatReadableDate = (value: Date | string) => {
  const parsed = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(parsed.getTime())) return typeof value === "string" ? value : todayDateString();

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const minutesBetween = (startTime: Date, endTime: Date) =>
  Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

const calculateSlots = (startTime: Date, endTime: Date, slotDuration: number) => {
  if (slotDuration <= 0) return 0;
  const totalMinutes = minutesBetween(startTime, endTime);
  if (totalMinutes <= 0) return 0;
  return Math.floor(totalMinutes / slotDuration);
};

const getDayKeyFromDate = (value: Date) => value.getDay();

const getAvailabilityDayKey = (slot: AvailabilityItem) => {
  if (typeof slot.day_of_week === "number" && Number.isInteger(slot.day_of_week)) {
    return slot.day_of_week === 7 ? 0 : slot.day_of_week;
  }

  const day = String(slot.day || "").trim().toLowerCase();
  const match = WEEK_DAYS.find((item) => item.day.toLowerCase() === day);
  return match?.dayKey ?? null;
};

const buildSuggestionLabel = (startMinutes: number) => {
  if (startMinutes < 12 * 60) return "Morning Session";
  if (startMinutes < 17 * 60) return "Afternoon Session";
  return "Evening Session";
};

const buildSessionSuggestions = (
  availability: AvailabilityItem[],
  existingSessions: ExistingSessionItem[],
  selectedDate: Date
): SessionSuggestion[] => {
  const dayKey = getDayKeyFromDate(selectedDate);
  const matchingAvailability = availability
    .filter((slot) => slot.is_active !== false && getAvailabilityDayKey(slot) === dayKey)
    .map((slot) => ({
      start: parseTimeToMinutes(slot.start_time),
      end: parseTimeToMinutes(slot.end_time),
    }))
    .filter(
      (slot): slot is { start: number; end: number } =>
        typeof slot.start === "number" && typeof slot.end === "number" && slot.end > slot.start
    )
    .sort((left, right) => left.start - right.start);

  const conflicts = existingSessions
    .map((session) => ({
      start: parseTimeToMinutes(session.start_time),
      end: parseTimeToMinutes(session.end_time),
    }))
    .filter(
      (slot): slot is { start: number; end: number } =>
        typeof slot.start === "number" && typeof slot.end === "number" && slot.end > slot.start
    )
    .sort((left, right) => left.start - right.start);

  const suggestions: SessionSuggestion[] = [];

  matchingAvailability.forEach((slot, slotIndex) => {
    let cursor = slot.start;
    const sourceSlot = availability
      .filter((item) => item.is_active !== false && getAvailabilityDayKey(item) === dayKey)
      .sort((left, right) => `${left.start_time}`.localeCompare(`${right.start_time}`))[slotIndex];

    conflicts.forEach((conflict) => {
      if (conflict.end <= cursor || conflict.start >= slot.end) {
        return;
      }

      if (conflict.start > cursor) {
        const durationMinutes = conflict.start - cursor;
        if (durationMinutes >= 60) {
          const targetMaxPatients =
            typeof sourceSlot?.max_patients === "number" && sourceSlot.max_patients > 0
              ? sourceSlot.max_patients
              : Math.max(1, Math.floor(durationMinutes / 15));
          const slotDuration = nearestSlotDuration(durationMinutes / targetMaxPatients);
          const maxPatients = Math.max(1, Math.floor(durationMinutes / slotDuration));
          suggestions.push({
            label: buildSuggestionLabel(cursor),
            start: minutesToTime(cursor),
            end: minutesToTime(conflict.start),
            durationMinutes,
            slotDuration,
            maxPatients,
          });
        }
      }

      cursor = Math.max(cursor, conflict.end);
    });

    if (cursor < slot.end) {
      const durationMinutes = slot.end - cursor;
      if (durationMinutes >= 60) {
        const targetMaxPatients =
          typeof sourceSlot?.max_patients === "number" && sourceSlot.max_patients > 0
            ? sourceSlot.max_patients
            : Math.max(1, Math.floor(durationMinutes / 15));
        const slotDuration = nearestSlotDuration(durationMinutes / targetMaxPatients);
        const maxPatients = Math.max(1, Math.floor(durationMinutes / slotDuration));
        suggestions.push({
          label: buildSuggestionLabel(cursor),
          start: minutesToTime(cursor),
          end: minutesToTime(slot.end),
          durationMinutes,
          slotDuration,
          maxPatients,
        });
      }
    }
  });

  return suggestions;
};

const nearestSlotDuration = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return SLOT_DURATION_OPTIONS[0];
  return SLOT_DURATION_OPTIONS.reduce((closest, current) =>
    Math.abs(current - value) < Math.abs(closest - value) ? current : closest
  );
};

const numericInput = (value: string) => value.replace(/[^0-9]/g, "");

const makeShiftId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createDefaultShift = (): RoutineShift => ({
  localId: makeShiftId(),
  startTime: parseTimeToDate("09:00"),
  endTime: parseTimeToDate("12:00"),
});

const buildRoutineDaysState = (payload: RoutineApiDay[]): RoutineDayState[] => {
  const byDay = new Map(payload.map((item) => [item.dayKey, item]));
  return WEEK_DAYS.map((item) => {
    const source = byDay.get(item.dayKey);
    return {
      day: item.day,
      dayKey: item.dayKey,
      isActive: Boolean(source?.routines.length),
      shifts:
        source?.routines.map((shift) => ({
          localId: makeShiftId(),
          routineId: shift.id,
          startTime: parseTimeToDate(shift.startTime),
          endTime: parseTimeToDate(shift.endTime),
          originalDayKey: item.dayKey,
          originalStartTime: shift.startTime,
          originalEndTime: shift.endTime,
          originalSlotDuration: shift.slotDuration,
          originalMaxPatients: shift.maxPatients,
        })) ?? [],
    };
  });
};

export default function DoctorScheduleManagementScreen({ navigation, route }: Props) {
  const suggestionAppliedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<ScreenTab>("routine");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [routineDays, setRoutineDays] = useState<RoutineDayState[]>(() =>
    WEEK_DAYS.map((item) => ({ day: item.day, dayKey: item.dayKey, isActive: false, shifts: [] }))
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [availabilityItems, setAvailabilityItems] = useState<AvailabilityItem[]>([]);
  const [manualSuggestions, setManualSuggestions] = useState<SessionSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [routineSettings, setRoutineSettings] = useState({
    slotDuration: "15",
    maxPatients: "12",
  });
  const [manualForm, setManualForm] = useState({
    date: new Date(),
    start_time: parseTimeToDate("09:00"),
    end_time: parseTimeToDate("12:00"),
    slot_duration: "15",
    max_patients: "12",
  });

  useEffect(() => {
    if (suggestionAppliedRef.current) {
      return;
    }
    if (!route.params.initialTab && !route.params.suggestedStartTime && !route.params.suggestedEndTime) {
      return;
    }
    suggestionAppliedRef.current = true;

    if (route.params.initialTab) {
      setActiveTab(route.params.initialTab);
    }

    const hasSuggestedTime = Boolean(route.params.suggestedStartTime && route.params.suggestedEndTime);
    if (!hasSuggestedTime) {
      return;
    }

    const startTime = parseTimeToDate(route.params.suggestedStartTime || "09:00");
    const endTime = parseTimeToDate(route.params.suggestedEndTime || "12:00");
    const nextMaxPatients =
      typeof route.params.suggestedMaxPatients === "number" && route.params.suggestedMaxPatients > 0
        ? String(route.params.suggestedMaxPatients)
        : manualForm.max_patients;

    setManualForm((current) => ({
      ...current,
      date: parseDateString(route.params.suggestedDate),
      start_time: startTime,
      end_time: endTime,
      max_patients: nextMaxPatients,
    }));
    setShowManualForm(true);
  }, [manualForm.max_patients, route.params]);

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [scheduleResponse, routineResponse] = await Promise.all([
        apiFetch("/api/center/schedules?active_only=true"),
        apiFetch(`/api/routines?doctorId=${encodeURIComponent(String(route.params.doctorUserId))}`),
      ]);

      if (!scheduleResponse.ok) {
        throw new Error(await getResponseErrorMessage(scheduleResponse, "Failed to load schedules"));
      }
      if (!routineResponse.ok) {
        throw new Error(await getResponseErrorMessage(routineResponse, "Failed to load routines"));
      }

      const schedulePayload = (await scheduleResponse.json().catch(() => [])) as ScheduleItem[];
      const routinePayload = (await routineResponse.json().catch(() => [])) as RoutineApiDay[];

      setItems(
        Array.isArray(schedulePayload)
          ? schedulePayload.filter((item) => Number(item?.doctor_id) === route.params.doctorUserId)
          : []
      );

      const routineState = buildRoutineDaysState(Array.isArray(routinePayload) ? routinePayload : []);
      setRoutineDays(routineState);

      const firstShift = routinePayload
        .flatMap((day) => day.routines)
        .find(Boolean);

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
  }, [route.params.doctorUserId]);

  useEffect(() => {
    void loadData("initial");
  }, [loadData]);

  const loadManualSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const selectedDate = formatLocalDateKey(manualForm.date);
      const [availabilityResponse, sessionsResponse] = await Promise.all([
        apiFetch(
          `/api/doctors/${encodeURIComponent(String(route.params.doctorId))}/availability?date=${encodeURIComponent(selectedDate)}`
        ),
        apiFetch(
          `/api/sessions?doctorId=${encodeURIComponent(String(route.params.doctorUserId))}&date=${encodeURIComponent(selectedDate)}`
        ),
      ]);

      if (!availabilityResponse.ok) {
        throw new Error(await getResponseErrorMessage(availabilityResponse, "Failed to load doctor availability"));
      }
      if (!sessionsResponse.ok) {
        throw new Error(await getResponseErrorMessage(sessionsResponse, "Failed to load existing sessions"));
      }

      const availabilityPayload = (await availabilityResponse.json().catch(() => [])) as AvailabilityItem[];
      const sessionsPayload = (await sessionsResponse.json().catch(() => [])) as ExistingSessionItem[];
      const normalizedAvailability = Array.isArray(availabilityPayload) ? availabilityPayload : [];
      const normalizedSessions = Array.isArray(sessionsPayload) ? sessionsPayload : [];

      setAvailabilityItems(normalizedAvailability);
      setManualSuggestions(
        buildSessionSuggestions(normalizedAvailability, normalizedSessions, manualForm.date)
      );
      setSuggestionsError(null);
    } catch (error) {
      setManualSuggestions([]);
      setSuggestionsError(
        error instanceof Error ? error.message : "Failed to generate session suggestions"
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }, [manualForm.date, route.params.doctorId, route.params.doctorUserId]);

  useEffect(() => {
    if (activeTab !== "manual") {
      return;
    }
    void loadManualSuggestions();
  }, [activeTab, loadManualSuggestions]);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => `${left.date}${left.start_time}`.localeCompare(`${right.date}${right.start_time}`)),
    [items]
  );

  const routineSlotDurationValue = useMemo(
    () => Number(routineSettings.slotDuration) || 0,
    [routineSettings.slotDuration]
  );
  const routineMaxPatientsValue = useMemo(
    () => Number(routineSettings.maxPatients) || 0,
    [routineSettings.maxPatients]
  );
  const manualSlotDurationValue = useMemo(
    () => Number(manualForm.slot_duration) || 0,
    [manualForm.slot_duration]
  );
  const manualMaxPatientsValue = useMemo(
    () => Number(manualForm.max_patients) || 0,
    [manualForm.max_patients]
  );
  const manualTotalMinutes = useMemo(
    () => minutesBetween(manualForm.start_time, manualForm.end_time),
    [manualForm.end_time, manualForm.start_time]
  );
  const manualSlotCount = useMemo(
    () => calculateSlots(manualForm.start_time, manualForm.end_time, manualSlotDurationValue),
    [manualForm.end_time, manualForm.start_time, manualSlotDurationValue]
  );
  const selectedDayAvailability = useMemo(
    () =>
      availabilityItems.filter(
        (slot) => slot.is_active !== false && getAvailabilityDayKey(slot) === getDayKeyFromDate(manualForm.date)
      ),
    [availabilityItems, manualForm.date]
  );

  const routineValidationMessage = useMemo(() => {
    if (routineSlotDurationValue <= 0) return "Routine slot duration must be greater than 0.";
    if (routineMaxPatientsValue <= 0) return "Routine max patients must be greater than 0.";
    const activeDays = routineDays.filter((day) => day.isActive);
    const activeShifts = activeDays.flatMap((day) => day.shifts);
    if (activeDays.length === 0) return "Turn on at least one working day.";
    if (activeShifts.length === 0) return "Add at least one weekly shift.";

    for (const day of activeDays) {
      if (day.shifts.length === 0) {
        return `${day.day}: add at least one shift.`;
      }

      for (const shift of day.shifts) {
        const totalMinutes = minutesBetween(shift.startTime, shift.endTime);
        if (totalMinutes <= 0) return "Routine shift end time must be later than start time.";
        const slotCount = calculateSlots(shift.startTime, shift.endTime, routineSlotDurationValue);
        if (slotCount <= 0) return "Routine shift is too short for the selected slot duration.";
        if (routineMaxPatientsValue > slotCount) {
          return "Routine max patients cannot exceed available slots for a shift.";
        }
      }
    }

    return null;
  }, [routineDays, routineMaxPatientsValue, routineSlotDurationValue]);

  const manualValidationMessage = useMemo(() => {
    if (manualTotalMinutes <= 0) return "End time must be later than start time.";
    if (manualSlotDurationValue <= 0) return "Slot duration must be greater than 0.";
    if (manualSlotCount <= 0) return "Time range is too short for the selected slot duration.";
    if (manualMaxPatientsValue <= 0) return "Max patients must be greater than 0.";
    if (manualMaxPatientsValue > manualSlotCount) return "Max patients cannot exceed available slots.";
    return null;
  }, [manualMaxPatientsValue, manualSlotCount, manualSlotDurationValue, manualTotalMinutes]);

  useEffect(() => {
    if (manualTotalMinutes <= 0 || manualSlotDurationValue <= 0) {
      setManualForm((prev) => ({ ...prev, max_patients: "0" }));
      return;
    }

    const nextSlotCount = calculateSlots(manualForm.start_time, manualForm.end_time, manualSlotDurationValue);
    setManualForm((prev) => {
      const currentMaxPatients = Number(prev.max_patients) || 0;
      if (currentMaxPatients <= 0) {
        return { ...prev, max_patients: String(nextSlotCount) };
      }
      if (currentMaxPatients > nextSlotCount) {
        return { ...prev, max_patients: String(nextSlotCount) };
      }
      return prev;
    });
  }, [manualForm.end_time, manualForm.start_time, manualSlotDurationValue, manualTotalMinutes]);

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

  const updateRoutineShift = useCallback(
    (dayKey: number, shiftId: string, changes: Partial<RoutineShift>) => {
      setRoutineDays((current) =>
        current.map((day) =>
          day.dayKey === dayKey
            ? {
                ...day,
                shifts: day.shifts.map((shift) =>
                  shift.localId === shiftId ? { ...shift, ...changes } : shift
                ),
              }
            : day
        )
      );
    },
    []
  );

  const toggleRoutineDay = useCallback((dayKey: number, value: boolean) => {
    setRoutineDays((current) =>
      current.map((day) =>
        day.dayKey === dayKey
          ? {
              ...day,
              isActive: value,
            }
          : day
      )
    );
  }, []);

  const addShift = useCallback((dayKey: number) => {
    setRoutineDays((current) =>
      current.map((day) =>
        day.dayKey === dayKey
          ? { ...day, isActive: true, shifts: [...day.shifts, createDefaultShift()] }
          : day
      )
    );
  }, []);

  const removeShift = useCallback((dayKey: number, shiftId: string) => {
    setRoutineDays((current) =>
      current.map((day) =>
        day.dayKey === dayKey
          ? { ...day, shifts: day.shifts.filter((shift) => shift.localId !== shiftId) }
          : day
      )
    );
  }, []);

  const saveRoutine = useCallback(async () => {
    if (savingRoutine) return;
    if (routineValidationMessage) {
      Alert.alert("Routine Validation", routineValidationMessage);
      return;
    }

    setSavingRoutine(true);
    try {
      const routinePayload: RoutineGeneratePayload["routine"] = routineDays
        .filter((day) => day.isActive && day.shifts.length > 0)
        .map((day) => ({
          day: day.day,
          dayOfWeek: day.dayKey,
          shifts: day.shifts.map((shift) => ({
            start: toApiTime(shift.startTime),
            end: toApiTime(shift.endTime),
          })),
        }));

      const currentShifts = routineDays.flatMap((day) =>
        day.isActive
          ? day.shifts.map((shift) => ({
              ...shift,
              dayKey: day.dayKey,
              startTime: toApiTime(shift.startTime),
              endTime: toApiTime(shift.endTime),
            }))
          : []
      );

      const originalShifts = routineDays.flatMap((day) =>
        day.shifts
          .filter((shift) => shift.routineId)
          .map((shift) => ({
            routineId: shift.routineId as string,
            dayKey: shift.originalDayKey ?? day.dayKey,
            startTime: shift.originalStartTime ?? toApiTime(shift.startTime),
            endTime: shift.originalEndTime ?? toApiTime(shift.endTime),
            slotDuration: shift.originalSlotDuration ?? routineSlotDurationValue,
            maxPatients: shift.originalMaxPatients ?? routineMaxPatientsValue,
          }))
      );

      const currentIds = new Set(currentShifts.map((shift) => shift.routineId).filter(Boolean) as string[]);
      const deletes = originalShifts.filter((shift) => !currentIds.has(shift.routineId));

      for (const shift of currentShifts) {
        const payload = {
          doctorId: route.params.doctorUserId,
          dayOfWeek: shift.dayKey,
          startTime: shift.startTime,
          endTime: shift.endTime,
          slotDuration: routineSlotDurationValue,
          maxPatients: routineMaxPatientsValue,
        };

        if (shift.routineId) {
          const changed =
            shift.dayKey !== shift.originalDayKey ||
            shift.startTime !== shift.originalStartTime ||
            shift.endTime !== shift.originalEndTime ||
            routineSlotDurationValue !== shift.originalSlotDuration ||
            routineMaxPatientsValue !== shift.originalMaxPatients;

          if (changed) {
            const response = await apiFetch(`/api/routines/${encodeURIComponent(shift.routineId)}`, {
              method: "PUT",
              body: JSON.stringify(payload),
            });
            if (!response.ok) {
              throw new Error(await getResponseErrorMessage(response, "Failed to update routine"));
            }
          }
        } else {
          const response = await apiFetch("/api/routines", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            throw new Error(await getResponseErrorMessage(response, "Failed to create routine"));
          }
        }
      }

      for (const shift of deletes) {
        const response = await apiFetch(
          `/api/routines/${encodeURIComponent(shift.routineId)}?doctorId=${encodeURIComponent(String(route.params.doctorUserId))}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          throw new Error(await getResponseErrorMessage(response, "Failed to delete routine"));
        }
      }

      const generateResponse = await apiFetch("/api/schedules/generate-from-routine", {
        method: "POST",
        body: JSON.stringify({
          doctorId: route.params.doctorUserId,
          routine: routinePayload,
          slotDuration: routineSlotDurationValue,
          maxPatients: routineMaxPatientsValue,
        } satisfies RoutineGeneratePayload),
      });
      if (!generateResponse.ok) {
        throw new Error(await getResponseErrorMessage(generateResponse, "Failed to generate sessions"));
      }

      await loadData("refresh");
      Alert.alert("Routine Saved", "Weekly routine saved and the next 30 days of sessions were generated.");
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
    if (savingManual) return;
    if (manualValidationMessage) {
      Alert.alert("Validation", manualValidationMessage);
      return;
    }

    setSavingManual(true);

    try {
      const payload = {
        doctor_id: route.params.doctorUserId,
        date: formatLocalDateKey(manualForm.date),
        start_time: toApiTime(manualForm.start_time),
        end_time: toApiTime(manualForm.end_time),
        slot_duration: manualSlotDurationValue,
        max_patients: manualMaxPatientsValue,
      };

      const previewResponse = await apiFetch("/api/center/schedules/preview", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!previewResponse.ok) {
        throw new Error(await getResponseErrorMessage(previewResponse, "Schedule validation failed"));
      }

      const createResponse = await apiFetch("/api/center/schedules", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!createResponse.ok) {
        throw new Error(await getResponseErrorMessage(createResponse, "Failed to create custom session"));
      }

      await loadData("refresh");
      await loadManualSuggestions();
      Alert.alert("Custom Session Created", "Custom session added successfully.");
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
  ]);

  const applySuggestion = useCallback(
    (suggestion: SessionSuggestion) => {
      setManualForm((current) => ({
        ...current,
        start_time: parseTimeToDate(suggestion.start),
        end_time: parseTimeToDate(suggestion.end),
        slot_duration: String(suggestion.slotDuration),
        max_patients: String(suggestion.maxPatients),
      }));
      setShowManualForm(true);
    },
    []
  );

  const disableSchedule = useCallback(async (scheduleId: number) => {
    if (busyId) return;
    setBusyId(scheduleId);

    try {
      const response = await apiFetch(`/api/center/schedules/${scheduleId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response, "Failed to disable session"));
      }
      await loadData("refresh");
      await loadManualSuggestions();
    } catch (error) {
      Alert.alert("Disable Failed", error instanceof Error ? error.message : "Failed to disable session");
    } finally {
      setBusyId(null);
    }
  }, [busyId, loadData, loadManualSuggestions]);

  const handlePickerConfirm = useCallback((selectedValue: Date) => {
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
  }, [pickerTarget, updateRoutineShift]);

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
                const day = routineDays.find((item) => item.dayKey === pickerTarget.dayKey);
                const shift = day?.shifts.find((item) => item.localId === pickerTarget.shiftId);
                if (!shift) return new Date();
                return pickerTarget.type === "routine-start" ? shift.startTime : shift.endTime;
              })()
            : new Date();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Schedule Management</Text>
          <Text style={styles.subtitle}>{route.params.doctorName || "Doctor"}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData("refresh")} />}
      >
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === "routine" && styles.segmentButtonActive]}
            onPress={() => setActiveTab("routine")}
          >
            <Text style={[styles.segmentText, activeTab === "routine" && styles.segmentTextActive]}>Routine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === "manual" && styles.segmentButtonActive]}
            onPress={() => setActiveTab("manual")}
          >
            <Text style={[styles.segmentText, activeTab === "manual" && styles.segmentTextActive]}>Manual</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "routine" ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Weekly Routine Builder</Text>

            <View style={styles.routineSummaryCard}>
              <View style={styles.routineSummaryIcon}>
                <Ionicons name="repeat-outline" size={18} color={THEME.primary} />
              </View>
              <View style={styles.routineSummaryCopy}>
                <Text style={styles.routineSummaryTitle}>Sessions will be generated for next 30 days</Text>
              </View>
            </View>

            <View style={styles.inlineFields}>
              <View style={styles.inlineField}>
                <Field
                  label="Slot Duration (minutes)"
                  value={routineSettings.slotDuration}
                  onChangeText={(value) => setRoutineSettings((prev) => ({ ...prev, slotDuration: numericInput(value) }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inlineField}>
                <Field
                  label="Max Patients"
                  value={routineSettings.maxPatients}
                  onChangeText={(value) => setRoutineSettings((prev) => ({ ...prev, maxPatients: numericInput(value) }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {routineDays.map((day) => {
              const hasShifts = day.shifts.length > 0;
              return (
                <View key={day.dayKey} style={styles.routineDayCard}>
                  <View style={styles.routineDayHeader}>
                    <View style={styles.routineDayHeaderCopy}>
                      <Text style={styles.routineDayTitle}>{day.day}</Text>
                      <Text style={styles.routineDaySubtitle}>Doctor works this day</Text>
                    </View>
                    <Switch
                      value={day.isActive}
                      onValueChange={(value) => toggleRoutineDay(day.dayKey, value)}
                      trackColor={{ false: "#D7DEE8", true: "#A9C7FF" }}
                      thumbColor={day.isActive ? THEME.primary : "#FFFFFF"}
                      ios_backgroundColor="#D7DEE8"
                    />
                  </View>

                  {!day.isActive ? (
                    <Text style={styles.dayOffText}>Doctor is not working this day</Text>
                  ) : (
                    <>
                      <View style={styles.dayControlsRow}>
                        {hasShifts ? (
                          <>
                            <Text style={styles.dayActiveStatus}>
                              {day.shifts.length} shift{day.shifts.length > 1 ? "s" : ""} configured
                            </Text>
                            <TouchableOpacity
                              style={styles.dayHeaderAction}
                              onPress={() => addShift(day.dayKey)}
                              activeOpacity={0.88}
                            >
                              <Ionicons name="add" size={16} color={THEME.primary} />
                              <Text style={styles.dayHeaderActionText}>Add Shift</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            style={styles.dayHeaderAction}
                            onPress={() => addShift(day.dayKey)}
                            activeOpacity={0.88}
                          >
                            <Ionicons name="add" size={16} color={THEME.primary} />
                            <Text style={styles.dayHeaderActionText}>Add Shift</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {hasShifts ? (
                        <View style={styles.shiftList}>
                          {day.shifts.map((shift, index) => (
                            <RoutineShiftCard
                              key={shift.localId}
                              startLabel={formatTime(shift.startTime)}
                              endLabel={formatTime(shift.endTime)}
                              onPress={() =>
                                setPickerTarget({
                                  type: "routine-start",
                                  dayKey: day.dayKey,
                                  shiftId: shift.localId,
                                  openEndAfterConfirm: true,
                                })
                              }
                              onDelete={() => removeShift(day.dayKey, shift.localId)}
                            />
                          ))}
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              );
            })}

            {routineValidationMessage ? <Text style={styles.validationText}>{routineValidationMessage}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, (savingRoutine || !!routineValidationMessage) && styles.primaryButtonDisabled]}
              onPress={() => void saveRoutine()}
              disabled={savingRoutine || !!routineValidationMessage}
            >
              {savingRoutine ? <ActivityIndicator color={THEME.white} /> : <Text style={styles.primaryButtonText}>Save Routine</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Add Custom Session</Text>
            <Text style={styles.sectionHint}>Use manual sessions only for one-off overrides or exceptions.</Text>
            <PickerButton
              label="Session Date"
              value={formatReadableDate(manualForm.date)}
              icon="calendar-outline"
              onPress={() => setPickerTarget({ type: "manual-date" })}
            />

            <View style={styles.availabilitySummaryCard}>
              <Text style={styles.availabilitySummaryTitle}>Doctor Availability for this day</Text>
              {selectedDayAvailability.length === 0 ? (
                <Text style={styles.availabilitySummaryEmpty}>No availability published for this date.</Text>
              ) : (
                <View style={styles.availabilitySummarySlots}>
                  {selectedDayAvailability.map((slot) => (
                    <View key={slot.id} style={styles.availabilitySummaryPill}>
                      <Text style={styles.availabilitySummaryPillText}>
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>Suggested Sessions</Text>
              {suggestionsLoading ? <ActivityIndicator size="small" color={THEME.primary} /> : null}
            </View>
            {suggestionsError ? <Text style={styles.validationText}>{suggestionsError}</Text> : null}
            {!suggestionsLoading && !suggestionsError && manualSuggestions.length === 0 ? (
              <Text style={styles.emptyText}>
                No conflict-free suggestions available for this date. You can still enter a custom session manually.
              </Text>
            ) : (
              <View style={styles.suggestionList}>
                {manualSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`${suggestion.start}-${suggestion.end}-${index}`}
                    style={styles.suggestionCard}
                    activeOpacity={0.88}
                    onPress={() => applySuggestion(suggestion)}
                  >
                    <View style={styles.suggestionTopRow}>
                      <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                      <Ionicons name="sparkles-outline" size={16} color={THEME.primary} />
                    </View>
                    <Text style={styles.suggestionTime}>
                      {suggestion.start} - {suggestion.end}
                    </Text>
                    <Text style={styles.suggestionMeta}>
                      {suggestion.durationMinutes} min · {suggestion.slotDuration} min slots · {suggestion.maxPatients} patients
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.manualActionRow}>
              {!showManualForm ? (
                <TouchableOpacity
                  style={styles.customButton}
                  onPress={() => setShowManualForm(true)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="create-outline" size={16} color={THEME.primary} />
                  <Text style={styles.customButtonText}>Custom</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => setShowManualForm(false)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.linkButtonText}>Back to suggestions</Text>
                </TouchableOpacity>
              )}
            </View>

            {showManualForm ? (
              <>
                <View style={styles.timeRow}>
                  <PickerButton
                    label="Start Time"
                    value={formatTime(manualForm.start_time)}
                    icon="time-outline"
                    compact
                    onPress={() => setPickerTarget({ type: "manual-start" })}
                  />
                  <View style={styles.timeArrowWrap}>
                    <Ionicons name="arrow-forward" size={18} color={THEME.textSecondary} />
                  </View>
                  <PickerButton
                    label="End Time"
                    value={formatTime(manualForm.end_time)}
                    icon="time-outline"
                    compact
                    onPress={() => setPickerTarget({ type: "manual-end" })}
                  />
                </View>

                <Field
                  label="Slot Duration (minutes)"
                  value={manualForm.slot_duration}
                  onChangeText={(value) => setManualForm((prev) => ({ ...prev, slot_duration: numericInput(value) || "0" }))}
                  keyboardType="numeric"
                />
                <Field
                  label="Max Patients"
                  value={manualForm.max_patients}
                  onChangeText={handleManualMaxPatientsChange}
                  keyboardType="numeric"
                />

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Custom Session Summary</Text>
                  <SummaryRow label="Date" value={formatReadableDate(manualForm.date)} />
                  <SummaryRow label="Total Duration" value={`${manualTotalMinutes} min`} />
                  <SummaryRow label="Slot Duration" value={`${manualSlotDurationValue || 0} min`} />
                  <SummaryRow label="Total Slots" value={String(manualSlotCount)} />
                  <SummaryRow label="Max Patients" value={String(manualMaxPatientsValue)} />
                </View>

                {manualValidationMessage ? <Text style={styles.validationText}>{manualValidationMessage}</Text> : null}

                <TouchableOpacity
                  style={[styles.primaryButton, (savingManual || !!manualValidationMessage) && styles.primaryButtonDisabled]}
                  onPress={() => void createManualSession()}
                  disabled={savingManual || !!manualValidationMessage}
                >
                  {savingManual ? <ActivityIndicator color={THEME.white} /> : <Text style={styles.primaryButtonText}>Add Custom Session</Text>}
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Scheduled Sessions</Text>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : sortedItems.length === 0 ? (
            <Text style={styles.emptyText}>No sessions scheduled for this doctor yet.</Text>
          ) : (
            sortedItems.map((item) => (
              <View key={item.id} style={styles.scheduleCard}>
                <View style={styles.scheduleTop}>
                  <View>
                    <Text style={styles.scheduleDate}>{formatReadableDate(item.date)}</Text>
                    <View style={[styles.sourceChip, item.source === "routine" ? styles.sourceChipRoutine : styles.sourceChipManual]}>
                      <Text style={[styles.sourceChipText, item.source === "routine" ? styles.sourceChipTextRoutine : styles.sourceChipTextManual]}>
                        {item.source === "routine" ? "Routine" : "Manual"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.disableButton}
                    onPress={() => void disableSchedule(item.id)}
                    disabled={busyId === item.id}
                  >
                    <Text style={styles.disableButtonText}>
                      {busyId === item.id ? "Please wait..." : "Disable"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.schedulePrimary}>{item.start_time} - {item.end_time}</Text>
                <Text style={styles.scheduleSecondary}>
                  {item.max_patients} patients · {item.slot_duration} min slots
                </Text>
                <Text style={styles.scheduleSecondary}>{item.clinic_name || "Medical Center"}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

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

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor={THEME.textSecondary}
      />
    </View>
  );
}

function PickerButton({
  label,
  value,
  icon,
  onPress,
  compact,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.pickerButton, compact ? styles.pickerButtonCompact : null]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pickerValueRow}>
        <Ionicons name={icon} size={16} color={THEME.primary} />
        <Text style={styles.pickerValue}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function RoutineShiftCard({
  startLabel,
  endLabel,
  onPress,
  onDelete,
}: {
  startLabel: string;
  endLabel: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={styles.shiftCard} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.shiftHeader}>
        <View style={styles.shiftPill}>
          <Text style={styles.shiftPillText}>
            {startLabel} {"\u2192"} {endLabel}
          </Text>
        </View>
        <View style={styles.shiftActionRow}>
          <TouchableOpacity style={styles.shiftDeleteButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={15} color={THEME.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { fontSize: 14, color: THEME.textSecondary, marginTop: 2 },
  scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: THEME.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: THEME.primary,
  },
  segmentText: { fontSize: 14, fontWeight: "700", color: THEME.textSecondary },
  segmentTextActive: { color: THEME.white },
  sectionCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: THEME.textPrimary, marginBottom: 8 },
  sectionHint: { fontSize: 14, lineHeight: 21, color: THEME.textSecondary, marginBottom: 16 },
  inlineFields: { flexDirection: "row", gap: 12 },
  inlineField: { flex: 1 },
  routineSummaryCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#D7E6FF",
    marginBottom: 16,
  },
  routineSummaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.softBlue,
  },
  routineSummaryCopy: {
    flex: 1,
  },
  routineSummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  routineSummaryText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: THEME.textSecondary, marginBottom: 6, fontWeight: "600" },
  input: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    color: THEME.textPrimary,
    backgroundColor: "#FBFDFF",
    fontSize: 14,
  },
  pickerButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    backgroundColor: "#FBFDFF",
    marginBottom: 12,
  },
  pickerButtonCompact: {
    flex: 1,
    marginBottom: 0,
  },
  pickerValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginLeft: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  timeArrowWrap: {
    paddingHorizontal: 8,
    paddingBottom: 14,
  },
  routineDayCard: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    backgroundColor: THEME.white,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  routineDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routineDayHeaderCopy: {
    flex: 1,
    paddingRight: 12,
  },
  routineDayTitle: { fontSize: 16, fontWeight: "700", color: THEME.textPrimary },
  routineDaySubtitle: { marginTop: 4, fontSize: 13, color: THEME.textSecondary },
  dayOffText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  dayControlsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 12,
  },
  dayActiveStatus: {
    flex: 1,
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  dayHeaderAction: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: THEME.softBlue,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayHeaderActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.primary,
  },
  shiftList: {
    marginTop: 12,
    gap: 10,
  },
  shiftCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftTitle: { fontSize: 13, fontWeight: "800", color: THEME.textPrimary },
  shiftPill: {
    flexShrink: 1,
  },
  shiftPillText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  shiftActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shiftDeleteButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  availabilitySummaryCard: {
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginBottom: 14,
  },
  availabilitySummaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  availabilitySummaryEmpty: {
    marginTop: 8,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  availabilitySummarySlots: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  availabilitySummaryPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.softGreen,
  },
  availabilitySummaryPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.success,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  suggestionList: {
    gap: 12,
    marginBottom: 14,
  },
  suggestionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D6E4FF",
    backgroundColor: "#F8FBFF",
    padding: 16,
    shadowColor: "#2F6FED",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  suggestionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
  },
  suggestionTime: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  suggestionMeta: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  manualActionRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  customButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  customButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
  },
  linkButton: {
    minHeight: 34,
    justifyContent: "center",
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.primary,
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 14,
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  validationText: {
    fontSize: 12,
    color: THEME.danger,
    marginBottom: 12,
    fontWeight: "600",
  },
  primaryButton: {
    height: 48,
    borderRadius: 999,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#2F6FED",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  centerState: { paddingVertical: 36, alignItems: "center" },
  emptyText: { fontSize: 14, color: THEME.textSecondary, lineHeight: 21 },
  scheduleCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginBottom: 12,
    backgroundColor: THEME.white,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  scheduleTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  scheduleDate: { fontSize: 12, fontWeight: "700", color: THEME.primary, marginBottom: 6 },
  schedulePrimary: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },
  scheduleSecondary: { fontSize: 12, color: THEME.textSecondary, marginTop: 4 },
  disableButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  disableButtonText: { color: "#6B7280", fontSize: 12, fontWeight: "800" },
  sourceChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sourceChipRoutine: { backgroundColor: THEME.softGreen },
  sourceChipManual: { backgroundColor: THEME.softBlue },
  sourceChipText: { fontSize: 11, fontWeight: "800" },
  sourceChipTextRoutine: { color: THEME.success },
  sourceChipTextManual: { color: THEME.primary },
});
