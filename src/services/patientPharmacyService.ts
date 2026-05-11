import { apiFetch } from "../config/api";

export type PatientPharmacy = {
  id: number;
  name: string;
  location: string;
  imageUrl: string | null;
  rating: number | null;
  status: string;
  verificationStatus: string;
};

type PatientPharmacyApiItem = {
  id?: string | number | null;
  name?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  rating?: number | string | null;
  status?: string | null;
  verificationStatus?: string | null;
};

const normalizePharmacy = (item: PatientPharmacyApiItem): PatientPharmacy | null => {
  const id = Number(item?.id);
  if (!Number.isFinite(id)) {
    return null;
  }

  const rating = item?.rating == null ? null : Number(item.rating);

  return {
    id,
    name: item?.name?.trim() || "Unnamed pharmacy",
    location: item?.location?.trim() || "Location not provided",
    imageUrl: item?.imageUrl || null,
    rating: Number.isFinite(rating) ? rating : null,
    status: item?.status?.trim() || "Available",
    verificationStatus: item?.verificationStatus?.trim() || "pending",
  };
};

export const getPatientPharmacies = async (search?: string): Promise<PatientPharmacy[]> => {
  const query = search?.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";
  const res = await apiFetch(`/api/patients/pharmacies${query}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load pharmacies");
  }

  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((item: PatientPharmacyApiItem) => normalizePharmacy(item))
    .filter((item: PatientPharmacy | null): item is PatientPharmacy => item !== null);
};
