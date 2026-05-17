import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ReceptionistTabs from "./ReceptionistTabs";
import AppointmentBooking from "../screens/receptionist/AppointmentBooking";
import ReceptionistVisitDetails from "../screens/receptionist/VisitDetails";
import ReceptionistQueueDetails from "../screens/receptionist/QueueDetails";
import ReceptionistDoctorSessionOverview from "../screens/receptionist/DoctorSessionOverview";
import ReceptionistDoctorAvailability from "../screens/receptionist/ReceptionistDoctorAvailability";
import ReceptionistDoctorSessionManagement from "../screens/receptionist/DoctorSessionManagement";
import ReceptionistDoctorSessionDetails from "../screens/receptionist/DoctorSessionDetails";
import ReceptionistCheckInPatients from "../screens/receptionist/ReceptionistCheckInPatients";
import type { ReceptionistStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<ReceptionistStackParamList>();

export default function ReceptionistStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceptionistTabsRoot" component={ReceptionistTabs} />
      <Stack.Screen name="ReceptionistBookAppointment" component={AppointmentBooking} />
      <Stack.Screen name="ReceptionistVisitDetails" component={ReceptionistVisitDetails} />
      <Stack.Screen name="ReceptionistQueueDetails" component={ReceptionistQueueDetails} />
      <Stack.Screen
        name="ReceptionistDoctorSessionOverview"
        component={ReceptionistDoctorSessionOverview}
      />
      <Stack.Screen
        name="ReceptionistDoctorAvailability"
        component={ReceptionistDoctorAvailability}
      />
      <Stack.Screen
        name="ReceptionistDoctorSessionManagement"
        component={ReceptionistDoctorSessionManagement as React.ComponentType}
      />
      <Stack.Screen
        name="ReceptionistDoctorSessionDetails"
        component={ReceptionistDoctorSessionDetails}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="ReceptionistCheckInPatients"
        component={ReceptionistCheckInPatients}
      />
    </Stack.Navigator>
  );
}
