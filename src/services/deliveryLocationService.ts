import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PatientLocation, PatientLocationDraft } from "../types/location";

type LocationState = {
  selectedLocationId: string | null;
  savedLocations: PatientLocation[];
};

const SELECTED_STORAGE_KEY = "healthlink.patient.selectedLocation";
const SAVED_STORAGE_KEY = "healthlink.patient.savedLocations";

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLocation = (value: PatientLocationDraft): PatientLocation => ({
  id: String(value.id || `loc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  label: asString(value.label),
  formattedAddress: asString(value.formattedAddress) || asString(value.line1) || "Unknown location",
  line1: asString(value.line1),
  line2: asString(value.line2),
  city: asString(value.city),
  district: asString(value.district),
  province: asString(value.province),
  country: asString(value.country),
  postalCode: asString(value.postalCode),
  latitude: asNumber(value.latitude),
  longitude: asNumber(value.longitude),
  placeId: asString(value.placeId),
  phone: asString(value.phone),
  deliveryNotes: asString(value.deliveryNotes),
  isDefault: Boolean(value.isDefault),
  source:
    value.source === "places_search" ||
    value.source === "current_location" ||
    value.source === "saved_address" ||
    value.source === "manual" ||
    value.source === "profile"
      ? value.source
      : "manual",
});

export const getLocationDisplayLabel = (location?: PatientLocation | null) => {
  if (!location) return "Add location";
  return location.label || location.city || location.formattedAddress || "Set location";
};

export const loadSavedLocations = async (): Promise<PatientLocation[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeLocation((entry || {}) as PatientLocationDraft))
      .filter((entry) => Boolean(entry.formattedAddress));
  } catch {
    return [];
  }
};

export const saveSavedLocations = async (locations: PatientLocation[]) => {
  await AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(locations.map(normalizeLocation)));
};

export const loadSelectedLocationId = async (): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(SELECTED_STORAGE_KEY);
    return asString(value);
  } catch {
    return null;
  }
};

export const saveSelectedLocationId = async (locationId: string | null) => {
  if (!locationId) {
    await AsyncStorage.removeItem(SELECTED_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(SELECTED_STORAGE_KEY, locationId);
};

export const loadLocationState = async (): Promise<LocationState> => {
  const [savedLocations, selectedLocationId] = await Promise.all([
    loadSavedLocations(),
    loadSelectedLocationId(),
  ]);

  return {
    savedLocations,
    selectedLocationId:
      selectedLocationId && savedLocations.some((location) => location.id === selectedLocationId)
        ? selectedLocationId
        : savedLocations.find((location) => location.isDefault)?.id || savedLocations[0]?.id || null,
  };
};

export const persistLocationState = async (state: LocationState) => {
  await Promise.all([
    saveSavedLocations(state.savedLocations),
    saveSelectedLocationId(state.selectedLocationId),
  ]);
};

export const buildProfileLocation = (profile: {
  address?: unknown;
  city?: unknown;
  phone?: unknown;
}) => {
  const address = asString(profile.address);
  const city = asString(profile.city);
  if (!address && !city) return null;

  return normalizeLocation({
    id: "profile-default",
    label: "Home",
    formattedAddress: address || city || "Home",
    line1: address || city,
    city,
    phone: asString(profile.phone),
    latitude: null,
    longitude: null,
    isDefault: true,
    source: "profile",
  });
};

export const seedLocationFromProfile = async (profile: {
  address?: unknown;
  city?: unknown;
  phone?: unknown;
}) => {
  const profileLocation = buildProfileLocation(profile);
  const state = await loadLocationState();
  if (!profileLocation) {
    return state;
  }

  const existingIndex = state.savedLocations.findIndex((item) => item.id === profileLocation.id);
  const nextSaved = [...state.savedLocations];

  if (existingIndex >= 0) {
    nextSaved[existingIndex] = {
      ...nextSaved[existingIndex],
      ...profileLocation,
      label: nextSaved[existingIndex].label || profileLocation.label,
    };
  } else {
    nextSaved.unshift(profileLocation);
  }

  const nextState = {
    savedLocations: nextSaved,
    selectedLocationId: state.selectedLocationId || profileLocation.id,
  };
  await persistLocationState(nextState);
  return nextState;
};

export const saveLocation = async (draft: PatientLocationDraft, currentState?: LocationState) => {
  const state = currentState ?? (await loadLocationState());
  const nextLocation = normalizeLocation(draft);
  const existingIndex = state.savedLocations.findIndex((item) => item.id === nextLocation.id);
  const nextSaved = [...state.savedLocations];

  if (nextLocation.isDefault) {
    for (let index = 0; index < nextSaved.length; index += 1) {
      nextSaved[index] = { ...nextSaved[index], isDefault: false };
    }
  }

  if (existingIndex >= 0) {
    nextSaved[existingIndex] = nextLocation;
  } else {
    nextSaved.unshift(nextLocation);
  }

  const nextState = {
    savedLocations: nextSaved,
    selectedLocationId: nextLocation.id,
  };
  await persistLocationState(nextState);
  return nextState;
};

export const deleteLocation = async (locationId: string, currentState?: LocationState) => {
  const state = currentState ?? (await loadLocationState());
  const nextSaved = state.savedLocations.filter((item) => item.id !== locationId);
  const nextSelectedId =
    state.selectedLocationId === locationId
      ? nextSaved.find((item) => item.isDefault)?.id || nextSaved[0]?.id || null
      : state.selectedLocationId;
  const nextState = {
    savedLocations: nextSaved,
    selectedLocationId: nextSelectedId,
  };
  await persistLocationState(nextState);
  return nextState;
};

export const setSelectedLocation = async (locationId: string, currentState?: LocationState) => {
  const state = currentState ?? (await loadLocationState());
  const nextState = {
    savedLocations: state.savedLocations,
    selectedLocationId: locationId,
  };
  await persistLocationState(nextState);
  return nextState;
};

export const getSelectedDeliveryLocation = async () => {
  const state = await loadLocationState();
  return state.savedLocations.find((item) => item.id === state.selectedLocationId) ?? null;
};

export type { PatientLocation, PatientLocationDraft };
