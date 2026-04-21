import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

interface AuthContextType {
  role: string | null;
  loading: boolean;
  refreshAuth: () => Promise<void> | void; // FIX
  logout: () => Promise<void> | void;      // FIX
}

export const AuthContext = createContext<AuthContextType>({
  role: null,
  loading: true,
  refreshAuth: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: any) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeRole = (value: unknown) => {
    const roleValue = String(value || "").trim().toLowerCase();
    return roleValue.length > 0 ? roleValue : null;
  };

  // 🔥 Refresh token + decode role
  const refreshAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setRole(null);
        return;
      }

      const decoded: any = jwtDecode(token);
      setRole(normalizeRole(decoded.role));
    } catch (err) {
      console.log("Token decode error:", err);
      setRole(null);
    }
  };

  // 🔥 Logout clears token + resets role
  const logout = async () => {
    await AsyncStorage.removeItem("token");
    setRole(null); // RootNavigator will switch to AuthStack
  };

  // 🔥 Runs at app startup
  useEffect(() => {
    refreshAuth().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ role, loading, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
