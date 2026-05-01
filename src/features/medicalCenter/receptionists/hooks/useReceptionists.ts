import { Alert } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { DEFAULT_PERMISSIONS } from "../constants";
import {
  fetchReceptionistPermissionsRequest,
  fetchReceptionistsRequest,
  removeReceptionistRequest,
  resendReceptionistInviteRequest,
  updateReceptionistPermissionsRequest,
  updateReceptionistStatusRequest,
} from "../api";
import { matchesReceptionistFilter, toErrorMessage } from "../utils";
import type { FilterValue, Receptionist, ReceptionistPermissions } from "../types";

export function useReceptionists() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [selectedReceptionist, setSelectedReceptionist] = useState<Receptionist | null>(null);
  const [permissionDraft, setPermissionDraft] =
    useState<ReceptionistPermissions>(DEFAULT_PERMISSIONS);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [actionInFlightId, setActionInFlightId] = useState<string | null>(null);

  const updateReceptionistInState = useCallback(
    (receptionistId: string, updater: (current: Receptionist) => Receptionist) => {
      setReceptionists((current) =>
        current.map((item) => (item.id === receptionistId ? updater(item) : item))
      );
    },
    []
  );

  const fetchReceptionists = useCallback(async () => {
    setLoading(true);
    try {
      setReceptionists(await fetchReceptionistsRequest());
    } catch (error) {
      setReceptionists([]);
      Alert.alert("Error", toErrorMessage(error, "Unable to load receptionists."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchReceptionists();
    }, [fetchReceptionists])
  );

  const stats = useMemo(() => {
    const total = receptionists.length;
    const pending = receptionists.filter((item) => item.status === "PENDING").length;
    const active = receptionists.filter((item) => item.status === "ACTIVE").length;
    const disabled = receptionists.filter((item) => item.status === "DISABLED").length;
    return { total, pending, active, disabled };
  }, [receptionists]);

  const filteredReceptionists = useMemo(
    () =>
      receptionists.filter((item) => matchesReceptionistFilter(item, activeFilter, search)),
    [activeFilter, receptionists, search]
  );

  const toggleReceptionist = useCallback(
    async (receptionist: Receptionist) => {
      if (actionInFlightId) {
        return;
      }

      const targetStatus = receptionist.status === "DISABLED" ? "ACTIVE" : "INACTIVE";
      const actionLabel = receptionist.status === "DISABLED" ? "enable" : "disable";

      setActionInFlightId(receptionist.id);
      try {
        const nextStatus = await updateReceptionistStatusRequest(receptionist.id, targetStatus);
        updateReceptionistInState(receptionist.id, (current) => ({
          ...current,
          status: nextStatus,
        }));
      } catch (error) {
        Alert.alert(
          "Update Failed",
          toErrorMessage(error, `Unable to ${actionLabel} receptionist.`)
        );
      } finally {
        setActionInFlightId(null);
      }
    },
    [actionInFlightId, updateReceptionistInState]
  );

  const resendInvite = useCallback(
    async (receptionist: Receptionist) => {
      if (actionInFlightId) {
        return;
      }

      setActionInFlightId(receptionist.id);
      try {
        const result = await resendReceptionistInviteRequest(receptionist.id);
        Alert.alert(
          "Invite Sent",
          result.emailSent
            ? "The receptionist invite email was resent successfully."
            : "The invite link was regenerated, but email delivery did not complete."
        );
      } catch (error) {
        Alert.alert("Resend Failed", toErrorMessage(error, "Unable to resend invite."));
      } finally {
        setActionInFlightId(null);
      }
    },
    [actionInFlightId]
  );

  const removeReceptionist = useCallback(
    async (receptionist: Receptionist) => {
      if (actionInFlightId) {
        return;
      }

      setActionInFlightId(receptionist.id);
      try {
        await removeReceptionistRequest(receptionist.id);
        setReceptionists((current) => current.filter((item) => item.id !== receptionist.id));
      } catch (error) {
        Alert.alert("Remove Failed", toErrorMessage(error, "Unable to remove receptionist."));
      } finally {
        setActionInFlightId(null);
      }
    },
    [actionInFlightId]
  );

  const confirmRemove = useCallback(
    (receptionist: Receptionist) => {
      Alert.alert(
        "Remove From Clinic",
        `Remove ${receptionist.name} from this clinic? Their user account will remain in HealthLink.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              void removeReceptionist(receptionist);
            },
          },
        ]
      );
    },
    [removeReceptionist]
  );

  const openPermissionsModal = useCallback(async (receptionist: Receptionist) => {
    if (receptionist.status === "PENDING") {
      Alert.alert("Unavailable", "Permissions can be assigned only after password setup is complete.");
      return;
    }

    setSelectedReceptionist(receptionist);
    setPermissionDraft(receptionist.permissions);
    setPermissionModalVisible(true);
    setPermissionLoading(true);

    try {
      setPermissionDraft(await fetchReceptionistPermissionsRequest(receptionist.id));
    } catch (error) {
      Alert.alert("Permissions Error", toErrorMessage(error, "Unable to load permissions."));
      setPermissionModalVisible(false);
      setSelectedReceptionist(null);
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  const closePermissionsModal = useCallback(() => {
    if (permissionSaving) {
      return;
    }

    setPermissionModalVisible(false);
    setSelectedReceptionist(null);
    setPermissionDraft(DEFAULT_PERMISSIONS);
  }, [permissionSaving]);

  const savePermissions = useCallback(async () => {
    if (!selectedReceptionist || permissionSaving) {
      return;
    }

    setPermissionSaving(true);
    try {
      const updatedPermissions = await updateReceptionistPermissionsRequest(
        selectedReceptionist.id,
        permissionDraft
      );

      updateReceptionistInState(selectedReceptionist.id, (current) => ({
        ...current,
        permissions: updatedPermissions,
      }));
      setPermissionDraft(updatedPermissions);
      setPermissionModalVisible(false);
      setSelectedReceptionist(null);
    } catch (error) {
      Alert.alert("Save Failed", toErrorMessage(error, "Unable to save permissions."));
    } finally {
      setPermissionSaving(false);
    }
  }, [permissionDraft, permissionSaving, selectedReceptionist, updateReceptionistInState]);

  const openActionMenu = useCallback(
    (receptionist: Receptionist) => {
      const disableOrEnableLabel = receptionist.status === "DISABLED" ? "Enable" : "Disable";

      Alert.alert("More Options", receptionist.name, [
        {
          text: disableOrEnableLabel,
          onPress: () => {
            void toggleReceptionist(receptionist);
          },
        },
        ...(receptionist.status === "PENDING"
          ? [
              {
                text: "Resend Invite",
                onPress: () => {
                  void resendInvite(receptionist);
                },
              },
            ]
          : []),
        {
          text: "Remove from Clinic",
          style: "destructive" as const,
          onPress: () => confirmRemove(receptionist),
        },
        { text: "Cancel", style: "cancel" as const },
      ]);
    },
    [confirmRemove, resendInvite, toggleReceptionist]
  );

  return {
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    receptionists: filteredReceptionists,
    loading,
    stats,
    permissionModalVisible,
    selectedReceptionist,
    permissionDraft,
    setPermissionDraft,
    permissionLoading,
    permissionSaving,
    toggleReceptionist,
    resendInvite,
    openPermissionsModal,
    openActionMenu,
    savePermissions,
    closePermissionsModal,
    actionInFlightId,
  };
}
