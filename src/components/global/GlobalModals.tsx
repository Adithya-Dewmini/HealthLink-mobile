import React, { useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { navigationRef } from "../../navigation/navigationRef";
import { apiFetch } from "../../config/api";
import SuccessAnimationModal from "../common/SuccessAnimationModal";
import PrescriptionPopup from "../patient/PrescriptionPopup";
import { useGlobalModal } from "../../context/GlobalModalContext";
import { connectSocket, getSocket, joinPatientRoom } from "../../services/socket";
import { AuthContext } from "../../utils/AuthContext";

export default function GlobalModals() {
  const {
    showSuccess,
    showQR,
    prescription,
    triggerConsultationFlow,
    setShowSuccess,
    setShowQR,
  } = useGlobalModal();
  const { role, loading: authLoading } = useContext(AuthContext);
  const [isPatient, setIsPatient] = useState(false);
  const [patientId, setPatientId] = useState<string | number | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [lastPopupId, setLastPopupId] = useState<string | null>(null);
  const [persistedPopupId, setPersistedPopupId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setIsPatient(false);
        setPatientId(null);
        setLastSeenId(null);
        setLastPopupId(null);
        setPersistedPopupId(null);
        setStorageReady(true);
        return;
      }
      try {
        const decoded: any = jwtDecode(token);
        const isPatientRole = decoded?.role === "patient" || decoded?.role === "user";
        setIsPatient(isPatientRole);
        const decodedId = decoded?.id ?? null;
        setPatientId(decodedId);
        if (decoded?.role === "patient" || decoded?.role === "user") {
          connectSocket(token);
          if (decodedId) joinPatientRoom(decodedId);
        }
      } catch {
        setIsPatient(false);
        setPatientId(null);
        setLastSeenId(null);
        setLastPopupId(null);
        setPersistedPopupId(null);
      }
      const decodedId = (() => {
        try {
          const decoded: any = jwtDecode(token);
          return decoded?.id ?? null;
        } catch {
          return null;
        }
      })();
      const seenKey = decodedId ? `lastSeenPrescriptionId:${decodedId}` : "lastSeenPrescriptionId";
      const popupKey = decodedId ? `lastPopupId:${decodedId}` : "lastPopupId";

      const storedSeen =
        (decodedId ? await AsyncStorage.getItem(seenKey) : null) ||
        (await AsyncStorage.getItem("lastSeenPrescriptionId"));
      setLastSeenId(storedSeen ?? null);
      const storedPopup =
        (decodedId ? await AsyncStorage.getItem(popupKey) : null) ||
        (await AsyncStorage.getItem("lastPopupId"));
      setPersistedPopupId(storedPopup ?? null);
      setStorageReady(true);
    };
    setStorageReady(false);
    void init();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setIsPatient(false);
        setPatientId(null);
        return;
      }
      try {
        const decoded: any = jwtDecode(token);
        const isPatientRole = decoded?.role === "patient" || decoded?.role === "user";
        setIsPatient(isPatientRole);
        setPatientId(decoded?.id ?? null);
        if (isPatientRole && decoded?.id) {
          connectSocket(token);
          joinPatientRoom(decoded.id);
        }
      } catch {
        setIsPatient(false);
        setPatientId(null);
      }
    })();
  }, [role, authLoading]);

  // QR popup should be closed only by the patient (no auto-close).

  const markSeenById = useCallback(async (id?: string | number) => {
    if (!id) return;
    const seenKey = patientId ? `lastSeenPrescriptionId:${patientId}` : "lastSeenPrescriptionId";
    try {
      await apiFetch(`/api/patients/prescriptions/${id}/seen`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Mark prescription seen error:", err);
    } finally {
      // Always persist locally so the popup doesn't repeat on devices without is_seen support.
      await AsyncStorage.setItem(seenKey, String(id));
      setLastSeenId(String(id));
    }
  }, [patientId]);

  const fetchLatestPrescription = useCallback(async (shouldTrigger: boolean) => {
    if (!isPatient || !patientId || !storageReady) return;
    try {
      const res = await apiFetch("/api/patients/prescriptions?latest=true");
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.id) return;
      if (data?.isSeen !== false) return;
      if (!data?.qrToken && !data?.qr_code) return;

      const incomingId = String(data.id);
      if (lastPopupId === incomingId) return;
      if (persistedPopupId && incomingId === persistedPopupId) return;
      if (lastSeenId && incomingId === lastSeenId) return;

      triggerConsultationFlow(data);
      setLastPopupId(incomingId);
      const popupKey = `lastPopupId:${patientId}`;
      await AsyncStorage.setItem(popupKey, incomingId);
      setPersistedPopupId(incomingId);
      await markSeenById(incomingId);
    } catch (err) {
      console.error("Global latest prescription fetch error:", err);
    }
  }, [
    isPatient,
    lastPopupId,
    lastSeenId,
    persistedPopupId,
    triggerConsultationFlow,
    patientId,
    storageReady,
    markSeenById,
  ]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleReady = () => {
      void fetchLatestPrescription(true);
    };
    socket.on("prescription:ready", handleReady);
    return () => {
      socket.off("prescription:ready", handleReady);
    };
  }, [fetchLatestPrescription]);

  useEffect(() => {
    if (!isPatient || !storageReady) return;
    void fetchLatestPrescription(false);
    const id = setInterval(() => {
      void fetchLatestPrescription(false);
    }, 20000);
    return () => clearInterval(id);
  }, [isPatient, fetchLatestPrescription, storageReady]);

  return (
    <>
      <SuccessAnimationModal
        visible={showSuccess}
        onFinish={() => {
          setShowSuccess(false);
          setShowQR(true);
        }}
      />

      <PrescriptionPopup
        visible={showQR}
        prescription={prescription}
        onClose={async () => {
          setShowQR(false);
        }}
        onView={async () => {
          setShowQR(false);
          if (prescription?.id && navigationRef.isReady()) {
            navigationRef.navigate("PatientStack", {
              screen: "PrescriptionDetails",
              params: { id: String(prescription.id) },
            });
          }
        }}
      />
    </>
  );
}
