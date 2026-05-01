import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  createDoctorExternalSession,
  deleteDoctorExternalSession,
  fetchDoctorExternalSessions,
  fetchDoctorSessionsRange,
} from "../../services/doctorScheduleService";
import { getSocket } from "../../services/socket";
import type { DoctorExternalSession, ScheduleSession } from "./scheduleTypes";

type RoutineTabProps = {
  onPreview?: () => void;
};

const THEME = {
  background: "#F8FAFC",
  white: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  shadow: "#0F172A",
  primary: "#2563EB",
  softBlue: "#EFF6FF",
  softGreen: "#DCFCE7",
  orangeSoft: "#FFEDD5",
  orangeText: "#EA580C",
};

type WeeklyPatternItem = {
  id: string;
  day: string;
  dayOrder: number;
  startTime: string;
  endTime: string;
  clinicName: string;
  note?: string | null;
  source: "internal" | "external";
  hasConflict?: boolean;
};

const WEEKDAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const SHORT_DAY_OPTIONS = [
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
  { key: 0, label: "Sun" },
] as const;

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

const getWeekdayLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleDateString("en-US", { weekday: "long" });
};

const groupSessions = (sessions: ScheduleSession[]): WeeklyPatternItem[] => {
  const grouped = new Map<string, WeeklyPatternItem>();

  sessions.forEach((session) => {
    const day = getWeekdayLabel(session.date);
    const clinicKey = String(session.clinicId || session.clinicName || "").trim().toLowerCase();
    const key = `${day}_${session.startTime}_${session.endTime}_${clinicKey}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        day,
        dayOrder: WEEKDAY_ORDER[day] ?? 99,
        startTime: session.startTime,
        endTime: session.endTime,
        clinicName: session.clinicName,
        note: session.note ?? null,
        source: "internal",
        hasConflict: false,
      });
    }
  });

  return [...grouped.values()].sort((left, right) => {
    if (left.dayOrder !== right.dayOrder) {
      return left.dayOrder - right.dayOrder;
    }

    if (left.startTime !== right.startTime) {
      return left.startTime.localeCompare(right.startTime);
    }

    if (left.endTime !== right.endTime) {
      return left.endTime.localeCompare(right.endTime);
    }

    return left.clinicName.localeCompare(right.clinicName);
  });
};

const groupExternalSessions = (sessions: DoctorExternalSession[]): WeeklyPatternItem[] =>
  [...sessions]
    .map((session) => ({
      id: session.id,
      day: session.day,
      dayOrder: WEEKDAY_ORDER[session.day] ?? 99,
      startTime: session.startTime,
      endTime: session.endTime,
      clinicName: session.clinicName,
      note: session.note ?? null,
      source: "external" as const,
      hasConflict: Boolean(session.hasConflict),
    }))
    .sort((left, right) => {
      if (left.dayOrder !== right.dayOrder) {
        return left.dayOrder - right.dayOrder;
      }
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }
      if (left.endTime !== right.endTime) {
        return left.endTime.localeCompare(right.endTime);
      }
      return left.clinicName.localeCompare(right.clinicName);
    });

const DayPill = ({
  day,
  isSelected,
  onPress,
}: {
  day: string;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.sheetDayPill, isSelected && styles.sheetDayPillSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.sheetDayPillText, isSelected && styles.sheetDayPillTextSelected]}>{day}</Text>
  </TouchableOpacity>
);

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
      <Ionicons name="time-outline" size={18} color="#64748B" />
    </View>
  </TouchableOpacity>
);

export default function RoutineTab(_: RoutineTabProps) {
  const externalSheetRef = useRef<BottomSheetModal>(null);
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [externalSessions, setExternalSessions] = useState<DoctorExternalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [savingExternal, setSavingExternal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [timePickerTarget, setTimePickerTarget] = useState<"startTime" | "endTime" | null>(null);
  const [externalForm, setExternalForm] = useState({
    dayOfWeek: 1,
    startTime: "",
    endTime: "",
    clinicName: "",
    note: "",
  });
  const externalSheetSnapPoints = useMemo(() => ["75%"], []);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const start = formatLocalDateKey(new Date());
      const end = formatLocalDateKey(addDays(new Date(), 90));
      const [data, external] = await Promise.all([
        fetchDoctorSessionsRange(start, end),
        fetchDoctorExternalSessions(),
      ]);

      const sorted = [...data].sort((left, right) =>
        `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`)
      );

      setSessions(sorted);
      setExternalSessions(external);
    } catch (err) {
      setSessions([]);
      setExternalSessions([]);
      setError(err instanceof Error ? err.message : "Failed to load assigned sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const socket = getSocket();
    const handleScheduleUpdate = () => {
      void loadSessions();
    };

    socket.on("schedule:update", handleScheduleUpdate);
    return () => {
      socket.off("schedule:update", handleScheduleUpdate);
    };
  }, [loadSessions]);

  useEffect(() => {
    if (showExternalModal) {
      externalSheetRef.current?.present();
    } else {
      externalSheetRef.current?.dismiss();
    }
  }, [showExternalModal]);

  const groupedSessions = useMemo(() => {
    const internal = groupSessions(sessions);
    const external = groupExternalSessions(externalSessions);

    return [...internal, ...external].sort((left, right) => {
      if (left.dayOrder !== right.dayOrder) {
        return left.dayOrder - right.dayOrder;
      }
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }
      if (left.endTime !== right.endTime) {
        return left.endTime.localeCompare(right.endTime);
      }
      if (left.clinicName !== right.clinicName) {
        return left.clinicName.localeCompare(right.clinicName);
      }
      return left.source.localeCompare(right.source);
    });
  }, [externalSessions, sessions]);

  const empty = useMemo(
    () => !loading && !error && groupedSessions.length === 0,
    [error, groupedSessions.length, loading]
  );

  const closeExternalSheet = useCallback(() => {
    setShowExternalModal(false);
  }, []);

  const renderExternalSheetBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    []
  );

  const handleSaveExternalSession = useCallback(async () => {
    try {
      setSavingExternal(true);
      const result = await createDoctorExternalSession({
        dayOfWeek: externalForm.dayOfWeek,
        startTime: externalForm.startTime.trim(),
        endTime: externalForm.endTime.trim(),
        clinicName: externalForm.clinicName.trim(),
        note: externalForm.note.trim(),
      });
      setExternalSessions(result.sessions);
      closeExternalSheet();
      setExternalForm({
        dayOfWeek: 1,
        startTime: "",
        endTime: "",
        clinicName: "",
        note: "",
      });

      if (result.hasConflict) {
        Alert.alert("Warning", "You have overlapping sessions");
      }
    } catch (err) {
      Alert.alert(
        "Save Failed",
        err instanceof Error ? err.message : "Failed to create external session"
      );
    } finally {
      setSavingExternal(false);
    }
  }, [closeExternalSheet, externalForm]);

  const renderExternalSheetFooter = useCallback(
    (props: React.ComponentProps<typeof BottomSheetFooter>) => (
      <BottomSheetFooter {...props}>
        <View style={styles.sheetFooterContainer}>
          <TouchableOpacity style={styles.sheetCancelButton} onPress={closeExternalSheet}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetSaveButton, savingExternal && styles.sheetSaveButtonDisabled]}
            disabled={savingExternal}
            onPress={() => void handleSaveExternalSession()}
          >
            <Text style={styles.sheetSaveText}>{savingExternal ? "Saving..." : "Save Session"}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    ),
    [closeExternalSheet, handleSaveExternalSession, savingExternal]
  );

  const renderItem = useCallback(({ item }: { item: WeeklyPatternItem }) => {
    return (
      <View>
        <TouchableOpacity activeOpacity={0.88} style={styles.sessionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.dayText}>{item.day}</Text>
            <View style={styles.externalMetaRow}>
              <View style={item.source === "external" ? styles.tagExternal : styles.tagInternal}>
                <Text style={item.source === "external" ? styles.tagTextExt : styles.tagTextInt}>
                  {item.source === "external" ? "External" : "Internal"}
                </Text>
              </View>
              {item.source === "external" ? (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.deleteExternalButton}
                  disabled={deletingId === item.id}
                  onPress={() => {
                    Alert.alert(
                      "Delete External Session",
                      "Remove this external session from your routine?",
                      [
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
                                err instanceof Error ? err.message : "Failed to delete external session"
                              );
                            } finally {
                              setDeletingId(null);
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={15} color="#EA580C" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>
          <View style={styles.clinicRow}>
            <Ionicons name="business-outline" size={15} color="#64748B" />
            <Text style={styles.clinicName}>{item.clinicName}</Text>
          </View>
          {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
          {item.hasConflict ? <Text style={styles.conflictText}>You have overlapping sessions</Text> : null}
        </TouchableOpacity>
      </View>
    );
  }, [deletingId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerEmptyState}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle" size={38} color="#F97316" />
          </View>
          <Text style={styles.emptyTitle}>Failed to load sessions</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.88} onPress={() => void loadSessions()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (empty) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerEmptyState}>
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar" size={40} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>No sessions scheduled</Text>
            <Text style={styles.emptyDescription}>
              Your weekly schedule will appear here
            </Text>
            <TouchableOpacity
              style={styles.externalAddButton}
              activeOpacity={0.88}
              onPress={() => setShowExternalModal(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={THEME.white} />
              <Text style={styles.externalAddButtonText}>Add External Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <>
        <FlatList
          data={groupedSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.cardGap} />}
          ListHeaderComponent={
            <View style={styles.sectionHeaderContainer}>
              <View>
                <Text style={styles.sectionTitle}>This Week</Text>
                <Text style={styles.sectionSubtitle}>Your working schedule</Text>
              </View>
              <TouchableOpacity
                style={styles.externalAddButtonInline}
                activeOpacity={0.88}
                onPress={() => setShowExternalModal(true)}
              >
                <Ionicons name="add" size={16} color={THEME.primary} />
                <Text style={styles.externalAddButtonInlineText}>Add External Session</Text>
              </TouchableOpacity>
            </View>
          }
        />

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
          }}
        >
          <BottomSheetView style={styles.sheetContentContainer}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Add External Session</Text>
                <Text style={styles.sheetSubtitle}>Add sessions outside your clinic schedule</Text>
              </View>
              <TouchableOpacity onPress={closeExternalSheet}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionLabel}>Days</Text>
              <View style={styles.sheetDaysRow}>
                {SHORT_DAY_OPTIONS.map((option) => (
                  <DayPill
                    key={option.key}
                    day={option.label}
                    isSelected={externalForm.dayOfWeek === option.key}
                    onPress={() => setExternalForm((prev) => ({ ...prev, dayOfWeek: option.key }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionLabel}>Time Range</Text>
              <View style={styles.sheetTimeRow}>
                <TimeInput
                  label="Start"
                  value={externalForm.startTime || "09:00 AM"}
                  onPress={() => setTimePickerTarget("startTime")}
                />
                <TimeInput
                  label="End"
                  value={externalForm.endTime || "10:00 AM"}
                  onPress={() => setTimePickerTarget("endTime")}
                />
              </View>
            </View>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionLabel}>Location</Text>
              <TextInput
                value={externalForm.clinicName}
                onChangeText={(value) => setExternalForm((prev) => ({ ...prev, clinicName: value }))}
                placeholder="Enter clinic or location"
                style={styles.sheetTextInput}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionLabel}>Notes (optional)</Text>
              <TextInput
                value={externalForm.note}
                onChangeText={(value) => setExternalForm((prev) => ({ ...prev, note: value }))}
                placeholder="Add specific details..."
                style={[styles.sheetTextInput, styles.sheetMultilineInput]}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>
          </BottomSheetView>
        </BottomSheetModal>

        <DateTimePickerModal
          isVisible={timePickerTarget !== null}
          mode="time"
          display="spinner"
          date={parseTimeToDate(
            timePickerTarget === "startTime"
              ? externalForm.startTime || "09:00"
              : externalForm.endTime || "12:00"
          )}
          onConfirm={(date) => {
            if (!timePickerTarget) {
              return;
            }

            const nextValue = formatPickerTime(date);
            setExternalForm((prev) => ({
              ...prev,
              [timePickerTarget]: nextValue,
            }));
            setTimePickerTarget(null);
          }}
          onCancel={() => setTimePickerTarget(null)}
        />
      </>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  cardGap: {
    height: 10,
  },
  sectionHeaderContainer: {
    marginTop: 4,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  externalAddButtonInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.softBlue,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  externalAddButtonInlineText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyStateCard: {
    width: "100%",
    backgroundColor: THEME.white,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: THEME.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: THEME.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  errorIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: THEME.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: THEME.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "700",
  },
  refreshGhostButton: {
    marginTop: 14,
    minWidth: 124,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  refreshGhostButtonText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "700",
  },
  externalAddButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  externalAddButtonText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  sessionCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: THEME.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  timeBadge: {
    alignSelf: "flex-start",
    backgroundColor: THEME.softBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  timeBadgeText: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  clinicName: {
    flex: 1,
    fontSize: 14,
    color: THEME.textSecondary,
    marginLeft: 8,
    fontWeight: "500",
  },
  noteText: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 6,
  },
  conflictText: {
    fontSize: 12,
    color: "#D97706",
    marginTop: 6,
    fontWeight: "600",
  },
  externalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagExternal: {
    backgroundColor: THEME.orangeSoft,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagInternal: {
    backgroundColor: THEME.softGreen,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagTextExt: {
    color: "#9A3412",
    fontSize: 11,
    fontWeight: "600",
  },
  tagTextInt: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "600",
  },
  deleteExternalButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
  },
  sheetBackground: {
    backgroundColor: "#F8FAFC",
  },
  sheetHandle: {
    backgroundColor: "#CBD5E1",
    width: 40,
  },
  sheetContentContainer: {
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  sheetSection: {
    marginBottom: 20,
  },
  sheetSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  sheetDaysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetDayPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  sheetDayPillSelected: {
    backgroundColor: "#3B82F6",
  },
  sheetDayPillText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  sheetDayPillTextSelected: {
    color: "#FFFFFF",
  },
  sheetTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  sheetTimeInputContainer: {
    flex: 1,
  },
  sheetInputLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  sheetInputBox: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  sheetInputText: {
    fontSize: 14,
    color: "#0F172A",
  },
  sheetTextInput: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  sheetMultilineInput: {
    height: 100,
    textAlignVertical: "top",
    paddingVertical: 8,
  },
  sheetFooterContainer: {
    padding: 16,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    elevation: 5,
  },
  sheetCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  sheetCancelText: {
    color: "#64748B",
    fontWeight: "600",
  },
  sheetSaveButton: {
    flex: 2,
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  sheetSaveButtonDisabled: {
    opacity: 0.7,
  },
  sheetSaveText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
