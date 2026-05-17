export type PatientLocation = {
  id: string;
  label?: string | null;
  formattedAddress: string;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId?: string | null;
  phone?: string | null;
  deliveryNotes?: string | null;
  isDefault?: boolean;
  source: "places_search" | "current_location" | "saved_address" | "manual" | "profile";
};

export type PatientLocationDraft = Omit<PatientLocation, "id"> & {
  id?: string | null;
};

export type LocationSearchSuggestion = {
  placeId: string;
  title: string;
  subtitle?: string | null;
};
