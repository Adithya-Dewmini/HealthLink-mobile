import { apiFetch } from "../config/api";
import type { ActiveQueueState, ActiveQueueStatus } from "../components/patient/LiveQueueCard";

type QueuePayload = ActiveQueueState & {
  queueStatus?: string | null;
  patientQueueStatus?: string | null;
  checkInState?: string | null;
  waitingCount?: number;
  message?: string | null;
};

type QueueApiError = Error & {
  code?: string | null;
  status?: number;
};

const VALID_STATUSES = new Set<ActiveQueueStatus>([
  "none",
  "appointment_booked",
  "today_appointment",
  "queue_live",
  "check_in_required",
  "not_arrived",
  "checked_in",
  "waiting",
  "next",
  "called",
  "in_consultation",
  "late",
  "missed",
  "cancelled",
  "completed",
]);

const parseQueueApiError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  const message =
    payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message?: unknown }).message ?? "").trim() || fallback
      : fallback;
  const error = new Error(message) as QueueApiError;
  error.status = response.status;
  error.code =
    payload && typeof payload === "object" && "code" in payload
      ? String((payload as { code?: unknown }).code ?? "").trim().toUpperCase() || null
      : null;
  return error;
};

export const normalizePatientActiveQueue = (payload: unknown): QueuePayload | null => {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const rawStatus = String(data.status ?? "none").toLowerCase() as ActiveQueueStatus;

  return {
    active: Boolean(data.active),
    status: VALID_STATUSES.has(rawStatus) ? rawStatus : "none",
    appointmentId: data.appointmentId ? String(data.appointmentId) : undefined,
    queueId: data.queueId ? String(data.queueId) : undefined,
    doctorId: Number(data.doctorId ?? 0) || undefined,
    clinicId: data.clinicId ? String(data.clinicId) : undefined,
    sessionId: Number(data.sessionId ?? 0) || undefined,
    doctorName: data.doctorName ? String(data.doctorName) : undefined,
    medicalCenterName: data.medicalCenterName ? String(data.medicalCenterName) : undefined,
    scheduledTime: data.scheduledTime ? String(data.scheduledTime) : undefined,
    sessionTime: data.sessionTime ? String(data.sessionTime) : undefined,
    queueStarted: typeof data.queueStarted === "boolean" ? data.queueStarted : undefined,
    tokenNumber: Number(data.tokenNumber ?? 0) || undefined,
    currentServingNumber: Number(data.currentServingNumber ?? data.currentServingToken ?? 0) || undefined,
    position: Number(data.position ?? 0) || undefined,
    estimatedWaitMinutes: Number(data.estimatedWaitMinutes ?? 0) || undefined,
    queueStatus: data.queueStatus ? String(data.queueStatus) : null,
    patientQueueStatus: data.patientQueueStatus ? String(data.patientQueueStatus) : null,
    consultationStatus: data.consultationStatus ? String(data.consultationStatus) : null,
    checkInState: data.checkInState ? String(data.checkInState) : null,
    waitingCount: Number(data.waitingCount ?? 0) || 0,
    message: data.message ? String(data.message) : null,
  };
};

export const fetchPatientActiveQueueStatus = async (params?: {
  appointmentId?: string | number;
  sessionId?: string | number;
}) => {
  const query = new URLSearchParams();
  if (params?.appointmentId) query.set("appointmentId", String(params.appointmentId));
  if (params?.sessionId) query.set("sessionId", String(params.sessionId));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch(`/api/patient/queue/active${suffix}`, { suppressErrorLog: true });
  if (!response.ok) {
    throw await parseQueueApiError(response, "Failed to load queue status");
  }

  return normalizePatientActiveQueue(await response.json().catch(() => null));
};
