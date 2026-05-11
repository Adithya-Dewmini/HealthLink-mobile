import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PharmacistTabs from "./PharmacistTabs";
import PrescriptionScreen from "../screens/patient/PrescriptionScreen";
import DispenseScreen from "../screens/pharmacist/DispenseScreen";
import PrescriptionDetailsScreen from "../screens/pharmacist/PrescriptionDetailsScreen";
import AddMedicine from "../screens/pharmacist/AddMedicine";
import AIForecast from "../screens/pharmacist/AIForecast";
import ExpiryTracker from "../screens/pharmacist/ExpiryTracker";
import PrescriptionTrackingScreen from "../screens/pharmacist/PrescriptionTrackingScreen";
import Suppliers from "../screens/pharmacist/Suppliers";
import Settings from "../screens/pharmacist/Settings";
import PharmacyOrderDetailsScreen from "../screens/pharmacist/PharmacyOrderDetailsScreen";

const Stack = createNativeStackNavigator();

export default function PharmacistStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PharmacistTabs"
        component={PharmacistTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrescriptionScreen"
        component={PrescriptionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyDispense"
        component={DispenseScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyPrescriptionDetails"
        component={PrescriptionDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyAddMedicine"
        component={AddMedicine}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyAIForecast"
        component={AIForecast}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyExpiryTracker"
        component={ExpiryTracker}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyPrescriptionTracking"
        component={PrescriptionTrackingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacySuppliers"
        component={Suppliers}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacySettings"
        component={Settings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PharmacyOrderDetails"
        component={PharmacyOrderDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
