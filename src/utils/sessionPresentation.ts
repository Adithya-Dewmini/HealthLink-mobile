export type SessionStatus = "Upcoming" | "Live" | "Completed" | "Cancelled" | "Full";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, "0");

export const formatLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateOnlyString = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeSessionDateValue = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (DATE_ONLY_PATTERN.test(raw)) return raw;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatLocalDateKey(parsed);
  }

  const datePortion = raw.split("T")[0] || raw;
  return DATE_ONLY_PATTERN.test(datePortion) ? datePortion : raw;
};

export const parseSessionDate = (value?: string | null) => {
  const normalized = normalizeSessionDateValue(value);
  if (DATE_ONLY_PATTERN.test(normalized)) {
    return parseDateOnlyString(normalized);
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatSessionDateLabel = (value?: string | null) => {
  const parsed = parseSessionDate(value);
  if (!parsed) return String(value || "--");

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
};

export const formatSessionFullDateLabel = (value?: string | null) => {
  const parsed = parseSessionDate(value);
  if (!parsed) return String(value || "--");

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
};

export const formatSessionTimeLabel = (value?: string | null) => {
  const raw = String(value || "").trim().slice(0, 5);
  const [hours, minutes] = raw.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return raw || "--:--";

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${pad(hour12)}:${pad(minutes)} ${period}`;
};

export const formatSessionTimeRangeLabel = (startTime?: string | null, endTime?: string | null) =>
  `${formatSessionTimeLabel(startTime)} - ${formatSessionTimeLabel(endTime)}`;

const buildSessionDateTime = (date: string, time?: string | null) => {
  const parsedDate = parseSessionDate(date);
  const normalizedTime = String(time || "").trim().slice(0, 5);
  const [hours, minutes] = normalizedTime.split(":").map(Number);

  if (!parsedDate || !Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    hours,
    minutes,
    0,
    0
  );
};

export const getSessionStatus = (input: {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  isActive: boolean;
  availableSlots: number;
}): SessionStatus => {
  if (!input.isActive) return "Cancelled";
  if (input.availableSlots <= 0) return "Full";

  const now = new Date();
  const startAt = buildSessionDateTime(input.date, input.startTime);
  const endAt = buildSessionDateTime(input.date, input.endTime);

  if (startAt && endAt) {
    if (now > endAt) return "Completed";
    if (now >= startAt && now <= endAt) return "Live";
  }

  return "Upcoming";
};

export const formatSessionAvailabilityLine = (input: {
  bookedCount: number;
  maxPatients: number;
  availableSlots: number;
}) => {
  if (input.bookedCount > 0) {
    return `${input.bookedCount}/${input.maxPatients} booked`;
  }

  return `${input.availableSlots} slots available`;
};
