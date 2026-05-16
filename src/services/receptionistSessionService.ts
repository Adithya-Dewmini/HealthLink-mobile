import { apiFetch } from "../config/api";
import { IS_DEVELOPMENT } from "../api/client";
import {
  getSessionStatus,
  normalizeSessionDateValue,
  type SessionStatus,
} from "../utils/sessionPresentation";

export type ReceptionSessionSource = "routine" | "manual";

export type ReceptionRoutineShift = {
  id: string;
  clinicId: string;
  clinicName: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
  roomNumber: string | null;
};

export type ReceptionRoutineDay = {
  day: string;
  dayKey: number;
  routines: ReceptionRoutineShift[];
};

export type ReceptionSessionItem = {
  id: number;
  date: string;
  doctorId: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  slotDuration: number;
  maxPatients: number;
  isActive: boolean;
  clinicName: string | null;
  source: ReceptionSessionSource;
  status: SessionStatus;
  bookedCount: number;
  availableSlots: number;
  doctorName?: string | null;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
  doctor_id: number;
  clinic_name: string | null;
  booked_count: number;
  available_count: number;
};

type ReceptionSessionApiItem = {
  id: number;
  date: string;
  doctor_id?: number | null;
  start_time: string;
  end_time: string;
  room_number?: string | null;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
  clinic_name?: string | null;
  source?: string | null;
  booked_count?: number | null;
  available_count?: number | null;
  doctor_name?: string | null;
};

const parseBody = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  return typeof body === "object" && body !== null ? body : {};
};

const getFriendlyScheduleError = (
  rawMessage: string,
  status?: number,
  details: string[] = []
) => {
  const combined = `${rawMessage}\n${details.join("\n")}`.toLowerCase();

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 429) {
    return "Too many schedule requests were sent. Please wait a moment and try again.";
  }

  if (
    combined.includes("max_patients cannot exceed generated slot count") ||
    combined.includes("max patients cannot exceed generated slot count") ||
    combined.includes("generated slot count")
  ) {
    return "Max patients is higher than the available appointment slots for this time range. Increase the session duration, reduce max patients, or reduce slot duration.";
  }

  if (combined.includes("doctor") && (combined.includes("overlap") || combined.includes("already has"))) {
    return "This doctor already has a session during the selected time.";
  }

  if (combined.includes("room") && (combined.includes("overlap") || combined.includes("already") || combined.includes("booked"))) {
    return "This room is already booked during the selected time.";
  }

  if (combined.includes("past")) {
    return "Session date cannot be in the past.";
  }

  if (combined.includes("end time") && combined.includes("start time")) {
    return "End time must be later than start time.";
  }

  if (combined.includes("network") || combined.includes("failed to fetch")) {
    return "Could not connect to the server. Check your connection and try again.";
  }

  return rawMessage || "Something went wrong while saving the session. Please try again.";
};

const requireOk = async (response: Response, fallback: string) => {
  const body = await parseBody(response);
  if (!response.ok) {
    const baseMessage = typeof body.message === "string" && body.message.trim() ? body.message : fallback;
    const details = Array.isArray(body.details)
      ? body.details.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    if (IS_DEVELOPMENT) {
      console.log("[reception-session]", response.url, response.status, body);
      const detailSuffix = details.length > 0 ? ` :: ${details.join(" | ")}` : "";
      throw new Error(`${baseMessage} (HTTP ${response.status} @ ${response.url})${detailSuffix}`);
    }
    throw new Error(getFriendlyScheduleError(baseMessage, response.status, details));
  }
  return body;
};

export const fetchReceptionSessionDoctors = async () => {
  const response = await apiFetch("/api/reception/sessions/doctors");
  return requireOk(response, "Failed to load clinic doctors");
};

export const fetchReceptionSessionAvailabilityState = async (doctorUserId: number) => {
  const response = await apiFetch(
    `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/availability-state`
  );
  return requireOk(response, "Failed to load doctor availability");
};

export const fetchReceptionSessionAvailability = async (
  doctorUserId: number,
  date: string
) => {
  const response = await apiFetch(
    `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/availability?date=${encodeURIComponent(date)}`
  );
  return requireOk(response, "Failed to load doctor availability");
};

