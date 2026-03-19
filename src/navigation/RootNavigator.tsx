import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthNavigator from "./AuthNavigator";
import PatientStack from "./PatientStack";
import PharmacistTabs from "./PharmacistTabs";
import AdminTabs from "./AdminTabs";
import ReceptionistTabs from "./ReceptionistTabs";
import { View, ActivityIndicator } from "react-native";
import { AuthContext } from "../utils/AuthContext";
import DoctorStack from "./DoctorStack";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { role, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!role && (
        <Stack.Screen name="AuthStack" component={AuthNavigator} />
      )}
      {role === "patient" && (
        <Stack.Screen name="PatientStack" component={PatientStack} />
      )}
      {role === "doctor" && <Stack.Screen name="Doctor" component={DoctorStack} />}

      {role === "pharmacist" && (
        <Stack.Screen name="PharmacistTabs" component={PharmacistTabs} />
      )}

      {role === "admin" && (
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
      )}

      {role === "receptionist" && (
        <Stack.Screen
          name="ReceptionistTabs"
          component={ReceptionistTabs}
        />
      )}
    </Stack.Navigator>
  );
}
