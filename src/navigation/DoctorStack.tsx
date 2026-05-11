import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DoctorTabs from "./DoctorTabs";
import DoctorSettings from "../screens/doctor/DoctorSettings";
import ReportScreen from "../screens/doctor/ReportScreen";
import ProfileScreen from "../screens/doctor/ProfileScreen";
import DoctorClinicsScreen from "../screens/doctor/DoctorClinicsScreen";
import ClinicDetailsScreen from "../screens/doctor/ClinicDetailsScreen";
import ConsultationPage from "../screens/doctor/consultation/[queueId]";
import PatientsScreen from "../screens/doctor/Patients";
import PrescriptionsScreen from "../screens/doctor/Prescriptions";
import DoctorPrescriptionDetailsScreen from "../screens/doctor/DoctorPrescriptionDetailsScreen";
import ProfileEditScreen from "../screens/profile/ProfileEditScreen";
import DoctorSchedulePreview from "../screens/doctor/DoctorSchedulePreview";

const Stack = createNativeStackNavigator();

export default function DoctorStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DoctorTabs"
        component={DoctorTabs}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="DoctorSettings"
        component={DoctorSettings}
        options={{ title: "Settings" }}
      />
      <Stack.Screen
        name="DoctorReport"
        component={ReportScreen}
        options={{ title: "Daily Report", headerShown: false }}
      />
      <Stack.Screen
        name="DoctorProfile"
        component={ProfileScreen}
        options={{ title: "Doctor Profile", headerShown: false }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: "Edit Profile", headerShown: false }}
      />
      <Stack.Screen
        name="DoctorClinics"
        component={DoctorClinicsScreen}
        options={{ title: "My Clinics", headerShown: false }}
      />
      <Stack.Screen
        name="DoctorPatients"
        component={PatientsScreen}
        options={{ title: "Patients", headerShown: false }}
      />
      <Stack.Screen
        name="DoctorPrescriptions"
        component={PrescriptionsScreen}
        options={{ title: "Prescriptions", headerShown: false }}
      />
      <Stack.Screen
        name="DoctorPrescriptionDetails"
        component={DoctorPrescriptionDetailsScreen}
        options={{ title: "Prescription Details", headerShown: false }}
      />
      <Stack.Screen
        name="ClinicDetails"
        component={ClinicDetailsScreen}
        options={{ title: "Clinic Details", headerShown: false }}
      />
      <Stack.Screen
        name="ConsultationPage"
        component={ConsultationPage}
        options={{ title: "Consultation", headerShown: false }}
      />
      <Stack.Screen
        name="DoctorSchedulePreview"
        component={DoctorSchedulePreview}
        options={{ title: "Schedule Preview", headerShown: false }}
      />
    </Stack.Navigator>
  );
}
