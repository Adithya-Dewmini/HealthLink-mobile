import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resetToLogin } from "../navigation/navigationRef";

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri || typeof hostUri !== "string") return null;
  const host = hostUri.split(":")[0];
  return host ? `http://${host}:5050` : null;
};

const resolveDevBaseUrl = () => {
  const host = getExpoHost();
  if (host) return host;
  if (Platform.OS === "android") return "http://10.0.2.2:5050";
  return "http://127.0.0.1:5050";
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || resolveDevBaseUrl();

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await AsyncStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
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
}
