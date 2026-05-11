import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { apiFetch } from "../config/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

export async function ensureNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (status !== "granted") return false;

  if (Platform.OS === "android" && !channelReady) {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    channelReady = true;
  }
  return true;
}

export async function notifyLocal(title: string, body: string) {
  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: undefined,
    },
    trigger: null,
  });
}

export async function getExpoPushToken() {
  const ok = await ensureNotificationPermissions();
  if (!ok) return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId;

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return token.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");

    // Local iOS builds without push entitlements commonly hit this. It should not break app flows.
    if (message.includes("aps-environment")) {
      if (__DEV__) {
        console.log("Expo push token skipped:", message);
      }
      return null;
    }

    if (__DEV__) {
      console.log("Expo push token error:", error);
    }
    return null;
  }
}

export async function syncExpoPushTokenWithBackend() {
  const token = await getExpoPushToken();
  if (!token) return null;

  const response = await apiFetch("/api/notifications/push-token", {
    method: "POST",
    body: JSON.stringify({
      expo_push_token: token,
      device_platform: Platform.OS,
      device_name: Device.deviceName ?? null,
      device_model: Device.modelName ?? null,
      app_version: Constants.expoConfig?.version ?? null,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message
        : "Failed to register push token"
    );
  }

  return token;
}
