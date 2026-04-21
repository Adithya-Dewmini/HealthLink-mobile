import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MedicalCenterTabs from "./MedicalCenterTabs";
import MedicalCenterSettings from "../screens/medicalCenter/Settings";
import AddReceptionistScreen from "../screens/medicalCenter/AddReceptionistScreen";
import type { MedicalCenterStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<MedicalCenterStackParamList>();

export default function MedicalCenterStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MedicalCenterTabsRoot" component={MedicalCenterTabs} />
      <Stack.Screen name="MedicalCenterSettings" component={MedicalCenterSettings} />
      <Stack.Screen
        name="MedicalCenterAddReceptionist"
        component={AddReceptionistScreen}
      />
    </Stack.Navigator>
  );
}
