import { apiFetch } from "../config/api";
import type {
  AvailabilityMap,
  DayKey,
  DoctorRoutineDay,
  DoctorExternalSession,
  ScheduleDayGroup,
  ScheduleSession,
  ScheduleSessionStatus,
} from "../screens/doctor/scheduleTypes";

type AvailabilityResponse = {
  availability?: AvailabilityMap;
  availableToday?: boolean;
  enabledDays?: DayKey[];
};

type ScheduleGroupResponse = {
  date: string;
  sessions: Array<{
    id?: number | string;
    clinicId?: string;
    clinicName?: string;
    startTime?: string;
    endTime?: string;
    patientsCount?: number;
    maxPatients?: number;
    slotDuration?: number;
    status?: string;
  }>;
};

const emptyAvailability = (): AvailabilityMap => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
});

export const fetchDoctorAvailability = async () => {
  const response = await apiFetch("/api/doctors/availability");
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to load availability");
  }

  const data = (await response.json()) as AvailabilityResponse;
  return {
    availability: data.availability || emptyAvailability(),
    availableToday: Boolean(data.availableToday),
    enabledDays: Array.isArray(data.enabledDays) ? data.enabledDays : [],
  };
};

export const saveDoctorAvailability = async (availability: AvailabilityMap, enabledDays: DayKey[]) => {
  const response = await apiFetch("/api/doctors/availability", {
    method: "PUT",
    body: JSON.stringify({ availability, enabled_days: enabledDays }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to save availability");
  }

  const data = (await response.json()) as AvailabilityResponse;
  return {
    availability: data.availability || emptyAvailability(),
    availableToday: Boolean(data.availableToday),
    enabledDays: Array.isArray(data.enabledDays) ? data.enabledDays : [],
  };
};

export const fetchDoctorSchedule = async (month: string) => {
  const response = await apiFetch(`/api/doctors/schedule?month=${encodeURIComponent(month)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to load schedule");
  }

  const data = (await response.json()) as ScheduleGroupResponse[];
  return data.map<ScheduleDayGroup>((group) => ({
    date: group.date,
    sessions: Array.isArray(group.sessions)
      ? group.sessions.map((session) => ({
          id: String(session.id ?? `${group.date}-${session.startTime}-${session.endTime}`),
          clinicId:
            "clinicId" in session && session.clinicId != null ? String(session.clinicId) : undefined,
          clinicName: String(session.clinicName || "Clinic"),
          date: group.date,
          startTime: String(session.startTime || ""),
          endTime: String(session.endTime || ""),
          patientCount: Number(session.patientsCount || 0),
          maxPatients: typeof session.maxPatients === "number" ? session.maxPatients : undefined,
          slotDuration: typeof session.slotDuration === "number" ? session.slotDuration : undefined,
          status: normalizeSessionStatus(group.date, session.startTime, session.endTime, session.status),
        }))
      : [],
  }));
};

type RangeSessionResponse = Array<{
  id?: number | string;
  date?: string;
  clinicId?: string;
  clinicName?: string;
  startTime?: string;
  endTime?: string;
  patientsCount?: number;
  patientCount?: number;
  maxPatients?: number;
  slotDuration?: number;
  status?: string;
}>;

export const fetchDoctorSessionsRange = async (start: string, end: string) => {
  const response = await apiFetch(
    `/api/doctor/sessions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to load assigned sessions");
  }

  const data = (await response.json()) as RangeSessionResponse;
  return Array.isArray(data)
    ? data.map<ScheduleSession>((session) => ({
        id: String(session.id ?? `${session.date}-${session.startTime}-${session.endTime}`),
        clinicId:
          "clinicId" in session && session.clinicId != null ? String(session.clinicId) : undefined,
        clinicName: String(session.clinicName || "Clinic"),
        date: String(session.date || ""),
        startTime: String(session.startTime || ""),
        endTime: String(session.endTime || ""),
        patientCount: Number(session.patientCount ?? session.patientsCount ?? 0),
        maxPatients: typeof session.maxPatients === "number" ? session.maxPatients : undefined,
        slotDuration: typeof session.slotDuration === "number" ? session.slotDuration : undefined,
        status: normalizeSessionStatus(
          String(session.date || ""),
          session.startTime,
          session.endTime,
          session.status
        ),
        source: "internal",
      }))
    : [];
};

type ExternalSessionResponse = Array<{
  id?: number | string;
  day?: string;
  dayKey?: number;
  startTime?: string;
  endTime?: string;
  clinicName?: string;
  note?: string | null;
  source?: "external";
  hasConflict?: boolean;
}>;

export const fetchDoctorExternalSessions = async () => {
  const response = await apiFetch("/api/doctor/external-sessions");
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to load external sessions");
  }

  const data = (await response.json()) as ExternalSessionResponse;
  return Array.isArray(data)
    ? data.map<DoctorExternalSession>((session) => ({
        id: String(session.id ?? ""),
        day: String(session.day || ""),
        dayKey: Number(session.dayKey ?? 0),
        startTime: String(session.startTime || ""),
        endTime: String(session.endTime || ""),
        clinicName: String(session.clinicName || "External Clinic"),
        note: session.note ?? null,
        source: "external",
        hasConflict: Boolean(session.hasConflict),
      }))
    : [];
};

export const createDoctorExternalSession = async (payload: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  clinicName: string;
  note?: string;
}) => {
  const response = await apiFetch("/api/doctor/external-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    sessions?: ExternalSessionResponse;
    hasConflict?: boolean;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data?.message || "Failed to create external session");
  }

  return {
    sessions: Array.isArray(data.sessions)
      ? data.sessions.map<DoctorExternalSession>((session) => ({
          id: String(session.id ?? ""),
          day: String(session.day || ""),
          dayKey: Number(session.dayKey ?? 0),
          startTime: String(session.startTime || ""),
          endTime: String(session.endTime || ""),
          clinicName: String(session.clinicName || "External Clinic"),
          note: session.note ?? null,
          source: "external",
          hasConflict: Boolean(session.hasConflict),
        }))
      : [],
    hasConflict: Boolean(data.hasConflict),
  };
};

