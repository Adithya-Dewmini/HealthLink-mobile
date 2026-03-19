import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DoctorTabs from "./DoctorTabs";
import DoctorSettings from "../screens/doctor/DoctorSettings";
import ReportScreen from "../screens/doctor/ReportScreen";
import ProfileScreen from "../screens/doctor/ProfileScreen";
import ConsultationPage from "../screens/doctor/consultation/[queueId]";
import AddScheduleScreen from "../screens/doctor/AddScheduleScreen";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
        name="ConsultationPage"
        component={ConsultationPage}
        options={{ title: "Consultation", headerShown: false }}
      />
      <Stack.Screen
        name="AddScheduleScreen"
        component={AddScheduleScreen}
        options={{ title: "Add Schedule", headerShown: false }}
      />
    </Stack.Navigator>
  );
}
