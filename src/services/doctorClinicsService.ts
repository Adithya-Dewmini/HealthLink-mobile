import { api } from "../api/client";

export type DoctorClinicItem = {
  id: string;
  relationship_id?: string;
  name: string;
  location?: string;
  address?: string;
  cover_image_url?: string;
  logo_url?: string;
};

export type DoctorClinicsResponse = {
  active: DoctorClinicItem[];
  pending: DoctorClinicItem[];
};

const normalizeClinic = (value: unknown): DoctorClinicItem | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const clinic = value as {
    id?: unknown;
    relationship_id?: unknown;
    medical_center_id?: unknown;
    name?: unknown;
    location?: unknown;
    address?: unknown;
    cover_image_url?: unknown;
    logo_url?: unknown;
  };
  const relationshipId = String(clinic.relationship_id ?? clinic.id ?? "").trim();
  const id = String(clinic.medical_center_id ?? clinic.id ?? "").trim();
  const name = String(clinic.name || "").trim();
  const location = String(clinic.location || "").trim();
  const address = String(clinic.address || "").trim();
  const coverImageUrl = String(clinic.cover_image_url || "").trim();
  const logoUrl = String(clinic.logo_url || "").trim();

  if (!id || !name) {
    return null;
  }

  return {
    id,
    relationship_id: relationshipId || undefined,
    name,
    location: location || undefined,
    address: address || undefined,
    cover_image_url: coverImageUrl || undefined,
    logo_url: logoUrl || undefined,
  };
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
  ) {
    return String((error as { response?: { data?: { message?: string } } }).response?.data?.message);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const fetchDoctorClinics = async (): Promise<DoctorClinicsResponse> => {
  try {
    const response = await api.get("/api/doctors/my-clinics");
    const data = response.data as Partial<DoctorClinicsResponse>;

    return {
      active: Array.isArray(data?.active) ? data.active.map(normalizeClinic).filter(Boolean) as DoctorClinicItem[] : [],
      pending: Array.isArray(data?.pending) ? data.pending.map(normalizeClinic).filter(Boolean) as DoctorClinicItem[] : [],
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to load clinics"));
  }
};

export const acceptDoctorClinicInvite = async (clinicId: string) => {
  try {
    await api.post(`/api/doctors/my-clinics/${clinicId}/accept`);
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to accept clinic invitation"));
  }
};

export const rejectDoctorClinicInvite = async (clinicId: string) => {
  try {
    await api.post(`/api/doctors/my-clinics/${clinicId}/reject`);
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Failed to reject clinic invitation"));
  }
};
