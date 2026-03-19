import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../screens/auth/Login";
import Register from "../screens/auth/Register";
import RegisterPatient from "../screens/auth/RegisterPatient";
import RegisterDoctor from "../screens/auth/RegisterDoctor";
import RegisterPharmacist from "../screens/auth/RegisterPharmacist";
import RegisterReceptionist from "../screens/auth/RegisterReceptionist";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="RegisterPatient" component={RegisterPatient} />
      <Stack.Screen name="RegisterDoctor" component={RegisterDoctor} />
      <Stack.Screen name="RegisterPharmacist" component={RegisterPharmacist} />
      <Stack.Screen
        name="RegisterReceptionist"
        component={RegisterReceptionist}
      />
    </Stack.Navigator>
  );
}
