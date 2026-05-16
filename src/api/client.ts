import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { resetToLogin } from "../navigation/navigationRef";

const DEFAULT_PROD_API_URL = "https://healthlink-backend-5a75.onrender.com";
const API_TIMEOUT_MS = 20000;
const IS_DEVELOPMENT = typeof __DEV__ !== "undefined" && __DEV__;

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";
const hasConfiguredApiUrl = configuredApiUrl.length > 0;

const resolveApiBaseUrl = () =>
  hasConfiguredApiUrl ? normalizeBaseUrl(configuredApiUrl) : DEFAULT_PROD_API_URL;

const resolveSocketUrl = (apiBaseUrl: string) => {
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return apiBaseUrl.replace(/\/api\/?$/, "");
  }
};

// Do not auto-derive localhost/LAN targets in Expo dev mode. Use
// EXPO_PUBLIC_API_URL explicitly when a non-default backend is required.
export const BASE_URL = resolveApiBaseUrl();
export const API_BASE_URL = BASE_URL;
export const SOCKET_URL = resolveSocketUrl(API_BASE_URL);
export const HAS_EXPO_PUBLIC_API_URL = hasConfiguredApiUrl;
export { DEFAULT_PROD_API_URL, IS_DEVELOPMENT };

if (IS_DEVELOPMENT) {
  console.log("[api] resolved API_BASE_URL", API_BASE_URL);
  console.log("[api] resolved Socket.IO URL", SOCKET_URL);
  console.log("[api] EXPO_PUBLIC_API_URL detected", HAS_EXPO_PUBLIC_API_URL);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof FormData !== "undefined" && config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    return config;
  },
  (error) => {
    console.log("API REQUEST ERROR:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log(
      "API RESPONSE ERROR:",
      `${error?.config?.baseURL || ""}${error?.config?.url || ""}`,
      error?.response?.status,
      error?.response?.data || error?.message
    );

    if (error?.response?.status === 401) {
      await AsyncStorage.clear();
      resetToLogin();
    }

    return Promise.reject(error);
  }
);
