import React, { useContext, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthNavigator from "./AuthNavigator";
import PatientStack from "./PatientStack";
import PharmacistStack from "./PharmacistStack";
import AdminTabs from "./AdminTabs";
import ReceptionistStack from "./ReceptionistStack";
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
import { syncExpoPushTokenWithBackend } from "../services/notifications";
import SetPasswordScreen from "../screens/auth/SetPasswordScreen";
import PasswordSetupSuccessScreen from "../screens/auth/PasswordSetupSuccessScreen";
import PasswordSetupWelcomeScreen from "../screens/auth/PasswordSetupWelcomeScreen";
import SuccessScreen from "../screens/auth/SuccessScreen";
import DoctorPendingApprovalScreen from "../screens/doctor/DoctorPendingApprovalScreen";
import ApprovalStatusScreen from "../screens/auth/ApprovalStatusScreen";
import type { RootStackParamList } from "../types/navigation";
import HealthLinkLoader from "../components/HealthLinkLoader";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { role, token, isAuthenticated, loading, user } = useContext(AuthContext);
  const verificationStatus = String(
    user?.verification_status || user?.status || "pending"
  ).trim().toLowerCase();
  const doctorVerificationStatus = verificationStatus;
  const isDoctorApproved =
    doctorVerificationStatus === "approved" || doctorVerificationStatus === "verified";
  const shouldShowDoctorPending = isAuthenticated && role === "doctor" && !isDoctorApproved;
  const isPharmacyApproved = verificationStatus === "approved";
  const shouldShowPharmacyApproval = isAuthenticated && role === "pharmacist" && !isPharmacyApproved;
  const isMedicalCenterApproved = verificationStatus === "approved";
  const shouldShowMedicalCenterApproval =
    isAuthenticated && role === "medical_center_admin" && !isMedicalCenterApproved;
  const initialRouteName =
    isAuthenticated && role === "patient"
      ? "PatientStack"
      : shouldShowDoctorPending
        ? "DoctorPendingApproval"
        : shouldShowPharmacyApproval || shouldShowMedicalCenterApproval
          ? "ApprovalStatus"
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
      void syncExpoPushTokenWithBackend().catch((error) => {
        console.log("Push token sync error:", error);
      });
    };
    void initSocket();
    return () => {
      const socket = getSocket();
      if (socket?.connected) socket.disconnect();
    };
  }, [role, token]);

  if (loading) {
    return <HealthLinkLoader />;
  }

  return (
    <Stack.Navigator
      key={
        isAuthenticated
          ? role === "doctor"
            ? `doctor:${doctorVerificationStatus || "unknown"}`
            : role === "pharmacist" || role === "medical_center_admin"
              ? `${role}:${verificationStatus || "unknown"}`
            : role ?? "authenticated"
          : "guest"
      }
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}
    >
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      <Stack.Screen name="PasswordSetupSuccess" component={PasswordSetupSuccessScreen} />
      <Stack.Screen name="PasswordSetupWelcome" component={PasswordSetupWelcomeScreen} />
      <Stack.Screen name="AuthSuccess" component={SuccessScreen} />
      <Stack.Screen name="DoctorPendingApproval" component={DoctorPendingApprovalScreen} />
      <Stack.Screen name="ApprovalStatus" component={ApprovalStatusScreen} />
      {!isAuthenticated && <Stack.Screen name="AuthStack" component={AuthNavigator} />}
      {isAuthenticated && role === "patient" && (
        <Stack.Screen name="PatientStack" component={PatientStack} />
      )}
      {isAuthenticated && role === "doctor" && isDoctorApproved && (
        <Stack.Screen name="Doctor" component={DoctorStack} />
      )}
      {isAuthenticated && role === "pharmacist" && isPharmacyApproved && (
        <Stack.Screen name="PharmacistStack" component={PharmacistStack} />
      )}
      {isAuthenticated && role === "admin" && <Stack.Screen name="AdminTabs" component={AdminTabs} />}
      {isAuthenticated && role === "receptionist" && (
        <Stack.Screen name="ReceptionistTabs" component={ReceptionistStack} />
      )}
      {isAuthenticated && role === "medical_center_admin" && isMedicalCenterApproved && (
        <Stack.Screen name="MedicalCenterTabs" component={MedicalCenterStack} />
      )}
    </Stack.Navigator>
  );
}
