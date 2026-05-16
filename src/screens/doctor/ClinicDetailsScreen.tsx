import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { fetchDoctorClinics, type DoctorClinicItem } from "../../services/doctorClinicsService";
import { fetchDoctorRoutine, fetchDoctorSessionsRange } from "../../services/doctorScheduleService";
import { useClinicStore } from "../../stores/useClinicStore";
import type { DoctorRoutineDay, ScheduleSession } from "./scheduleTypes";

const THEME = {
  background: "#F6F8FB",
  white: "#FFFFFF",
  textDark: "#0F172A",
  textGray: "#64748B",
  border: "#E2E8F0",
  softBlue: "#EEF2FF",
  blue: "#3B82F6",
  greenSoft: "#DCFCE7",
  greenText: "#16A34A",
  shadow: "#000000",
};

const FALLBACK_CLINIC_IMAGE =
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=1200&auto=format&fit=crop";

const STATUS_STYLES: Record<
  string,
  { backgroundColor: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Active: { backgroundColor: "#DCFCE7", color: "#16A34A", icon: "radio" },
  Upcoming: { backgroundColor: "#DBEAFE", color: "#2563EB", icon: "time-outline" },
  Completed: { backgroundColor: "#E2E8F0", color: "#64748B", icon: "checkmark-done-outline" },
  Missed: { backgroundColor: "#FEE2E2", color: "#DC2626", icon: "close-circle-outline" },
};

const SCHEDULE_LOOKAHEAD_DAYS = 90;

type SessionCardProps = {
  session: ScheduleSession;
};

const SessionCard = memo(function SessionCard({ session }: SessionCardProps) {
  const statusStyle = STATUS_STYLES[session.status] ?? STATUS_STYLES.Upcoming;

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTopRow}>
        <View>
          <Text style={styles.sessionTime}>
            {formatDisplayTime(session.startTime)} {"\u2192"} {formatDisplayTime(session.endTime)}
          </Text>
          <Text style={styles.sessionDate}>{formatDisplayDate(session.date)}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
          <Ionicons name={statusStyle.icon} size={12} color={statusStyle.color} />
          <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{session.status}</Text>
        </View>
      </View>
    </View>
  );
});

type SectionProps = {
  title: string;
  sessions: ScheduleSession[];
  emptyTitle: string;
};

const SessionSection = memo(function SessionSection({ title, sessions, emptyTitle }: SectionProps) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-clear-outline" size={22} color={THEME.textGray} />
          </View>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionCard session={item} />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sessionSpacer} />}
        />
      )}
    </View>
  );
});

