import type {
  AppointmentApiItem,
  AppointmentBackendStatus,
  AppointmentItem,
  AppointmentStatus,
} from "../types/appointments";

const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_REGEX = /^\d{2}:\d{2}$/;

export const APPOINTMENT_TABS: AppointmentStatus[] = ["UPCOMING", "COMPLETED", "CANCELLED", "MISSED"];

export const normalizeAppointmentBackendStatus = (value: unknown): AppointmentBackendStatus => {
  const normalized = String(value ?? "BOOKED").trim().toUpperCase();
  switch (normalized) {
    case "BOOKED":
    case "CONFIRMED":
    case "IN_PROGRESS":
    case "COMPLETED":
    case "MISSED":
    case "CANCELLED":
      return normalized;
    default:
      return "BOOKED";
  }
};

export const deriveAppointmentStatus = (
  backendStatus: AppointmentBackendStatus,
  scheduledAt: string | null
): AppointmentStatus => {
  if (backendStatus === "COMPLETED") return "COMPLETED";
  if (backendStatus === "CANCELLED") return "CANCELLED";
  if (backendStatus === "MISSED") return "MISSED";

  if (scheduledAt) {
    const scheduledTime = new Date(scheduledAt).getTime();
    if (!Number.isNaN(scheduledTime) && Date.now() > scheduledTime + 30 * 60 * 1000) {
      return "MISSED";
    }
  }

  return "UPCOMING";
};

export const formatAppointmentDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

export const formatAppointmentTime = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

export const validateRescheduleInput = (date: string, time: string) => {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();

  if (!DATE_INPUT_REGEX.test(normalizedDate)) {
    return { ok: false as const, message: "Date must be in YYYY-MM-DD format." };
  }
  if (!TIME_INPUT_REGEX.test(normalizedTime)) {
    return { ok: false as const, message: "Time must be in HH:MM format." };
  }

  const requestedDate = new Date(`${normalizedDate}T${normalizedTime}:00`);
  if (Number.isNaN(requestedDate.getTime())) {
    return { ok: false as const, message: "Invalid appointment date or time." };
  }
  if (requestedDate.getTime() <= Date.now()) {
    return { ok: false as const, message: "Reschedule time must be in the future." };
  }

  return { ok: true as const };
};

export const normalizeAppointment = (item: AppointmentApiItem): AppointmentItem => {
  const rawDate = String(item.date ?? "").slice(0, 10);
  const rawTime = String(item.time ?? "").slice(0, 5);
  const scheduledAt =
    item.scheduled_at && !Number.isNaN(new Date(item.scheduled_at).getTime())
      ? new Date(item.scheduled_at).toISOString()
      : rawDate && rawTime
        ? new Date(`${rawDate}T${rawTime}:00`).toISOString()
        : null;

  const backendStatus = normalizeAppointmentBackendStatus(item.status);

  return {
    id: String(item.id ?? ""),
    doctorId: Number.isFinite(Number(item.doctor_id)) ? Number(item.doctor_id) : null,
    clinicId: typeof item.medical_center_id === "string" ? item.medical_center_id : null,
    clinicName: item.medical_center_name ?? "Medical Center",
    sessionId: Number.isFinite(Number(item.session_id)) ? Number(item.session_id) : null,
    doctor: item.doctor_name ?? "Doctor",
    type: "Appointment",
    location: item.medical_center_name ?? "Medical Center",
    rawDate,
    rawTime,
    displayDate: formatAppointmentDate(rawDate),
    displayTime: formatAppointmentTime(rawTime),
    scheduledAt,
    backendStatus,
    status: deriveAppointmentStatus(backendStatus, scheduledAt),
    isLate: Boolean(item.is_late),
    startedAt: item.started_at ?? null,
    endedAt: item.ended_at ?? null,
    cancelledBy: item.cancelledBy ?? null,
    cancelledReason: item.cancelledReason ?? null,
    missedAt: item.missedAt ?? null,
  };
};

export const getAppointmentCounts = (appointments: AppointmentItem[]) => {
  return {
    UPCOMING: appointments.filter((item) => item.status === "UPCOMING").length,
    COMPLETED: appointments.filter((item) => item.status === "COMPLETED").length,
    CANCELLED: appointments.filter((item) => item.status === "CANCELLED").length,
    MISSED: appointments.filter((item) => item.status === "MISSED").length,
  };
};
