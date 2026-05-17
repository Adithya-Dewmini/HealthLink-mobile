import { apiFetch } from "../config/api";

export type DoctorDashboardLiveSession = {
  id: string | null;
  queueId?: string | null;
  doctorId: string;
  medicalCenterId?: string | null;
  medicalCenterName?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  status: "live";
  totalAppointments: number;
  checkedInCount: number;
  waitingCount: number;
  currentServingNumber?: number | null;
  nextQueueNumber?: number | null;
};

export type DoctorDashboardNextSession = {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
  medicalCenterName?: string | null;
  appointmentCount: number;
};

export type DoctorDashboardData = {
  doctor?: {
    id?: string;
    userId?: string;
    name?: string | null;
    specialization?: string | null;
    profile_image?: string | null;
  } | null;
  today?: {
    date?: string;
    sessionCount?: number;
    appointmentCount?: number;
  } | null;
  upcoming?: {
    sessionCount?: number;
    appointmentCount?: number;
  } | null;
  liveSession?: DoctorDashboardLiveSession | null;
  nextSession?: DoctorDashboardNextSession | null;
  queue?: {
    status?: string | null;
    waitingCount?: number | null;
  } | null;
};

const parseError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  return typeof data?.message === "string" && data.message.trim() ? data.message : fallback;
};

export const fetchDoctorDashboard = async (): Promise<DoctorDashboardData> => {
  const response = await apiFetch("/api/doctor/dashboard");

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load doctor dashboard"));
  }

  return response.json();
};
