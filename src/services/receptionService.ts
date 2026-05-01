import { apiFetch } from "../config/api";

const parseBody = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  return typeof body === "object" && body !== null ? body : {};
};

const requireOk = async (response: Response, fallback: string) => {
  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(typeof body.message === "string" && body.message.trim() ? body.message : fallback);
  }
  return body;
};

export const fetchReceptionContext = async () => {
  const response = await apiFetch("/api/me/context");
  return requireOk(response, "Failed to load context");
};

export const fetchReceptionPermissions = async () => {
  const response = await apiFetch("/api/reception/permissions");
  return requireOk(response, "Failed to load permissions");
};

export const fetchReceptionDashboard = async () => {
  const response = await apiFetch("/api/reception/dashboard");
  return requireOk(response, "Failed to load dashboard");
};

export const fetchReceptionQueue = async (sessionId?: number | null) => {
  const suffix = sessionId ? `?sessionId=${encodeURIComponent(String(sessionId))}` : "";
  const response = await apiFetch(`/api/reception/queue${suffix}`);
  return requireOk(response, "Failed to load queue");
};

export const queueNextPatient = async (sessionId: number) => {
  const response = await apiFetch("/api/reception/queue/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  return requireOk(response, "Failed to advance queue");
};

export const queueCompletePatient = async (sessionId: number) => {
  const response = await apiFetch("/api/reception/queue/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  return requireOk(response, "Failed to complete patient");
};

export const queueMissPatient = async (sessionId: number) => {
  const response = await apiFetch("/api/reception/queue/miss", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  return requireOk(response, "Failed to mark patient missed");
};

export const registerReceptionPatient = async (payload: {
  name: string;
  phone?: string;
  sessionId?: number | null;
  addToQueue?: boolean;
}) => {
  const response = await apiFetch("/api/reception/patient/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return requireOk(response, "Failed to register patient");
};

export const fetchReceptionAppointments = async (params?: { date?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch(`/api/reception/appointments${suffix}`);
  return requireOk(response, "Failed to load appointments");
};

export const createReceptionAppointment = async (payload: {
  sessionId: number;
  time: string;
  patientId?: number | null;
  patientName?: string;
  phone?: string;
}) => {
  const response = await apiFetch("/api/reception/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return requireOk(response, "Failed to create appointment");
};

export const updateReceptionAppointment = async (appointmentId: number, payload: { status: string }) => {
  const response = await apiFetch(`/api/reception/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return requireOk(response, "Failed to update appointment");
};

export const fetchReceptionPatients = async () => {
  const response = await apiFetch("/api/reception/patients");
  return requireOk(response, "Failed to load patients");
};
