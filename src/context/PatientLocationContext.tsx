import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PatientLocation, PatientLocationDraft } from "../types/location";
import { apiFetch } from "../config/api";
import {
  deleteLocation as deleteStoredLocation,
  getLocationDisplayLabel,
  getSelectedDeliveryLocation,
  loadLocationState,
  saveLocation as saveStoredLocation,
  seedLocationFromProfile,
  setSelectedLocation as setStoredSelectedLocation,
} from "../services/deliveryLocationService";
import { useAuth } from "../utils/AuthContext";

type PatientLocationContextValue = {
  selectedLocation: PatientLocation | null;
  savedLocations: PatientLocation[];
  loading: boolean;
  error: string | null;
  selectLocation: (location: PatientLocation) => Promise<void>;
  saveLocation: (location: PatientLocationDraft) => Promise<void>;
  updateLocation: (id: string, updates: Partial<PatientLocation>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  refreshLocations: () => Promise<void>;
  getLocationLabel: (location?: PatientLocation | null) => string;
};

const PatientLocationContext = createContext<PatientLocationContextValue | null>(null);

export function PatientLocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [savedLocations, setSavedLocations] = useState<PatientLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const state = await loadLocationState();
      setSavedLocations(state.savedLocations);
      setSelectedLocationId(state.selectedLocationId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLocations();
  }, [refreshLocations]);

  useEffect(() => {
    if (!user || String(user.role || "").toLowerCase() !== "patient") return;
    void (async () => {
      try {
        const profileResponse = await apiFetch("/api/patients/me");
        const profile = profileResponse.ok ? await profileResponse.json().catch(() => ({})) : {};
        const state = await seedLocationFromProfile({
          address: profile?.address ?? user.address,
          city: profile?.city ?? user.city,
          phone: profile?.phone ?? user.phone,
        } as Record<string, unknown>);
        setSavedLocations(state.savedLocations);
        setSelectedLocationId(state.selectedLocationId);
      } catch {
        const state = await seedLocationFromProfile({
          address: user.address,
          city: user.city,
          phone: user.phone,
        } as Record<string, unknown>);
        setSavedLocations(state.savedLocations);
        setSelectedLocationId(state.selectedLocationId);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const selectedLocation = useMemo(
    () => savedLocations.find((location) => location.id === selectedLocationId) ?? null,
    [savedLocations, selectedLocationId]
  );

  const selectLocation = useCallback(async (location: PatientLocation) => {
    const state = await setStoredSelectedLocation(location.id, {
      savedLocations,
      selectedLocationId,
    });
    setSavedLocations(state.savedLocations);
    setSelectedLocationId(state.selectedLocationId);
  }, [savedLocations, selectedLocationId]);

  const saveLocation = useCallback(async (location: PatientLocationDraft) => {
    const state = await saveStoredLocation(location, {
      savedLocations,
      selectedLocationId,
    });
    setSavedLocations(state.savedLocations);
    setSelectedLocationId(state.selectedLocationId);
  }, [savedLocations, selectedLocationId]);

  const updateLocation = useCallback(async (id: string, updates: Partial<PatientLocation>) => {
    const current = savedLocations.find((location) => location.id === id);
    if (!current) return;
    await saveLocation({
      ...current,
      ...updates,
      id,
    });
  }, [saveLocation, savedLocations]);

  const deleteLocation = useCallback(async (id: string) => {
    const state = await deleteStoredLocation(id, {
      savedLocations,
      selectedLocationId,
    });
    setSavedLocations(state.savedLocations);
    setSelectedLocationId(state.selectedLocationId);
  }, [savedLocations, selectedLocationId]);

  const value = useMemo<PatientLocationContextValue>(() => ({
    selectedLocation,
    savedLocations,
    loading,
    error,
    selectLocation,
    saveLocation,
    updateLocation,
    deleteLocation,
    refreshLocations,
    getLocationLabel: getLocationDisplayLabel,
  }), [
    deleteLocation,
    error,
    loading,
    refreshLocations,
    saveLocation,
    savedLocations,
    selectLocation,
    selectedLocation,
    updateLocation,
  ]);

  return (
    <PatientLocationContext.Provider value={value}>
      {children}
    </PatientLocationContext.Provider>
  );
}

export const usePatientLocation = () => {
  const context = useContext(PatientLocationContext);
  if (!context) {
    throw new Error("usePatientLocation must be used inside PatientLocationProvider");
  }
  return context;
};

export { getSelectedDeliveryLocation };
