import { apiFetch } from "../config/api";
import type { AppointmentApiItem, AppointmentItem } from "../types/appointments";
import { normalizeAppointment } from "../utils/appointments";

const parseErrorMessage = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = String((payload as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
};

export const fetchAppointments = async (): Promise<AppointmentItem[]> => {
  const response = await apiFetch("/api/patients/bookings");
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to load appointments"));
  }

  const payload = await response.json();
  const rows = Array.isArray(payload) ? (payload as AppointmentApiItem[]) : [];
  return rows.map(normalizeAppointment).filter((item) => item.id);
};

export const cancelAppointment = async (bookingId: string) => {
  const response = await apiFetch(`/api/patients/bookings/${bookingId}/cancel`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to cancel appointment"));
  }
};

export const rescheduleAppointment = async (bookingId: string, date: string, time: string) => {
  const response = await apiFetch(`/api/patients/bookings/${bookingId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({ date, time }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to reschedule appointment"));
  }
};