export const deleteDoctorExternalSession = async (externalSessionId: string) => {
  const response = await apiFetch(`/api/doctor/external-sessions/${encodeURIComponent(externalSessionId)}`, {
    method: "DELETE",
  });
  const data = (await response.json().catch(() => ({}))) as ExternalSessionResponse | { message?: string };

  if (!response.ok) {
    throw new Error(
      typeof (data as { message?: string })?.message === "string"
        ? (data as { message?: string }).message!
        : "Failed to delete external session"
    );
  }

  return Array.isArray(data)
    ? data.map<DoctorExternalSession>((session) => ({
        id: String(session.id ?? ""),
        day: String(session.day || ""),
        dayKey: Number(session.dayKey ?? 0),
        startTime: String(session.startTime || ""),
        endTime: String(session.endTime || ""),
        clinicName: String(session.clinicName || "External Clinic"),
        note: session.note ?? null,
        source: "external",
        hasConflict: Boolean(session.hasConflict),
      }))
    : [];
};

type RoutineResponse = Array<{
  day?: string;
  dayKey?: number;
  routines?: Array<{
    id?: number | string;
    clinicId?: string;
    clinicName?: string;
    startTime?: string;
    endTime?: string;
    slotDuration?: number;
    maxPatients?: number;
  }>;
}>;

export const fetchDoctorRoutine = async () => {
  const response = await apiFetch("/api/doctors/routines");
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to load routine");
  }

  const data = (await response.json()) as RoutineResponse;
  return Array.isArray(data)
    ? data.map<DoctorRoutineDay>((day, index) => ({
        day: String(day.day || ""),
        dayKey: typeof day.dayKey === "number" ? day.dayKey : index,
        routines: Array.isArray(day.routines)
          ? day.routines.map((routine) => ({
              id: String(routine.id ?? `${day.day}-${routine.clinicName}-${routine.startTime}`),
              clinicId: String(routine.clinicId || ""),
              clinicName: String(routine.clinicName || "Clinic"),
              startTime: String(routine.startTime || ""),
              endTime: String(routine.endTime || ""),
              slotDuration: Number(routine.slotDuration || 0),
              maxPatients: Number(routine.maxPatients || 0),
            }))
          : [],
      }))
    : [];
};

export const createDoctorRoutine = async (payload: {
  clinicId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
}) => {
  const response = await apiFetch("/api/doctors/routines", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to save routine");
  }

  const data = (await response.json()) as RoutineResponse;
  return Array.isArray(data)
    ? data.map<DoctorRoutineDay>((day, index) => ({
        day: String(day.day || ""),
        dayKey: typeof day.dayKey === "number" ? day.dayKey : index,
        routines: Array.isArray(day.routines)
          ? day.routines.map((routine) => ({
              id: String(routine.id ?? `${day.day}-${routine.clinicName}-${routine.startTime}`),
              clinicId: String(routine.clinicId || ""),
              clinicName: String(routine.clinicName || "Clinic"),
              startTime: String(routine.startTime || ""),
              endTime: String(routine.endTime || ""),
              slotDuration: Number(routine.slotDuration || 0),
              maxPatients: Number(routine.maxPatients || 0),
            }))
          : [],
      }))
    : [];
};

export const deleteDoctorRoutine = async (routineId: string) => {
  const response = await apiFetch(`/api/doctors/routines/${encodeURIComponent(routineId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to delete routine");
  }

  const data = (await response.json()) as RoutineResponse;
  return Array.isArray(data)
    ? data.map<DoctorRoutineDay>((day, index) => ({
        day: String(day.day || ""),
        dayKey: typeof day.dayKey === "number" ? day.dayKey : index,
        routines: Array.isArray(day.routines)
          ? day.routines.map((routine) => ({
              id: String(routine.id ?? `${day.day}-${routine.clinicName}-${routine.startTime}`),
              clinicId: String(routine.clinicId || ""),
              clinicName: String(routine.clinicName || "Clinic"),
              startTime: String(routine.startTime || ""),
              endTime: String(routine.endTime || ""),
              slotDuration: Number(routine.slotDuration || 0),
              maxPatients: Number(routine.maxPatients || 0),
            }))
          : [],
      }))
    : [];
};

const normalizeSessionStatus = (
  date: string,
  startTime: unknown,
  endTime: unknown,
  value: unknown
): ScheduleSessionStatus => {
  const normalized = String(value || "").trim().toUpperCase();
  const computed = computeDerivedStatus(date, String(startTime || ""), String(endTime || ""), normalized);

  switch (computed) {
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "MISSED":
      return "Missed";
    default:
      return "Upcoming";
  }
};

const computeDerivedStatus = (
  date: string,
  startTime: string,
  endTime: string,
  rawStatus: string
) => {
  const now = new Date();
  const start = new Date(`${date}T${String(startTime).slice(0, 5)}:00`);
  const end = new Date(`${date}T${String(endTime).slice(0, 5)}:00`);

  if (rawStatus === "COMPLETED") {
    return "COMPLETED";
  }

  if (now > end && rawStatus === "UPCOMING") {
    return "MISSED";
  }

  if (now >= start && now <= end && rawStatus !== "COMPLETED") {
    return "ACTIVE";
  }

  return rawStatus || "UPCOMING";
};
