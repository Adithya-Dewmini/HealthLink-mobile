import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../screens/auth/Login";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import Register from "../screens/auth/Register";
import RegisterPatient from "../screens/auth/RegisterPatient";
import RegisterDoctor from "../screens/auth/RegisterDoctor";
import RegisterDoctorSuccessScreen from "../screens/auth/RegisterDoctorSuccessScreen";
import RegisterPharmacist from "../screens/auth/RegisterPharmacist";
import RegisterMedicalCenter from "../screens/auth/RegisterMedicalCenter";
import type { AuthStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="RegisterPatient" component={RegisterPatient} />
      <Stack.Screen name="RegisterDoctor" component={RegisterDoctor} />
      <Stack.Screen name="RegisterDoctorSuccess" component={RegisterDoctorSuccessScreen} />
      <Stack.Screen name="RegisterPharmacist" component={RegisterPharmacist} />
      <Stack.Screen name="RegisterMedicalCenter" component={RegisterMedicalCenter} />
    </Stack.Navigator>
  );
}
