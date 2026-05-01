import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import { useCallback } from "react";
import { useAuth } from "../utils/AuthContext";

type PermissionKey = "can_manage_queue" | "can_manage_appointments" | "can_check_in";

export const useReceptionPermissionGuard = (
  taskName: string,
  requiredPermission: PermissionKey
) => {
  const navigation = useNavigation<any>();
  const {
    receptionistPermissions,
    pendingPermissionUpdate,
    refreshReceptionPermissions,
    setActiveTask,
  } = useAuth();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async () => {
        try {
          let effectivePermissions = receptionistPermissions;

          if (pendingPermissionUpdate) {
            effectivePermissions = await refreshReceptionPermissions();
          }

          if (!active) {
            return;
          }

          if (!effectivePermissions[requiredPermission]) {
            Alert.alert(
              "Access Updated",
              "Your access has changed. You no longer have permission to use this feature.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.navigate("ReceptionistHome");
                  },
                },
              ]
            );
            return;
          }

          setActiveTask(taskName);
        } catch {
          if (!active) {
            return;
          }

          if (!receptionistPermissions[requiredPermission]) {
            navigation.navigate("ReceptionistHome");
            return;
          }

          setActiveTask(taskName);
        }
      };

      void run();

      return () => {
        active = false;
        setActiveTask(null);
      };
    }, [
      navigation,
      pendingPermissionUpdate,
      receptionistPermissions,
      refreshReceptionPermissions,
      requiredPermission,
      setActiveTask,
      taskName,
    ])
  );
};
