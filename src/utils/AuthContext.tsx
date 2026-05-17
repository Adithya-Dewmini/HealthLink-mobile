import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { apiFetch } from "../config/api";
import {
  DEFAULT_RECEPTIONIST_PERMISSIONS,
  normalizeReceptionistPermissions,
  type ReceptionistPermissions,
} from "./receptionistPermissions";

export type AuthUser = {
  id?: number;
  doctor_id?: number | null;
  name?: string;
  email?: string;
  role?: string | null;
  status?: string | null;
  verification_status?: string | null;
  verification_notes?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  profile_image?: string | null;
  specialization?: string | null;
  experience_years?: number | null;
  bio?: string | null;
  qualifications?: string | null;
  consultation_fee?: string | number | null;
  short_description?: string | null;
  medical_center_id?: string | null;
  receptionist_permissions?: Partial<ReceptionistPermissions> | null;
  is_password_set?: boolean;
};

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  role: string | null;
  user: AuthUser | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  clinicId: string | null;
  receptionistPermissions: ReceptionistPermissions;
  pendingPermissionUpdate: boolean;
  activeTask: string | null;
  loading: boolean;
  login: (user: AuthUser | null, token: string) => Promise<void>;
  refreshReceptionPermissions: () => Promise<ReceptionistPermissions>;
  setPendingPermissionUpdate: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTask: React.Dispatch<React.SetStateAction<string | null>>;
  refreshAuth: () => Promise<AuthUser | null> | AuthUser | null; // FIX
  logout: () => Promise<void> | void;      // FIX
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  role: null,
  user: null,
  setUser: () => null,
  clinicId: null,
  receptionistPermissions: DEFAULT_RECEPTIONIST_PERMISSIONS,
  pendingPermissionUpdate: false,
  activeTask: null,
  loading: true,
  login: async () => {},
  refreshReceptionPermissions: async () => DEFAULT_RECEPTIONIST_PERMISSIONS,
  setPendingPermissionUpdate: () => null,
  setActiveTask: () => null,
  refreshAuth: async () => null,
  logout: async () => {},
});

