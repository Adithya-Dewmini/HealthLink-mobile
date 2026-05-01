import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../api/client";
import { resetToLogin } from "../navigation/navigationRef";

// localhost does not work on a physical device because it points to the phone itself.
// Update EXPO_PUBLIC_API_URL when the laptop IP changes.
export const API_BASE_URL = BASE_URL;
const FETCH_TIMEOUT_MS = 12000;

export const testConnection = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(BASE_URL, { signal: controller.signal });
  clearTimeout(timeoutId);
  const text = await res.text();
  console.log("API RESPONSE:", text);
  return text;
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("token");
  const controller = new AbortController();
  const externalSignal = options.signal;
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      await AsyncStorage.clear();
      resetToLogin();
      throw new Error("Session expired");
    }

    return response;
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
