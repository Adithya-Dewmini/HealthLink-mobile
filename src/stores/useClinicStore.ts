import { useSyncExternalStore } from "react";

export type SelectedClinic = {
  id: string;
  name: string;
  location?: string;
  address?: string;
  cover_image_url?: string;
  logo_url?: string;
};

type ClinicStoreState = {
  selectedClinicId: string | null;
  selectedClinic: SelectedClinic | null;
};

let state: ClinicStoreState = {
  selectedClinicId: null,
  selectedClinic: null,
};

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

const isSameClinic = (left: SelectedClinic | null, right: SelectedClinic | null) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  return (
    left.id === right.id &&
    left.name === right.name &&
    left.location === right.location &&
    left.address === right.address &&
    left.cover_image_url === right.cover_image_url &&
    left.logo_url === right.logo_url
  );
};

export const setSelectedClinic = (clinic: SelectedClinic | null) => {
  if (state.selectedClinicId === (clinic?.id ?? null) && isSameClinic(state.selectedClinic, clinic)) {
    return;
  }

  state = {
    selectedClinicId: clinic?.id ?? null,
    selectedClinic: clinic,
  };
  emitChange();
};

export const setSelectedClinicId = (clinicId: string | null) => {
  if (state.selectedClinicId === clinicId) {
    return;
  }

  state = {
    ...state,
    selectedClinicId: clinicId,
    selectedClinic:
      state.selectedClinic && state.selectedClinic.id === clinicId ? state.selectedClinic : null,
  };
  emitChange();
};

export function useClinicStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    selectedClinicId: snapshot.selectedClinicId,
    selectedClinic: snapshot.selectedClinic,
    setSelectedClinic,
    setSelectedClinicId,
  };
}
