import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Toast from "react-native-toast-message";
import type { ReceptionistStackParamList } from "../../types/navigation";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import { AuthContext } from "../../utils/AuthContext";
import { getFriendlyError } from "../../utils/friendlyErrors";
import {
  createReceptionManualSession,
  fetchReceptionSessionDoctors,
  fetchReceptionSessionRoutine,
  saveReceptionSessionRoutine,
} from "../../services/receptionistSessionService";

type SessionDoctor = {
  doctorId: number;
  doctorUserId: number;
  doctorName: string;
  specialization?: string | null;
  availabilitySummary?: string[];
  todaySessionCount?: number;
  upcomingSessionCount?: number;
};

type SessionType = "weekly" | "one_time";

type AddSessionForm = {
  sessionType: SessionType;
  dayOfWeek: number | null;
  date: Date;
  startTime: Date;
  endTime: Date;
  roomNumber: string;
  maxPatients: string;
  notes: string;
};

type TimePickerTarget = "start" | "end" | null;

type RoutineApiDay = {
  day: string;
  dayKey: number;
  routines: Array<{
    startTime: string;
    endTime: string;
  }>;
};

type SessionCategoryKey = "all" | "today" | "upcoming" | "idle";

const THEME = {
  navy: "#03045E",
  primary: "#0077B6",
  aqua: "#00B4D8",
  lightAqua: "#CAF0F8",
  background: "#F8FCFD",
  surface: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  shadow: "rgba(3, 4, 94, 0.10)",
};

const SESSION_CATEGORIES: Array<{ key: SessionCategoryKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "idle", label: "No Sessions" },
];

const WEEK_DAYS = [
  { key: 1, label: "Monday", short: "Mon" },
  { key: 2, label: "Tuesday", short: "Tue" },
  { key: 3, label: "Wednesday", short: "Wed" },
  { key: 4, label: "Thursday", short: "Thu" },
  { key: 5, label: "Friday", short: "Fri" },
  { key: 6, label: "Saturday", short: "Sat" },
  { key: 0, label: "Sunday", short: "Sun" },
];

const DEFAULT_SLOT_DURATION = 15; // TODO: Confirm default slot duration with backend.

const createInitialForm = (): AddSessionForm => ({
  sessionType: "one_time",
  dayOfWeek: null,
  date: new Date(),
  startTime: new Date(new Date().setHours(9, 0, 0, 0)),
  endTime: new Date(new Date().setHours(10, 0, 0, 0)),
  roomNumber: "",
  maxPatients: "4",
  notes: "",
});

const formatLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatReadableDate = (value: Date) =>
  value.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

const formatTimeValue = (value: Date) =>
  value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

const buildRollingDates = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
};

const getTimeMinutes = (value: Date) => value.getHours() * 60 + value.getMinutes();

const getAvailableSlotCount = (startTime: Date, endTime: Date, slotDuration = DEFAULT_SLOT_DURATION) => {
  const start = getTimeMinutes(startTime);
  const end = getTimeMinutes(endTime);
  if (end <= start || slotDuration <= 0) return 0;
  return Math.floor((end - start) / slotDuration);
};

const isPastDate = (value: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

const getFriendlyCreateError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("max patients") || normalized.includes("generated slot")) {
    return "Max patients is higher than the available appointment slots for this time range.";
  }
  if (normalized.includes("doctor") && (normalized.includes("overlap") || normalized.includes("already"))) {
    return "This doctor already has a session during this time.";
  }
  if (normalized.includes("room") && (normalized.includes("booked") || normalized.includes("overlap"))) {
    return "This room is already booked during this time.";
  }
  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "Could not connect to the server. Please try again.";
  }
  return message || "Could not create the session. Please try again.";
};

