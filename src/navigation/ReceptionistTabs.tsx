import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Home from "../screens/receptionist/Home";
import Registration from "../screens/receptionist/Registration";
import AppointmentManagement from "../screens/receptionist/AppointmentManagement";
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
        tabBarActiveTintColor: "#1976D2",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          paddingBottom: 6,
          height: 60,
        },
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
    </Tab.Navigator>
  );
}
