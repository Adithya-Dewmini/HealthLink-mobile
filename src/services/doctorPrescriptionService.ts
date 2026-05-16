import { apiFetch } from "../config/api";

export type DoctorPrescriptionListItem = {
  id: string;
  consultationId: string | null;
  patient: {
    id: string | null;
    name: string;
    age: number | null;
    gender: string | null;
    profile_image?: string | null;
  };
  medicalCenter: {
    id: string;
    name: string;
    logo_url?: string | null;
    cover_image_url?: string | null;
  } | null;
  issuedAt: string | null;
  status: "Issued" | "Dispensed";
  dispensed: boolean;
  dispensedAt: string | null;
  medicineCount: number;
  qrStatus: "active" | "expired" | "unavailable" | "unknown";
  expiresAt: string | null;
};

export type DoctorPrescriptionDetail = {
  id: string;
  consultationId: string | null;
  queueId: string | null;
  issuedAt: string | null;
  status: "Issued" | "Dispensed";
  dispensed: {
    isDispensed: boolean;
    dispensedAt: string | null;
    dispensedBy: {
      id: string;
      name: string;
    } | null;
  };
  qr: {
    status: "active" | "expired" | "unavailable" | "unknown";
    expiresAt: string | null;
    available: boolean;
  };
  patient: {
    id: string | null;
    name: string;
    age: number | null;
    gender: string | null;
    profile_image?: string | null;
  };
  doctor: {
    id: string;
    name: string;
    specialization: string;
    profile_image?: string | null;
  };
  medicalCenter: {
    id: string;
    name: string;
    logo_url?: string | null;
    cover_image_url?: string | null;
  } | null;
  consultation: {
    symptoms: string | null;
    diagnosis: string | null;
    notes: string | null;
  };
  medicines: Array<{
    id: string;
    name: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | number | null;
    instructions: string | null;
  }>;
};

type DoctorPrescriptionFilters = {
  search?: string;
  status?: string;
  date?: string;
  limit?: number;
  offset?: number;
};

const parseError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  return typeof data?.message === "string" && data.message.trim() ? data.message : fallback;
};

export const fetchDoctorPrescriptions = async (
  filters: DoctorPrescriptionFilters = {}
): Promise<DoctorPrescriptionListItem[]> => {
  const query = new URLSearchParams();

  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.status?.trim()) query.set("status", filters.status.trim());
  if (filters.date?.trim()) query.set("date", filters.date.trim());
  if (Number.isFinite(filters.limit)) query.set("limit", String(filters.limit));
  if (Number.isFinite(filters.offset)) query.set("offset", String(filters.offset));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch(`/api/doctor/prescriptions${suffix}`);

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load prescriptions"));
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
};

export const fetchDoctorPrescriptionDetail = async (
  prescriptionId: string
): Promise<DoctorPrescriptionDetail> => {
  const response = await apiFetch(
    `/api/doctor/prescriptions/${encodeURIComponent(String(prescriptionId))}`
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load prescription"));
  }

  return response.json();
};
