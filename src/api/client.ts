import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { resetToLogin } from "../navigation/navigationRef";

const IOS_SIMULATOR_API_URL = "http://127.0.0.1:5050";
const ANDROID_EMULATOR_API_URL = "http://10.0.2.2:5050";
const LOCALHOST_API_URL = "http://localhost:5050";
const DEFAULT_PROD_API_URL = "https://healthlink-backend-m9eo.onrender.com";
const API_TIMEOUT_MS = 20000;

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const isSimulator = Platform.OS === "ios" && !Device.isDevice;
const isAndroidEmulator = Platform.OS === "android" && !Device.isDevice;

const getExpoHostUri = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  return typeof hostUri === "string" && hostUri.trim().length > 0 ? hostUri.trim() : null;
};

const getDerivedDevApiUrl = () => {
  const hostUri = getExpoHostUri();

  if (hostUri) {
    const hostname = hostUri.split(":")[0]?.trim();
    if (hostname) {
      return `http://${hostname}:5050`;
    }
  }

  if (Platform.OS === "ios") {
    return IOS_SIMULATOR_API_URL;
  }

  if (Platform.OS === "android") {
    return ANDROID_EMULATOR_API_URL;
  }

  return LOCALHOST_API_URL;
};

// Physical devices cannot use localhost because that resolves to the phone itself.
// Keep API switching centralized here so development can target the laptop over LAN
// while production points at the deployed HTTPS backend.
export const BASE_URL =
  __DEV__ && isSimulator
    ? IOS_SIMULATOR_API_URL
    : __DEV__ && isAndroidEmulator
      ? ANDROID_EMULATOR_API_URL
      : configuredApiUrl && configuredApiUrl.length > 0
        ? configuredApiUrl
        : __DEV__
          ? getDerivedDevApiUrl()
          : DEFAULT_PROD_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
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
