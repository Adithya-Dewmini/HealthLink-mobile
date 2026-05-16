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
import { doctorColors } from "../constants/doctorTheme";

const Tab = createBottomTabNavigator();

export default function DoctorTabs() {
  useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: doctorColors.primary,
        tabBarInactiveTintColor: doctorColors.textMuted,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 3 },
        tabBarItemStyle: { paddingVertical: 1, paddingHorizontal: 0 },
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 10,
          right: 10,
          height: 64,
          backgroundColor: doctorColors.surface,
          borderRadius: 999,
          elevation: 10,
          shadowColor: doctorColors.shadow,
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: doctorColors.surface,
              borderRadius: 999,
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
                <Ionicons name="calendar-outline" size={21} color={doctorColors.primary} />
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
    marginTop: -4,
  },
  centerTabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: doctorColors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: doctorColors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: doctorColors.border,
  },
  centerTabCircleActive: {
    backgroundColor: doctorColors.badgeBg,
    borderColor: doctorColors.aqua,
  },
});