export default function ReceptionistSessions() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ReceptionistStackParamList>>();
  const { user, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const hasAccess = useReceptionPermissionGuard(
    "schedule",
    "schedule_management",
    true
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<SessionDoctor[]>([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<SessionCategoryKey>("all");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedDoctorUserId, setSelectedDoctorUserId] = useState<number | null>(null);
  const [form, setForm] = useState<AddSessionForm>(() => createInitialForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget>(null);
  const rollingDates = useMemo(() => buildRollingDates(), []);

  const loadDoctors = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);

    try {
      const payload = (await fetchReceptionSessionDoctors()) as SessionDoctor[];
      setDoctors(Array.isArray(payload) ? payload : []);
      setError(null);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "Could not load clinic doctors."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDoctors("initial");
    }, [loadDoctors])
  );

  const summary = useMemo(() => {
    const today = doctors.reduce((sum, doctor) => sum + (doctor.todaySessionCount || 0), 0);
    const upcoming = doctors.reduce(
      (sum, doctor) => sum + Math.max((doctor.upcomingSessionCount || 0) - (doctor.todaySessionCount || 0), 0),
      0
    );
    return {
      doctors: doctors.length,
      today,
      upcoming,
    };
  }, [doctors]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.doctorUserId === selectedDoctorUserId) || null,
    [doctors, selectedDoctorUserId]
  );

  const filteredDoctors = useMemo(() => {
    const query = doctorSearch.trim().toLowerCase();
    if (!query) return doctors;
    return doctors.filter((doctor) =>
      [doctor.doctorName, doctor.specialization || ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [doctorSearch, doctors]);

  const categoryCounts = useMemo(() => {
    const counts: Record<SessionCategoryKey, number> = {
      all: doctors.length,
      today: 0,
      upcoming: 0,
      idle: 0,
    };

    doctors.forEach((doctor) => {
      const todayCount = doctor.todaySessionCount || 0;
      const upcomingCount = doctor.upcomingSessionCount || 0;
      if (todayCount > 0) counts.today += 1;
      if (upcomingCount > todayCount) counts.upcoming += 1;
      if (todayCount === 0 && upcomingCount === 0) counts.idle += 1;
    });

    return counts;
  }, [doctors]);

  const receptionistName = user?.name?.trim() || "Receptionist";

  const handleLogout = useCallback(() => {
    Alert.alert("Sign out", "Do you want to sign out of the receptionist panel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  }, [logout]);

  const visibleSessionDoctors = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const todayCount = doctor.todaySessionCount || 0;
      const upcomingCount = doctor.upcomingSessionCount || 0;
      const matchesCategory =
        activeCategory === "all" ||
        (activeCategory === "today" && todayCount > 0) ||
        (activeCategory === "upcoming" && upcomingCount > todayCount) ||
        (activeCategory === "idle" && todayCount === 0 && upcomingCount === 0);

      const matchesSearch =
        !query ||
        [doctor.doctorName, doctor.specialization || ""]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, doctors, sessionSearch]);

  const activeCategoryLabel = SESSION_CATEGORIES.find((item) => item.key === activeCategory)?.label || "All";

  const availableSlots = useMemo(
    () => getAvailableSlotCount(form.startTime, form.endTime),
    [form.endTime, form.startTime]
  );

  const resetAddSessionState = useCallback(() => {
    setDoctorSearch("");
    setSelectedDoctorUserId(null);
    setForm(createInitialForm());
    setFormErrors({});
    setSubmitError(null);
    setSubmitting(false);
  }, []);

  const closeAddModal = useCallback(() => {
    setAddModalVisible(false);
    resetAddSessionState();
  }, [resetAddSessionState]);

  const openAddModal = useCallback(() => {
    setAddModalVisible(true);
    setSubmitError(null);
    setFormErrors({});
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    const maxPatients = Number(form.maxPatients);
    const startMinutes = getTimeMinutes(form.startTime);
    const endMinutes = getTimeMinutes(form.endTime);

    if (!selectedDoctor) nextErrors.doctor = "Select a doctor first.";
    if (!form.sessionType) nextErrors.sessionType = "Select a session type.";
    if (form.sessionType === "weekly" && form.dayOfWeek === null) {
      nextErrors.dayOfWeek = "Select a weekly day.";
    }
    if (form.sessionType === "one_time" && isPastDate(form.date)) {
      nextErrors.date = "Session date cannot be in the past.";
    }
    if (endMinutes <= startMinutes) {
      nextErrors.endTime = "End time must be later than start time.";
    }
    if (!form.roomNumber.trim()) nextErrors.roomNumber = "Room number is required.";
    if (!form.maxPatients.trim() || !Number.isFinite(maxPatients) || maxPatients <= 0) {
      nextErrors.maxPatients = "Max patients must be greater than 0.";
    } else if (availableSlots > 0 && maxPatients > availableSlots) {
      nextErrors.maxPatients = `This time range creates only ${availableSlots} appointment slots. Max patients cannot exceed ${availableSlots}.`;
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [availableSlots, form, selectedDoctor]);

  const handleCreateSession = useCallback(async () => {
    if (submitting || !validateForm() || !selectedDoctor) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (form.sessionType === "one_time") {
        // TODO: Send room number and notes when backend manual-session API supports them.
        await createReceptionManualSession(selectedDoctor.doctorUserId, {
          date: formatLocalDateKey(form.date),
          start_time: formatTimeValue(form.startTime),
          end_time: formatTimeValue(form.endTime),
          slot_duration: DEFAULT_SLOT_DURATION,
          max_patients: Number(form.maxPatients),
        });
      } else {
        const routinePayload = (await fetchReceptionSessionRoutine(
          selectedDoctor.doctorUserId
        )) as RoutineApiDay[];
        const nextRoutine = WEEK_DAYS.map((day) => {
          const existing = Array.isArray(routinePayload)
            ? routinePayload.find((item) => item.dayKey === day.key)
            : null;
          if (day.key === form.dayOfWeek) {
            return {
              day: day.label,
              dayOfWeek: day.key,
              shifts: [{ start: formatTimeValue(form.startTime), end: formatTimeValue(form.endTime) }],
            };
          }
          return {
            day: day.label,
            dayOfWeek: day.key,
            shifts:
              existing?.routines.map((shift) => ({
                start: String(shift.startTime).slice(0, 5),
                end: String(shift.endTime).slice(0, 5),
              })) ?? [],
          };
        }).filter((day) => day.shifts.length > 0);

        // TODO: Send room number and notes when backend recurring schedule API supports them.
        await saveReceptionSessionRoutine(selectedDoctor.doctorUserId, {
          weeks: 12,
          routine: nextRoutine,
          slotDuration: DEFAULT_SLOT_DURATION,
          maxPatients: Number(form.maxPatients),
        });
      }

      await loadDoctors("refresh");
      closeAddModal();
      Toast.show({ type: "success", text1: "Doctor session created successfully." });
    } catch (createError) {
      setSubmitError(getFriendlyCreateError(createError));
    } finally {
      setSubmitting(false);
    }
  }, [closeAddModal, form, loadDoctors, selectedDoctor, submitting, validateForm]);

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Doctor session management has not been assigned to your account." />
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#061A2E" />
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <View style={styles.topBrandRow}>
              <Ionicons name="medical" size={18} color="#38BDF8" />
              <Text style={styles.topHeaderBrandText}>HealthLink</Text>
            </View>
            <Text style={styles.topHeaderTitle}>Doctor Sessions</Text>
          </View>

          <View style={styles.topHeaderRight}>
            <TouchableOpacity style={styles.topIconButton} onPress={() => void loadDoctors("refresh")}>
              <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topAvatarPlaceholder} onPress={handleLogout}>
              <Text style={styles.topAvatarText}>
                {receptionistName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((item) => item[0]?.toUpperCase())
                  .join("") || "RC"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadDoctors("refresh")} />
        }
      >
        <View style={styles.stickyShell}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#475569" />
            <TextInput
              style={styles.sessionSearchInput}
              value={sessionSearch}
              onChangeText={setSessionSearch}
              placeholder="Search doctors or specialties"
              placeholderTextColor="#64748B"
              returnKeyType="search"
            />
            {sessionSearch.trim() ? (
              <TouchableOpacity onPress={() => setSessionSearch("")} style={styles.searchClearButton}>
                <Ionicons name="close" size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabs}
          >
            {SESSION_CATEGORIES.map((category) => {
              const selected = activeCategory === category.key;
              return (
                <TouchableOpacity
                  key={category.key}
                  style={styles.categoryTab}
                  onPress={() => setActiveCategory(category.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.categoryTabText, selected && styles.categoryTabTextActive]}>
                    {category.label}
                  </Text>
                  <Text style={[styles.categoryCount, selected && styles.categoryCountActive]}>
                    {categoryCounts[category.key]}
                  </Text>
                  <View style={[styles.categoryUnderline, selected && styles.categoryUnderlineActive]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : error ? (
            <StateCard
              title="Sessions unavailable"
              message={error}
              actionLabel="Try Again"
              onPress={() => void loadDoctors("refresh")}
              danger
            />
          ) : doctors.length === 0 ? (
            <StateCard
              title="No doctors ready for session management"
              message="Doctors assigned to this clinic will appear here once they are active and available for scheduling."
            />
          ) : (
            <View style={styles.workspace}>
              <View style={styles.workspaceHeader}>
                <View>
                  <Text style={styles.workspaceTitle}>{activeCategoryLabel}</Text>
                  <Text style={styles.workspaceSubtitle}>
                    {visibleSessionDoctors.length} doctor{visibleSessionDoctors.length === 1 ? "" : "s"} in this view
                  </Text>
                </View>
              </View>

              {visibleSessionDoctors.length === 0 ? (
                <StateCard
                  title="No matching sessions"
                  message="Try a different category or search term."
                />
              ) : (
                <View style={styles.doctorGrid}>
                  {visibleSessionDoctors.map((doctor) => {
                    const todayCount = doctor.todaySessionCount || 0;
                    const upcomingCount = doctor.upcomingSessionCount || 0;
                    return (
                      <TouchableOpacity
                        key={`${doctor.doctorUserId}-${doctor.doctorId}`}
                        style={styles.sessionTile}
                        activeOpacity={0.9}
                        onPress={() =>
                          navigation.navigate("ReceptionistDoctorSessionOverview", {
                            doctorId: doctor.doctorId,
                            doctorUserId: doctor.doctorUserId,
                            doctorName: doctor.doctorName,
                            specialization: doctor.specialization || null,
                          })
                        }
                      >
                        <View style={styles.tileAccent} />
                        <View style={styles.avatar}>
                          <Ionicons name="medkit-outline" size={20} color={THEME.primary} />
                        </View>
                        <View style={styles.tileCopy}>
                          <Text numberOfLines={1} style={styles.cardTitle}>
                            {doctor.doctorName}
                          </Text>
                          <Text numberOfLines={1} style={styles.cardSubtitle}>
                            {doctor.specialization || "General practice"}
                          </Text>
                          <View style={styles.metricsRow}>
                            <MetricPill icon="today-outline" label={`${todayCount} today`} />
                            <MetricPill icon="calendar-outline" label={`${upcomingCount} upcoming`} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.9}
        accessibilityLabel="Add doctor session"
        accessibilityRole="button"
        style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 14) + 118 }]}
        onPress={openAddModal}
      >
        <LinearGradient
          colors={[THEME.aqua, THEME.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeAddModal} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetEyebrow}>Reception schedule</Text>
                <Text style={styles.sheetTitle}>Add Session</Text>
                <Text style={styles.sheetSubtitle}>Select a doctor and create a clinic session.</Text>
              </View>
              <TouchableOpacity style={styles.sheetClose} onPress={closeAddModal}>
                <Ionicons name="close" size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionNumber}>01</Text>
                <Text style={styles.formSectionTitle}>Select Doctor</Text>
              </View>
              <TextInput
                style={styles.searchInput}
                value={doctorSearch}
                onChangeText={setDoctorSearch}
                placeholder="Search doctor"
                placeholderTextColor="#94A3B8"
              />
              {formErrors.doctor ? <Text style={styles.fieldError}>{formErrors.doctor}</Text> : null}

              <View style={styles.doctorSelectList}>
                {filteredDoctors.map((doctor) => {
                  const selected = doctor.doctorUserId === selectedDoctorUserId;
                  return (
                    <TouchableOpacity
                      key={`${doctor.doctorUserId}-${doctor.doctorId}`}
                      style={[styles.doctorOption, selected && styles.doctorOptionSelected]}
                      onPress={() => setSelectedDoctorUserId(doctor.doctorUserId)}
                    >
                      <View style={[styles.doctorOptionAvatar, selected && styles.doctorOptionAvatarSelected]}>
                        <Ionicons
                          name="person-outline"
                          size={17}
                          color={selected ? "#FFFFFF" : THEME.primary}
                        />
                      </View>
                      <View style={styles.cardCopy}>
                        <Text style={styles.doctorOptionName}>{doctor.doctorName}</Text>
                        <Text style={styles.doctorOptionMeta}>
                          {doctor.specialization || "General practice"}
                        </Text>
                      </View>
                      <View style={[styles.selectIndicator, selected && styles.selectIndicatorActive]}>
                        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredDoctors.length === 0 ? (
                <Text style={styles.emptySearchText}>No matching doctors found.</Text>
              ) : null}

              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionNumber}>02</Text>
                <Text style={styles.formSectionTitle}>Add Session</Text>
              </View>
              <View style={styles.typeRow}>
                {[
                  { key: "weekly" as const, label: "Weekly recurring" },
                  { key: "one_time" as const, label: "One-time extra session" },
                ].map((option) => {
                  const selected = form.sessionType === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.typeChip, selected && styles.typeChipSelected]}
                      onPress={() => setForm((current) => ({ ...current, sessionType: option.key }))}
                    >
                      <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {form.sessionType === "weekly" ? (
                <View>
                  <Text style={styles.inputLabel}>Day of week</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleDateList}>
                    {WEEK_DAYS.map((day) => {
                      const selected = form.dayOfWeek === day.key;
                      return (
                        <TouchableOpacity
                          key={day.key}
                          style={[styles.scheduleDateCard, selected && styles.scheduleDateCardActive]}
                          onPress={() => setForm((current) => ({ ...current, dayOfWeek: day.key }))}
                        >
                          <Text style={[styles.scheduleDateTop, selected && styles.scheduleDateTextActive]}>Week</Text>
                          <Text style={[styles.scheduleDateMain, selected && styles.scheduleDateTextActive]}>
                            {day.short}
                          </Text>
                          <Text style={[styles.scheduleDateBottom, selected && styles.scheduleDateTextActive]}>
                            {day.label.slice(0, 1)}
                          </Text>
                          {selected ? <View style={styles.scheduleActiveDot} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {formErrors.dayOfWeek ? <Text style={styles.fieldError}>{formErrors.dayOfWeek}</Text> : null}
                </View>
              ) : (
                <View style={styles.fieldBlock}>
                  <Text style={styles.inputLabel}>Session date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleDateList}>
                    {rollingDates.map((date) => {
                      const selected = formatLocalDateKey(date) === formatLocalDateKey(form.date);
                      return (
                        <TouchableOpacity
                          key={formatLocalDateKey(date)}
                          style={[styles.scheduleDateCard, selected && styles.scheduleDateCardActive]}
                          onPress={() => setForm((current) => ({ ...current, date }))}
                        >
                          <Text style={[styles.scheduleDateTop, selected && styles.scheduleDateTextActive]}>
                            {date.toLocaleDateString("en-US", { month: "short" })}
                          </Text>
                          <Text style={[styles.scheduleDateMain, selected && styles.scheduleDateTextActive]}>
                            {date.getDate()}
                          </Text>
                          <Text style={[styles.scheduleDateBottom, selected && styles.scheduleDateTextActive]}>
                            {date.toLocaleDateString("en-US", { weekday: "short" })}
                          </Text>
                          {selected ? <View style={styles.scheduleActiveDot} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity style={styles.customDateCard} onPress={() => setDatePickerVisible(true)}>
                      <Ionicons name="calendar-outline" size={18} color={THEME.primary} />
                      <Text style={styles.customDateText}>More</Text>
                    </TouchableOpacity>
                  </ScrollView>
                  <Text style={styles.dateSelectedText}>Selected: {formatReadableDate(form.date)}</Text>
                  {formErrors.date ? <Text style={styles.fieldError}>{formErrors.date}</Text> : null}
                </View>
              )}

              <View style={styles.sessionDetailsCard}>
                <Text style={styles.detailsCardTitle}>Session details</Text>
                <View style={styles.formGrid}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Start time</Text>
                    <TouchableOpacity style={styles.pickerInput} onPress={() => setTimePickerTarget("start")}>
                      <Text style={styles.pickerInputText}>{formatTimeValue(form.startTime)}</Text>
                      <Ionicons name="time-outline" size={18} color={THEME.primary} />
                    </TouchableOpacity>
                    {formErrors.startTime ? <Text style={styles.fieldError}>{formErrors.startTime}</Text> : null}
                  </View>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>End time</Text>
                    <TouchableOpacity style={styles.pickerInput} onPress={() => setTimePickerTarget("end")}>
                      <Text style={styles.pickerInputText}>{formatTimeValue(form.endTime)}</Text>
                      <Ionicons name="time-outline" size={18} color={THEME.primary} />
                    </TouchableOpacity>
                    {formErrors.endTime ? <Text style={styles.fieldError}>{formErrors.endTime}</Text> : null}
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Room number</Text>
                    <TextInput
                      style={styles.sheetInput}
                      value={form.roomNumber}
                      onChangeText={(value) => setForm((current) => ({ ...current, roomNumber: value }))}
                      placeholder="Room 02"
                      placeholderTextColor="#94A3B8"
                    />
                    {formErrors.roomNumber ? <Text style={styles.fieldError}>{formErrors.roomNumber}</Text> : null}
                  </View>
                  <View style={styles.inputHalf}>
                    <Text style={styles.inputLabel}>Max patients</Text>
                    <TextInput
                      style={styles.sheetInput}
                      value={form.maxPatients}
                      onChangeText={(value) =>
                        setForm((current) => ({ ...current, maxPatients: value.replace(/[^0-9]/g, "") }))
                      }
                      keyboardType="numeric"
                      placeholder="4"
                      placeholderTextColor="#94A3B8"
                    />
                    {availableSlots > 0 ? (
                      <Text style={styles.slotHelper}>Available appointment slots: {availableSlots}</Text>
                    ) : null}
                    {formErrors.maxPatients ? <Text style={styles.fieldError}>{formErrors.maxPatients}</Text> : null}
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.inputLabel}>Notes optional</Text>
                  <TextInput
                    style={[styles.sheetInput, styles.notesInput]}
                    value={form.notes}
                    onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
                    placeholder="Session note"
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                </View>
              </View>

              {submitError ? (
                <View style={styles.submitErrorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeAddModal} disabled={submitting}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, submitting && styles.createButtonDisabled]}
                onPress={() => void handleCreateSession()}
                disabled={submitting}
              >
                <Text style={styles.createButtonText}>{submitting ? "Creating..." : "Create Session"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DateTimePickerModal
        isVisible={datePickerVisible}
        mode="date"
        date={form.date}
        onConfirm={(value) => {
          setDatePickerVisible(false);
          setForm((current) => ({ ...current, date: value }));
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={Boolean(timePickerTarget)}
        mode="time"
        is24Hour
        date={timePickerTarget === "end" ? form.endTime : form.startTime}
        onConfirm={(value) => {
          const target = timePickerTarget;
          setTimePickerTarget(null);
          if (!target) return;
          setForm((current) => ({ ...current, [target === "start" ? "startTime" : "endTime"]: value }));
          setFormErrors((current) => {
            const next = { ...current };
            delete next.startTime;
            delete next.endTime;
            return next;
          });
        }}
        onCancel={() => setTimePickerTarget(null)}
      />
    </View>
  );
}

function MetricPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={14} color={THEME.primary} />
      <Text style={styles.metricText}>{label}</Text>
    </View>
  );
}

function StateCard({
  title,
  message,
  actionLabel,
  onPress,
  danger = false,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <View style={[styles.stateCard, danger ? styles.stateCardDanger : null]}>
      <Ionicons
        name={danger ? "alert-circle-outline" : "calendar-outline"}
        size={26}
        color={danger ? "#DC2626" : THEME.primary}
      />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
      {actionLabel && onPress ? (
        <TouchableOpacity style={styles.stateButton} onPress={onPress}>
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061A2E" },
  topSafeArea: { backgroundColor: "#061A2E" },
  content: { flexGrow: 1, paddingBottom: 220, backgroundColor: "#FFFFFF" },
  topHeader: {
    backgroundColor: "#061A2E",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#061A2E",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  topHeaderLeft: {
    flexDirection: "column",
    justifyContent: "center",
  },
  topBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  topHeaderBrandText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  topHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  topAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0EA5E9",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  topAvatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  stickyShell: {
    backgroundColor: "#061A2E",
    paddingTop: 10,
    paddingBottom: 8,
    overflow: "hidden",
  },
  searchBar: {
    height: 54,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 18,
  },
  sessionSearchInput: {
    flex: 1,
    minHeight: 44,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 0,
  },
  searchClearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  categoryTabs: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: "center",
    marginHorizontal: 5,
    position: "relative",
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
  categoryCount: {
    position: "absolute",
    right: -4,
    top: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 18,
    fontSize: 10,
    fontWeight: "800",
    color: "#D8E7F3",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  categoryCountActive: {
    color: "#FFFFFF",
    backgroundColor: "#0EA5E9",
  },
  categoryUnderline: {
    height: 4,
    width: 60,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginTop: 11,
  },
  categoryUnderlineActive: {
    backgroundColor: "#38BDF8",
  },
  centerState: { paddingTop: 80, alignItems: "center" },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: "#FFFFFF",
  },
  workspace: { gap: 14 },
  workspaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  workspaceTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  workspaceSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textSecondary,
  },
  doctorGrid: { gap: 12 },
  sessionTile: {
    minHeight: 104,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E7F3",
    padding: 14,
    paddingLeft: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "rgba(15, 23, 42, 0.08)",
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  tileAccent: {
    position: "absolute",
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: THEME.aqua,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.lightAqua,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tileCopy: { flex: 1, paddingRight: 8 },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: THEME.textPrimary },
  cardSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 17, color: "#64748B" },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "#EDF8FD",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  metricText: { fontSize: 11, fontWeight: "700", color: THEME.navy },
  stateCard: {
    alignItems: "center",
    backgroundColor: THEME.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
  },
  stateCardDanger: {
    backgroundColor: "#FFF7F7",
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 22,
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
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stateButtonText: { fontSize: 15, fontWeight: "800", color: THEME.primary },
  fabWrap: {
    position: "absolute",
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    shadowColor: THEME.primary,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 4, 94, 0.34)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: "#D8E7F3",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D8E7F3",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF5FB",
  },
  sheetHeaderCopy: { flex: 1 },
  sheetEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: THEME.aqua,
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: THEME.navy },
  sheetSubtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: THEME.textSecondary },
  sheetClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D8E7F3",
  },
  sheetContent: { padding: 20, paddingBottom: 10 },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EFF8FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    textAlign: "center",
    lineHeight: 28,
    fontSize: 11,
    fontWeight: "800",
    color: THEME.primary,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E7F3",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    color: THEME.textPrimary,
    fontSize: 15,
  },
  doctorSelectList: { gap: 10, marginTop: 12, marginBottom: 18 },
  doctorOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D8E7F3",
    backgroundColor: "#FFFFFF",
    padding: 13,
  },
  doctorOptionSelected: {
    backgroundColor: "#EFF8FF",
    borderColor: THEME.aqua,
    borderWidth: 2,
  },
  doctorOptionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF8FF",
  },
  doctorOptionAvatarSelected: { backgroundColor: THEME.primary },
  doctorOptionName: { fontSize: 15, fontWeight: "800", color: THEME.textPrimary },
  doctorOptionMeta: { marginTop: 3, fontSize: 13, color: THEME.textSecondary },
  selectIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E7F3",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  selectIndicatorActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary,
  },
  emptySearchText: {
    marginTop: -8,
    marginBottom: 14,
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeChip: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E7F3",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  typeChipSelected: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  typeChipText: { textAlign: "center", fontSize: 13, fontWeight: "700", color: THEME.textSecondary },
  typeChipTextSelected: { color: "#FFFFFF" },
  inputLabel: { marginBottom: 8, fontSize: 13, fontWeight: "700", color: THEME.textPrimary },
  fieldBlock: { marginBottom: 14 },
  scheduleDateList: { gap: 12, paddingBottom: 12 },
  scheduleDateCard: {
    width: 65,
    height: 90,
    backgroundColor: "#F0FAFF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  scheduleDateCardActive: {
    backgroundColor: "#0EA5E9",
    borderColor: "#7DD3FC",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  scheduleDateTop: {
    fontSize: 9,
    color: "#0284C7",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  scheduleDateMain: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginVertical: 3,
  },
  scheduleDateBottom: { fontSize: 11, color: "#64748B", fontWeight: "500" },
  scheduleDateTextActive: { color: "#FFFFFF" },
  scheduleActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DDFBFF",
    marginTop: 5,
  },
  customDateCard: {
    width: 65,
    height: 90,
    backgroundColor: "#F0FDFA",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  customDateText: { marginTop: 6, fontSize: 11, fontWeight: "600", color: "#0F766E" },
  dateSelectedText: { marginTop: -4, marginBottom: 10, fontSize: 12, color: THEME.textSecondary, fontWeight: "700" },
  sessionDetailsCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D8E7F3",
    padding: 14,
    marginBottom: 14,
  },
  detailsCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 12,
  },
  formGrid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  inputHalf: { flex: 1 },
  sheetInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E7F3",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: THEME.textPrimary,
    fontSize: 15,
    justifyContent: "center",
  },
  pickerInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E7F3",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerInputText: { color: THEME.textPrimary, fontSize: 16, fontWeight: "700" },
  notesInput: {
    minHeight: 78,
    paddingTop: 13,
    textAlignVertical: "top",
  },
  slotHelper: { marginTop: 6, fontSize: 11, lineHeight: 15, color: THEME.textSecondary },
  fieldError: { marginTop: 6, fontSize: 11, lineHeight: 15, color: "#B91C1C", fontWeight: "700" },
  submitErrorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    padding: 12,
    marginTop: 4,
  },
  submitErrorText: { flex: 1, color: "#B91C1C", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF5FB",
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8E7F3",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: { fontSize: 14, fontWeight: "800", color: THEME.textPrimary },
  createButton: {
    flex: 1.25,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  createButtonDisabled: { opacity: 0.62 },
  createButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