export default function ClinicDetailsScreen() {
  const navigation = useNavigation<any>();
  const { selectedClinic, selectedClinicId, setSelectedClinic } = useClinicStore();
  const [clinic, setClinic] = useState<DoctorClinicItem | null>(
    selectedClinic ? { ...selectedClinic } : null
  );
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clinicId = selectedClinicId ?? selectedClinic?.id ?? null;

  const loadScreen = useCallback(
    async (silent = false) => {
      if (!clinicId) {
        setClinic(null);
        setSessions([]);
        setErrorMessage(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const start = toLocalDateString(new Date());
        const endCursor = new Date();
        endCursor.setDate(endCursor.getDate() + SCHEDULE_LOOKAHEAD_DAYS);
        const end = toLocalDateString(endCursor);

        const [clinicsResponse, sessionResponse, routineResponse] = await Promise.all([
          fetchDoctorClinics(),
          fetchDoctorSessionsRange(start, end),
          fetchDoctorRoutine(),
        ]);

        const clinics = [...clinicsResponse.active, ...clinicsResponse.pending];
        const matchedClinic = clinics.find((item) => isClinicIdMatch(item.id, clinicId)) ?? null;

        setClinic(matchedClinic);
        if (matchedClinic) {
          setSelectedClinic(matchedClinic);
        }

        const clinicReference = matchedClinic ?? selectedClinic ?? { id: clinicId, name: "" };
        const filteredSessions = sessionResponse.filter((session) =>
          doesSessionBelongToClinic(session, clinicReference)
        );
        const projectedRoutineSessions = buildProjectedRoutineSessions({
          clinic: clinicReference,
          routineDays: routineResponse,
          existingSessions: filteredSessions,
          from: start,
          daysToGenerate: SCHEDULE_LOOKAHEAD_DAYS,
        });
        const mergedSessions = [...filteredSessions, ...projectedRoutineSessions].sort((left, right) =>
          `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`)
        );

        setSessions(mergedSessions);
        setErrorMessage(null);
      } catch (error) {
        console.log("Clinic details screen error:", error);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load clinic details");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [clinicId, selectedClinic, setSelectedClinic]
  );

  useEffect(() => {
    void loadScreen();
  }, [loadScreen]);

  const todayKey = useMemo(() => toLocalDateString(new Date()), []);

  const todaySessions = useMemo(
    () => sessions.filter((session) => session.date === todayKey),
    [sessions, todayKey]
  );

  const upcomingSessions = useMemo(
    () => sessions.filter((session) => session.date > todayKey),
    [sessions, todayKey]
  );

  if (!clinicId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.headerButton, styles.headerButtonLeft]}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.textDark} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Clinic</Text>
          </View>

          <View style={styles.emptySelection}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="business-outline" size={24} color={THEME.textGray} />
            </View>
            <Text style={styles.emptyTitle}>No clinic selected</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.primaryButtonText}>Back to Clinics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!clinic && isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.headerButton, styles.headerButtonLeft]}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.textDark} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Clinic Details</Text>
          </View>

          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={THEME.blue} />
            <Text style={styles.loaderText}>Loading clinic details...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!clinic) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.headerButton, styles.headerButtonLeft]}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.textDark} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Clinic Details</Text>
          </View>

          <View style={styles.emptySelection}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="business-outline" size={24} color={THEME.textGray} />
            </View>
            <Text style={styles.emptyTitle}>Clinic not available</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.primaryButtonText}>Back to Clinics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={[{ key: "content" }]}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                style={[styles.headerButton, styles.headerButtonLeft]}
                activeOpacity={0.85}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={22} color={THEME.textDark} />
              </TouchableOpacity>

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Clinic Details</Text>
                <Text style={styles.headerSubtitle}>My Clinics</Text>
              </View>

              <TouchableOpacity
                style={[styles.headerButton, styles.headerButtonRight]}
                activeOpacity={0.85}
                disabled={isLoading || isRefreshing}
                onPress={() => void loadScreen(true)}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={THEME.textDark} />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color={THEME.textDark} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <Image
                source={{ uri: clinic.cover_image_url || clinic.logo_url || FALLBACK_CLINIC_IMAGE }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroOverlay} />
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{clinic.name}</Text>
                {clinic.address || clinic.location ? (
                  <Text style={styles.heroMeta}>{clinic.address || clinic.location}</Text>
                ) : null}
              </View>
            </View>
          </>
        }
        renderItem={() => (
          <View style={styles.sectionsWrap}>
            {isLoading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={THEME.blue} />
                <Text style={styles.loaderText}>Loading clinic details...</Text>
              </View>
            ) : (
              <>
                {errorMessage ? (
                  <View style={styles.errorCard}>
                    <Text style={styles.errorTitle}>Failed to load clinic details</Text>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      activeOpacity={0.88}
                      onPress={() => void loadScreen()}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <SessionSection
                  title="Today's Schedule"
                  sessions={todaySessions}
                  emptyTitle="No sessions today"
                />

                <SessionSection
                  title="Upcoming Sessions"
                  sessions={upcomingSessions}
                  emptyTitle="No upcoming sessions"
                />

                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>Actions</Text>
                  <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate("DoctorTabs", { screen: "DoctorSchedule" })}
                  >
                    <Ionicons name="calendar-outline" size={18} color={THEME.blue} />
                    <Text style={styles.actionButtonLabel}>View Full Calendar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeComparableText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isClinicIdMatch(left?: string | null, right?: string | null) {
  return normalizeComparableText(left) !== "" && normalizeComparableText(left) === normalizeComparableText(right);
}

function doesSessionBelongToClinic(
  session: ScheduleSession,
  clinic: Pick<DoctorClinicItem, "id" | "name">
) {
  const sessionClinicId = normalizeComparableText(session.clinicId);
  const sessionClinicName = normalizeComparableText(session.clinicName);
  const clinicId = normalizeComparableText(clinic.id);
  const clinicName = normalizeComparableText(clinic.name);

  if (sessionClinicId && clinicId && sessionClinicId === clinicId) {
    return true;
  }

  if (sessionClinicName && clinicName && sessionClinicName === clinicName) {
    return true;
  }

  return false;
}

function buildProjectedRoutineSessions({
  clinic,
  routineDays,
  existingSessions,
  from,
  daysToGenerate,
}: {
  clinic: Pick<DoctorClinicItem, "id" | "name">;
  routineDays: DoctorRoutineDay[];
  existingSessions: ScheduleSession[];
  from: string;
  daysToGenerate: number;
}) {
  const targetRoutines = routineDays.flatMap((day) =>
    day.routines
      .filter(
        (routine) =>
          isClinicIdMatch(routine.clinicId, clinic.id) ||
          normalizeComparableText(routine.clinicName) === normalizeComparableText(clinic.name)
      )
      .map((routine) => ({
        dayKey: day.dayKey,
        routine,
      }))
  );

  if (targetRoutines.length === 0) {
    return [];
  }

  const existingKeys = new Set(
    existingSessions.map((session) =>
      [
        normalizeComparableText(session.clinicId || clinic.id),
        session.date,
        String(session.startTime || "").slice(0, 5),
        String(session.endTime || "").slice(0, 5),
      ].join("|")
    )
  );

  const start = new Date(`${from}T00:00:00`);
  const projected: ScheduleSession[] = [];

  for (let offset = 0; offset <= daysToGenerate; offset += 1) {
    const cursor = new Date(start);
    cursor.setDate(start.getDate() + offset);
    const dateKey = toLocalDateString(cursor);
    const dayKey = cursor.getDay();

    targetRoutines.forEach(({ dayKey: routineDayKey, routine }) => {
      if (routineDayKey !== dayKey) {
        return;
      }

      const startTime = String(routine.startTime || "").slice(0, 5);
      const endTime = String(routine.endTime || "").slice(0, 5);
      const dedupeKey = [
        normalizeComparableText(routine.clinicId || clinic.id),
        dateKey,
        startTime,
        endTime,
      ].join("|");

      if (existingKeys.has(dedupeKey)) {
        return;
      }

      projected.push({
        id: `routine-${routine.id}-${dateKey}-${startTime}-${endTime}`,
        clinicId: routine.clinicId || clinic.id,
        clinicName: routine.clinicName || clinic.name || "Clinic",
        location: routine.location ?? undefined,
        coverImageUrl: routine.coverImageUrl ?? undefined,
        logoUrl: routine.logoUrl ?? undefined,
        date: dateKey,
        startTime,
        endTime,
        patientCount: 0,
        maxPatients: routine.maxPatients || undefined,
        slotDuration: routine.slotDuration || undefined,
        status: "Upcoming",
        source: "internal",
        note: null,
      });
    });
  }

  return projected;
}

function formatDisplayTime(value: string) {
  if (!value) return "--:--";
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  header: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    position: "relative",
  },
  headerButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    position: "absolute",
    top: 0,
  },
  headerButtonLeft: {
    left: 0,
  },
  headerButtonRight: {
    right: 0,
  },
  headerCopy: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME.textDark,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.textGray,
    textAlign: "center",
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: THEME.white,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 5,
    marginBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: 168,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  heroCopy: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: THEME.white,
  },
  heroMeta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
  },
  sectionsWrap: {
    gap: 22,
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: THEME.textGray,
  },
  sectionWrap: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textDark,
  },
  sessionCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  sessionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sessionTime: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.textDark,
  },
  sessionDate: {
    fontSize: 13,
    color: THEME.textGray,
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sessionSpacer: {
    height: 10,
  },
  emptyCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  emptySelection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.textDark,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: THEME.blue,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.white,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: THEME.softBlue,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.blue,
  },
  errorCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#991B1B",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
    marginTop: 6,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
});
