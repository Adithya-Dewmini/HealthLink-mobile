import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  deleteReceptionSession,
  fetchReceptionSessionRoutine,
  fetchReceptionSessionSchedules,
  saveReceptionSessionRoutine,
  type ReceptionRoutineDay,
  type ReceptionSessionItem,
} from "../../services/receptionistSessionService";
import type {
  DoctorExtraSession,
  DoctorGeneratedSession,
  DoctorWeeklySchedule,
  DoctorSessionSourceType,
} from "../../types/doctorSessions";
import {
  formatLocalDateKey,
  formatSessionDateLabel,
  formatSessionTimeRangeLabel,
  parseSessionDate,
} from "../../utils/sessionPresentation";
import { getSocket } from "../../services/socket";
import { getFriendlyError } from "../../utils/friendlyErrors";

type Props = NativeStackScreenProps<
  ReceptionistStackParamList,
  "ReceptionistDoctorSessionOverview"
>;

type FilterKey = "all" | "weekly" | "today" | "upcoming" | "extra";
type ScheduleStatusTone = "info" | "success" | "warning" | "muted" | "danger";
type SessionDetailsPayload = {
  id: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: ScheduleStatusTone;
  sourceLabel: string;
  dateLabel: string;
  timeLabel: string;
  repeatsLabel?: string | null;
  roomLabel: string;
  maxPatients: number;
  slotDuration: number;
  bookedCount?: number | null;
  availableSlots?: number | null;
  clinicLabel: string;
  notesLabel?: string | null;
  onDelete?: () => void;
  deleteLabel?: string;
};

type EditWeeklyScheduleForm = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string;
  maxPatients: string;
  slotDuration: string;
  notes: string;
};

const THEME = {
  primary: "#061A2E",
  deepBlue: "#0B3558",
  brand: "#0EA5E9",
  softCyan: "#38BDF8",
  bgLight: "#EFF8FF",
  cardBg: "#FFFFFF",
  mutedSurface: "#F8FAFC",
  border: "#D8E7F3",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  success: "#10B981",
  successBg: "#D1FAE5",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  infoBg: "#E0F2FE",
  slateBg: "#F1F5F9",
  modal: {
    centerPadding: 16,
    cardBackground: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(164, 219, 232, 0.3)",
    handleColor: "#D1D1D6",
    titleColor: "#FFFFFF",
    labelColor: "#A4DBE8",
    valueColor: "#FFFFFF",
    secondaryButtonBackground: "rgba(255, 255, 255, 0.1)",
    dangerButtonBackground: "#F27B71",
    buttonBorderColor: "rgba(255,255,255,0.3)",
    subtleBorderColor: "rgba(164, 219, 232, 0.16)",
    shadow: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 5,
    },
    glow: {
      shadowColor: "#64D2FF",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },
  },
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "weekly", label: "Weekly" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "extra", label: "Extra" },
];

const DEFAULT_DOCTOR_NAME = "Doctor";
const DEFAULT_SPECIALIZATION = "Specialist";
const DEFAULT_CLINIC_NAME = "Clinic";
const DEFAULT_SLOT_DURATION = 15;
const DEFAULT_MAX_PATIENTS = 16;
const ROUTINE_WEEKS_TO_GENERATE = 8;

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const compareDateKeys = (left: string, right: string) => left.localeCompare(right);

const toId = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const shouldRefreshDoctorSchedule = (
  payload: { doctorId?: number | string; doctorUserId?: number | string } | undefined,
  routeParams: { doctorId?: number | string; doctorUserId?: number | string },
  currentDoctor?: { doctorId?: number | string; doctorUserId?: number | string }
) => {
  const payloadDoctorId = toId(payload?.doctorId);
  const payloadDoctorUserId = toId(payload?.doctorUserId);
  const currentDoctorId = toId(currentDoctor?.doctorId ?? routeParams.doctorId);
  const currentDoctorUserId = toId(currentDoctor?.doctorUserId ?? routeParams.doctorUserId);

  // `doctorId` identifies the doctor entity, while `doctorUserId` identifies the linked user account.
  // Some socket payloads send one or the other, so the refresh check must tolerate both forms safely.
  return Boolean(
    (payloadDoctorId && payloadDoctorId === currentDoctorId) ||
      (payloadDoctorUserId && payloadDoctorUserId === currentDoctorUserId) ||
      (payloadDoctorId && payloadDoctorId === currentDoctorUserId) ||
      (payloadDoctorUserId && payloadDoctorUserId === currentDoctorId)
  );
};

const getDoctorInitials = (name?: string | null) =>
  (name || DEFAULT_DOCTOR_NAME)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "DR";

const getDayOfWeekFromDate = (dateValue: string) => parseSessionDate(dateValue)?.getDay() ?? 0;

const getRoomLabel = (roomNumber?: string | null) => roomNumber?.trim() ? `Room ${roomNumber.trim()}` : "Room TBD";

const getSourceType = (session: ReceptionSessionItem): DoctorSessionSourceType =>
  session.source === "routine" ? "weekly" : "extra";

const getDisplayStatus = (
  session: DoctorGeneratedSession | DoctorExtraSession,
  context: "today" | "upcoming" | "extra" | "all"
) => {
  if (session.status === "Live") {
    return { label: "Queue Live", tone: "success" as ScheduleStatusTone };
  }
  if (session.status === "Completed") {
    return { label: "Completed", tone: "muted" as ScheduleStatusTone };
  }
  if (session.status === "Cancelled") {
    return { label: "Cancelled", tone: "danger" as ScheduleStatusTone };
  }
  if (context === "today") {
    return { label: "Not Started", tone: "info" as ScheduleStatusTone };
  }
  return { label: "Upcoming", tone: "info" as ScheduleStatusTone };
};

const buildWeeklySchedules = (
  routineDays: ReceptionRoutineDay[],
  doctorId: number
): DoctorWeeklySchedule[] =>
  routineDays
    .filter((day) => Array.isArray(day.routines) && day.routines.length > 0)
    .map((day) => {
      const shifts = [...day.routines].sort((left, right) => left.startTime.localeCompare(right.startTime));
      const firstShift = shifts[0];
      const lastShift = shifts[shifts.length - 1];

      return {
        id: String(day.dayKey),
        doctorId,
        dayOfWeek: day.dayKey,
        dayName: day.day || WEEKDAY_LABELS[day.dayKey] || "Day",
        startTime: String(firstShift?.startTime || "09:00").slice(0, 5),
        endTime: String(lastShift?.endTime || "17:00").slice(0, 5),
        roomNumber: firstShift?.roomNumber?.trim() ? firstShift.roomNumber.trim() : null,
        maxPatients: Number(firstShift?.maxPatients || DEFAULT_MAX_PATIENTS),
        slotDuration: Number(firstShift?.slotDuration || DEFAULT_SLOT_DURATION),
        isActive: true,
        notes: null,
        clinicName: firstShift?.clinicName || null,
        timeSummary: shifts.map((shift) => `${String(shift.startTime).slice(0, 5)}-${String(shift.endTime).slice(0, 5)}`).join(" • "),
        shiftCount: shifts.length,
      };
    })
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek);

const buildGeneratedSessions = (items: ReceptionSessionItem[]): DoctorGeneratedSession[] =>
  items
    .map((item) => ({
      id: item.id,
      doctorId: item.doctorId,
      date: item.date,
      dayOfWeek: getDayOfWeekFromDate(item.date),
      startTime: item.startTime,
      endTime: item.endTime,
      roomNumber: item.roomNumber,
      maxPatients: item.maxPatients,
      bookedCount: item.bookedCount,
      status: item.status,
      sourceType: getSourceType(item),
      slotDuration: item.slotDuration,
      notes: null,
      clinicName: item.clinicName,
      availableSlots: item.availableSlots,
      isActive: item.isActive,
    }))
    .sort((left, right) =>
      `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`)
    );

