import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Dashboard from "../screens/patient/Dashboard";
import Appointments from "../screens/patient/Appointments";
import Prescriptions from "../screens/patient/Prescriptions";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../utils/AuthContext";
import type { PatientTabParamList } from "../types/navigation";

const Tab = createBottomTabNavigator<PatientTabParamList>();

export default function PatientTabs() {
  useContext(AuthContext); // keep context ready for children

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        tabBarActiveTintColor: "#1976D2",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: { fontSize: 11, marginTop: 0 },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: 10,
          height: 72,
          borderTopWidth: 0,
          borderTopColor: "transparent",
        },
        headerLeft: route.name === "PatientDashboard" ? undefined : () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("PatientDashboard")}
            style={{ paddingHorizontal: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#0F1E2E" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen
        name="PatientDashboard"
        component={Dashboard}
        options={{
          tabBarLabel: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientAppointments"
        component={Appointments}
        options={{
          tabBarLabel: "Appointments",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientPrescriptions"
        component={Prescriptions}
        options={{
          tabBarLabel: "Prescriptions",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