const ADMIN_MOBILE_ACCESS_MESSAGE =
  "Platform admin access is available through the HealthLink web portal only.";

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [receptionistPermissions, setReceptionistPermissions] = useState<ReceptionistPermissions>(
    DEFAULT_RECEPTIONIST_PERMISSIONS
  );
  const [pendingPermissionUpdate, setPendingPermissionUpdate] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeRole = useCallback((value: unknown) => {
    const roleValue = String(value || "").trim().toLowerCase();
    return roleValue.length > 0 ? roleValue : null;
  }, []);

  const normalizeDoctorStatus = useCallback((value: unknown) => {
    const statusValue = String(value || "").trim().toLowerCase();
    return statusValue.length > 0 ? statusValue : null;
  }, []);

  const applyAuthState = useCallback((input: {
    token: string | null;
    decoded?: any;
    user?: AuthUser | null;
    clinicId?: string | null;
    receptionistPermissions?: Partial<ReceptionistPermissions> | null;
  }) => {
    const decodedRole = normalizeRole(input.decoded?.role ?? input.user?.role);
    const resolvedClinicId =
      typeof input.clinicId === "string"
        ? input.clinicId
        : typeof input.user?.medical_center_id === "string"
          ? input.user.medical_center_id
          : typeof input.decoded?.medicalCenterId === "string"
            ? input.decoded.medicalCenterId
            : null;

    setToken(input.token);
    setRole(decodedRole);
    setUser((prev) => ({
      ...(prev || {}),
      ...(input.user || {}),
      id:
        typeof input.user?.id === "number"
          ? input.user.id
          : typeof input.decoded?.id === "number"
            ? input.decoded.id
            : prev?.id,
      email:
        typeof input.user?.email === "string"
          ? input.user.email
          : typeof input.decoded?.email === "string"
            ? input.decoded.email
            : prev?.email,
      role: decodedRole,
      status:
        typeof input.user?.status === "string"
          ? normalizeDoctorStatus(input.user.status)
          : typeof input.user?.verification_status === "string"
            ? normalizeDoctorStatus(input.user.verification_status)
            : prev?.status ?? prev?.verification_status ?? null,
      verification_status:
        typeof input.user?.verification_status === "string"
          ? normalizeDoctorStatus(input.user.verification_status)
          : typeof input.user?.status === "string"
            ? normalizeDoctorStatus(input.user.status)
            : prev?.verification_status ?? prev?.status ?? null,
    }));
    setClinicId(resolvedClinicId);
    setReceptionistPermissions(
      normalizeReceptionistPermissions({
        ...(input.decoded?.receptionistPermissions || {}),
        ...(input.receptionistPermissions || {}),
      })
    );
  }, [normalizeDoctorStatus, normalizeRole]);

  // 🔥 Refresh token + decode role
  const clearAuthState = useCallback(() => {
    setToken(null);
    setRole(null);
    setUser(null);
    setClinicId(null);
    setReceptionistPermissions(DEFAULT_RECEPTIONIST_PERMISSIONS);
    setPendingPermissionUpdate(false);
    setActiveTask(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    let decoded: any = null;
    try {
      const storedToken = await AsyncStorage.getItem("token");

      if (!storedToken) {
        clearAuthState();
        return null;
      }

      decoded = jwtDecode(storedToken);
      if (normalizeRole(decoded?.role) === "admin") {
        await AsyncStorage.removeItem("token");
        clearAuthState();
        return null;
      }
      applyAuthState({ token: storedToken, decoded });

      const response = await apiFetch("/api/me/context");
      if (response.ok) {
        const context = await response.json().catch(() => null);
        if (context && typeof context === "object") {
          applyAuthState({
            token: storedToken,
            decoded,
            user:
              (context as any).user && typeof (context as any).user === "object"
                ? ((context as any).user as AuthUser)
                : null,
            clinicId:
              typeof (context as any).clinicId === "string" &&
              (context as any).clinicId.trim().length > 0
                ? (context as any).clinicId.trim()
                : null,
            receptionistPermissions:
              (context as any).permissions && typeof (context as any).permissions === "object"
                ? (context as any).permissions
                : null,
          });
          return (context as any).user && typeof (context as any).user === "object"
            ? ((context as any).user as AuthUser)
            : null;
        }
      }

      return null;
    } catch (err) {
      if (!decoded) {
        console.log("Token decode error:", err);
        clearAuthState();
        return null;
      }

      console.log("Auth refresh error:", err);
      return user ?? null;
    }
  }, [applyAuthState, clearAuthState, user]);

  const refreshReceptionPermissions = useCallback(async () => {
    const storedToken = token ?? (await AsyncStorage.getItem("token"));
    if (!storedToken) {
      setReceptionistPermissions(DEFAULT_RECEPTIONIST_PERMISSIONS);
      setPendingPermissionUpdate(false);
      return DEFAULT_RECEPTIONIST_PERMISSIONS;
    }

    const decoded: any = jwtDecode(storedToken);
    const decodedRole = normalizeRole(decoded?.role);
    if (decodedRole !== "receptionist") {
      setPendingPermissionUpdate(false);
      return DEFAULT_RECEPTIONIST_PERMISSIONS;
    }

    const response = await apiFetch("/api/reception/permissions");
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        typeof body?.message === "string" && body.message.trim().length > 0
          ? body.message
          : "Failed to refresh receptionist permissions"
      );
    }

    const data = await response.json().catch(() => null);
    const nextPermissions =
      data && typeof data === "object"
        ? normalizeReceptionistPermissions(data as Record<string, unknown>)
        : DEFAULT_RECEPTIONIST_PERMISSIONS;

    setReceptionistPermissions(nextPermissions);
    setPendingPermissionUpdate(false);
    return nextPermissions;
  }, [normalizeRole, token]);

  const login = useCallback(async (userData: AuthUser | null, tokenData: string) => {
    const normalizedToken = String(tokenData || "").trim();
    if (!normalizedToken) {
      throw new Error("Token is required");
    }

    const decoded: any = jwtDecode(normalizedToken);
    if (normalizeRole(userData?.role ?? decoded?.role) === "admin") {
      throw new Error(ADMIN_MOBILE_ACCESS_MESSAGE);
    }

    await AsyncStorage.setItem("token", normalizedToken);
    applyAuthState({
      token: normalizedToken,
      decoded,
      user: userData,
      clinicId:
        typeof userData?.medical_center_id === "string"
          ? String(userData.medical_center_id)
          : null,
      receptionistPermissions:
        userData?.receptionist_permissions &&
        typeof userData.receptionist_permissions === "object"
          ? userData.receptionist_permissions
          : null,
    });

    void refreshAuth();
  }, [applyAuthState, normalizeRole, refreshAuth]);

  // 🔥 Logout clears token + resets role
  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.log("Logout audit call failed:", error);
    }
    await AsyncStorage.removeItem("token");
    setToken(null);
    setRole(null); // RootNavigator will switch to AuthStack
    setUser(null);
    setClinicId(null);
    setReceptionistPermissions(DEFAULT_RECEPTIONIST_PERMISSIONS);
    setPendingPermissionUpdate(false);
    setActiveTask(null);
  }, []);

  // 🔥 Runs at app startup
  useEffect(() => {
    refreshAuth().finally(() => setLoading(false));
  }, []);

  const contextValue = useMemo(() => ({
    token,
    isAuthenticated: Boolean(token && role),
    role,
    user,
    setUser,
    clinicId,
    receptionistPermissions,
    pendingPermissionUpdate,
    activeTask,
    loading,
    login,
    refreshReceptionPermissions,
    setPendingPermissionUpdate,
    setActiveTask,
    refreshAuth,
    logout,
  }), [
    activeTask,
    clinicId,
    loading,
    login,
    logout,
    pendingPermissionUpdate,
    receptionistPermissions,
    refreshAuth,
    refreshReceptionPermissions,
    role,
    token,
    user,
  ]);

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
