import React, { useContext, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthNavigator from "./AuthNavigator";
import PatientStack from "./PatientStack";
import PharmacistStack from "./PharmacistStack";
import AdminTabs from "./AdminTabs";
import ReceptionistTabs from "./ReceptionistTabs";
import { View, ActivityIndicator } from "react-native";
import { AuthContext } from "../utils/AuthContext";
import DoctorStack from "./DoctorStack";
import { jwtDecode } from "jwt-decode";
import {
  connectSocket,
  joinCenterRoom,
  joinDoctorRoom,
  joinPatientRoom,
  getSocket,
} from "../services/socket";
import MedicalCenterStack from "./MedicalCenterStack";
import SetPasswordScreen from "../screens/auth/SetPasswordScreen";
import PasswordSetupSuccessScreen from "../screens/auth/PasswordSetupSuccessScreen";
import PasswordSetupWelcomeScreen from "../screens/auth/PasswordSetupWelcomeScreen";
import SuccessScreen from "../screens/auth/SuccessScreen";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { role, token, isAuthenticated, loading } = useContext(AuthContext);
  const initialRouteName =
    isAuthenticated && role === "patient"
      ? "PatientStack"
      : isAuthenticated && role === "doctor"
        ? "Doctor"
        : isAuthenticated && role === "pharmacist"
          ? "PharmacistStack"
          : isAuthenticated && role === "admin"
            ? "AdminTabs"
            : isAuthenticated && role === "receptionist"
              ? "ReceptionistTabs"
              : isAuthenticated && role === "medical_center_admin"
                ? "MedicalCenterTabs"
                : "AuthStack";

  useEffect(() => {
    const initSocket = async () => {
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const decodedRole = String(decoded?.role || "").trim().toLowerCase();
      connectSocket(token);
      if (decodedRole === "doctor" && decoded?.id) {
        joinDoctorRoom(decoded.id);
      }
      if (decodedRole === "patient" && decoded?.id) {
        joinPatientRoom(decoded.id);
      }
      if (["medical_center_admin", "receptionist"].includes(decodedRole) && decoded?.medicalCenterId) {
        joinCenterRoom(decoded.medicalCenterId);
      }
    };
    void initSocket();
    return () => {
      const socket = getSocket();
      if (socket?.connected) socket.disconnect();
    };
  }, [role, token]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? role ?? "authenticated" : "guest"}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}
    >
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      <Stack.Screen name="PasswordSetupSuccess" component={PasswordSetupSuccessScreen} />
      <Stack.Screen name="PasswordSetupWelcome" component={PasswordSetupWelcomeScreen} />
      <Stack.Screen name="AuthSuccess" component={SuccessScreen} />
      {!isAuthenticated && <Stack.Screen name="AuthStack" component={AuthNavigator} />}
      {isAuthenticated && role === "patient" && (
        <Stack.Screen name="PatientStack" component={PatientStack} />
      )}
      {isAuthenticated && role === "doctor" && <Stack.Screen name="Doctor" component={DoctorStack} />}
      {isAuthenticated && role === "pharmacist" && (
        <Stack.Screen name="PharmacistStack" component={PharmacistStack} />
      )}
      {isAuthenticated && role === "admin" && <Stack.Screen name="AdminTabs" component={AdminTabs} />}
      {isAuthenticated && role === "receptionist" && (
        <Stack.Screen name="ReceptionistTabs" component={ReceptionistTabs} />
      )}
      {isAuthenticated && role === "medical_center_admin" && (
        <Stack.Screen name="MedicalCenterTabs" component={MedicalCenterStack} />
      )}
    </Stack.Navigator>
  );
}
