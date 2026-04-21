import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Home from "../screens/receptionist/Home";
import Registration from "../screens/receptionist/Registration";
import AppointmentManagement from "../screens/receptionist/AppointmentManagement";
import QueueManagement from "../screens/receptionist/QueueManagement";
import AppointmentBooking from "../screens/receptionist/AppointmentBooking";
import Patients from "../screens/receptionist/Patients";
import { AuthContext } from "../utils/AuthContext";

const Tab = createBottomTabNavigator();

export default function ReceptionistTabs() {
  const { logout } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity
            onPress={logout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#1976D2" />
            <Text
              style={{
                color: "#1976D2",
                marginLeft: 6,
                fontWeight: "600",
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        ),
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
        name="ReceptionistHome"
        component={Home}
        options={{
          tabBarLabel: "Home",
          headerTitle: "Receptionist Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReceptionistRegistration"
        component={Registration}
        options={{
          headerShown: false,
          tabBarLabel: "Registration",
          headerTitle: "Patient Registration",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-add-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReceptionistAppointments"
        component={AppointmentManagement}
        options={{
          tabBarLabel: "Appointments",
          headerTitle: "Appointment Management",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReceptionistQueue"
        component={QueueManagement}
        options={{
          tabBarLabel: "Queue",
          headerTitle: "Queue Management",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-circle-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReceptionistBookAppointment"
        component={AppointmentBooking}
        options={{
          headerShown: false,
          tabBarLabel: "Book",
          headerTitle: "Book Appointment",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-clear-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReceptionistPatients"
        component={Patients}
        options={{
          headerShown: false,
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
}
