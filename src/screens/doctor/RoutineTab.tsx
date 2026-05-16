import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useNavigation } from "@react-navigation/native";
import {
  createDoctorExternalSession,
  deleteDoctorExternalSession,
  fetchDoctorExternalSessions,
  fetchDoctorRoutine,
} from "../../services/doctorScheduleService";
import { getSocket } from "../../services/socket";
import type {
  DoctorExternalSession,
  DoctorRoutineDay,
  ScheduleDayGroup,
  ScheduleSession,
} from "./scheduleTypes";
import {
  doctorColors,
  doctorRadius,
  doctorShadows,
  doctorSpacing,
  getDoctorStatusPalette,
  type DoctorStatusTone,
} from "../../constants/doctorTheme";
import ScheduleStatusBadge from "../../components/schedule/ScheduleStatusBadge";
import {
  formatLongDateLabel,
  formatTimeRangeLabel,
} from "../../utils/dateUtils";
import { getDisplayInitials, resolveDoctorImage } from "../../utils/imageUtils";

type RoutineTabProps = {
  schedule: ScheduleDayGroup[];
  isLoadingSchedule?: boolean;
};

type WeeklyRoutineCard = {
  id: string;
  clinicId?: string;
  clinicName: string;
  dayKey: number;
  dayLabel: string;
  startTime: string;
  endTime: string;
  maxPatients?: number;
  location?: string | null;
  imageUrl?: string | null;
  nextSession?: ScheduleSession | null;
  todaySession?: ScheduleSession | null;
  liveSession?: ScheduleSession | null;
};

type ExternalRoutineCard = {
  id: string;
  dayLabel: string;
  dayKey: number;
  startTime: string;
  endTime: string;
  clinicName: string;
  note?: string | null;
  hasConflict?: boolean;
  conflictReason?: string | null;
};

const DAY_OPTIONS = [
  { key: 1, shortLabel: "Mon", fullLabel: "Monday" },
  { key: 2, shortLabel: "Tue", fullLabel: "Tuesday" },
  { key: 3, shortLabel: "Wed", fullLabel: "Wednesday" },
  { key: 4, shortLabel: "Thu", fullLabel: "Thursday" },
  { key: 5, shortLabel: "Fri", fullLabel: "Friday" },
  { key: 6, shortLabel: "Sat", fullLabel: "Saturday" },
  { key: 0, shortLabel: "Sun", fullLabel: "Sunday" },
] as const;

const DAY_NAME_BY_KEY = DAY_OPTIONS.reduce<Record<number, string>>((acc, item) => {
  acc[item.key] = item.fullLabel;
  return acc;
}, {});

const NO_SESSIONS_DAY_BANNER = require("../../../assets/images/no-sessions-day-banner.png");

const formatLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const parseTimeToDate = (value: string) => {
  const base = new Date();
  const [hours = "09", minutes = "00"] = String(value || "").split(":");
  base.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return base;
};

