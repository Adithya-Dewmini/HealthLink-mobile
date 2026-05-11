import { apiFetch } from "../config/api";
import { resolveImageUrl } from "../utils/imageUrl";

export type DashboardMedicalCenter = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  isOpen?: boolean | null;
  activeQueueCount?: number | null;
  doctorCount?: number | null;
};

export type DashboardPharmacy = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  isOpen?: boolean | null;
  medicineCount?: number | null;
};

type ApiRecord = Record<string, unknown>;

const asRecordArray = (value: unknown): ApiRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ApiRecord => Boolean(item) && typeof item === "object");
};

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
};

const buildCity = (row: ApiRecord): string | null =>
  asString(row.city) ?? asString(row.location) ?? asString(row.address)?.split(",")[0]?.trim() ?? null;

const normalizeMedicalCenter = (row: ApiRecord): DashboardMedicalCenter | null => {
  const id = asString(row.id) ?? asString(row.medical_center_id);
  const name = asString(row.name) ?? asString(row.clinic_name);

  if (!id || !name) {
    return null;
  }

  const imageUrl = resolveImageUrl(
    asString(row.imageUrl) ?? asString(row.image_url) ?? asString(row.cover_image_url)
  );
  const logoUrl = resolveImageUrl(asString(row.logoUrl) ?? asString(row.logo_url));
  const status = asString(row.status)?.toLowerCase() ?? "";

  return {
    id,
    name,
    address: asString(row.address) ?? asString(row.location),
    city: buildCity(row),
    imageUrl,
    logoUrl,
    isOpen: asBoolean(row.isOpen) ?? asBoolean(row.is_open) ?? (status ? status !== "closed" : null),
    activeQueueCount:
      asNumber(row.activeQueueCount) ?? asNumber(row.active_queue_count) ?? asNumber(row.queue_count),
    doctorCount: asNumber(row.doctorCount) ?? asNumber(row.doctor_count),
  };
};

const normalizePharmacy = (row: ApiRecord): DashboardPharmacy | null => {
  const id = asString(row.id);
  const name = asString(row.name);

  if (!id || !name) {
    return null;
  }

  const location = asString(row.address) ?? asString(row.location);
  const cityFromLocation = location?.split(",")[0]?.trim() || null;
  const status = asString(row.status)?.toLowerCase() ?? "";

  return {
    id,
    name,
    address: location,
    city: asString(row.city) ?? cityFromLocation,
    imageUrl: resolveImageUrl(
      asString(row.imageUrl) ??
        asString(row.image_url) ??
        asString(row.coverImageUrl) ??
        asString(row.cover_image_url)
    ),
    logoUrl: resolveImageUrl(asString(row.logoUrl) ?? asString(row.logo_url)),
    isOpen: asBoolean(row.isOpen) ?? asBoolean(row.is_open) ?? (status ? !status.includes("closed") : null),
    medicineCount: asNumber(row.medicineCount) ?? asNumber(row.medicine_count),
  };
};

export async function getDashboardMedicalCenters(): Promise<DashboardMedicalCenter[]> {
  const response = await apiFetch("/api/clinics");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string" ? payload.message : "Failed to load medical centers"
    );
  }

  const rows = asRecordArray(
    payload && typeof payload === "object" && "clinics" in payload
      ? (payload as { clinics?: unknown }).clinics
      : payload
  );

  return rows
    .map(normalizeMedicalCenter)
    .filter((item): item is DashboardMedicalCenter => item !== null);
}

export async function getDashboardPharmacies(): Promise<DashboardPharmacy[]> {
  const response = await apiFetch("/api/patients/pharmacies");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof payload?.message === "string" ? payload.message : "Failed to load pharmacies");
  }

  const rows = asRecordArray(
    payload && typeof payload === "object" && "items" in payload
      ? (payload as { items?: unknown }).items
      : payload
  );

  return rows
    .map(normalizePharmacy)
    .filter((item): item is DashboardPharmacy => item !== null);
}
