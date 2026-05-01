import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Dashboard from "../screens/patient/Dashboard";
import MedicalCenterHubScreen from "../screens/patient/MedicalCenterHubScreen";
import PharmacyMarketplace from "../screens/patient/PharmacyMarketplace";
import ExploreScreen from "../screens/patient/ExploreScreen";
import MyProfile from "../screens/patient/MyProfile";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PatientTabParamList } from "../types/navigation";

const Tab = createBottomTabNavigator<PatientTabParamList>();

export default function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#2196F3",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontSize: 9, marginBottom: 4 },
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
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientAppointments"
        component={MedicalCenterHubScreen}
        options={{
          tabBarLabel: "Centers",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="business-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientQuickActions"
        component={PharmacyMarketplace}
        options={{
          tabBarLabel: "",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabWrap}>
              <View style={[styles.centerTabCircle, focused && styles.centerTabCircleActive]}>
                <Ionicons name="cart" size={24} color="#2196F3" />
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="PatientExplore"
        component={ExploreScreen}
        options={{
          tabBarLabel: "Explore",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="map" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientProfile"
        component={MyProfile}
        options={{
          tabBarLabel: "My Profile",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle-outline" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerTabWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
  },
  centerTabCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  centerTabCircleActive: {
    backgroundColor: "#E3F2FD",
    borderColor: "#D6EAFB",
  },
});
