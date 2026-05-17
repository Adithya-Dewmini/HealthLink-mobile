import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { AuthProvider } from "./src/utils/AuthContext";
import { GlobalModalProvider } from "./src/context/GlobalModalContext";
import { PatientLocationProvider } from "./src/context/PatientLocationContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import Toast from "react-native-toast-message";
import GlobalModals from "./src/components/global/GlobalModals";
import { linking } from "./src/utils/linking";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PatientLocationProvider>
          <GlobalModalProvider>
            <BottomSheetModalProvider>
              <NavigationContainer ref={navigationRef} linking={linking}>
                <RootNavigator />
                <GlobalModals />
              </NavigationContainer>
            </BottomSheetModalProvider>
            <Toast />
          </GlobalModalProvider>
        </PatientLocationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
