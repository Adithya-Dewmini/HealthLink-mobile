import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MedicalCenterTabs from "./MedicalCenterTabs";
import MedicalCenterSettings from "../screens/medicalCenter/Settings";
import SpecialtiesScreen from "../screens/medicalCenter/SpecialtiesScreen";
import AddReceptionistScreen from "../screens/medicalCenter/AddReceptionistScreen";
import AddDoctorScreen from "../screens/medicalCenter/AddDoctorScreen";
import DoctorProfileScreen from "../screens/medicalCenter/DoctorProfileScreen";
import DoctorDetailsScreen from "../screens/medicalCenter/DoctorDetailsScreen";
import DoctorScheduleManagementScreen from "../screens/medicalCenter/DoctorScheduleManagementScreen";
import MedicalCenterDoctorAvailabilityScreen from "../screens/medicalCenter/DoctorAvailabilityScreen";
import type { MedicalCenterStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<MedicalCenterStackParamList>();

export default function MedicalCenterStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MedicalCenterTabsRoot" component={MedicalCenterTabs} />
      <Stack.Screen name="MedicalCenterSettings" component={MedicalCenterSettings} />
      <Stack.Screen name="MedicalCenterSpecialties" component={SpecialtiesScreen} />
      <Stack.Screen
        name="MedicalCenterAddReceptionist"
        component={AddReceptionistScreen}
      />
      <Stack.Screen
        name="MedicalCenterAddDoctor"
        component={AddDoctorScreen}
      />
      <Stack.Screen
        name="MedicalCenterDoctorProfile"
        component={DoctorProfileScreen}
      />
      <Stack.Screen
        name="MedicalCenterDoctorDetails"
        component={DoctorDetailsScreen}
      />
      <Stack.Screen
        name="MedicalCenterDoctorSchedule"
        component={DoctorScheduleManagementScreen}
      />
      <Stack.Screen
        name="MedicalCenterDoctorAvailability"
        component={MedicalCenterDoctorAvailabilityScreen}
      />
    </Stack.Navigator>
  );
}
