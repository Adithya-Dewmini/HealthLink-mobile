import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthNavigator from "./AuthNavigator";
import PatientTabs from "./PatientTabs";
import DoctorTabs from "./DoctorTabs";
import PharmacistTabs from "./PharmacistTabs";
import AdminTabs from "./AdminTabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import jwtDecode from "jwt-decode";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const token = await AsyncStorage.getItem("token");

        if (!token) {
          setRole(null);
          setLoading(false);
          return;
        }

        const decoded: any = jwtDecode(token);
        setRole(decoded.role); // Must match backend payload: { role: "patient" | "doctor" | "pharmacist" | "admin" }
      } catch (error) {
        console.log("Token decode error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* NOT LOGGED IN → Auth */}
        {!role && (
          <Stack.Screen name="AuthStack" component={AuthNavigator} />
        )}

        {/* LOGGED IN → ROLE TABS */}
        {role === "patient" && (
          <Stack.Screen name="PatientTabs" component={PatientTabs} />
        )}

        {role === "doctor" && (
          <Stack.Screen name="DoctorTabs" component={DoctorTabs} />
        )}

        {role === "pharmacist" && (
          <Stack.Screen name="PharmacistTabs" component={PharmacistTabs} />
        )}

        {role === "admin" && (
          <Stack.Screen name="AdminTabs" component={AdminTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
