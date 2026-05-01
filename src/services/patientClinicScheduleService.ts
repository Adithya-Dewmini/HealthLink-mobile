import { apiFetch } from "../config/api";

export type ClinicDoctorSession = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  booked_count: number;
  available_slots: number;
  is_fully_booked: boolean;
  status: "NOT_STARTED" | "LIVE" | "CLOSED";
};

export type ClinicDoctorScheduleResponse = {
  clinic_id: string;
  clinic_name: string;
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  next_session: ClinicDoctorSession | null;
  sessions: ClinicDoctorSession[];
};

export const fetchClinicDoctorSchedule = async (clinicId: string, doctorId: number | string) => {
  const response = await apiFetch(
    `/api/clinics/${encodeURIComponent(clinicId)}/doctors/${encodeURIComponent(String(doctorId))}/schedule`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to load clinic schedule");
  }

  return (await response.json()) as ClinicDoctorScheduleResponse;
};

export const fetchClinicDoctorBookedSlots = async (
  clinicId: string,
  doctorId: number | string,
  date: string
) => {
  const response = await apiFetch(
    `/api/patients/doctor/bookings/${encodeURIComponent(String(doctorId))}?clinicId=${encodeURIComponent(clinicId)}&date=${encodeURIComponent(date)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to load booked slots");
  }

  const rows = (await response.json()) as Array<{ time?: string }>;
  return Array.isArray(rows) ? rows.map((row) => String(row.time || "").slice(0, 5)) : [];
};

export const generateSessionSlots = (session: {
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
}) => {
  const [startHour, startMinute] = String(session.start_time).slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = String(session.end_time).slice(0, 5).split(":").map(Number);

  if (
    [startHour, startMinute, endHour, endMinute].some((value) => Number.isNaN(value)) ||
    session.slot_duration <= 0 ||
    session.max_patients <= 0
  ) {
    return [];
  }

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const slots: string[] = [];

  for (
    let totalMinutes = startTotal, index = 0;
    totalMinutes + session.slot_duration <= endTotal && index < session.max_patients;
    totalMinutes += session.slot_duration, index += 1
  ) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }

  return slots;
};
