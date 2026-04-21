import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { AuthProvider } from "./src/utils/AuthContext";
import { GlobalModalProvider } from "./src/context/GlobalModalContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Alert } from "react-native";
import GlobalModals from "./src/components/global/GlobalModals";
import { linking } from "./src/utils/linking";
import { useDeepLinking } from "./src/hooks/useDeepLinking";


async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("Must use a physical device for Push Notifications");
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Permission not granted for notifications");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  const token = tokenData.data;

  console.log("PUSH TOKEN:", token);

  return token;
}



export default function App() {
  useEffect(() => {
    void registerForPushNotificationsAsync();
  }, []);
  useDeepLinking();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <GlobalModalProvider>
          <BottomSheetModalProvider>
            <NavigationContainer ref={navigationRef} linking={linking}>
              <RootNavigator />
              <GlobalModals />
            </NavigationContainer>
          </BottomSheetModalProvider>
          <Toast />
        </GlobalModalProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
