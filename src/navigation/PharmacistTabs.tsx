import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "../screens/pharmacist/Home";
import Scanner from "../screens/pharmacist/Scanner";
import Inventory from "../screens/pharmacist/Inventory";
import AddMedicine from "../screens/pharmacist/AddMedicine";
import Forecasting from "../screens/pharmacist/Forecasting";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text } from "react-native";
import { AuthContext } from "../utils/AuthContext";

const Tab = createBottomTabNavigator();

export default function PharmacistTabs() {
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
            <Text style={{ color: "#1976D2", marginLeft: 6, fontWeight: "600" }}>
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
        name="PharmacyHome"
        component={Home}
        options={{
          tabBarLabel: "Home",
          headerTitle: "Pharmacist Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyScanner"
        component={Scanner}
        options={{
          tabBarLabel: "Scanner",
          headerTitle: "Prescription Scanner",
          tabBarIcon: ({ color }) => (
            <Ionicons name="qr-code-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyInventory"
        component={Inventory}
        options={{
          tabBarLabel: "Inventory",
          headerTitle: "Inventory",
          tabBarIcon: ({ color }) => (
            <Ionicons name="albums-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyAddMedicine"
        component={AddMedicine}
        options={{
          tabBarLabel: "Add",
          headerTitle: "Add Medicine",
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyForecasting"
        component={Forecasting}
        options={{
          tabBarLabel: "Forecast",
          headerTitle: "AI Forecasting",
          tabBarIcon: ({ color }) => (
            <Ionicons name="analytics-outline" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
