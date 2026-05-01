import { apiFetch } from "../config/api";

export type Specialty = {
  id: string;
  name: string;
  clinic_id: string;
  created_at: string;
};

const getResponseErrorMessage = async (response: Response, fallback: string) => {
  const raw = await response.text().catch(() => "");
  if (raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
      if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
    } catch {
      return raw.trim();
    }
  }
  return `${fallback} (HTTP ${response.status})`;
};

export const fetchSpecialties = async (): Promise<Specialty[]> => {
  const response = await apiFetch("/api/clinic-specialties");
  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response, "Failed to load specialties"));
  }

  const data = (await response.json().catch(() => [])) as Specialty[];
  return Array.isArray(data) ? data : [];
};

export const createClinicSpecialty = async (name: string): Promise<Specialty> => {
  const response = await apiFetch("/api/clinic-specialties", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response, "Failed to create specialty"));
  }

  return response.json();
};

export const updateClinicSpecialty = async (specialtyId: string, name: string): Promise<Specialty> => {
  const response = await apiFetch(`/api/clinic-specialties/${encodeURIComponent(specialtyId)}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response, "Failed to update specialty"));
  }

  return response.json();
};

export const deleteClinicSpecialty = async (specialtyId: string) => {
  const response = await apiFetch(`/api/clinic-specialties/${encodeURIComponent(specialtyId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response, "Failed to delete specialty"));
  }

  return response.json();
};

export const updateDoctorSpecialty = async (relationshipId: string, specialtyId: string | null) => {
  const response = await apiFetch(`/api/doctor-clinics/${encodeURIComponent(relationshipId)}`, {
    method: "PATCH",
    body: JSON.stringify({ clinic_specialty_id: specialtyId }),
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response, "Failed to update doctor specialty"));
  }

  return response.json();
};
