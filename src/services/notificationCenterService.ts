import { apiFetch } from "../config/api";

export type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const parseError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  return typeof payload?.message === "string" && payload.message.trim() ? payload.message : fallback;
};

const normalizeNotification = (item: any): NotificationItem => ({
  id: Number(item?.id ?? 0),
  title: String(item?.title ?? "").trim() || "Notification",
  body: String(item?.body ?? "").trim() || "",
  type: String(item?.type ?? "general"),
  isRead: Boolean(item?.isRead ?? item?.is_read),
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
  updatedAt:
    typeof item?.updatedAt === "string"
      ? item.updatedAt
      : typeof item?.updated_at === "string"
        ? item.updated_at
        : new Date().toISOString(),
});

export const getNotifications = async (page = 1, limit = 20) => {
  const response = await apiFetch(`/api/notifications?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load notifications"));
  }

  const payload = await response.json();
  return {
    page: Number(payload?.page ?? page),
    limit: Number(payload?.limit ?? limit),
    unreadCount: Number(payload?.unreadCount ?? 0),
    notifications: Array.isArray(payload?.notifications)
      ? payload.notifications.map(normalizeNotification)
      : [],
  };
};

export const markNotificationAsRead = async (notificationId: number) => {
  const response = await apiFetch(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to update notification"));
  }

  const payload = await response.json();
  return normalizeNotification(payload?.notification ?? {});
};
