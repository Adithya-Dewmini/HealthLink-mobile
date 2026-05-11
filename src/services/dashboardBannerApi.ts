import { apiFetch } from "../config/api";
import { resolveImageUrl } from "../utils/imageUrl";

export type DashboardBanner = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  imageUrl: string;
  targetType?:
    | "none"
    | "medical_center"
    | "pharmacy"
    | "doctor"
    | "prescription_upload"
    | "appointments"
    | string
    | null;
  targetId?: string | null;
  targetScreen?: string | null;
};

type ApiRecord = Record<string, unknown>;

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asRecordArray = (value: unknown): ApiRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ApiRecord => Boolean(item) && typeof item === "object");
};

const normalizeBanner = (row: ApiRecord): DashboardBanner | null => {
  const id = asString(row.id);
  const title = asString(row.title);
  const rawImageUrl = asString(row.imageUrl) ?? asString(row.image_url);
  const imageUrl = resolveImageUrl(rawImageUrl);

  if (!id || !imageUrl) {
    return null;
  }

  return {
    id,
    title,
    subtitle: asString(row.subtitle),
    imageUrl,
    targetType: asString(row.targetType) ?? asString(row.target_type),
    targetId: asString(row.targetId) ?? asString(row.target_id),
    targetScreen: asString(row.targetScreen) ?? asString(row.target_screen),
  };
};

export async function getDashboardBanners(): Promise<DashboardBanner[]> {
  const response = await apiFetch("/api/patient/dashboard-banners");
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof payload?.message === "string" ? payload.message : "Failed to load dashboard banners");
  }

  const rows = asRecordArray(
    payload && typeof payload === "object" && "items" in payload
      ? (payload as { items?: unknown }).items
      : payload
  );

  return rows.map(normalizeBanner).filter((item): item is DashboardBanner => item !== null);
}
