import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useAuth } from "../utils/AuthContext";

export const useReceptionActiveTask = (taskName: string | null) => {
  const { setActiveTask } = useAuth();

  useFocusEffect(
    useCallback(() => {
      setActiveTask(taskName);
      return () => {
        setActiveTask(null);
      };
    }, [setActiveTask, taskName])
  );
};
