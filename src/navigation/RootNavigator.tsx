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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import {
  connectSocket,
  joinCenterRoom,
  joinDoctorRoom,
  joinPatientRoom,
  getSocket,
} from "../services/socket";
import MedicalCenterStack from "./MedicalCenterStack";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { role, loading } = useContext(AuthContext);

  useEffect(() => {
    const initSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const decoded: any = jwtDecode(token);
      const decodedRole = String(decoded?.role || "").trim().toLowerCase();
      connectSocket();
      if (decodedRole === "doctor" && decoded?.id) {
        joinDoctorRoom(decoded.id);
      }
      if (decodedRole === "patient" && decoded?.id) {
        joinPatientRoom(decoded.id);
      }
      if (decodedRole === "medical_center_admin" && decoded?.medicalCenterId) {
        joinCenterRoom(decoded.medicalCenterId);
      }
    };
    void initSocket();
    return () => {
      const socket = getSocket();
      if (socket?.connected) socket.disconnect();
    };
  }, [role]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!role && (
        <Stack.Screen name="AuthStack" component={AuthNavigator} />
      )}
      {role === "patient" && (
        <Stack.Screen name="PatientStack" component={PatientStack} />
      )}
      {role === "doctor" && <Stack.Screen name="Doctor" component={DoctorStack} />}

      {role === "pharmacist" && (
        <Stack.Screen name="PharmacistStack" component={PharmacistStack} />
      )}

      {role === "admin" && (
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
      )}

      {role === "receptionist" && (
        <Stack.Screen
          name="ReceptionistTabs"
          component={ReceptionistTabs}
        />
      )}
      {role === "medical_center_admin" && (
        <Stack.Screen name="MedicalCenterTabs" component={MedicalCenterStack} />
      )}
    </Stack.Navigator>
  );
}
