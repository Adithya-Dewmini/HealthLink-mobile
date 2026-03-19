import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../types/navigation";
import PatientTabs from "./PatientTabs";
import Settings from "../screens/patient/Settings";
import Profile from "../screens/patient/Profile";
import Queue from "../screens/patient/Queue";
import HeartRate from "../screens/patient/HeartRate";
import Sleep from "../screens/patient/Sleep";
import DoctorSearchScreen from "../screens/patient/DoctorSearchScreen";
import DoctorAvailabilityScreen from "../screens/patient/DoctorAvailabilityScreen";
import BookAppointmentScreen from "../screens/patient/BookAppointmentScreen";
import AppointmentSummaryScreen from "../screens/patient/AppointmentSummaryScreen";

const Stack = createNativeStackNavigator<PatientStackParamList>();

export default function PatientStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PatientTabs"
        component={PatientTabs}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PatientProfile"
        component={Profile}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PatientSettings"
        component={Settings}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PatientQueue"
        component={Queue}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="HeartRateScreen"
        component={HeartRate}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="SleepTrackerScreen"
        component={Sleep}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="DoctorSearchScreen"
        component={DoctorSearchScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="DoctorAvailabilityScreen"
        component={DoctorAvailabilityScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="BookAppointmentScreen"
        component={BookAppointmentScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="AppointmentSummaryScreen"
        component={AppointmentSummaryScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