const formatPickerTime = (value: Date) =>
  `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;

const formatClock = (value: string) => {
  const [hourRaw = "00", minuteRaw = "00"] = String(value || "").split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const getSessionSortKey = (session: ScheduleSession) =>
  new Date(`${session.date}T${session.startTime || "00:00"}:00`).getTime();

const getDurationMinutes = (startTime: string, endTime: string) => {
  const [startHour = "0", startMinute = "0"] = String(startTime || "").split(":");
  const [endHour = "0", endMinute = "0"] = String(endTime || "").split(":");
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  return Math.max(end - start, 0);
};

const formatDurationLabel = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const getRoutineStatusTone = (routine: WeeklyRoutineCard): DoctorStatusTone => {
  if (routine.liveSession) return "live";
  if (routine.todaySession) return "upcoming";
  return "upcoming";
};

const getRoutineStatusLabel = (routine: WeeklyRoutineCard) => {
  if (routine.liveSession) return "Live";
  if (routine.todaySession) return "Active Today";
  if (routine.nextSession) return "Upcoming";
  return "Assigned";
};

const getTodayOption = () => {
  const todayKey = new Date().getDay();
  return DAY_OPTIONS.find((item) => item.key === todayKey) ?? DAY_OPTIONS[0];
};

const groupExternalSessions = (sessions: DoctorExternalSession[]): ExternalRoutineCard[] =>
  [...sessions]
    .map((session) => ({
      id: session.id,
      dayLabel: session.day,
      dayKey: session.dayKey,
      startTime: session.startTime,
      endTime: session.endTime,
      clinicName: session.clinicName,
      note: session.note ?? null,
      hasConflict: Boolean(session.hasConflict),
      conflictReason: session.conflictReason ?? null,
    }))
    .sort((left, right) => {
      if (left.dayKey !== right.dayKey) return left.dayKey - right.dayKey;
      if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
      return left.endTime.localeCompare(right.endTime);
    });

const buildRoutineCardsFromSessions = (sessions: ScheduleSession[]) => {
  const todayDateKey = formatLocalDateKey(new Date());
  const map = new Map<string, WeeklyRoutineCard>();

  sessions
    .filter((session) => session.source !== "external")
    .forEach((session) => {
      const parsedDay = new Date(`${session.date}T00:00:00`);
      if (Number.isNaN(parsedDay.getTime())) return;

      const dayKey = parsedDay.getDay();
      const dayLabel =
        DAY_NAME_BY_KEY[dayKey] || parsedDay.toLocaleDateString("en-US", { weekday: "long" });
      const clinicKey = String(session.clinicId || session.clinicName || "clinic").trim().toLowerCase();
      const id = `${dayKey}_${clinicKey}_${session.startTime}_${session.endTime}`;
      const nextImage = resolveDoctorImage(session.coverImageUrl ?? null, session.logoUrl ?? null);
      const existing = map.get(id);

      const nextSessionDateTime = new Date(`${session.date}T${session.startTime}`);
      const existingNextDateTime =
        existing?.nextSession
          ? new Date(`${existing.nextSession.date}T${existing.nextSession.startTime}`)
          : null;

      const isToday = session.date === todayDateKey;
      const normalizedStatus = String(session.status || "").toLowerCase();
      const isLive = normalizedStatus === "active" || normalizedStatus === "live";
      const isCompleted =
        normalizedStatus === "completed" ||
        normalizedStatus === "cancelled" ||
        normalizedStatus === "missed";

      const candidateNextSession =
        !isCompleted &&
        !Number.isNaN(nextSessionDateTime.getTime()) &&
        (!existingNextDateTime || nextSessionDateTime.getTime() < existingNextDateTime.getTime())
          ? session
          : existing?.nextSession ?? null;

      map.set(id, {
        id,
        clinicId: session.clinicId,
        clinicName: session.clinicName,
        dayKey,
        dayLabel,
        startTime: session.startTime,
        endTime: session.endTime,
        maxPatients: session.maxPatients,
        location: session.location ?? existing?.location ?? null,
        imageUrl: nextImage ?? existing?.imageUrl ?? null,
        nextSession: candidateNextSession,
        todaySession: isToday ? session : existing?.todaySession ?? null,
        liveSession: isLive ? session : existing?.liveSession ?? null,
      });
    });

  return [...map.values()].sort((left, right) => {
    if (left.dayKey !== right.dayKey) return left.dayKey - right.dayKey;
    if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
    return left.clinicName.localeCompare(right.clinicName);
  });
};

const buildRoutineCardsFromRoutineDays = (
  routineDays: DoctorRoutineDay[],
  sessions: ScheduleSession[]
) => {
  const todayDateKey = formatLocalDateKey(new Date());

  return routineDays
    .flatMap((day) =>
      day.routines.map<WeeklyRoutineCard>((routine) => {
        const matchedSessions = sessions
          .filter((session) => {
            if (session.source === "external") return false;
            const sessionDate = new Date(`${session.date}T00:00:00`);
            if (Number.isNaN(sessionDate.getTime())) return false;

            const sameDay = sessionDate.getDay() === day.dayKey;
            const sameClinic =
              (routine.clinicId && session.clinicId && routine.clinicId === session.clinicId) ||
              routine.clinicName.trim().toLowerCase() === session.clinicName.trim().toLowerCase();
            const sameTime =
              routine.startTime === session.startTime && routine.endTime === session.endTime;

            return sameDay && sameClinic && sameTime;
          })
          .sort((left, right) =>
            `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`)
          );

        const liveSession =
          matchedSessions.find((session) => {
            const normalizedStatus = String(session.status || "").toLowerCase();
            return normalizedStatus === "active" || normalizedStatus === "live";
          }) ?? null;

        const todaySession =
          matchedSessions.find((session) => session.date === todayDateKey) ?? null;

        const nextSession = matchedSessions[0] ?? null;
        const imageUrl = resolveDoctorImage(routine.coverImageUrl, routine.logoUrl);

        return {
          id: routine.id,
          clinicId: routine.clinicId,
          clinicName: routine.clinicName,
          dayKey: day.dayKey,
          dayLabel: day.day || DAY_NAME_BY_KEY[day.dayKey] || "Assigned Day",
          startTime: routine.startTime,
          endTime: routine.endTime,
          maxPatients: routine.maxPatients,
          location: routine.location ?? null,
          imageUrl: imageUrl ?? null,
          nextSession,
          todaySession,
          liveSession,
        };
      })
    )
    .sort((left, right) => {
      if (left.dayKey !== right.dayKey) return left.dayKey - right.dayKey;
      if (left.startTime !== right.startTime) return left.startTime.localeCompare(right.startTime);
      return left.clinicName.localeCompare(right.clinicName);
    });
};

const DayChip = ({
  label,
  isSelected,
  isToday,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.dayChip, isSelected && styles.dayChipSelected, isToday && styles.dayChipToday]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextSelected]}>{label}</Text>
    {isToday ? <Text style={[styles.dayChipTodayText, isSelected && styles.dayChipTodayTextSelected]}>Today</Text> : null}
  </TouchableOpacity>
);

const ClinicThumbnail = ({
  imageUrl,
  clinicName,
}: {
  imageUrl?: string | null;
  clinicName: string;
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.clinicImage}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={styles.clinicImageFallback}>
      <Ionicons name="business-outline" size={20} color={doctorColors.primary} />
      <Text style={styles.clinicImageFallbackText}>{getDisplayInitials(clinicName, "CL")}</Text>
    </View>
  );
};

const TimeInput = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.sheetTimeInputContainer} onPress={onPress} activeOpacity={0.88}>
    <Text style={styles.sheetInputLabel}>{label}</Text>
    <View style={styles.sheetInputBox}>
      <Text style={styles.sheetInputText}>{value}</Text>
      <Ionicons name="time-outline" size={18} color={doctorColors.textSecondary} />
    </View>
  </TouchableOpacity>
);

export default function RoutineTab({ schedule, isLoadingSchedule }: RoutineTabProps) {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const externalSheetRef = useRef<BottomSheetModal>(null);
  const [routineDays, setRoutineDays] = useState<DoctorRoutineDay[]>([]);
  const [routineRequestFailed, setRoutineRequestFailed] = useState(false);
  const [externalSessions, setExternalSessions] = useState<DoctorExternalSession[]>([]);
  const [supportsExternalSessions, setSupportsExternalSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [savingExternal, setSavingExternal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<"startTime" | "endTime" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<number>(getTodayOption().key);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(height);
  const [externalSectionY, setExternalSectionY] = useState(0);
  const [externalSectionHeight, setExternalSectionHeight] = useState(0);
  const [externalForm, setExternalForm] = useState({
    dayOfWeek: 1,
    startTime: "",
    endTime: "",
    clinicName: "",
    note: "",
  });

  const externalSheetSnapPoints = useMemo(() => ["78%"], []);

  const resetExternalForm = useCallback(() => {
    setExternalForm({
      dayOfWeek: 1,
      startTime: "",
      endTime: "",
      clinicName: "",
      note: "",
    });
    setFormError(null);
  }, []);

  const loadRoutineDays = useCallback(async () => {
    try {
      const next = await fetchDoctorRoutine();
      setRoutineDays(next);
      setRoutineRequestFailed(false);
    } catch {
      setRoutineDays([]);
      setRoutineRequestFailed(true);
    }
  }, []);

  const loadExternalSessions = useCallback(async () => {
    try {
      setError(null);

      const external = await fetchDoctorExternalSessions();
      if (Array.isArray(external)) {
        setSupportsExternalSessions(true);
      }
      setExternalSessions(external);
    } catch {
      setExternalSessions([]);
      setSupportsExternalSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadExternalSessions();
  }, [loadExternalSessions]);

  useEffect(() => {
    void loadRoutineDays();
  }, [loadRoutineDays]);

  useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = () => {
      void loadRoutineDays();
      void loadExternalSessions();
    };

    socket.on("schedule:update", handleScheduleUpdate);
    socket.on("queue:update", handleScheduleUpdate);
    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
      socket.off("queue:update", handleScheduleUpdate);
    };
  }, [loadExternalSessions, loadRoutineDays]);

  useEffect(() => {
    if (showExternalModal) {
      externalSheetRef.current?.present();
    } else {
      externalSheetRef.current?.dismiss();
    }
  }, [showExternalModal]);

  const sessions = useMemo(
    () => schedule.flatMap((group) => group.sessions || []),
    [schedule]
  );
  const fallbackRoutineCards = useMemo(() => buildRoutineCardsFromSessions(sessions), [sessions]);
  const routineCards = useMemo(() => {
    if (routineDays.length > 0) {
      return buildRoutineCardsFromRoutineDays(routineDays, sessions);
    }
    return fallbackRoutineCards;
  }, [fallbackRoutineCards, routineDays, sessions]);
  const externalItems = useMemo(() => groupExternalSessions(externalSessions), [externalSessions]);
  const todayOption = useMemo(() => getTodayOption(), []);
  const isExternalSectionVisible = useMemo(() => {
    if (!supportsExternalSessions || externalSectionY <= 0 || externalSectionHeight <= 0) {
      return false;
    }

    const viewportTop = scrollY + 100;
    const viewportBottom = scrollY + viewportHeight - 120;
    const sectionTop = externalSectionY;
    const sectionBottom = externalSectionY + externalSectionHeight;

    return sectionTop < viewportBottom && sectionBottom > viewportTop;
  }, [externalSectionHeight, externalSectionY, scrollY, supportsExternalSessions, viewportHeight]);

  const shouldShowFloatingAdd = supportsExternalSessions && !isExternalSectionVisible;

  const selectedDayLabel =
    DAY_OPTIONS.find((item) => item.key === selectedDayKey)?.fullLabel ?? "Selected Day";

  const routinesForSelectedDay = useMemo(
    () => routineCards.filter((item) => item.dayKey === selectedDayKey),
    [routineCards, selectedDayKey]
  );

  const weeklySummary = useMemo(() => {
    const clinicDays = new Set(routineCards.map((item) => item.dayKey)).size;
    const now = Date.now();
    const nextSession = [...sessions]
      .filter((item) => item.source !== "external")
      .filter((item) => {
        const startAt = getSessionSortKey(item);
        if (Number.isNaN(startAt)) return false;
        return startAt >= now || String(item.status || "").toLowerCase() === "active";
      })
      .sort((left, right) => getSessionSortKey(left) - getSessionSortKey(right))[0];
    const totalWorkingMinutes = routineCards.reduce(
      (sum, item) => sum + getDurationMinutes(item.startTime, item.endTime),
      0
    );

    return {
      clinicDays,
      weeklySessions: routineCards.length,
      totalWorkingHoursLabel: formatDurationLabel(totalWorkingMinutes),
      nextLabel: nextSession
        ? `${formatLongDateLabel(nextSession.date)}, ${formatTimeRangeLabel(nextSession.startTime, nextSession.endTime)}`
        : null,
      nextSession: nextSession ?? null,
    };
  }, [routineCards, sessions]);

  const upcomingSessions = useMemo(
    () => {
      const now = Date.now();
      return [...sessions]
        .filter((item) => item.source !== "external")
        .filter((item) => {
          const startAt = getSessionSortKey(item);
          if (Number.isNaN(startAt)) return false;
          return startAt >= now || String(item.status || "").toLowerCase() === "active";
        })
        .sort((left, right) => getSessionSortKey(left) - getSessionSortKey(right))
        .slice(0, 3);
    },
    [sessions]
  );

  const closeExternalSheet = useCallback(() => {
    setShowExternalModal(false);
  }, []);

  const scrollToExternalSection = useCallback(() => {
    if (externalSectionY > 0) {
      scrollViewRef.current?.scrollTo({
        y: Math.max(externalSectionY - 92, 0),
        animated: true,
      });
      return;
    }

    resetExternalForm();
    setSaveSuccess(null);
    setShowExternalModal(true);
  }, [externalSectionY, resetExternalForm, setSaveSuccess]);

  const renderExternalSheetBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    []
  );

  const validateExternalForm = useCallback(() => {
    const location = externalForm.clinicName.trim();
    const startTime = externalForm.startTime.trim();
    const endTime = externalForm.endTime.trim();
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!location) {
      return "Add an external location or clinic name.";
    }
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return "Select a valid start and end time.";
    }
    if (startTime >= endTime) {
      return "End time must be later than the start time.";
    }
    return null;
  }, [externalForm]);

  const handleSaveExternalSession = useCallback(async () => {
    const validationError = validateExternalForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSavingExternal(true);
      setFormError(null);
      setSaveSuccess(null);
      const result = await createDoctorExternalSession({
        dayOfWeek: externalForm.dayOfWeek,
        startTime: externalForm.startTime.trim(),
        endTime: externalForm.endTime.trim(),
        clinicName: externalForm.clinicName.trim(),
        note: externalForm.note.trim(),
      });
      setExternalSessions(result.sessions);
      setSaveSuccess("External session added.");
      resetExternalForm();

      if (result.hasConflict && result.conflictReason) {
        setFormError(result.conflictReason);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save your external session right now.");
    } finally {
      setSavingExternal(false);
    }
  }, [externalForm, resetExternalForm, validateExternalForm]);

  const renderExternalSheetFooter = useCallback(
    (props: React.ComponentProps<typeof BottomSheetFooter>) => {
      const isDisabled = savingExternal || Boolean(validateExternalForm());
      return (
        <BottomSheetFooter {...props}>
          <View style={styles.sheetFooterContainer}>
            <TouchableOpacity style={styles.sheetCancelButton} onPress={closeExternalSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetSaveButton, isDisabled && styles.sheetSaveButtonDisabled]}
              disabled={isDisabled}
              onPress={() => void handleSaveExternalSession()}
            >
              <Text style={styles.sheetSaveText}>{savingExternal ? "Saving..." : "Save External Session"}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetFooter>
      );
    },
    [closeExternalSheet, handleSaveExternalSession, savingExternal, validateExternalForm]
  );

  const handleDeleteExternal = useCallback((item: ExternalRoutineCard) => {
    Alert.alert("Delete External Session", "Remove this outside commitment from your routine?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(item.id);
            const next = await deleteDoctorExternalSession(item.id);
            setExternalSessions(next);
          } catch (err) {
            Alert.alert(
              "Delete Failed",
              err instanceof Error ? err.message : "Could not delete this external session."
            );
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }, []);

  const openRoutineQueue = useCallback(
    (routine: WeeklyRoutineCard) => {
      const targetSession = routine.liveSession || routine.todaySession || routine.nextSession;
      if (!targetSession?.id) return;

      navigation.navigate("DoctorTabs", {
        screen: "DoctorQueueControl",
        params: {
          scheduleId: targetSession.id,
          sessionId: targetSession.id,
          clinicId: targetSession.clinicId,
          medicalCenterId: targetSession.clinicId,
          clinicName: targetSession.clinicName,
          date: targetSession.date,
          startTime: targetSession.startTime,
          endTime: targetSession.endTime,
        },
      });
    },
    [navigation]
  );

  const openRoutineDetails = useCallback(
    (routine: WeeklyRoutineCard) => {
      navigation.navigate("DoctorSchedulePreview", {
        shifts: [
          {
            id: routine.nextSession?.id || routine.id,
            clinicId: routine.clinicId,
            clinicName: routine.clinicName,
            date: routine.nextSession?.date || routine.dayLabel,
            location: routine.location,
            day: routine.dayLabel,
            start_time: routine.startTime,
            end_time: routine.endTime,
            max_patients: routine.maxPatients ?? null,
          },
        ],
      });
    },
    [navigation]
  );

  const renderRoutineCard = useCallback(
    ({ item }: { item: WeeklyRoutineCard }) => {
      const statusLabel = getRoutineStatusLabel(item);
      const statusTone = getRoutineStatusTone(item);
      const canOpenQueue = Boolean(item.liveSession || item.todaySession);

      return (
        <View style={[styles.routineCard, { width: Math.max(width - 56, 280) }]}>
          <View style={styles.routineTopRow}>
            <ClinicThumbnail imageUrl={item.imageUrl} clinicName={item.clinicName} />
            <View style={styles.routineCopy}>
              <Text style={styles.routineClinicName}>{item.clinicName}</Text>
              <Text style={styles.routineLocation}>{item.location || "Location will appear once available"}</Text>
            </View>
            <ScheduleStatusBadge label={statusLabel} tone={statusTone} />
          </View>

          <View style={styles.routineMetaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="calendar-outline" size={14} color={doctorColors.primary} />
              <Text style={styles.metaPillText}>{item.dayLabel}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={14} color={doctorColors.primary} />
              <Text style={styles.metaPillText}>{formatTimeRangeLabel(item.startTime, item.endTime)}</Text>
            </View>
            {typeof item.maxPatients === "number" && item.maxPatients > 0 ? (
              <View style={styles.metaPill}>
                <Ionicons name="people-outline" size={14} color={doctorColors.primary} />
                <Text style={styles.metaPillText}>Max {item.maxPatients}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.routineActionButton, canOpenQueue ? styles.primaryActionButton : styles.secondaryActionButton]}
            activeOpacity={0.9}
            onPress={() => (canOpenQueue ? openRoutineQueue(item) : openRoutineDetails(item))}
          >
            <Text style={[styles.routineActionText, canOpenQueue ? styles.primaryActionText : styles.secondaryActionText]}>
              {canOpenQueue ? "Open Queue" : "View Details"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [openRoutineDetails, openRoutineQueue, width]
  );

  const renderUpcomingCard = useCallback(
    ({ item }: { item: ScheduleSession }) => {
      const normalizedStatus = String(item.status || "").toLowerCase();
      const canOpenQueue = normalizedStatus === "active" || normalizedStatus === "live" || item.date === formatLocalDateKey(new Date());
      const tone: DoctorStatusTone =
        normalizedStatus === "active" || normalizedStatus === "live" ? "live" : "upcoming";

      return (
        <View style={[styles.upcomingCard, { width: Math.max(width - 56, 280) }]}>
          <View style={styles.upcomingTopRow}>
            <View style={styles.upcomingCopy}>
              <Text style={styles.upcomingDate}>{formatLongDateLabel(item.date)}</Text>
              <Text style={styles.upcomingClinic}>{item.clinicName}</Text>
              <Text style={styles.upcomingMeta}>{formatTimeRangeLabel(item.startTime, item.endTime)}</Text>
              {item.location ? <Text style={styles.upcomingLocation}>{item.location}</Text> : null}
            </View>
            <ScheduleStatusBadge label={canOpenQueue ? "Startable" : "Upcoming"} tone={tone} />
          </View>

          <TouchableOpacity
            style={[styles.inlineAction, !canOpenQueue && styles.inlineActionSecondary]}
            activeOpacity={0.88}
            onPress={() => {
              if (canOpenQueue) {
                navigation.navigate("DoctorTabs", {
                  screen: "DoctorQueueControl",
                  params: {
                    scheduleId: item.id,
                    sessionId: item.id,
                    clinicId: item.clinicId,
                    medicalCenterId: item.clinicId,
                    clinicName: item.clinicName,
                    date: item.date,
                    startTime: item.startTime,
                    endTime: item.endTime,
                  },
                });
                return;
              }

              navigation.navigate("DoctorSchedulePreview", {
                shifts: [
                  {
                    id: item.id,
                    clinicId: item.clinicId,
                    clinicName: item.clinicName,
                    date: item.date,
                    location: item.location,
                    day: item.date,
                    start_time: item.startTime,
                    end_time: item.endTime,
                    max_patients: item.maxPatients ?? null,
                  },
                ],
              });
            }}
          >
            <Text style={[styles.inlineActionText, !canOpenQueue && styles.inlineActionTextSecondary]}>
              {canOpenQueue ? "Open Queue" : "View Details"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [navigation, width]
  );

  const renderExternalCard = useCallback(
    ({ item }: { item: ExternalRoutineCard }) => {
      const palette = getDoctorStatusPalette(item.hasConflict ? "conflict" : "upcoming");
      return (
        <View style={styles.externalCard}>
          <View style={styles.externalTopRow}>
            <View style={styles.externalCopy}>
              <Text style={styles.externalClinicName}>{item.clinicName}</Text>
              <Text style={styles.externalMeta}>
                {item.dayLabel} • {formatTimeRangeLabel(item.startTime, item.endTime)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteExternalButton}
              activeOpacity={0.88}
              disabled={deletingId === item.id}
              onPress={() => handleDeleteExternal(item)}
            >
              <Ionicons name="trash-outline" size={16} color={doctorColors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.externalBadge, { backgroundColor: palette.backgroundColor }]}>
            <Text style={[styles.externalBadgeText, { color: palette.textColor }]}>
              {item.hasConflict ? "Conflict" : "Weekly"}
            </Text>
          </View>

          {item.note ? <Text style={styles.externalNote}>{item.note}</Text> : null}
          {item.hasConflict ? (
            <Text style={styles.externalConflictText}>
              {item.conflictReason || "This overlaps with another clinic session in your routine."}
            </Text>
          ) : null}
        </View>
      );
    },
    [deletingId, handleDeleteExternal]
  );

  if (isLoadingSchedule) {
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={doctorColors.primary} />
          <Text style={styles.centerStateText}>Loading your weekly sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.content}>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Weekly Sessions</Text>

            {routineCards.length > 0 ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{weeklySummary.clinicDays}</Text>
                  <Text style={styles.summaryLabel}>clinic days</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{weeklySummary.weeklySessions}</Text>
                  <Text style={styles.summaryLabel}>weekly sessions</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{weeklySummary.totalWorkingHoursLabel}</Text>
                  <Text style={styles.summaryLabel}>working hours</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No weekly sessions assigned yet</Text>
                <Text style={styles.emptyCardText}>
                  {routineRequestFailed
                    ? "We could not load your assigned weekly sessions right now."
                    : "Clinic sessions will appear here once they are scheduled for you."}
                </Text>
              </View>
            )}

            {weeklySummary.nextSession ? (
              <View style={styles.nextAppointmentCard}>
                <Text style={styles.nextAppointmentLabel}>Next Session</Text>
                <Text style={styles.nextAppointmentClinic}>
                  {weeklySummary.nextSession.clinicName}
                </Text>
                <Text style={styles.nextAppointmentMeta}>
                  {weeklySummary.nextLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.stickyDaysSection}>
          <FlatList
            horizontal
            data={DAY_OPTIONS}
            keyExtractor={(item) => String(item.key)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}
            renderItem={({ item }) => (
              <DayChip
                label={item.shortLabel}
                isSelected={selectedDayKey === item.key}
                isToday={item.key === todayOption.key}
                onPress={() => setSelectedDayKey(item.key)}
              />
            )}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.sectionBlock}>
            {routineCards.length === 0 ? null : routinesForSelectedDay.length === 0 ? (
              <View style={styles.noSessionBannerCard}>
                <ImageBackground
                  source={NO_SESSIONS_DAY_BANNER}
                  style={styles.noSessionBannerImage}
                  imageStyle={styles.noSessionBannerImageRadius}
                  resizeMode="cover"
                >
                  <View style={styles.noSessionTextOverlay}>
                    <Text style={styles.noSessionBannerTitle}>No sessions on {selectedDayLabel}</Text>
                    <Text style={styles.noSessionBannerText}>
                      No sessions are assigned for {selectedDayLabel}.
                    </Text>
                  </View>
                </ImageBackground>
              </View>
            ) : (
              <FlatList
                horizontal
                data={routinesForSelectedDay}
                keyExtractor={(item) => item.id}
                renderItem={renderRoutineCard}
                scrollEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles.horizontalCardsRow}
                ItemSeparatorComponent={() => <View style={styles.horizontalCardGap} />}
              />
            )}
          </View>

          <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Upcoming Sessions</Text>

              {upcomingSessions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardTitle}>No upcoming sessions yet</Text>
                  <Text style={styles.emptyCardText}>
                    Upcoming clinic sessions will appear here once they are generated.
                  </Text>
                </View>
              ) : (
                <FlatList
                  horizontal
                  data={upcomingSessions}
                  keyExtractor={(item) => item.id}
                  renderItem={renderUpcomingCard}
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  contentContainerStyle={styles.horizontalCardsRow}
                  ItemSeparatorComponent={() => <View style={styles.horizontalCardGap} />}
                />
              )}
          </View>

          <View
            style={styles.sectionBlock}
            onLayout={(event) => {
              setExternalSectionY(event.nativeEvent.layout.y);
              setExternalSectionHeight(event.nativeEvent.layout.height);
            }}
          >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionTitle}>External Commitments</Text>
                </View>
                {supportsExternalSessions ? (
                  <TouchableOpacity
                    style={styles.addExternalButton}
                    activeOpacity={0.88}
                    onPress={() => {
                      resetExternalForm();
                      setSaveSuccess(null);
                      setShowExternalModal(true);
                    }}
                  >
                    <Ionicons name="add" size={16} color={doctorColors.surface} />
                    <Text style={styles.addExternalButtonText}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {!supportsExternalSessions ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardTitle}>External commitments are unavailable right now</Text>
                  <Text style={styles.emptyCardText}>
                    Try again shortly. Your clinic routines will continue to work normally.
                  </Text>
                </View>
              ) : externalItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardTitle}>No external commitments added.</Text>
                  <Text style={styles.emptyCardText}>
                    Add outside clinic hours to avoid booking conflicts.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={externalItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderExternalCard}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.cardGap} />}
                />
              )}
          </View>
        </View>
      </ScrollView>

      {shouldShowFloatingAdd ? (
        <TouchableOpacity
          style={[styles.addExternalButton, styles.floatingAddButton]}
          activeOpacity={0.9}
          onPress={scrollToExternalSection}
        >
          <Ionicons name="add" size={18} color={doctorColors.surface} />
          <Text style={styles.addExternalButtonText}>Add</Text>
        </TouchableOpacity>
      ) : null}

      {supportsExternalSessions ? (
        <>
          <BottomSheetModal
            ref={externalSheetRef}
            snapPoints={externalSheetSnapPoints}
            backdropComponent={renderExternalSheetBackdrop}
            footerComponent={renderExternalSheetFooter}
            handleIndicatorStyle={styles.sheetHandle}
            backgroundStyle={styles.sheetBackground}
            onDismiss={() => {
              setShowExternalModal(false);
              setSavingExternal(false);
              setTimePickerTarget(null);
            }}
          >
            <BottomSheetView style={styles.sheetContentContainer}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderCopy}>
                  <Text style={styles.sheetTitle}>Add External Commitment</Text>
                  <Text style={styles.sheetSubtitle}>
                    Add sessions outside your medical-center routine.
                  </Text>
                </View>
                <TouchableOpacity onPress={closeExternalSheet}>
                  <Ionicons name="close" size={24} color={doctorColors.textPrimary} />
                </TouchableOpacity>
              </View>

              {saveSuccess ? (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={doctorColors.successText} />
                  <Text style={styles.successBannerText}>{saveSuccess}</Text>
                </View>
              ) : null}

              <View style={styles.sheetHelperCard}>
                <Text style={styles.sheetHelperTitle}>Avoid conflicts</Text>
                <Text style={styles.sheetHelperText}>
                  External commitments block time when you are working outside your assigned medical centers.
                </Text>
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>Day</Text>
                <View style={styles.sheetDaysRow}>
                  {DAY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.sheetDayPill,
                        externalForm.dayOfWeek === option.key && styles.sheetDayPillSelected,
                      ]}
                      onPress={() => setExternalForm((prev) => ({ ...prev, dayOfWeek: option.key }))}
                    >
                      <Text
                        style={[
                          styles.sheetDayPillText,
                          externalForm.dayOfWeek === option.key && styles.sheetDayPillTextSelected,
                        ]}
                      >
                        {option.shortLabel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>Time Range</Text>
                <View style={styles.sheetTimeRow}>
                  <TimeInput
                    label="Start"
                    value={externalForm.startTime ? formatClock(externalForm.startTime) : "Select time"}
                    onPress={() => setTimePickerTarget("startTime")}
                  />
                  <TimeInput
                    label="End"
                    value={externalForm.endTime ? formatClock(externalForm.endTime) : "Select time"}
                    onPress={() => setTimePickerTarget("endTime")}
                  />
                </View>
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>External Location</Text>
                <TextInput
                  value={externalForm.clinicName}
                  onChangeText={(value) => {
                    setFormError(null);
                    setExternalForm((prev) => ({ ...prev, clinicName: value }));
                  }}
                  placeholder="Enter external clinic or location"
                  style={styles.sheetTextInput}
                  placeholderTextColor={doctorColors.textMuted}
                />
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionLabel}>Notes</Text>
                <TextInput
                  value={externalForm.note}
                  onChangeText={(value) => {
                    setFormError(null);
                    setExternalForm((prev) => ({ ...prev, note: value }));
                  }}
                  placeholder="Optional details for this external session"
                  style={[styles.sheetTextInput, styles.sheetMultilineInput]}
                  placeholderTextColor={doctorColors.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {formError ? (
                <View style={styles.formErrorBox}>
                  <Ionicons name="warning-outline" size={16} color={doctorColors.warningText} />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}
            </BottomSheetView>
          </BottomSheetModal>

          <DateTimePickerModal
            isVisible={timePickerTarget !== null}
            mode="time"
            date={parseTimeToDate(
              timePickerTarget === "startTime" ? externalForm.startTime : externalForm.endTime
            )}
            onConfirm={(date) => {
              const nextValue = formatPickerTime(date);
              setFormError(null);
              setExternalForm((prev) => ({
                ...prev,
                [timePickerTarget || "startTime"]: nextValue,
              }));
              setTimePickerTarget(null);
            }}
            onCancel={() => setTimePickerTarget(null)}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: doctorColors.background,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: 4,
    gap: 18,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: doctorColors.textSecondary,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: doctorColors.card,
    borderRadius: doctorRadius.xl,
    borderWidth: 1,
    borderColor: doctorColors.border,
    padding: doctorSpacing.md,
    ...doctorShadows.card,
  },
  nextAppointmentCard: {
    marginTop: 12,
    backgroundColor: doctorColors.card,
    borderRadius: doctorRadius.xl,
    borderWidth: 1,
    borderColor: doctorColors.border,
    padding: 16,
    ...doctorShadows.card,
  },
  nextAppointmentLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    color: doctorColors.primary,
  },
  nextAppointmentClinic: {
    marginTop: 8,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  nextAppointmentMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: doctorColors.border,
    marginHorizontal: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: doctorColors.deep,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: doctorColors.textSecondary,
  },
  stickyDaysSection: {
    backgroundColor: doctorColors.background,
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 0,
    zIndex: 2,
  },
  daysRow: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    gap: 10,
  },
  dayChip: {
    minWidth: 68,
    borderRadius: doctorRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: doctorColors.surface,
    borderWidth: 1,
    borderColor: doctorColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipSelected: {
    backgroundColor: doctorColors.primary,
    borderColor: doctorColors.primary,
  },
  dayChipToday: {
    borderColor: doctorColors.primary,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  dayChipTextSelected: {
    color: doctorColors.surface,
  },
  dayChipTodayText: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: doctorColors.primary,
  },
  dayChipTodayTextSelected: {
    color: "rgba(255,255,255,0.82)",
  },
  emptyCard: {
    backgroundColor: doctorColors.card,
    borderRadius: doctorRadius.xl,
    borderWidth: 1,
    borderColor: doctorColors.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  noSessionBannerCard: {
    width: "100%",
    padding: 0,
    marginHorizontal: 0,
    overflow: "hidden",
    borderRadius: doctorRadius.xl,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  noSessionBannerImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    justifyContent: "center",
  },
  noSessionBannerImageRadius: {
    borderRadius: doctorRadius.xl,
  },
  noSessionTextOverlay: {
    width: "50%",
    minHeight: "100%",
    justifyContent: "center",
    paddingLeft: 24,
    paddingRight: 12,
    paddingVertical: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  noSessionBannerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  noSessionBannerText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  emptyCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  emptyCardText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  cardGap: {
    height: 12,
  },
  horizontalCardsRow: {
    paddingRight: 24,
  },
  horizontalCardGap: {
    width: 12,
  },
  floatingAddButton: {
    position: "absolute",
    right: 20,
    bottom: 102,
    zIndex: 12,
    ...doctorShadows.card,
  },
  routineCard: {
    backgroundColor: doctorColors.card,
    borderRadius: doctorRadius.xl,
    borderWidth: 1,
    borderColor: doctorColors.border,
    padding: 16,
    ...doctorShadows.card,
  },
  routineTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clinicImage: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  clinicImageFallback: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EAF7F7",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  clinicImageFallbackText: {
    fontSize: 11,
    fontWeight: "700",
    color: doctorColors.primary,
  },
  routineCopy: {
    flex: 1,
    minWidth: 0,
  },
  routineClinicName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  routineLocation: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: doctorColors.textSecondary,
  },
  routineMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: doctorRadius.pill,
    backgroundColor: "#F2FBFB",
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: doctorColors.primary,
  },
  routineActionButton: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionButton: {
    backgroundColor: doctorColors.primary,
  },
  secondaryActionButton: {
    backgroundColor: "#EAF6F5",
    borderWidth: 1,
    borderColor: doctorColors.border,
  },
  routineActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  primaryActionText: {
    color: doctorColors.surface,
  },
  secondaryActionText: {
    color: doctorColors.primary,
  },
  upcomingCard: {
    backgroundColor: doctorColors.card,
    borderRadius: doctorRadius.xl,
    borderWidth: 1,
    borderColor: doctorColors.border,
    padding: 16,
    ...doctorShadows.card,
  },
  upcomingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  upcomingCopy: {
    flex: 1,
  },
  upcomingDate: {
    fontSize: 13,
    fontWeight: "700",
    color: doctorColors.primary,
  },
  upcomingClinic: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  upcomingMeta: {
    marginTop: 4,
    fontSize: 14,
    color: doctorColors.textSecondary,
  },
  upcomingLocation: {
    marginTop: 4,
    fontSize: 13,
    color: doctorColors.textSecondary,
  },
  inlineAction: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: doctorColors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineActionSecondary: {
    backgroundColor: "#EAF6F5",
    borderWidth: 1,
    borderColor: doctorColors.border,
  },
  inlineActionText: {
    color: doctorColors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  inlineActionTextSecondary: {
    color: doctorColors.primary,
  },
  externalCard: {
    backgroundColor: "#FCFFFF",
    borderRadius: doctorRadius.xl,
    borderWidth: 1.5,
    borderColor: "#BDDCDD",
    borderStyle: "dashed",
    padding: 16,
  },
  externalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  externalCopy: {
    flex: 1,
  },
  externalClinicName: {
    fontSize: 16,
    fontWeight: "800",
    color: doctorColors.textPrimary,
  },
  externalMeta: {
    marginTop: 4,
    fontSize: 13,
    color: doctorColors.textSecondary,
  },
  deleteExternalButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EFF8F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: doctorColors.border,
  },
  externalBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    borderRadius: doctorRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  externalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  externalNote: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: doctorColors.textSecondary,
  },
  externalConflictText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: doctorColors.warningText,
  },
  addExternalButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: doctorColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addExternalButtonText: {
    color: doctorColors.surface,
    fontSize: 13,
    fontWeight: "700",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerStateText: {
    fontSize: 14,
    color: doctorColors.textSecondary,
  },
  centerEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  errorIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: doctorColors.warningBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  emptyDescription: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  retryButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: doctorColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    color: doctorColors.surface,
    fontWeight: "700",
    fontSize: 14,
  },
  sheetHandle: {
    backgroundColor: "#B7CFD1",
  },
  sheetBackground: {
    backgroundColor: doctorColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sheetHeaderCopy: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: doctorColors.textSecondary,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: doctorColors.successBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successBannerText: {
    flex: 1,
    color: doctorColors.successText,
    fontSize: 13,
    fontWeight: "700",
  },
  sheetHelperCard: {
    borderRadius: 20,
    backgroundColor: "#ECF8F7",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetHelperTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: doctorColors.deep,
  },
  sheetHelperText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: doctorColors.textSecondary,
  },
  sheetSection: {
    gap: 10,
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  sheetDaysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetDayPill: {
    minWidth: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: doctorColors.border,
    backgroundColor: "#F7FBFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetDayPillSelected: {
    backgroundColor: doctorColors.primary,
    borderColor: doctorColors.primary,
  },
  sheetDayPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  sheetDayPillTextSelected: {
    color: doctorColors.surface,
  },
  sheetTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  sheetTimeInputContainer: {
    flex: 1,
    gap: 8,
  },
  sheetInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: doctorColors.textSecondary,
  },
  sheetInputBox: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: doctorColors.border,
    backgroundColor: doctorColors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  sheetInputText: {
    fontSize: 14,
    fontWeight: "600",
    color: doctorColors.textPrimary,
  },
  sheetTextInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: doctorColors.border,
    backgroundColor: doctorColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: doctorColors.textPrimary,
  },
  sheetMultilineInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 16,
    backgroundColor: doctorColors.warningBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: doctorColors.warningText,
  },
  sheetFooterContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: doctorColors.surface,
  },
  sheetCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: doctorColors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FBFB",
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: doctorColors.textPrimary,
  },
  sheetSaveButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: doctorColors.primary,
  },
  sheetSaveButtonDisabled: {
    opacity: 0.45,
  },
  sheetSaveText: {
    fontSize: 14,
    fontWeight: "800",
    color: doctorColors.surface,
  },
});
