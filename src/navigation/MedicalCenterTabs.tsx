import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import MedicalCenterDashboard from "../screens/medicalCenter/MedicalCenterDashboard";
import MedicalCenterDoctors from "../screens/medicalCenter/Doctors";
import MedicalCenterReceptionists from "../screens/medicalCenter/Receptionists";
import MedicalCenterQueueOverview from "../screens/medicalCenter/QueueOverview";
import MedicalCenterAppointments from "../screens/medicalCenter/Appointments";
import MedicalCenterReports from "../screens/medicalCenter/Reports";

const Tab = createBottomTabNavigator();

export default function MedicalCenterTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2196F3",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontSize: 12, marginBottom: 5 },
        tabBarItemStyle: { paddingVertical: 5 },
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 16,
          right: 16,
          height: 70,
          backgroundColor: "#FFFFFF",
          borderRadius: 25,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "#FFFFFF",
              borderRadius: 25,
              bottom: -20,
            }}
          />
        ),
      }}
    >
      <Tab.Screen
        name="MedicalCenterDashboard"
        component={MedicalCenterDashboard}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MedicalCenterDoctors"
        component={MedicalCenterDoctors}
        options={{
          tabBarLabel: "Doctors",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "medkit" : "medkit-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MedicalCenterReceptionists"
        component={MedicalCenterReceptionists}
        options={{
          tabBarLabel: "Team",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MedicalCenterQueue"
        component={MedicalCenterQueueOverview}
        options={{
          tabBarLabel: "Queue",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "git-network" : "git-network-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MedicalCenterAppointments"
        component={MedicalCenterAppointments}
        options={{
          tabBarLabel: "Visits",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar-clear" : "calendar-clear-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MedicalCenterReports"
        component={MedicalCenterReports}
        options={{
          tabBarLabel: "Reports",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
