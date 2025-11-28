import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Dashboard from "../screens/patient/Dashboard";
import Appointments from "../screens/patient/Appointments";
import Prescriptions from "../screens/patient/Prescriptions";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

export default function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#1976D2",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          paddingBottom: 6,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: any;

          if (route.name === "Dashboard") {
            iconName = "home";
          } else if (route.name === "Appointments") {
            iconName = "calendar";
          } else if (route.name === "Prescriptions") {
            iconName = "document-text";
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Appointments" component={Appointments} />
      <Tab.Screen name="Prescriptions" component={Prescriptions} />
    </Tab.Navigator>
  );
}
