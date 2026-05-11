import { API_BASE_URL } from "../config/api";

const normalizedApiBaseUrl = API_BASE_URL.replace(/\/+$/, "");

export function resolveImageUrl(url?: string | null): string | null {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${normalizedApiBaseUrl}${value}`;
  }

  return `${normalizedApiBaseUrl}/${value.replace(/^\/+/, "")}`;
}