export const fetchReceptionSessionSchedules = async (
  doctorUserId: number,
  activeOnly = true
) => {
  const response = await apiFetch(
    `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/schedules?active_only=${activeOnly ? "true" : "false"}`
  );
  const body = (await requireOk(response, "Failed to load doctor schedules")) as ReceptionSessionApiItem[];
  return Array.isArray(body) ? body.map(normalizeReceptionSession) : [];
};

export const fetchReceptionSessionRoutine = async (doctorUserId: number) => {
  const response = await apiFetch(
    `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/schedules/routine`
  );
  const body = (await requireOk(response, "Failed to load doctor routines")) as ReceptionRoutineDay[];
  return Array.isArray(body) ? body : [];
};

export const saveReceptionSessionRoutine = async (
  doctorUserId: number,
  payload: {
    weeks: number;
    routine: Array<{
      day: string;
      dayOfWeek: number;
      shifts: Array<{ start: string; end: string; roomNumber?: string | null }>;
    }>;
    slotDuration: number;
    maxPatients: number;
  }
) => {
  const response = await apiFetch(
    `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/routine`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return requireOk(response, "Failed to save routine schedule");
};

export const createReceptionManualSession = async (
  doctorUserId: number,
  payload: {
    date: string;
    start_time: string;
    end_time: string;
    slot_duration: number;
    max_patients: number;
  }
) => {
  const response = await apiFetch(
    `/api/reception/sessions/doctors/${encodeURIComponent(String(doctorUserId))}/manual`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return requireOk(response, "Failed to create manual session");
};

export const deleteReceptionSession = async (
  scheduleId: number,
  doctorUserId?: number | null
) => {
  const suffix =
    typeof doctorUserId === "number"
      ? `?doctorId=${encodeURIComponent(String(doctorUserId))}`
      : "";
  const response = await apiFetch(
    `/api/reception/sessions/${encodeURIComponent(String(scheduleId))}${suffix}`,
    {
      method: "DELETE",
    }
  );
  return requireOk(response, "Failed to delete session");
};

export const updateReceptionSession = async (
  scheduleId: number,
  payload: {
    doctorId?: number;
    date?: string;
    start_time?: string;
    end_time?: string;
    slot_duration?: number;
    max_patients?: number;
    is_active?: boolean;
  }
) => {
  const response = await apiFetch(
    `/api/reception/sessions/${encodeURIComponent(String(scheduleId))}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return requireOk(response, "Failed to update session");
};

const normalizeReceptionSession = (item: ReceptionSessionApiItem): ReceptionSessionItem => {
  const date = normalizeSessionDateValue(item.date);
  const startTime = String(item.start_time || "").slice(0, 5);
  const endTime = String(item.end_time || "").slice(0, 5);
  const bookedCount = Number(item.booked_count || 0);
  const maxPatients = Number(item.max_patients || 0);
  const availableSlots = Number(
    item.available_count ?? Math.max(0, maxPatients - bookedCount)
  );
  const source: ReceptionSessionSource =
    String(item.source || "manual").toLowerCase() === "routine" ? "routine" : "manual";
  const isActive = item.is_active !== false;

  return {
    id: Number(item.id),
    date,
    doctorId: Number(item.doctor_id || 0),
    startTime,
    endTime,
    roomNumber: item.room_number?.trim() ? item.room_number.trim() : null,
    slotDuration: Number(item.slot_duration || 0),
    maxPatients,
    isActive,
    clinicName: item.clinic_name ?? null,
    source,
    status: getSessionStatus({
      date,
      startTime,
      endTime,
      isActive,
      availableSlots,
    }),
    bookedCount,
    availableSlots,
    doctorName: item.doctor_name ?? null,
    start_time: startTime,
    end_time: endTime,
    slot_duration: Number(item.slot_duration || 0),
    max_patients: maxPatients,
    is_active: isActive,
    doctor_id: Number(item.doctor_id || 0),
    clinic_name: item.clinic_name ?? null,
    booked_count: bookedCount,
    available_count: availableSlots,
  };
};
