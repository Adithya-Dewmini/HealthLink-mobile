const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, "0");

const buildLocalDate = (year: number, month: number, day: number) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseDateOnly = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  if (DATE_ONLY_PATTERN.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return buildLocalDate(year, month, day);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return buildLocalDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
};

export const formatShortDate = (value: unknown, fallback = "Date unavailable") => {
  const parsed = parseDateOnly(value);
  if (!parsed) return fallback;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
};

export const formatDateLabel = (value: unknown, fallback = "Date unavailable") => {
  const parsed = parseDateOnly(value);
  if (!parsed) return fallback;

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

export const normalizeDateSearchText = (value: unknown) => {
  const parsed = parseDateOnly(value);
  if (!parsed) return "";

  const key = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  const shortLabel = formatShortDate(parsed, "");
  const fullLabel = formatDateLabel(parsed, "");
  return `${key} ${shortLabel} ${fullLabel}`.trim().toLowerCase();
};

export const formatTimeLabel = (value: unknown, fallback = "Time unavailable") => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  const normalized = raw.length >= 5 ? raw.slice(0, 5) : raw;
  const parsed = new Date(`1970-01-01T${normalized.length === 5 ? `${normalized}:00` : normalized}`);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
};

export const formatTimeRangeLabel = (
  start: unknown,
  end: unknown,
  fallback = "Time unavailable"
) => {
  const startLabel = formatTimeLabel(start, "");
  const endLabel = formatTimeLabel(end, "");
  if (!startLabel || !endLabel) return fallback;
  return `${startLabel} - ${endLabel}`;
};

export const formatLongDateLabel = (value: unknown, fallback = "Date unavailable") => {
  const parsed = parseDateOnly(value);
  if (!parsed) return fallback;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(parsed);
};
