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

export const fetchReceptionQueue = async () => {
  const response = await apiFetch("/api/reception/queues");
  return requireOk(response, "Failed to load queue");
};

export const fetchReceptionQueueDetail = async (params: {
  queueId?: number | null;
  sessionId?: number | null;
}) => {
  const path = params.queueId
    ? `/api/reception/queues/${encodeURIComponent(String(params.queueId))}`
    : params.sessionId
      ? `/api/reception/queues/session/${encodeURIComponent(String(params.sessionId))}`
      : "/api/reception/queue/detail";
  const response = await apiFetch(path);
  return requireOk(response, "Failed to load queue details");
};

const queueAction = async (
  path: string,
  payload: { sessionId?: number | null; queueId?: number | null },
  fallback: string
) => {
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return requireOk(response, fallback);
};

export const queueStart = async (sessionId: number) =>
  queueAction("/api/reception/queue/start", { sessionId }, "Failed to start queue");

export const queuePause = async (payload: { sessionId?: number | null; queueId?: number | null }) =>
  queueAction(
    payload.queueId
      ? `/api/reception/queues/${encodeURIComponent(String(payload.queueId))}/pause`
      : "/api/reception/queue/pause",
    payload,
    "Failed to pause queue"
  );

export const queueResume = async (payload: { sessionId?: number | null; queueId?: number | null }) =>
  queueAction(
    payload.queueId
      ? `/api/reception/queues/${encodeURIComponent(String(payload.queueId))}/resume`
      : "/api/reception/queue/resume",
    payload,
    "Failed to resume queue"
  );

export const queueEnd = async (payload: { sessionId?: number | null; queueId?: number | null }) =>
  queueAction(
    payload.queueId
      ? `/api/reception/queues/${encodeURIComponent(String(payload.queueId))}/end`
      : "/api/reception/queue/end",
    payload,
    "Failed to end queue"
  );

export const queueNextPatient = async (payload: { sessionId?: number | null; queueId?: number | null }) => {
  const response = await apiFetch(
    payload.queueId
      ? `/api/reception/queues/${encodeURIComponent(String(payload.queueId))}/next`
      : "/api/reception/queue/next",
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    }
  );
  return requireOk(response, "Failed to advance queue");
};

export const queueCompletePatient = async (payload: {
  sessionId?: number | null;
  queueId?: number | null;
}) => {
  const response = await apiFetch(
    payload.queueId
      ? `/api/reception/queues/${encodeURIComponent(String(payload.queueId))}/complete`
      : "/api/reception/queue/complete",
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    }
  );
  return requireOk(response, "Failed to complete patient");
};

export const queueMissPatient = async (payload: { sessionId?: number | null; queueId?: number | null }) => {
  const response = await apiFetch(
    payload.queueId
      ? `/api/reception/queues/${encodeURIComponent(String(payload.queueId))}/miss`
      : "/api/reception/queue/miss",
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    }
  );
  return requireOk(response, "Failed to mark patient missed");
};

export const registerReceptionPatient = async (payload: {
  name: string;
  phone?: string;
  sessionId?: number | null;
  addToQueue?: boolean;
}) => {
  if (payload.addToQueue && payload.sessionId) {
    const response = await apiFetch("/api/reception/queue/walkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        phone: payload.phone,
        sessionId: payload.sessionId,
        priority: "normal",
      }),
    });
    const body = await requireOk(response, "Failed to add walk-in patient");
    return {
      success: typeof (body as any).success === "boolean" ? (body as any).success : true,
      message:
        typeof (body as any).message === "string" && (body as any).message.trim()
          ? (body as any).message
          : "Patient added to queue",
      patient: (body as any).data?.patient ?? null,
      queue: (body as any).data ?? null,
    };
  }

  const response = await apiFetch("/api/reception/patient/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await requireOk(response, "Failed to register patient");
  return {
    success: typeof (body as any).success === "boolean" ? (body as any).success : true,
    message:
      typeof (body as any).message === "string" && (body as any).message.trim()
        ? (body as any).message
        : "Patient profile created successfully",
    patient: (body as any).patient ?? (body as any).data?.patient ?? null,
    queue: (body as any).queue ?? (body as any).data?.queue ?? null,
  };
};

export const fetchReceptionAppointments = async (params?: { date?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.date) query.set("date", params.date);
  if (params?.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch(`/api/reception/appointments${suffix}`);
  return requireOk(response, "Failed to load appointments");
};

export const fetchReceptionVisits = async (params?: {
  filter?: string;
  date?: string;
  search?: string;
  doctorId?: number | null;
  sessionId?: number | null;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.filter) query.set("filter", params.filter);
  if (params?.date) query.set("date", params.date);
  if (params?.search) query.set("search", params.search);
  if (params?.doctorId) query.set("doctorId", String(params.doctorId));
  if (params?.sessionId) query.set("sessionId", String(params.sessionId));
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch(`/api/reception/visits${suffix}`);
  return requireOk(response, "Failed to load visits");
};

export const fetchReceptionVisitDetail = async (visitId: number) => {
  const response = await apiFetch(`/api/reception/visits/${visitId}`);
  return requireOk(response, "Failed to load visit details");
};

const visitMutation = async (visitId: number, action: string, fallback: string) => {
  const response = await apiFetch(`/api/reception/visits/${visitId}/${action}`, {
    method: "POST",
  });
  return requireOk(response, fallback);
};

export const checkInReceptionVisit = async (visitId: number) =>
  visitMutation(visitId, "check-in", "Failed to check in patient");
export const markReceptionVisitMissed = async (visitId: number) =>
  visitMutation(visitId, "mark-missed", "Failed to mark visit missed");
export const cancelReceptionVisit = async (visitId: number) =>
  visitMutation(visitId, "cancel", "Failed to cancel visit");
export const sendReceptionVisitToQueue = async (visitId: number) =>
  visitMutation(visitId, "send-to-queue", "Failed to send patient to queue");
export const completeReceptionVisit = async (visitId: number) =>
  visitMutation(visitId, "complete", "Failed to complete visit");

export const createReceptionVisit = async (payload: {
  sessionId: number;
  time: string;
  patientId?: number | null;
  patientName?: string;
  phone?: string;
}) => {
  const response = await apiFetch("/api/reception/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return requireOk(response, "Failed to create visit");
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
