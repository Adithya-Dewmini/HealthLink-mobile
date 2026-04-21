import { apiFetch } from "../config/api";

export type FavoriteDoctor = {
  favoriteId: number;
  id: number;
  itemId: number;
  name: string;
  specialization: string;
  experienceYears: number | null;
  createdAt: string;
};

export type FavoritePharmacy = {
  favoriteId: number;
  id: number;
  itemId: number;
  name: string;
  location: string;
  imageUrl: string | null;
  rating: number | null;
  status: string | null;
  createdAt: string;
};

export type FavoritesResponse = {
  doctors: FavoriteDoctor[];
  pharmacies: FavoritePharmacy[];
};

export const getFavorites = async (): Promise<FavoritesResponse> => {
  const res = await apiFetch("/api/favorites");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to load favorites");
  }
  return {
    doctors: Array.isArray(data?.doctors) ? data.doctors : [],
    pharmacies: Array.isArray(data?.pharmacies) ? data.pharmacies : [],
  };
};

export const addFavorite = async (itemId: number, itemType: "doctor" | "pharmacy") => {
  const res = await apiFetch("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ itemId, itemType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409) {
    throw new Error(data?.message || "Failed to add favorite");
  }
  return data;
};

export const removeFavorite = async (itemId: number, itemType: "doctor" | "pharmacy") => {
  const res = await apiFetch("/api/favorites", {
    method: "DELETE",
    body: JSON.stringify({ itemId, itemType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 404) {
    throw new Error(data?.message || "Failed to remove favorite");
  }
  return data;
};
