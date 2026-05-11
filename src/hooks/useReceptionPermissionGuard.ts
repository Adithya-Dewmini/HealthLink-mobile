import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { useAuth } from "../utils/AuthContext";

type PermissionKey =
  | "queue_access"
  | "appointments"
  | "check_in"
  | "schedule_management";

export const useReceptionPermissionGuard = (
  taskName: string,
  requiredPermission: PermissionKey,
  enabled = true
) => {
  const {
    receptionistPermissions,
    pendingPermissionUpdate,
    refreshReceptionPermissions,
    setActiveTask,
  } = useAuth();
  const [hasAccess, setHasAccess] = useState(
    enabled ? Boolean(receptionistPermissions[requiredPermission]) : true
  );

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setHasAccess(true);
        return () => {
          setActiveTask(null);
        };
      }

      let active = true;

      const run = async () => {
        try {
          const effectivePermissions =
            pendingPermissionUpdate || enabled
              ? await refreshReceptionPermissions()
              : receptionistPermissions;

          if (!active) {
            return;
          }

          if (!effectivePermissions[requiredPermission]) {
            setHasAccess(false);
            setActiveTask(null);
            return;
          }

          setHasAccess(true);
          setActiveTask(taskName);
        } catch {
          if (!active) {
            return;
          }

          if (!receptionistPermissions[requiredPermission]) {
            setHasAccess(false);
            setActiveTask(null);
            return;
          }

          setHasAccess(true);
          setActiveTask(taskName);
        }
      };

      void run();

      return () => {
        active = false;
        setActiveTask(null);
      };
    }, [
      pendingPermissionUpdate,
      receptionistPermissions,
      refreshReceptionPermissions,
      requiredPermission,
      enabled,
      setActiveTask,
      taskName,
    ])
  );

  return hasAccess;
};
