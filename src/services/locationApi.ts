import Constants from "expo-constants";
import type { LocationSearchSuggestion, PatientLocation } from "../types/location";

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";

const ensureApiKey = () => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key is missing. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.");
  }
};

const pickAddressPart = (components: Array<{ long_name?: string; short_name?: string; types?: string[] }>, type: string) =>
  components.find((component) => Array.isArray(component.types) && component.types.includes(type))?.long_name || null;

const normalizeResolvedLocation = (payload: {
  formatted_address?: string;
  address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
  geometry?: { location?: { lat?: number; lng?: number } };
  place_id?: string;
  source: PatientLocation["source"];
}): PatientLocation => {
  const components = Array.isArray(payload.address_components) ? payload.address_components : [];
  const streetNumber = pickAddressPart(components, "street_number");
  const route = pickAddressPart(components, "route");
  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim() || payload.formatted_address || "Selected location";

  return {
    id: payload.place_id || `loc-${Date.now()}`,
    formattedAddress: payload.formatted_address || line1,
    line1,
    city: pickAddressPart(components, "locality") || pickAddressPart(components, "administrative_area_level_2"),
    district: pickAddressPart(components, "administrative_area_level_2"),
    province: pickAddressPart(components, "administrative_area_level_1"),
    country: pickAddressPart(components, "country"),
    postalCode: pickAddressPart(components, "postal_code"),
    latitude:
      typeof payload.geometry?.location?.lat === "number" ? payload.geometry.location.lat : null,
    longitude:
      typeof payload.geometry?.location?.lng === "number" ? payload.geometry.location.lng : null,
    placeId: payload.place_id || null,
    source: payload.source,
  };
};

export const searchPlaces = async (query: string): Promise<LocationSearchSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];
  ensureApiKey();

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(trimmed)}&key=${GOOGLE_MAPS_API_KEY}&components=country:lk`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.status === "REQUEST_DENIED") {
    throw new Error("Could not search addresses right now. Please try again.");
  }

  const predictions = Array.isArray(payload?.predictions) ? payload.predictions : [];
  return predictions.map((item: any) => ({
    placeId: String(item?.place_id || ""),
    title: typeof item?.structured_formatting?.main_text === "string" ? item.structured_formatting.main_text : String(item?.description || "").split(",")[0] || "Address",
    subtitle:
      typeof item?.structured_formatting?.secondary_text === "string"
        ? item.structured_formatting.secondary_text
        : typeof item?.description === "string"
          ? item.description
          : null,
  })).filter((item: LocationSearchSuggestion) => item.placeId);
};

export const getPlaceDetails = async (placeId: string): Promise<PatientLocation> => {
  ensureApiKey();
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,address_component,geometry,place_id&key=${GOOGLE_MAPS_API_KEY}`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.result) {
    throw new Error("Could not load that address. Please try again.");
  }

  return normalizeResolvedLocation({
    ...payload.result,
    address_components: payload.result.address_components,
    source: "places_search",
  });
};

export const reverseGeocodeCoordinates = async (latitude: number, longitude: number): Promise<PatientLocation> => {
  ensureApiKey();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !Array.isArray(payload?.results) || payload.results.length === 0) {
    throw new Error("Could not resolve your current location. Please search manually.");
  }

  return normalizeResolvedLocation({
    ...payload.results[0],
    source: "current_location",
  });
};

export const getCurrentLocationSelection = async (): Promise<PatientLocation> => {
  let ExpoLocation: any;
  try {
    ExpoLocation = await import("expo-location");
  } catch {
    throw new Error("Current location requires expo-location in this build. Search for an address instead.");
  }

  const permission = await ExpoLocation.requestForegroundPermissionsAsync();
  if (permission?.status !== "granted") {
    throw new Error("Location permission was denied. Search for an address instead.");
  }

  const position = await ExpoLocation.getCurrentPositionAsync({
    accuracy: 3,
  });

  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Could not resolve your current location. Please search manually.");
  }

  const location = await reverseGeocodeCoordinates(latitude, longitude);
  return {
    ...location,
    latitude,
    longitude,
    source: "current_location",
  };
};