const buildRoutineSavePayload = (routineDays: ReceptionRoutineDay[]) => {
  const activeDays = routineDays.filter((day) => day.routines.length > 0);
  const firstShift = activeDays.flatMap((day) => day.routines).find(Boolean);

  return {
    weeks: ROUTINE_WEEKS_TO_GENERATE,
    routine: activeDays.map((day) => ({
      day: day.day,
      dayOfWeek: day.dayKey,
      shifts: day.routines.map((shift) => ({
        start: String(shift.startTime).slice(0, 5),
        end: String(shift.endTime).slice(0, 5),
        roomNumber: shift.roomNumber?.trim() ? shift.roomNumber.trim() : null,
      })),
    })),
    slotDuration: Number(firstShift?.slotDuration || DEFAULT_SLOT_DURATION),
    maxPatients: Number(firstShift?.maxPatients || DEFAULT_MAX_PATIENTS),
  };
};

const parseTimeToMinutes = (value: string) => {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
};

const calculateGeneratedSlotCount = (startTime: string, endTime: string, slotDuration: number) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null || slotDuration <= 0 || endMinutes <= startMinutes) return 0;
  return Math.floor((endMinutes - startMinutes) / slotDuration);
};

const createEditWeeklyForm = (schedule: DoctorWeeklySchedule): EditWeeklyScheduleForm => ({
  dayOfWeek: schedule.dayOfWeek,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  roomNumber: schedule.roomNumber || "",
  maxPatients: String(schedule.maxPatients),
  slotDuration: String(schedule.slotDuration),
  notes: schedule.notes || "",
});

