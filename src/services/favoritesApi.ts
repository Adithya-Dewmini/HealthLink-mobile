import { apiFetch } from "../config/api";

export type FavoriteType = "doctor" | "pharmacy" | "medical_center";

export type FavoriteItem = {
  favoriteId: number;
  entityType: FavoriteType;
  entityId: string;
  unavailable: boolean;
  createdAt: string;
  name: string;
  subtitle: string | null;
  location: string | null;
  imageUrl: string | null;
  status: string | null;
  doctorId: number | null;
  clinicId: string | null;
  clinicName: string | null;
  specialization: string | null;
  medicalCenterSpecialty?: string | null;
  experienceYears: number | null;
  pharmacyId: number | null;
  medicalCenterId: string | null;
  nextAvailable: string | null;
  waitTime: string | null;
  rating: number | null;
  reviewCount: number | null;
};

export type FavoriteDoctor = {
  favoriteId: number;
  id: number;
  itemId: number;
  entityId: string;
  name: string;
  specialization: string;
  clinicId: string | null;
  clinicName: string | null;
  profileImage: string | null;
  experienceYears: number | null;
  rating: number | null;
  reviewCount: number | null;
  unavailable: boolean;
  createdAt: string;
};

export type FavoritePharmacy = {
  favoriteId: number;
  id: number;
  itemId: number;
  entityId: string;
  name: string;
  location: string;
  imageUrl: string | null;
  rating: number | null;
  status: string | null;
  unavailable: boolean;
  createdAt: string;
};

export type FavoriteMedicalCenter = {
  favoriteId: number;
  id: string;
  itemId: string;
  entityId: string;
  name: string;
  location: string;
  imageUrl: string | null;
  status: string | null;
  specialty: string | null;
  waitTime?: string | null;
  nextAvailable: string | null;
  unavailable: boolean;
  createdAt: string;
};

export type FavoritesResponse = {
  items: FavoriteItem[];
  doctors: FavoriteDoctor[];
  pharmacies: FavoritePharmacy[];
  medicalCenters: FavoriteMedicalCenter[];
};

const FAVORITES_ENDPOINT = "/api/patient/favorites";

const parseFavorites = (data: any): FavoritesResponse => ({
  items: Array.isArray(data?.items) ? data.items : [],
  doctors: Array.isArray(data?.doctors) ? data.doctors : [],
  pharmacies: Array.isArray(data?.pharmacies) ? data.pharmacies : [],
  medicalCenters: Array.isArray(data?.medicalCenters) ? data.medicalCenters : [],
});

export const getFavorites = async (): Promise<FavoritesResponse> => {
  const res = await apiFetch(FAVORITES_ENDPOINT);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to load favorites");
  }
  return parseFavorites(data);
};

export const addFavorite = async (entityType: FavoriteType, entityId: string) => {
  const res = await apiFetch(FAVORITES_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ entityType, entityId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to add favorite");
  }
  return data;
};

export const removeFavorite = async (entityType: FavoriteType, entityId: string) => {
  const res = await apiFetch(`${FAVORITES_ENDPOINT}/${entityType}/${encodeURIComponent(entityId)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 404) {
    throw new Error(data?.message || "Failed to remove favorite");
  }
  return data;
};

export const toggleFavorite = async (
  entityType: FavoriteType,
  entityId: string,
  currentValue?: boolean
) => {
  if (currentValue) {
    return removeFavorite(entityType, entityId);
  }
  return addFavorite(entityType, entityId);
};

export const checkFavorite = async (entityType: FavoriteType, entityId: string) => {
  const res = await apiFetch(`${FAVORITES_ENDPOINT}/check/${entityType}/${encodeURIComponent(entityId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to check favorite");
  }
  return { isFavorite: Boolean(data?.isFavorite) };
};
