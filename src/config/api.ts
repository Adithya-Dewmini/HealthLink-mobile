import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AxiosResponse } from "axios";
import { API_BASE_URL, IS_DEVELOPMENT, api } from "../api/client";
import { resetToLogin } from "../navigation/navigationRef";

export { API_BASE_URL };

const FETCH_TIMEOUT_MS = 12000;

const createHeaders = (input: unknown) => {
  const headers = new Headers();

  if (!input || typeof input !== "object") {
    return headers;
  }

  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
      return;
    }

    if (value !== undefined && value !== null) {
      headers.set(key, String(value));
    }
  });

  return headers;
};

const headersToObject = (headers: Headers) => {
  const next: Record<string, string> = {};
  headers.forEach((value, key) => {
    next[key] = value;
  });
  return next;
};

const readTextBody = (data: unknown) => {
  if (typeof data === "string") {
    return data;
  }

  if (data === undefined) {
    return "";
  }

  return JSON.stringify(data);
};

const readJsonBody = (data: unknown) => {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) {
      throw new SyntaxError("Unexpected end of JSON input");
    }

    return JSON.parse(trimmed);
  }

  if (data === undefined) {
    throw new SyntaxError("Unexpected end of JSON input");
  }

  return data;
};

const resolveRequestUrl = (endpoint: string) => {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  try {
    return new URL(endpoint, `${API_BASE_URL}/`).toString();
  } catch {
    return `${API_BASE_URL}${endpoint}`;
  }
};

const toResponseLike = (response: AxiosResponse, requestUrl: string): Response =>
  ({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    statusText: response.statusText,
    headers: createHeaders(response.headers),
    url: requestUrl,
    redirected: false,
    type: "basic",
    body: null,
    bodyUsed: false,
    clone() {
      return toResponseLike(response, requestUrl);
    },
    async arrayBuffer() {
      throw new Error("arrayBuffer() is not implemented for apiFetch responses.");
    },
    async blob() {
      throw new Error("blob() is not implemented for apiFetch responses.");
    },
    async formData() {
      throw new Error("formData() is not implemented for apiFetch responses.");
    },
    async json() {
      return readJsonBody(response.data);
    },
    async text() {
      return readTextBody(response.data);
    },
  }) as Response;

export const testConnection = async () => {
  const res = await apiFetch("/");
  const text = await res.text();
  console.log("API RESPONSE:", text);
  return text;
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const token = await AsyncStorage.getItem("token");
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const requestUrl = resolveRequestUrl(endpoint);
    const response = toResponseLike(
      await api.request({
        url: endpoint,
        method: options.method ?? "GET",
        data: options.body,
        headers: headersToObject(headers),
        signal: controller.signal,
        timeout: FETCH_TIMEOUT_MS,
        validateStatus: () => true,
      }),
      requestUrl
    );

    if (IS_DEVELOPMENT && !response.ok) {
      console.log("[api] request failed", response.url, response.status, await response.text());
    }

    if (response.status === 401) {
      await AsyncStorage.clear();
      resetToLogin();
      throw new Error("Session expired");
    }

    return response;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.log("[api] request error", resolveRequestUrl(endpoint), error);
    }

    if (didTimeout) {
      throw new Error("Request timed out");
    }

    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    if (code === "ECONNABORTED" || (error as Error)?.name === "AbortError" || (error as Error)?.name === "CanceledError") {
      throw new Error("Request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
