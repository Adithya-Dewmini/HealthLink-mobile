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
import { patientTheme } from "../constants/patientTheme";

const Tab = createBottomTabNavigator<PatientTabParamList>();

export default function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: patientTheme.colors.blue,
        tabBarInactiveTintColor: patientTheme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 6, fontWeight: "700" },
        tabBarItemStyle: { paddingTop: 8, paddingBottom: 8 },
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 16,
          right: 16,
          height: 82,
          backgroundColor: patientTheme.colors.surface,
          borderRadius: 25,
          elevation: 10,
          shadowColor: patientTheme.colors.navy,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          borderTopWidth: 1,
          borderTopColor: patientTheme.colors.border,
        },
        tabBarBackground: () => (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: patientTheme.colors.surface,
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
          <Ionicons name="chevron-back" size={22} color={patientTheme.colors.navy} />
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
            <Ionicons name="business" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientQuickActions"
        component={PharmacyMarketplace}
        options={{
          tabBarLabel: "",
          headerShown: false,
          tabBarButton: (props) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.centerTabWrap}
              onPress={props.onPress}
              accessibilityRole={props.accessibilityRole}
              accessibilityState={props.accessibilityState}
              accessibilityLabel={props.accessibilityLabel}
              testID={props.testID}
            >
              {props.children}
            </TouchableOpacity>
          ),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.centerTabCircle, focused && styles.centerTabCircleActive]}>
              <Ionicons name="cart" size={24} color={focused ? patientTheme.colors.navy : patientTheme.colors.blue} />
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
            <Ionicons name="person-circle" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerTabWrap: {
    top: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  centerTabCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: patientTheme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: patientTheme.colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: patientTheme.colors.border,
  },
  centerTabCircleActive: {
    backgroundColor: patientTheme.colors.highlight,
    borderColor: patientTheme.colors.softAqua,
  },
});
