import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "../screens/pharmacist/Home";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

export default function PharmacistTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
        name="PharmacyHome"
        component={Home}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