export default function DoctorSessionOverview({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const hasAccess = useReceptionPermissionGuard("schedule", "schedule_management", true);
  const canManageSessions = hasAccess;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionItems, setSessionItems] = useState<ReceptionSessionItem[]>([]);
  const [routineDays, setRoutineDays] = useState<ReceptionRoutineDay[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<SessionDetailsPayload | null>(null);
  const [selectedWeeklyScheduleForEdit, setSelectedWeeklyScheduleForEdit] = useState<DoctorWeeklySchedule | null>(null);
  const [isEditWeeklyModalVisible, setIsEditWeeklyModalVisible] = useState(false);
  const [editWeeklyForm, setEditWeeklyForm] = useState<EditWeeklyScheduleForm | null>(null);
  const [editWeeklyErrors, setEditWeeklyErrors] = useState<Partial<Record<keyof EditWeeklyScheduleForm, string>>>({});
  const [editWeeklyErrorMessage, setEditWeeklyErrorMessage] = useState<string | null>(null);
  const [isSavingWeeklyEdit, setIsSavingWeeklyEdit] = useState(false);
  const doctorDisplayName = route.params.doctorName || DEFAULT_DOCTOR_NAME;
  const specializationLabel = route.params.specialization || DEFAULT_SPECIALIZATION;

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const [schedulePayload, routinePayload] = await Promise.all([
          fetchReceptionSessionSchedules(route.params.doctorUserId, false),
          fetchReceptionSessionRoutine(route.params.doctorUserId),
        ]);

        setSessionItems(Array.isArray(schedulePayload) ? schedulePayload : []);
        setRoutineDays(Array.isArray(routinePayload) ? routinePayload : []);
        setError(null);
      } catch {
        setError("Could not load schedule. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params.doctorUserId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadData("initial");
    }, [loadData])
  );

  useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = (payload?: { doctorId?: number | string; doctorUserId?: number | string }) => {
      if (
        !shouldRefreshDoctorSchedule(payload, route.params, {
          doctorId: route.params.doctorId,
          doctorUserId: route.params.doctorUserId,
        })
      ) {
        return;
      }
      void loadData("refresh");
    };

    socket.on("schedule:update", handleScheduleUpdate);
    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
    };
  }, [loadData, route.params.doctorId, route.params.doctorUserId]);

  const todayKey = useMemo(() => formatLocalDateKey(new Date()), []);

  const weeklySchedules = useMemo(
    () => buildWeeklySchedules(routineDays, route.params.doctorId),
    [route.params.doctorId, routineDays]
  );

  const generatedSessions = useMemo(() => buildGeneratedSessions(sessionItems), [sessionItems]);

  const todaySessions = useMemo(
    () =>
      generatedSessions.filter((session) => session.date === todayKey),
    [generatedSessions, todayKey]
  );

  const upcomingWeeklySessions = useMemo(
    () =>
      generatedSessions.filter((session) => compareDateKeys(session.date, todayKey) > 0),
    [generatedSessions, todayKey]
  );

  const extraSessions = useMemo(
    () => generatedSessions.filter((session): session is DoctorExtraSession => session.sourceType === "extra"),
    [generatedSessions]
  );

  const allTabExtraSessions = useMemo(
    () =>
      extraSessions.filter((session) => compareDateKeys(session.date, todayKey) < 0),
    [extraSessions, todayKey]
  );

  const totalCapacity = useMemo(
    () => generatedSessions.reduce((sum, session) => sum + session.maxPatients, 0),
    [generatedSessions]
  );

  const activeRoutineDayCount = useMemo(
    () => routineDays.filter((day) => day.routines.length > 0).length,
    [routineDays]
  );

  const searchNormalized = searchQuery.trim().toLowerCase();

  const matchesWeeklySearch = useCallback((item: DoctorWeeklySchedule) => {
    if (!searchNormalized) return true;
    const haystack = [
      item.dayName,
      WEEKDAY_SHORT[item.dayOfWeek] || "",
      item.timeSummary,
      getRoomLabel(item.roomNumber),
      item.clinicName || "",
      "weekly",
      item.isActive ? "active" : "inactive",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchNormalized);
  }, [searchNormalized]);

  const matchesSessionSearch = useCallback(
    (item: DoctorGeneratedSession | DoctorExtraSession, bucket: "today" | "upcoming" | "extra") => {
      if (!searchNormalized) return true;
      const displayStatus = getDisplayStatus(item, bucket);
      const haystack = [
        formatSessionDateLabel(item.date),
        WEEKDAY_LABELS[item.dayOfWeek] || "",
        formatSessionTimeRangeLabel(item.startTime, item.endTime),
        getRoomLabel(item.roomNumber),
        item.clinicName || "",
        item.sourceType,
        bucket,
        displayStatus.label,
        item.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchNormalized);
    },
    [searchNormalized]
  );

  const filteredWeeklySchedules = useMemo(
    () => weeklySchedules.filter(matchesWeeklySearch),
    [matchesWeeklySearch, weeklySchedules]
  );

  const filteredTodaySessions = useMemo(
    () => todaySessions.filter((item) => matchesSessionSearch(item, "today")),
    [matchesSessionSearch, todaySessions]
  );

  const filteredUpcomingWeeklySessions = useMemo(
    () => upcomingWeeklySessions.filter((item) => matchesSessionSearch(item, "upcoming")),
    [matchesSessionSearch, upcomingWeeklySessions]
  );

  const filteredExtraSessions = useMemo(
    () => extraSessions.filter((item) => matchesSessionSearch(item, "extra")),
    [extraSessions, matchesSessionSearch]
  );

  const filteredAllTabExtraSessions = useMemo(
    () => allTabExtraSessions.filter((item) => matchesSessionSearch(item, "extra")),
    [allTabExtraSessions, matchesSessionSearch]
  );

  const categoryCounts = useMemo(
    () => ({
      all:
        weeklySchedules.length +
        todaySessions.length +
        upcomingWeeklySessions.length +
        allTabExtraSessions.length,
      weekly: weeklySchedules.length,
      today: todaySessions.length,
      upcoming: upcomingWeeklySessions.length,
      extra: extraSessions.length,
    }),
    [allTabExtraSessions.length, todaySessions.length, upcomingWeeklySessions.length, weeklySchedules.length]
  );

  const activeFilterLabel = useMemo(
    () => FILTERS.find((filter) => filter.key === activeFilter)?.label || "All",
    [activeFilter]
  );

  const headerClinicName = useMemo(
    () =>
      sessionItems.find((session) => session.clinicName)?.clinicName ||
      weeklySchedules.find((item) => item.clinicName)?.clinicName ||
      DEFAULT_CLINIC_NAME,
    [sessionItems, weeklySchedules]
  );

  const doctorSummaryText = useMemo(() => {
    if (todaySessions.length > 0) return "Session scheduled today";
    if (weeklySchedules.length > 0) return "Weekly schedule active";
    return "No weekly schedule set";
  }, [todaySessions.length, weeklySchedules.length]);

  const weeklyAvailabilitySummary = useMemo(() => {
    if (weeklySchedules.length === 0) return "No weekly hours added";
    return weeklySchedules
      .map((item) => `${WEEKDAY_SHORT[item.dayOfWeek]} ${item.startTime}-${item.endTime}`)
      .join(" • ");
  }, [weeklySchedules]);

  const overallStatus = useMemo(() => {
    if (weeklySchedules.length > 0 || generatedSessions.length > 0) return "Active";
    return "No schedules";
  }, [generatedSessions.length, weeklySchedules.length]);

  const stats = useMemo(
    () => ({
      weeklyDays: weeklySchedules.length,
      today: todaySessions.length,
      upcoming: upcomingWeeklySessions.length,
      extra: extraSessions.length,
      totalCapacity,
    }),
    [extraSessions.length, todaySessions.length, totalCapacity, upcomingWeeklySessions.length, weeklySchedules.length]
  );

  const confirmDeleteWeekly = useCallback(
    (item: DoctorWeeklySchedule) => {
      Alert.alert(
        "Remove weekly schedule",
        `Remove the weekly schedule for ${item.dayName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  const nextRoutineDays = routineDays.map((day) =>
                    day.dayKey === item.dayOfWeek ? { ...day, routines: [] } : day
                  );
                  await saveReceptionSessionRoutine(
                    route.params.doctorUserId,
                    buildRoutineSavePayload(nextRoutineDays)
                  );
                  Alert.alert("Schedule Updated", "Weekly schedule removed.");
                  await loadData("refresh");
                } catch {
                  Alert.alert("Update Failed", "Could not update schedule. Please try again.");
                }
              })();
            },
          },
        ]
      );
    },
    [loadData, route.params.doctorUserId, routineDays]
  );

  const confirmDeleteExtra = useCallback(
    (item: DoctorExtraSession) => {
      Alert.alert(
        "Delete extra session",
        `Remove the extra session on ${formatSessionDateLabel(item.date)}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await deleteReceptionSession(item.id, route.params.doctorUserId);
                  Alert.alert("Session Removed", "Extra session removed.");
                  await loadData("refresh");
                } catch {
                  Alert.alert("Delete Failed", "Could not update schedule. Please try again.");
                }
              })();
            },
          },
        ]
      );
    },
    [loadData, route.params.doctorUserId]
  );

  const confirmCancelUpcoming = useCallback(
    (item: DoctorGeneratedSession) => {
      Alert.alert(
        "Cancel upcoming session",
        `Cancel the session on ${formatSessionDateLabel(item.date)}?`,
        [
          { text: "Keep", style: "cancel" },
          {
            text: "Cancel Session",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await deleteReceptionSession(item.id, route.params.doctorUserId);
                  Alert.alert("Schedule Updated", "Schedule updated successfully.");
                  await loadData("refresh");
                } catch {
                  Alert.alert("Update Failed", "Could not update schedule. Please try again.");
                }
              })();
            },
          },
        ]
      );
    },
    [loadData, route.params.doctorUserId]
  );

  const openWeeklyDetails = useCallback(
    (item: DoctorWeeklySchedule) => {
      setSelectedSessionDetails({
        id: `weekly-${item.id}`,
        typeLabel: "Weekly",
        statusLabel: item.isActive ? "Active" : "Inactive",
        statusTone: item.isActive ? "success" : "muted",
        sourceLabel: "Weekly recurring schedule",
        dateLabel: item.dayName,
        timeLabel: formatSessionTimeRangeLabel(item.startTime, item.endTime),
        repeatsLabel: `Every ${item.dayName}`,
        roomLabel: getRoomLabel(item.roomNumber),
        maxPatients: item.maxPatients,
        slotDuration: item.slotDuration,
        clinicLabel: item.clinicName || DEFAULT_CLINIC_NAME,
        notesLabel: item.notes || null,
        onDelete: () => confirmDeleteWeekly(item),
        deleteLabel: "Delete",
      });
      setDetailsModalVisible(true);
    },
    [confirmDeleteWeekly]
  );

  const openGeneratedDetails = useCallback(
    (
      item: DoctorGeneratedSession | DoctorExtraSession,
      typeLabel: string,
      status: { label: string; tone: ScheduleStatusTone },
      onDelete?: () => void,
      deleteLabel?: string
    ) => {
      setSelectedSessionDetails({
        id: `session-${item.id}`,
        typeLabel,
        statusLabel: status.label,
        statusTone: status.tone,
        sourceLabel:
          item.sourceType === "extra"
            ? "One-time extra session"
            : "Generated session from weekly schedule",
        dateLabel: `${formatSessionDateLabel(item.date)} • ${WEEKDAY_LABELS[item.dayOfWeek] || "Day"}`,
        timeLabel: formatSessionTimeRangeLabel(item.startTime, item.endTime),
        roomLabel: getRoomLabel(item.roomNumber),
        maxPatients: item.maxPatients,
        slotDuration: item.slotDuration,
        bookedCount: item.bookedCount,
        availableSlots: item.availableSlots,
        clinicLabel: item.clinicName || DEFAULT_CLINIC_NAME,
        notesLabel: item.notes || null,
        onDelete,
        deleteLabel,
      });
      setDetailsModalVisible(true);
    },
    []
  );

  const closeDetailsModal = useCallback(() => {
    setDetailsModalVisible(false);
    setSelectedSessionDetails(null);
  }, []);

  const openEditWeeklySchedule = useCallback((schedule: DoctorWeeklySchedule) => {
    setSelectedWeeklyScheduleForEdit(schedule);
    setEditWeeklyForm(createEditWeeklyForm(schedule));
    setEditWeeklyErrors({});
    setEditWeeklyErrorMessage(null);
    setIsEditWeeklyModalVisible(true);
  }, []);

  const closeEditWeeklySchedule = useCallback(() => {
    setIsEditWeeklyModalVisible(false);
    setSelectedWeeklyScheduleForEdit(null);
    setEditWeeklyForm(null);
    setEditWeeklyErrors({});
    setEditWeeklyErrorMessage(null);
  }, []);

  const validateEditWeeklyScheduleForm = useCallback(() => {
    if (!selectedWeeklyScheduleForEdit || !editWeeklyForm) {
      return {
        errors: { startTime: "Weekly schedule is unavailable." } as Partial<Record<keyof EditWeeklyScheduleForm, string>>,
        message: "Weekly schedule is unavailable.",
      };
    }

    const errors: Partial<Record<keyof EditWeeklyScheduleForm, string>> = {};
    const startMinutes = parseTimeToMinutes(editWeeklyForm.startTime);
    const endMinutes = parseTimeToMinutes(editWeeklyForm.endTime);
    const slotDuration = Number(editWeeklyForm.slotDuration);
    const maxPatients = Number(editWeeklyForm.maxPatients);
    const roomNumber = editWeeklyForm.roomNumber.trim();

    if (!editWeeklyForm.startTime.trim()) errors.startTime = "Start time is required.";
    else if (startMinutes === null) errors.startTime = "Use 24-hour time like 09:00.";

    if (!editWeeklyForm.endTime.trim()) errors.endTime = "End time is required.";
    else if (endMinutes === null) errors.endTime = "Use 24-hour time like 10:00.";

    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      errors.endTime = "End time must be later than start time.";
    }

    if (!Number.isFinite(maxPatients) || maxPatients <= 0) {
      errors.maxPatients = "Max patients must be greater than 0.";
    }

    if (!Number.isFinite(slotDuration) || slotDuration <= 0) {
      errors.slotDuration = "Slot duration must be greater than 0.";
    }

    if (!roomNumber) {
      errors.roomNumber = "Room number is required.";
    }

    const generatedSlotCount = calculateGeneratedSlotCount(
      editWeeklyForm.startTime,
      editWeeklyForm.endTime,
      slotDuration
    );

    if (Number.isFinite(maxPatients) && Number.isFinite(slotDuration) && maxPatients > 0 && slotDuration > 0) {
      if (generatedSlotCount <= 0) {
        errors.endTime = errors.endTime || "This time range does not create any appointment slots.";
      } else if (maxPatients > generatedSlotCount) {
        errors.maxPatients = `This time range creates only ${generatedSlotCount} appointment slots. Max patients cannot exceed ${generatedSlotCount}.`;
      }
    }

    const canEditGlobalCapacity = activeRoutineDayCount <= 1;
    if (!canEditGlobalCapacity) {
      const capacityChanged = maxPatients !== selectedWeeklyScheduleForEdit.maxPatients;
      const slotDurationChanged = slotDuration !== selectedWeeklyScheduleForEdit.slotDuration;
      if (capacityChanged) {
        errors.maxPatients = "Max patients applies to all weekly days. Edit it from schedule management.";
      }
      if (slotDurationChanged) {
        errors.slotDuration = "Slot duration applies to all weekly days. Edit it from schedule management.";
      }
    }

    const message = Object.values(errors)[0] || null;
    return { errors, message };
  }, [activeRoutineDayCount, editWeeklyForm, selectedWeeklyScheduleForEdit]);

  const handleSaveWeeklyScheduleEdit = useCallback(async () => {
    if (!selectedWeeklyScheduleForEdit || !editWeeklyForm) return;

    const { errors, message } = validateEditWeeklyScheduleForm();
    setEditWeeklyErrors(errors);
    setEditWeeklyErrorMessage(message);
    if (message) return;

    setIsSavingWeeklyEdit(true);
    try {
      const nextRoutineDays = routineDays.map((day) => {
        if (day.dayKey !== selectedWeeklyScheduleForEdit.dayOfWeek) return day;
        const previousShift = day.routines[0];
        return {
          ...day,
          routines: [
            {
              id: previousShift?.id || `weekly-${day.dayKey}`,
              clinicId: previousShift?.clinicId || "",
              clinicName: previousShift?.clinicName || selectedWeeklyScheduleForEdit.clinicName || DEFAULT_CLINIC_NAME,
              startTime: editWeeklyForm.startTime,
              endTime: editWeeklyForm.endTime,
              roomNumber: editWeeklyForm.roomNumber.trim(),
              slotDuration: Number(editWeeklyForm.slotDuration),
              maxPatients: Number(editWeeklyForm.maxPatients),
            },
          ],
        };
      });

      await saveReceptionSessionRoutine(route.params.doctorUserId, buildRoutineSavePayload(nextRoutineDays));
      await loadData("refresh");
      closeEditWeeklySchedule();
      Alert.alert("Schedule Updated", "Weekly schedule updated successfully.");
    } catch (saveError) {
      setEditWeeklyErrorMessage(getFriendlyError(saveError, "Could not update schedule. Please try again."));
    } finally {
      setIsSavingWeeklyEdit(false);
    }
  }, [
    closeEditWeeklySchedule,
    editWeeklyForm,
    loadData,
    route.params.doctorUserId,
    routineDays,
    selectedWeeklyScheduleForEdit,
    validateEditWeeklyScheduleForm,
  ]);

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Doctor session management has not been assigned to your account." />
    );
  }

  const renderWeeklyCards = (items: DoctorWeeklySchedule[], horizontal = false) =>
    items.map((item) => {
      const card = (
        <WeeklyScheduleCard
          key={item.id}
          item={item}
          onView={() => openWeeklyDetails(item)}
          onEdit={() => openEditWeeklySchedule(item)}
          onDelete={() => confirmDeleteWeekly(item)}
        />
      );
      return horizontal ? <View key={item.id} style={styles.horizontalCardItem}>{card}</View> : card;
    });

  const renderActualSessionCards = (
    items: Array<DoctorGeneratedSession | DoctorExtraSession>,
    context: "today" | "upcoming" | "extra" | "all",
    horizontal = false
  ) =>
    items.map((item) => {
      const resolvedContext =
        context === "all"
          ? item.date === todayKey
            ? "today"
            : item.sourceType === "extra"
              ? "extra"
              : "upcoming"
          : context;
      const displayStatus = getDisplayStatus(item, resolvedContext);
      const showQueueAction =
        context === "today" &&
        item.status !== "Completed" &&
        item.status !== "Cancelled";
      const canDeleteExtra =
        item.sourceType === "extra" &&
        item.status !== "Completed" &&
        item.status !== "Live";
      const canCancelUpcoming =
        context === "upcoming" &&
        item.status !== "Completed" &&
        item.status !== "Cancelled" &&
        item.status !== "Live";
      const resolvedTypeLabel =
        item.sourceType === "weekly"
          ? "Weekly"
          : item.sourceType === "extra"
            ? "Extra"
            : resolvedContext === "today"
              ? "Today"
              : "Upcoming";
      const showStatusChip = displayStatus.label.toLowerCase() !== resolvedTypeLabel.toLowerCase();
      const onDelete = canCancelUpcoming
        ? () => confirmCancelUpcoming(item)
        : canDeleteExtra
          ? () => confirmDeleteExtra(item as DoctorExtraSession)
          : undefined;
      const deleteLabel = canCancelUpcoming ? "Cancel" : canDeleteExtra ? "Delete" : undefined;

      const card = (
        <SessionCard
          key={item.id}
          item={item}
          status={displayStatus}
          typeLabel={resolvedTypeLabel}
          showStatusChip={showStatusChip}
          onView={() => openGeneratedDetails(item, resolvedTypeLabel, displayStatus, onDelete, deleteLabel)}
          onPrimaryAction={
            showQueueAction
              ? () => navigation.navigate("ReceptionistQueueDetails", { sessionId: item.id })
              : undefined
          }
          primaryActionLabel={
            showQueueAction
              ? item.status === "Live"
                ? "Open Queue"
                : "Start Queue"
              : undefined
          }
          onSecondaryAction={onDelete}
          secondaryActionLabel={deleteLabel}
        />
      );
      return horizontal ? <View key={item.id} style={styles.horizontalCardItem}>{card}</View> : card;
    });

  const renderAllSections = () => (
    <View style={styles.feedList}>
      <SessionFeedSection
        title="Weekly Schedule"
        count={filteredWeeklySchedules.length}
      >
        {filteredWeeklySchedules.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.feedSectionScroller}
          >
            {renderWeeklyCards(filteredWeeklySchedules, true)}
          </ScrollView>
        ) : (
          <EmptySectionRow message="No weekly schedule set." />
        )}
      </SessionFeedSection>

      <SessionFeedSection
        title="Today"
        count={filteredTodaySessions.length}
      >
        {filteredTodaySessions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.feedSectionScroller}
          >
            {renderActualSessionCards(filteredTodaySessions, "today", true)}
          </ScrollView>
        ) : (
          <EmptySectionBanner
            icon="calendar-clear-outline"
            iconColor={THEME.brand}
            iconBackgroundColor="#E8F3FF"
            title="No sessions scheduled for today."
            message="Today's doctor sessions will appear here."
          />
        )}
      </SessionFeedSection>

      <SessionFeedSection
        title="Upcoming"
        count={filteredUpcomingWeeklySessions.length}
      >
        {filteredUpcomingWeeklySessions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.feedSectionScroller}
          >
            {renderActualSessionCards(filteredUpcomingWeeklySessions, "upcoming", true)}
          </ScrollView>
        ) : (
          <EmptySectionBanner
            icon="time-outline"
            iconColor={THEME.warning}
            iconBackgroundColor="#FFF2DF"
            title="No upcoming sessions."
            message="Future doctor sessions will appear here."
          />
        )}
      </SessionFeedSection>

      <SessionFeedSection
        title="Extra Sessions"
        count={filteredAllTabExtraSessions.length}
      >
        {filteredAllTabExtraSessions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.feedSectionScroller}
          >
            {renderActualSessionCards(filteredAllTabExtraSessions, "extra", true)}
          </ScrollView>
        ) : (
          <EmptySectionRow message="No extra sessions added." />
        )}
      </SessionFeedSection>
    </View>
  );

  const renderFilteredContent = () => {
    if (loading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.brand} />
        </View>
      );
    }

    if (error) {
      return (
        <StateCard
          title="Schedules unavailable"
          message={error}
          actionLabel="Try Again"
          onPress={() => void loadData("refresh")}
        />
      );
    }

    if (activeFilter === "all") {
      return renderAllSections();
    }

    if (activeFilter === "weekly") {
      if (filteredWeeklySchedules.length === 0) {
        return (
          <StateCard
            title="No weekly schedule yet"
            message="No weekly schedule configured for this doctor."
          />
        );
      }
      return <View style={styles.list}>{renderWeeklyCards(filteredWeeklySchedules)}</View>;
    }

    if (activeFilter === "today") {
      if (filteredTodaySessions.length === 0) {
        return (
          <StateCard
            title={searchQuery.trim() ? "No matching sessions" : "No sessions for today"}
            message={
              searchQuery.trim()
                ? "Try a different search term or switch to another tab."
                : "No actual sessions are scheduled for today."
            }
          />
        );
      }
      return <View style={styles.list}>{renderActualSessionCards(filteredTodaySessions, "today")}</View>;
    }

    if (activeFilter === "upcoming") {
      if (filteredUpcomingWeeklySessions.length === 0) {
        return (
          <StateCard
            title={searchQuery.trim() ? "No matching sessions" : "No upcoming weekly sessions"}
            message={
              searchQuery.trim()
                ? "Try a different search term or switch to another tab."
                : "Future generated sessions will appear here."
            }
          />
        );
      }
      return <View style={styles.list}>{renderActualSessionCards(filteredUpcomingWeeklySessions, "upcoming")}</View>;
    }

    if (filteredExtraSessions.length === 0) {
      return (
        <StateCard
          title={searchQuery.trim() ? "No matching sessions" : "No extra sessions yet"}
          message={
            searchQuery.trim()
              ? "Try a different search term or switch to another tab."
              : "No one-time extra sessions available."
          }
        />
      );
    }

    return <View style={styles.list}>{renderActualSessionCards(filteredExtraSessions, "extra")}</View>;
  };

  return (
    <View style={styles.safeArea}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
      </SafeAreaView>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <View style={styles.brandRow}>
                <Ionicons name="medical" size={16} color={THEME.softCyan} />
                <Text style={styles.headerBrandText}>HealthLink</Text>
              </View>
              <Text style={styles.headerTitle}>Doctor Sessions</Text>
              <Text style={styles.headerSubtitle}>{doctorDisplayName} • {specializationLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={() => void loadData("refresh")} activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{getDoctorInitials(doctorDisplayName)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData("refresh")} />}
        >
          <View style={styles.summaryShell}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FBFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doctorCard}
            >
              <View style={styles.summaryTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getDoctorInitials(doctorDisplayName)}</Text>
                </View>
                <View style={styles.summaryCopy}>
                  <View style={styles.summaryHeadingRow}>
                    <View style={styles.summaryHeadingCopy}>
                      <Text style={styles.summaryName}>{doctorDisplayName}</Text>
                      <Text style={styles.summarySpecialty}>{specializationLabel}</Text>
                    </View>
                    <StatusPill label={overallStatus} tone={overallStatus === "Active" ? "success" : "muted"} />
                  </View>
                  <View style={styles.availabilityInline}>
                    <Ionicons name="calendar-outline" size={14} color={THEME.brand} />
                    <Text style={styles.availabilityText}>{doctorSummaryText}</Text>
                  </View>
                  <Text style={styles.weeklySummaryText}>{weeklyAvailabilitySummary}</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.overviewCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statsScroller}
              >
                <StatBlock label="Weekly Days" value={stats.weeklyDays} icon="repeat-outline" />
                <StatBlock label="Today" value={stats.today} icon="today-outline" />
                <StatBlock label="Upcoming" value={stats.upcoming} icon="calendar-outline" />
                <StatBlock label="Extra" value={stats.extra} icon="add-circle-outline" />
                <StatBlock label="Capacity" value={stats.totalCapacity} icon="people-outline" />
              </ScrollView>
            </View>
          </View>

          <View style={styles.stickyShell}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color={THEME.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search day, date, time, room, or session type"
                placeholderTextColor="#94A3B8"
                returnKeyType="search"
              />
              {searchQuery.trim() ? (
                <TouchableOpacity style={styles.searchClearButton} onPress={() => setSearchQuery("")} activeOpacity={0.85}>
                  <Ionicons name="close" size={16} color={THEME.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
              {FILTERS.map((filter) => {
                const active = activeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={styles.categoryTab}
                    onPress={() => setActiveFilter(filter.key)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.categoryTabLabelRow}>
                      <Text style={[styles.categoryTabText, active ? styles.categoryTabTextActive : null]}>
                        {filter.label}
                      </Text>
                      <Text style={[styles.categoryCount, active ? styles.categoryCountActive : null]}>
                        {categoryCounts[filter.key]}
                      </Text>
                    </View>
                    <View style={[styles.categoryUnderline, active ? styles.categoryUnderlineActive : null]} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.body}>
            {activeFilter !== "all" ? (
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>{activeFilterLabel}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {categoryCounts[activeFilter]} item{categoryCounts[activeFilter] === 1 ? "" : "s"} in this view
                  </Text>
                </View>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{headerClinicName}</Text>
                </View>
              </View>
            ) : null}

            {renderFilteredContent()}
          </View>
        </ScrollView>

        <SessionDetailsModal
          visible={detailsModalVisible}
          data={selectedSessionDetails}
          doctorName={doctorDisplayName}
          specialization={specializationLabel}
          onClose={closeDetailsModal}
        />

        <EditWeeklyScheduleModal
          visible={isEditWeeklyModalVisible}
          schedule={selectedWeeklyScheduleForEdit}
          form={editWeeklyForm}
          errors={editWeeklyErrors}
          errorMessage={editWeeklyErrorMessage}
          isSaving={isSavingWeeklyEdit}
          activeRoutineDayCount={activeRoutineDayCount}
          onChange={(field, value) => {
            setEditWeeklyForm((current) => (current ? { ...current, [field]: value } : current));
            setEditWeeklyErrors((current) => ({ ...current, [field]: undefined }));
            setEditWeeklyErrorMessage(null);
          }}
          onClose={closeEditWeeklySchedule}
          onSave={() => void handleSaveWeeklyScheduleEdit()}
        />
      </View>
    </View>
  );
}

function StatBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const paletteByLabel: Record<string, { bg: string; border: string; iconBg: string; value: string }> = {
    "Weekly Days": { bg: "#E0F2FE", border: "#BAE6FD", iconBg: "#FFFFFF", value: "#0C4A6E" },
    Today: { bg: "#EEF2FF", border: "#C7D2FE", iconBg: "#FFFFFF", value: "#312E81" },
    Upcoming: { bg: "#ECFDF5", border: "#A7F3D0", iconBg: "#FFFFFF", value: "#065F46" },
    Extra: { bg: "#FEF2F2", border: "#FECACA", iconBg: "#FFFFFF", value: "#9F1239" },
    Capacity: { bg: "#FEFCE8", border: "#FDE68A", iconBg: "#FFFFFF", value: "#854D0E" },
  };
  const palette = paletteByLabel[label] || paletteByLabel.Today;

  return (
    <View style={[styles.statBlock, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: palette.iconBg }]}>
        <Ionicons name={icon} size={16} color={THEME.brand} />
      </View>
      <Text style={[styles.statValue, { color: palette.value }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WeeklyScheduleCard({
  item,
  onView,
  onEdit,
  onDelete,
}: {
  item: DoctorWeeklySchedule;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeBadge = getTypeBadgeStyle("weekly");
  const statusBadge = getStatusBadgeStyle(item.isActive ? "Active" : "Inactive");
  const accentColor = getSessionCardAccent("weekly", item.isActive ? "Active" : "Inactive");
  const timeLabel = formatSessionTimeRangeLabel(item.startTime, item.endTime);
  const subtitle = `${item.dayName} • Every ${item.dayName}`;
  const chips = getSessionMetaChips(item.roomNumber, item.maxPatients, item.slotDuration);

  return (
    <View style={styles.sessionCard}>
      <View style={[styles.sessionCardAccent, { backgroundColor: accentColor }]} />

      <View style={styles.cardTopRow}>
        <View style={[styles.typeChip, { backgroundColor: typeBadge.bg, borderColor: typeBadge.border }]}>
          <Text style={[styles.typeChipText, { color: typeBadge.fg }]}>{typeBadge.label}</Text>
        </View>
        <StatusPill label={statusBadge.label} tone={statusBadge.tone} />
      </View>

      <Text style={styles.cardMainTime}>{timeLabel}</Text>
      <Text style={styles.cardSubline}>
        {subtitle}
        {item.shiftCount > 1 ? ` • ${item.shiftCount} windows` : ""}
      </Text>

      <View style={styles.metaChipWrap}>
        {chips.map((chip) => (
          <MetaChip key={chip} label={chip} />
        ))}
      </View>

      <View style={styles.actionRow}>
        <ActionButton label="View" onPress={onView} />
        <ActionButton label="Edit" primary onPress={onEdit} />
        <ActionButton label="Delete" destructive onPress={onDelete} />
      </View>
    </View>
  );
}

function SessionCard({
  item,
  status,
  typeLabel,
  showStatusChip,
  onView,
  onPrimaryAction,
  primaryActionLabel,
  onSecondaryAction,
  secondaryActionLabel,
}: {
  item: DoctorGeneratedSession | DoctorExtraSession;
  status: { label: string; tone: ScheduleStatusTone };
  typeLabel: string;
  showStatusChip: boolean;
  onView: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
}) {
  const normalizedType = typeLabel.toLowerCase();
  const typeBadge = getTypeBadgeStyle(normalizedType);
  const statusBadge = getStatusBadgeStyle(status.label);
  const accentColor = getSessionCardAccent(normalizedType, status.label);
  const chips = getSessionMetaChips(item.roomNumber, item.maxPatients, item.slotDuration);

  return (
    <View style={styles.sessionCard}>
      <View style={[styles.sessionCardAccent, { backgroundColor: accentColor }]} />

      <View style={styles.cardTopRow}>
        <View style={[styles.typeChip, { backgroundColor: typeBadge.bg, borderColor: typeBadge.border }]}>
          <Text style={[styles.typeChipText, { color: typeBadge.fg }]}>{typeBadge.label}</Text>
        </View>
        {showStatusChip ? <StatusPill label={statusBadge.label} tone={statusBadge.tone} /> : null}
      </View>

      <Text style={styles.cardMainTime}>{formatSessionTimeRangeLabel(item.startTime, item.endTime)}</Text>
      <Text style={styles.cardSubline}>{formatSessionDateLabel(item.date)} • {WEEKDAY_LABELS[item.dayOfWeek] || "Day"}</Text>

      <View style={styles.metaChipWrap}>
        {chips.map((chip) => (
          <MetaChip key={chip} label={chip} />
        ))}
      </View>

      <View style={styles.actionRow}>
        <ActionButton label="View" onPress={onView} />
        {primaryActionLabel && onPrimaryAction ? (
          <ActionButton label={primaryActionLabel} primary onPress={onPrimaryAction} />
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <ActionButton
            label={secondaryActionLabel}
            destructive={secondaryActionLabel === "Delete" || secondaryActionLabel === "Cancel"}
            onPress={onSecondaryAction}
          />
        ) : null}
      </View>
    </View>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

function getSessionMetaChips(roomNumber: string | null | undefined, maxPatients: number, slotDuration: number) {
  return [
    getRoomLabel(roomNumber),
    `Max ${maxPatients}`,
    `${slotDuration} min slots`,
  ];
}

function getTypeBadgeStyle(type: string) {
  if (type === "weekly") return { label: "Weekly", bg: "#E0F2FE", border: "#BAE6FD", fg: "#0369A1" };
  if (type === "today") return { label: "Today", bg: "#DCFCE7", border: "#BBF7D0", fg: "#166534" };
  if (type === "extra") return { label: "Extra", bg: "#FEF3C7", border: "#FDE68A", fg: "#92400E" };
  return { label: "Upcoming", bg: "#E0F2FE", border: "#BAE6FD", fg: "#1D4ED8" };
}

function getStatusBadgeStyle(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("live")) return { label: "Queue Live", tone: "success" as ScheduleStatusTone };
  if (normalized.includes("completed")) return { label: "Completed", tone: "muted" as ScheduleStatusTone };
  if (normalized.includes("cancelled")) return { label: "Cancelled", tone: "danger" as ScheduleStatusTone };
  if (normalized.includes("paused")) return { label: "Paused", tone: "warning" as ScheduleStatusTone };
  if (normalized.includes("active")) return { label: "Active", tone: "success" as ScheduleStatusTone };
  if (normalized.includes("not started")) return { label: "Scheduled", tone: "info" as ScheduleStatusTone };
  return { label: "Upcoming", tone: "info" as ScheduleStatusTone };
}

function getSessionCardAccent(type: string, status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("cancelled")) return THEME.danger;
  if (normalized.includes("completed")) return "#94A3B8";
  if (normalized.includes("live")) return THEME.success;
  if (type === "extra") return "#F59E0B";
  if (type === "today") return "#22C55E";
  if (type === "weekly") return THEME.softCyan;
  return THEME.brand;
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: ScheduleStatusTone;
}) {
  const palette =
    tone === "success"
      ? { bg: THEME.successBg, fg: THEME.success }
      : tone === "warning"
        ? { bg: THEME.warningBg, fg: "#B45309" }
        : tone === "danger"
          ? { bg: THEME.dangerBg, fg: THEME.danger }
          : tone === "muted"
            ? { bg: THEME.slateBg, fg: THEME.textSecondary }
            : { bg: THEME.infoBg, fg: "#1D4ED8" };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  primary = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        primary ? styles.actionButtonPrimary : null,
        destructive ? styles.actionButtonDestructive : null,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Text
        style={[
          styles.actionButtonText,
          primary ? styles.actionButtonTextPrimary : null,
          destructive ? styles.actionButtonTextDestructive : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SessionFeedSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.feedSection}>
      <View style={styles.feedSectionHeader}>
        <Text style={styles.feedSectionTitle}>{title}</Text>
        <View style={styles.feedSectionCountWrap}>
          <Text style={styles.feedSectionCount}>{count}</Text>
        </View>
      </View>
      <View style={styles.feedSectionContent}>{children}</View>
    </View>
  );
}

function EmptySectionRow({ message }: { message: string }) {
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyRowText}>{message}</Text>
    </View>
  );
}

function EmptySectionBanner({
  icon,
  iconColor,
  iconBackgroundColor,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackgroundColor: string;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.emptyBanner}>
      <View style={[styles.emptyBannerIconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.emptyBannerContent}>
        <Text style={styles.emptyBannerTitle}>{title}</Text>
        <Text style={styles.emptyBannerText}>{message}</Text>
      </View>
    </View>
  );
}

function StateCard({
  title,
  message,
  actionLabel,
  onPress,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconWrap}>
        <Ionicons name="calendar-outline" size={24} color={THEME.brand} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
      {actionLabel && onPress ? (
        <TouchableOpacity style={styles.stateButton} onPress={onPress} activeOpacity={0.88}>
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SessionDetailsModal({
  visible,
  data,
  doctorName,
  specialization,
  onClose,
}: {
  visible: boolean;
  data: SessionDetailsPayload | null;
  doctorName: string;
  specialization: string;
  onClose: () => void;
}) {
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!visible) return;
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, data?.id]);

  if (!data) return null;

  const detailsRows: Array<{ label: string; value: string }> = [
    { label: "Type", value: data.typeLabel },
    { label: "Status", value: data.statusLabel },
    { label: "Doctor", value: doctorName || DEFAULT_DOCTOR_NAME },
    { label: "Specialization", value: specialization || DEFAULT_SPECIALIZATION },
    { label: "Date", value: data.dateLabel },
    { label: "Time", value: data.timeLabel },
    ...(data.repeatsLabel ? [{ label: "Repeats", value: data.repeatsLabel }] : []),
    { label: "Room", value: data.roomLabel },
    { label: "Capacity", value: `${data.maxPatients} patients` },
    { label: "Slot duration", value: `${data.slotDuration} minutes` },
    ...(typeof data.bookedCount === "number" ? [{ label: "Booked", value: String(data.bookedCount) }] : []),
    ...(typeof data.availableSlots === "number" ? [{ label: "Open", value: String(data.availableSlots) }] : []),
    { label: "Clinic", value: data.clinicLabel || DEFAULT_CLINIC_NAME },
    { label: "Source", value: data.sourceLabel },
    ...(data.notesLabel ? [{ label: "Notes", value: data.notesLabel }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalCenterWrap} pointerEvents="box-none">
        <LinearGradient
          colors={["rgba(18, 40, 60, 0.94)", "rgba(10, 28, 45, 0.96)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalCard}
        >
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Session Details</Text>
          <StatusPill label={data.statusLabel} tone={data.statusTone} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {detailsRows.map((row) => (
            <View key={`${data.id}-${row.label}`} style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>{row.label}</Text>
              <Text style={styles.modalRowValue}>{row.value}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.popupButtonSecondary} onPress={onClose} activeOpacity={0.9}>
            <Text style={styles.popupButtonSecondaryText}>Close</Text>
          </TouchableOpacity>
          {data.onDelete ? (
            <TouchableOpacity
              style={styles.popupButtonDanger}
              onPress={() => {
                onClose();
                data.onDelete?.();
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.popupButtonDangerText}>{data.deleteLabel || "Delete"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>
      </View>
    </Modal>
  );
}

function EditWeeklyScheduleModal({
  visible,
  schedule,
  form,
  errors,
  errorMessage,
  isSaving,
  activeRoutineDayCount,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  schedule: DoctorWeeklySchedule | null;
  form: EditWeeklyScheduleForm | null;
  errors: Partial<Record<keyof EditWeeklyScheduleForm, string>>;
  errorMessage: string | null;
  isSaving: boolean;
  activeRoutineDayCount: number;
  onChange: <K extends keyof EditWeeklyScheduleForm>(field: K, value: EditWeeklyScheduleForm[K]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!visible) return;
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, schedule?.id]);

  if (!schedule || !form) return null;

  const isGlobalCapacityLocked = activeRoutineDayCount > 1;
  const hasMultipleWindows = schedule.shiftCount > 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={isSaving ? undefined : onClose} />
      <View style={styles.modalCenterWrap} pointerEvents="box-none">
        <View style={styles.editModalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.editModalHeader}>
            <View style={styles.editModalHeaderCopy}>
              <Text style={styles.editModalTitle}>Edit weekly schedule</Text>
              <Text style={styles.editModalSubtitle}>Update this doctor's recurring clinic session.</Text>
            </View>
            <TouchableOpacity style={styles.editModalCloseButton} onPress={onClose} activeOpacity={0.88} disabled={isSaving}>
              <Ionicons name="close" size={18} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.editModalBody}
            contentContainerStyle={styles.editModalBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {errorMessage ? <Text style={styles.editModalError}>{errorMessage}</Text> : null}

            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>Day of week</Text>
              <View style={styles.editReadOnlyField}>
                <Text style={styles.editReadOnlyValue}>{WEEKDAY_LABELS[form.dayOfWeek] || schedule.dayName}</Text>
              </View>
              <Text style={styles.editFieldHint}>Use a new weekly schedule if you need a different day.</Text>
            </View>

            <View style={styles.editFieldRow}>
              <View style={styles.editFieldHalf}>
                <Text style={styles.editFieldLabel}>Start time</Text>
                <TextInput
                  value={form.startTime}
                  onChangeText={(value) => onChange("startTime", value)}
                  placeholder="09:00"
                  placeholderTextColor="#94A3B8"
                  style={[styles.editInput, errors.startTime ? styles.editInputError : null]}
                  autoCapitalize="none"
                />
                {errors.startTime ? <Text style={styles.editFieldError}>{errors.startTime}</Text> : null}
              </View>

              <View style={styles.editFieldHalf}>
                <Text style={styles.editFieldLabel}>End time</Text>
                <TextInput
                  value={form.endTime}
                  onChangeText={(value) => onChange("endTime", value)}
                  placeholder="10:00"
                  placeholderTextColor="#94A3B8"
                  style={[styles.editInput, errors.endTime ? styles.editInputError : null]}
                  autoCapitalize="none"
                />
                {errors.endTime ? <Text style={styles.editFieldError}>{errors.endTime}</Text> : null}
              </View>
            </View>

            <View style={styles.editFieldRow}>
              <View style={styles.editFieldHalf}>
                <Text style={styles.editFieldLabel}>Max patients</Text>
                <TextInput
                  value={form.maxPatients}
                  onChangeText={(value) => onChange("maxPatients", value.replace(/[^0-9]/g, ""))}
                  placeholder="4"
                  placeholderTextColor="#94A3B8"
                  style={[styles.editInput, errors.maxPatients ? styles.editInputError : null, isGlobalCapacityLocked ? styles.editInputDisabled : null]}
                  keyboardType="number-pad"
                  editable={!isGlobalCapacityLocked}
                />
                {errors.maxPatients ? <Text style={styles.editFieldError}>{errors.maxPatients}</Text> : null}
              </View>

              <View style={styles.editFieldHalf}>
                <Text style={styles.editFieldLabel}>Slot duration</Text>
                <TextInput
                  value={form.slotDuration}
                  onChangeText={(value) => onChange("slotDuration", value.replace(/[^0-9]/g, ""))}
                  placeholder="15"
                  placeholderTextColor="#94A3B8"
                  style={[styles.editInput, errors.slotDuration ? styles.editInputError : null, isGlobalCapacityLocked ? styles.editInputDisabled : null]}
                  keyboardType="number-pad"
                  editable={!isGlobalCapacityLocked}
                />
                {errors.slotDuration ? <Text style={styles.editFieldError}>{errors.slotDuration}</Text> : null}
              </View>
            </View>

            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>Room number</Text>
              <TextInput
                value={form.roomNumber}
                onChangeText={(value) => onChange("roomNumber", value)}
                placeholder="Room 101"
                placeholderTextColor="#94A3B8"
                style={[styles.editInput, errors.roomNumber ? styles.editInputError : null]}
                editable={!isSaving}
              />
              {errors.roomNumber ? <Text style={styles.editFieldError}>{errors.roomNumber}</Text> : null}
            </View>

            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>Notes</Text>
              <TextInput
                value={form.notes}
                onChangeText={(value) => onChange("notes", value)}
                placeholder="Notes"
                placeholderTextColor="#94A3B8"
                style={[styles.editInput, styles.editInputMultiline, styles.editInputDisabled]}
                editable={false}
                multiline
              />
              <Text style={styles.editFieldHint}>Notes are not supported for weekly schedule edits yet.</Text>
            </View>

            {hasMultipleWindows ? (
              <View style={styles.editInfoBox}>
                <Text style={styles.editInfoText}>
                  This weekly day currently has multiple recurring windows. Saving here replaces them with one recurring time window.
                </Text>
              </View>
            ) : null}

            {isGlobalCapacityLocked ? (
              <View style={styles.editInfoBox}>
                <Text style={styles.editInfoText}>
                  Slot duration and max patients apply to all weekly days for this doctor. Edit them from schedule management if you need a global change.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.editModalActions}>
            <TouchableOpacity style={styles.editModalSecondaryButton} onPress={onClose} activeOpacity={0.88} disabled={isSaving}>
              <Text style={styles.editModalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editModalPrimaryButton, isSaving ? styles.editModalPrimaryButtonDisabled : null]}
              onPress={onSave}
              activeOpacity={0.88}
              disabled={isSaving}
            >
              <Text style={styles.editModalPrimaryButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bgLight,
  },
  topSafeArea: {
    backgroundColor: THEME.primary,
  },
  header: {
    backgroundColor: THEME.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  headerLeft: {
    flex: 1,
    marginRight: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  headerBrandText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.softCyan,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.brand,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: THEME.bgLight,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  summaryShell: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 14,
  },
  doctorCard: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7F0F8",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3558",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: { elevation: 4 },
    }),
  },
  overviewCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "visible",
    backgroundColor: "transparent",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#D9F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.deepBlue,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryHeadingCopy: {
    flex: 1,
  },
  summaryName: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  summarySpecialty: {
    marginTop: 2,
    fontSize: 12,
    color: THEME.textSecondary,
  },
  availabilityInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  availabilityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: THEME.textSecondary,
  },
  weeklySummaryText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: THEME.textPrimary,
    fontWeight: "600",
  },
  statsScroller: {
    paddingHorizontal: 2,
    paddingRight: 8,
    gap: 8,
  },
  statBlock: {
    width: 122,
    minHeight: 90,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: THEME.textSecondary,
  },
  stickyShell: {
    backgroundColor: THEME.bgLight,
    paddingTop: 10,
    paddingBottom: 8,
    overflow: "hidden",
  },
  searchBar: {
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.mutedSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 40,
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  searchClearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  categoryTabs: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  categoryTab: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: THEME.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 0,
    position: "relative",
  },
  categoryTabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.78)",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
  categoryCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    paddingHorizontal: 4,
    textAlignVertical: "center",
    textAlign: "center",
    lineHeight: 18,
    fontSize: 10,
    fontWeight: "800",
    color: "#D7E8F7",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  categoryCountActive: {
    color: THEME.primary,
    backgroundColor: "#FFFFFF",
  },
  categoryUnderline: {
    height: 0,
    width: 0,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginTop: 0,
  },
  categoryUnderlineActive: {
    backgroundColor: "transparent",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: THEME.textSecondary,
  },
  sectionBadge: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.brand,
  },
  centerState: {
    paddingTop: 76,
    alignItems: "center",
  },
  feedList: {
    gap: 18,
  },
  feedSection: {
    gap: 12,
  },
  feedSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  feedSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  feedSectionCountWrap: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  feedSectionCount: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.brand,
  },
  feedSectionContent: {
    gap: 14,
  },
  feedSectionScroller: {
    gap: 14,
    paddingRight: 8,
  },
  horizontalCardItem: {
    width: 308,
  },
  emptyRow: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.84)",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyRowText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  emptyBanner: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#0B3558",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
    }),
  },
  emptyBannerIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyBannerContent: {
    flex: 1,
  },
  emptyBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  emptyBannerText: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 20,
  },
  list: {
    gap: 14,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3558",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  sessionCardAccent: {
    position: "absolute",
    top: 10,
    bottom: 10,
    left: -1,
    width: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  typeChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardMainTime: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    color: THEME.primary,
    letterSpacing: -0.3,
  },
  cardSubline: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textSecondary,
  },
  metaChipWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.mutedSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textSecondary,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  actionButtonPrimary: {
    backgroundColor: THEME.brand,
    borderColor: THEME.brand,
  },
  actionButtonDestructive: {
    backgroundColor: "#FFF7F7",
    borderColor: "#FECACA",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  actionButtonTextPrimary: {
    color: "#FFFFFF",
  },
  actionButtonTextDestructive: {
    color: THEME.danger,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 8,
  },
  stateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  stateButton: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: THEME.brand,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3,12,20,0.56)",
  },
  modalCenterWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: THEME.modal.centerPadding,
    paddingVertical: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92%",
    backgroundColor: THEME.modal.cardBackground,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: THEME.modal.borderColor,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
    overflow: "hidden",
    ...THEME.modal.shadow,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 24,
    backgroundColor: THEME.modal.handleColor,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: THEME.modal.titleColor,
    letterSpacing: 0.5,
  },
  modalBody: {
    flexShrink: 1,
    minHeight: 0,
  },
  modalBodyContent: {
    paddingBottom: 12,
    gap: 0,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.modal.subtleBorderColor,
  },
  modalRowLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.modal.labelColor,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  modalRowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "400",
    color: THEME.modal.valueColor,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "column",
    gap: 12,
    marginTop: 32,
  },
  popupButtonSecondary: {
    backgroundColor: THEME.modal.secondaryButtonBackground,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: THEME.modal.buttonBorderColor,
  },
  popupButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.modal.valueColor,
    letterSpacing: 0.3,
  },
  popupButtonDanger: {
    backgroundColor: THEME.modal.dangerButtonBackground,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    ...THEME.modal.glow,
  },
  popupButtonDangerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  editModalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0B3558",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  editModalHeaderCopy: {
    flex: 1,
  },
  editModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  editModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  editModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.mutedSurface,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  editModalBody: {
    flexShrink: 1,
    minHeight: 0,
  },
  editModalBodyContent: {
    paddingBottom: 8,
    gap: 14,
  },
  editModalError: {
    fontSize: 12,
    lineHeight: 18,
    color: THEME.danger,
    fontWeight: "600",
  },
  editFieldGroup: {
    gap: 6,
  },
  editFieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  editFieldHalf: {
    flex: 1,
    gap: 6,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  editFieldHint: {
    fontSize: 11,
    lineHeight: 16,
    color: THEME.textSecondary,
  },
  editFieldError: {
    fontSize: 11,
    lineHeight: 15,
    color: THEME.danger,
    fontWeight: "600",
  },
  editInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 14,
    color: THEME.textPrimary,
  },
  editInputError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF7F7",
  },
  editInputDisabled: {
    backgroundColor: THEME.mutedSurface,
    color: THEME.textSecondary,
  },
  editInputMultiline: {
    minHeight: 78,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  editReadOnlyField: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.mutedSurface,
    paddingHorizontal: 14,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  editReadOnlyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  editInfoBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editInfoText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#1D4ED8",
  },
  editModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  editModalSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  editModalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.deepBlue,
  },
  editModalPrimaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: THEME.brand,
    borderWidth: 1,
    borderColor: THEME.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  editModalPrimaryButtonDisabled: {
    opacity: 0.7,
  },
  editModalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
