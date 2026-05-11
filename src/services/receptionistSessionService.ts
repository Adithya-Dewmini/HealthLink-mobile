import { apiFetch } from "../config/api";
import {
  getSessionStatus,
  normalizeSessionDateValue,
  type SessionStatus,
} from "../utils/sessionPresentation";

export type ReceptionSessionSource = "routine" | "manual";

export type ReceptionSessionItem = {
  id: number;
  date: string;
  doctorId: number;
  startTime: string;
  endTime: string;
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

const requireOk = async (response: Response, fallback: string) => {
  const body = await parseBody(response);
  if (!response.ok) {
    const baseMessage = typeof body.message === "string" && body.message.trim() ? body.message : fallback;
    const details = Array.isArray(body.details)
      ? body.details.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    throw new Error(details.length > 0 ? `${baseMessage}\n${details.join("\n")}` : baseMessage);
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
  return requireOk(response, "Failed to load doctor routines");
};

export const saveReceptionSessionRoutine = async (
  doctorUserId: number,
  payload: {
    weeks: number;
    routine: Array<{
      day: string;
      dayOfWeek: number;
      shifts: Array<{ start: string; end: string }>;
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
