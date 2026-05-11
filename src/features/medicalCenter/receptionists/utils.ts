import { DEFAULT_PERMISSIONS } from "./constants";
import type { FilterValue, Receptionist, ReceptionistPermissions, ReceptionistStatus } from "./types";
import { normalizeReceptionistPermissions } from "../../../utils/receptionistPermissions";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

const readIdString = (value: unknown, fallback = "") => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const readBoolean = (value: unknown) => value === true;

const readNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const getStatus = (user: { is_password_set?: boolean; status?: string }): ReceptionistStatus => {
  if (!user.is_password_set) return "PENDING";
  if (String(user.status || "").toUpperCase() === "INACTIVE") return "DISABLED";

  const normalizedStatus = String(user.status || "").toUpperCase();
  if (normalizedStatus === "PENDING" || normalizedStatus === "DISABLED") {
    return normalizedStatus;
  }

  return "ACTIVE";
};

export const parseReceptionistPermissions = (
  value: unknown
): ReceptionistPermissions => {
  if (!isRecord(value)) {
    return DEFAULT_PERMISSIONS;
  }

  return normalizeReceptionistPermissions(value);
};

export const parseReceptionist = (value: unknown): Receptionist | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = readIdString(value.id);
  const userId = readNumber(value.user_id, Number.NaN);

  if (!id || !Number.isFinite(userId) || userId <= 0) {
    return null;
  }

  return {
    id,
    userId,
    name: readString(value.name, "Receptionist"),
    email: readString(value.email),
    phone: readString(value.phone, "No phone added"),
    status: getStatus({
      is_password_set: readBoolean(value.is_password_set),
      status: readString(value.status),
    }),
    isPasswordSet: readBoolean(value.is_password_set),
    createdAt: readString(value.created_at),
    permissions: parseReceptionistPermissions(value.permissions),
  };
};

export const parseReceptionistList = (value: unknown) =>
  Array.isArray(value) ? value.map(parseReceptionist).filter((item): item is Receptionist => item !== null) : [];

export const getPermissionBadges = (permissions: ReceptionistPermissions) => {
  const badges: string[] = [];

  if (permissions.queue_access) badges.push("Queue Access");
  if (permissions.appointments) badges.push("Appointments");
  if (permissions.check_in) badges.push("Check-in");
  if (permissions.schedule_management) badges.push("Schedule Management");

  return badges;
};

export const matchesReceptionistFilter = (
  receptionist: Receptionist,
  filter: FilterValue,
  query: string
) => {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesSearch =
    normalizedQuery.length === 0 ||
    receptionist.name.toLowerCase().includes(normalizedQuery) ||
    receptionist.phone.toLowerCase().includes(normalizedQuery) ||
    receptionist.email.toLowerCase().includes(normalizedQuery);

  if (!matchesSearch) {
    return false;
  }

  if (filter === "pending") return receptionist.status === "PENDING";
  if (filter === "active") return receptionist.status === "ACTIVE";
  if (filter === "disabled") return receptionist.status === "DISABLED";

  return true;
};

export const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
