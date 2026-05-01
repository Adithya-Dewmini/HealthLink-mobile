import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import HomeScreen from "../screens/doctor/HomeScreen";
import DoctorScheduleScreen from "../screens/doctor/DoctorScheduleScreen";
import DoctorClinicsScreen from "../screens/doctor/DoctorClinicsScreen";
import QueueControl from "../screens/doctor/QueueControl";
import ProfileScreen from "../screens/doctor/ProfileScreen";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../utils/AuthContext";

const Tab = createBottomTabNavigator();

export default function DoctorTabs() {
  useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: "#2BB673",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontSize: 11, marginBottom: 3 },
        tabBarItemStyle: { paddingVertical: 2, paddingHorizontal: 0 },
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 10,
          right: 10,
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
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="medkit" size={21} color={color} />
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
            <Ionicons name="time" size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DoctorSchedule"
        component={DoctorScheduleScreen}
        options={{
          headerShown: false,
          tabBarLabel: "",
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabWrap}>
              <View style={[styles.centerTabCircle, focused && styles.centerTabCircleActive]}>
                <Ionicons name="calendar-outline" size={21} color="#2BB673" />
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="DoctorClinics"
        component={DoctorClinicsScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Clinics",
          tabBarIcon: ({ color }) => (
            <Ionicons name="business-outline" size={21} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DoctorMyProfile"
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarLabel: "My Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-circle-outline" size={21} color={color} />
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
    marginTop: -8,
  },
  centerTabCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
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
    backgroundColor: "#E6F7EF",
    borderColor: "#CDEFE0",
  },
});
