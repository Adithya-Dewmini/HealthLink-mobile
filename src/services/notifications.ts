import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

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
    console.log("Expo push token error:", error);
    return null;
  }
}
