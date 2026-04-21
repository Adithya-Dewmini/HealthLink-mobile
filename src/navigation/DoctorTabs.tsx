import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import Home from "../screens/doctor/Home";
import QueueControl from "../screens/doctor/QueueControl";
import Prescriptions from "../screens/doctor/Prescriptions";
import Patients from "../screens/doctor/Patients";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../utils/AuthContext";

const Tab = createBottomTabNavigator();

export default function DoctorTabs() {
  const { logout } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2BB673",
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
        name="DoctorHome"
        component={Home}
        options={{
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="medkit" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DoctorQueueControl"
        component={QueueControl}
        options={{
          headerShown: false,
          tabBarLabel: "Queue",
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DoctorPrescriptions"
        component={Prescriptions}
        options={{
          headerShown: false,
          tabBarLabel: "Prescriptions",
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DoctorPatients"
        component={Patients}
        options={{
          headerShown: false,
          tabBarLabel: "Patients",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
