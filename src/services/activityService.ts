import { apiFetch } from "../config/api";

export type ActivityItem = {
  id: number;
  userId: number | null;
  orderId: number | null;
  prescriptionId: string | null;
  queueId: number | null;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const parseError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  return typeof payload?.message === "string" && payload.message.trim() ? payload.message : fallback;
};

const normalizeActivityItem = (item: any): ActivityItem => ({
  id: Number(item?.id ?? 0),
  userId: item?.userId === null || item?.user_id === null ? null : Number(item?.userId ?? item?.user_id ?? 0),
  orderId: item?.orderId === null || item?.order_id === null ? null : Number(item?.orderId ?? item?.order_id ?? 0),
  prescriptionId:
    item?.prescriptionId === null || item?.prescription_id === null
      ? null
      : String(item?.prescriptionId ?? item?.prescription_id ?? ""),
  queueId: item?.queueId === null || item?.queue_id === null ? null : Number(item?.queueId ?? item?.queue_id ?? 0),
  type: String(item?.type ?? "activity"),
  title: String(item?.title ?? "Activity"),
  description: typeof item?.description === "string" ? item.description : null,
  metadata:
    item?.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? item.metadata
      : {},
  createdAt:
    typeof item?.createdAt === "string"
      ? item.createdAt
      : typeof item?.created_at === "string"
        ? item.created_at
        : new Date().toISOString(),
});

export const getActivityFeed = async (page = 1, limit = 20) => {
  const response = await apiFetch(`/api/activity/my-feed?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load activity feed"));
  }

  const payload = await response.json();
  return {
    page: Number(payload?.page ?? page),
    limit: Number(payload?.limit ?? limit),
    items: Array.isArray(payload?.items) ? payload.items.map(normalizeActivityItem) : [],
  };
};
