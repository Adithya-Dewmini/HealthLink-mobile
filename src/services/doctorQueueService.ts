import { api } from "./apiClient";

export type DoctorQueueStatus = "NOT_STARTED" | "LIVE" | "PAUSED" | "ENDED" | "IDLE";

export type DoctorQueuePatient = {
  id?: number | string | null;
  queue_id?: number | string | null;
  patient_id?: number | null;
  consultation_id?: number | string | null;
  name?: string | null;
  profile_image?: string | null;
  age?: number | null;
  gender?: string | null;
  token_number?: number | string | null;
  status?: string | null;
  appointment_time?: string | null;
  appointmentTime?: string | null;
  scheduled_time?: string | null;
  symptoms?: string | null;
  notes?: string | null;
  note?: string | null;
  type?: string | null;
};

export type DoctorQueueDashboard = {
  doctor?: {
    id?: number | string | null;
    name?: string | null;
    profile_image?: string | null;
  } | null;
  queue?: {
    id?: number | string | null;
    name?: string | null;
    status?: string | null;
    waitingCount?: number | null;
    completedCount?: number | null;
    sessionId?: number | string | null;
    medicalCenterId?: string | null;
    medicalCenterName?: string | null;
    sessionDate?: string | null;
    sessionStart?: string | null;
    sessionEnd?: string | null;
    location?: string | null;
    cover_image_url?: string | null;
    logo_url?: string | null;
  } | null;
  patients?: DoctorQueuePatient[];
  currentPatient?: DoctorQueuePatient | null;
};

export type DoctorDailyReport = {
  dailySummary?: {
    totalPatients?: number | null;
    averageConsultationMinutes?: number | null;
    completedPatients?: number | null;
    missedPatients?: number | null;
  } | null;
};

export const getQueueDashboard = async (
  token: string,
  options?: { scheduleId?: string | number | null }
) => {
  const res = await api.get("/api/doctor/queue/dashboard", {
    params:
      options?.scheduleId != null
        ? {
            scheduleId: options.scheduleId,
          }
        : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data as DoctorQueueDashboard;
};

export const startQueue = async (token: string, scheduleId?: string | number | null) => {
  const res = await api.post(
    "/api/doctor/queue/start",
    scheduleId != null ? { scheduleId } : {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const callNextPatient = async (token: string) => {
  const res = await api.post(
    "/api/doctor/queue/next",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const skipPatient = async (token: string) => {
  const res = await api.post(
    "/api/doctor/queue/skip",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const endClinic = async (token: string, force = false) => {
  const res = await api.post(
    "/api/doctor/queue/end",
    { force },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

export const getDailyReport = async (token: string, date?: string) => {
  const res = await api.get("/api/doctor/reports/daily", {
    params: date ? { date } : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data as DoctorDailyReport;
};
