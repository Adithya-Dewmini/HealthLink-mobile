import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../types/navigation";
import PatientTabs from "./PatientTabs";
import Settings from "../screens/patient/Settings";
import Queue from "../screens/patient/Queue";
import ClinicDetailsScreen from "../screens/patient/ClinicDetailsScreen";
import HeartRate from "../screens/patient/HeartRate";
import Sleep from "../screens/patient/Sleep";
import MedicalHistoryScreen from "../screens/patient/MedicalHistoryScreen";
import DoctorSearchScreen from "../screens/patient/DoctorSearchScreen";
import DoctorAvailabilityScreen from "../screens/patient/DoctorAvailabilityScreen";
import Appointments from "../screens/patient/Appointments";
import BookAppointmentScreen from "../screens/patient/BookAppointmentScreen";
import AppointmentSummaryScreen from "../screens/patient/AppointmentSummaryScreen";
import ProfileEditScreen from "../screens/profile/ProfileEditScreen";
import PrescriptionDetails from "../screens/patient/PrescriptionDetails";
import Prescriptions from "../screens/patient/Prescriptions";
import MedicineTracker from "../screens/patient/MedicineTracker";
import UploadPrescriptionScreen from "../screens/patient/UploadPrescriptionScreen";
import FavoriteScreen from "../screens/patient/FavoriteScreen";
import SymptomCheckerScreen from "../screens/patient/SymptomCheckerScreen";
import MedicineSearchScreen from "../screens/patient/MedicineSearchScreen";
import PharmacyMarketplace from "../screens/patient/PharmacyMarketplace";
import PharmacyStoreScreen from "../screens/patient/PharmacyStoreScreen";
import MyHealthDashboard from "../screens/patient/MyHealthDashboard";

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
        name="PatientSettings"
        component={Settings}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PatientClinicDetails"
        component={ClinicDetailsScreen}
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
        name="MedicalHistoryScreen"
        component={MedicalHistoryScreen}
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
        name="Appointments"
        component={Appointments}
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

      <Stack.Screen
        name="PrescriptionDetails"
        component={PrescriptionDetails}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PatientPrescriptions"
        component={Prescriptions}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="MedicineTracker"
        component={MedicineTracker}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="UploadPrescription"
        component={UploadPrescriptionScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Favorites"
        component={FavoriteScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="SymptomChecker"
        component={SymptomCheckerScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="MedicineSearch"
        component={MedicineSearchScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PharmacyMarketplace"
        component={PharmacyMarketplace}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyStore"
        component={PharmacyStoreScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="MyHealthDashboard"
        component={MyHealthDashboard}
        options={{ headerShown: false }}
      />

    </Stack.Navigator>
  );
}
