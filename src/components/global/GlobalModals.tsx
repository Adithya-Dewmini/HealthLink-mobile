import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
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
    setPrescription,
  } = useGlobalModal();
  const { role, loading: authLoading } = useContext(AuthContext);
  const [isPatient, setIsPatient] = useState(false);
  const [patientId, setPatientId] = useState<string | number | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [lastPopupId, setLastPopupId] = useState<string | null>(null);
  const [persistedPopupId, setPersistedPopupId] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const lastSeenIdRef = useRef<string | null>(null);
  const lastPopupIdRef = useRef<string | null>(null);
  const persistedPopupIdRef = useRef<string | null>(null);
  const acknowledgedIdsRef = useRef<string[]>([]);

  const syncLastSeenId = useCallback((value: string | null) => {
    lastSeenIdRef.current = value;
    setLastSeenId(value);
  }, []);

  const syncLastPopupId = useCallback((value: string | null) => {
    lastPopupIdRef.current = value;
    setLastPopupId(value);
  }, []);

  const syncPersistedPopupId = useCallback((value: string | null) => {
    persistedPopupIdRef.current = value;
    setPersistedPopupId(value);
  }, []);

  const syncAcknowledgedIds = useCallback((value: string[]) => {
    acknowledgedIdsRef.current = value;
    setAcknowledgedIds(value);
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setIsPatient(false);
        setPatientId(null);
        syncLastSeenId(null);
        syncLastPopupId(null);
        syncPersistedPopupId(null);
        syncAcknowledgedIds([]);
        setStorageReady(true);
        return;
      }
      let decodedId: string | number | null = null;
      try {
        const decoded: any = jwtDecode(token);
        const isPatientRole = decoded?.role === "patient" || decoded?.role === "user";
        setIsPatient(isPatientRole);
        decodedId = decoded?.id ?? null;
        setPatientId(decodedId);
        if (decoded?.role === "patient" || decoded?.role === "user") {
          connectSocket(token);
          if (decodedId) joinPatientRoom(decodedId);
        }
      } catch {
        setIsPatient(false);
        setPatientId(null);
        syncLastSeenId(null);
        syncLastPopupId(null);
        syncPersistedPopupId(null);
        syncAcknowledgedIds([]);
      }

      const seenKey = decodedId ? `lastSeenPrescriptionId:${decodedId}` : null;
      const popupKey = decodedId ? `lastPopupId:${decodedId}` : null;
      const acknowledgedKey = decodedId ? `acknowledgedPrescriptionIds:${decodedId}` : null;

      const storedSeen =
        (seenKey ? await AsyncStorage.getItem(seenKey) : null) ||
        (await AsyncStorage.getItem("lastSeenPrescriptionId"));
      const storedPopup =
        (popupKey ? await AsyncStorage.getItem(popupKey) : null) ||
        (await AsyncStorage.getItem("lastPopupId"));
      const storedAcknowledgedRaw = acknowledgedKey
        ? await AsyncStorage.getItem(acknowledgedKey)
        : null;
      let storedAcknowledged: string[] = [];
      if (storedAcknowledgedRaw) {
        try {
          const parsed = JSON.parse(storedAcknowledgedRaw);
          if (Array.isArray(parsed)) {
            storedAcknowledged = parsed
              .map((item) => String(item ?? "").trim())
              .filter(Boolean);
          }
        } catch {
          storedAcknowledged = [];
        }
      }
      if (storedSeen && !storedAcknowledged.includes(storedSeen)) {
        storedAcknowledged.push(storedSeen);
      }
      if (storedPopup && !storedAcknowledged.includes(storedPopup)) {
        storedAcknowledged.push(storedPopup);
      }

      if (seenKey && storedSeen) {
        await AsyncStorage.setItem(seenKey, storedSeen);
      }
      if (popupKey && storedPopup) {
        await AsyncStorage.setItem(popupKey, storedPopup);
      }
      if (acknowledgedKey) {
        await AsyncStorage.setItem(acknowledgedKey, JSON.stringify(storedAcknowledged));
      }

      syncLastSeenId(storedSeen ?? null);
      syncPersistedPopupId(storedPopup ?? null);
      syncAcknowledgedIds(storedAcknowledged);
      setStorageReady(true);
    };
    setStorageReady(false);
    void init();
  }, [syncAcknowledgedIds, syncLastPopupId, syncLastSeenId, syncPersistedPopupId]);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setIsPatient(false);
        setPatientId(null);
        syncAcknowledgedIds([]);
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
        syncAcknowledgedIds([]);
      }
    })();
  }, [role, authLoading, syncAcknowledgedIds]);

  // QR popup should be closed only by the patient (no auto-close).

  const markSeenById = useCallback(async (id?: string | number) => {
    if (!id) return;
    const normalizedId = String(id);
    const seenKey = patientId ? `lastSeenPrescriptionId:${patientId}` : "lastSeenPrescriptionId";
    const acknowledgedKey = patientId ? `acknowledgedPrescriptionIds:${patientId}` : "acknowledgedPrescriptionIds";
    const nextAcknowledged = acknowledgedIdsRef.current.includes(normalizedId)
      ? acknowledgedIdsRef.current
      : [...acknowledgedIdsRef.current, normalizedId];
    try {
      await apiFetch(`/api/patients/prescriptions/${normalizedId}/seen`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Mark prescription seen error:", err);
    } finally {
      await AsyncStorage.multiSet([
        [seenKey, normalizedId],
        [acknowledgedKey, JSON.stringify(nextAcknowledged)],
      ]);
      syncLastSeenId(normalizedId);
      syncAcknowledgedIds(nextAcknowledged);
    }
  }, [patientId, syncAcknowledgedIds, syncLastSeenId]);

  const acknowledgePopupId = useCallback(async (id?: string | number) => {
    if (!id) return;
    const normalizedId = String(id);
    if (acknowledgedIdsRef.current.includes(normalizedId)) return;
    const acknowledgedKey = patientId ? `acknowledgedPrescriptionIds:${patientId}` : "acknowledgedPrescriptionIds";
    const nextAcknowledged = [...acknowledgedIdsRef.current, normalizedId];
    await AsyncStorage.setItem(acknowledgedKey, JSON.stringify(nextAcknowledged));
    syncAcknowledgedIds(nextAcknowledged);
  }, [patientId, syncAcknowledgedIds]);

  const fetchLatestPrescription = useCallback(async () => {
    if (!isPatient || !patientId || !storageReady) return;
    try {
      const res = await apiFetch("/api/patients/prescriptions?latest=true");
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.id) return;
      if (data?.isSeen !== false) return;
      if (!data?.qrToken && !data?.qr_code) return;

      const incomingId = String(data.id);
      if (prescription?.id && String(prescription.id) === incomingId && showQR) return;
      if (acknowledgedIdsRef.current.includes(incomingId)) return;
      if (lastPopupIdRef.current === incomingId) return;
      if (persistedPopupIdRef.current && incomingId === persistedPopupIdRef.current) return;
      if (lastSeenIdRef.current && incomingId === lastSeenIdRef.current) return;

      await acknowledgePopupId(incomingId);
      triggerConsultationFlow(data);
      syncLastPopupId(incomingId);
      const popupKey = `lastPopupId:${patientId}`;
      await AsyncStorage.setItem(popupKey, incomingId);
      syncPersistedPopupId(incomingId);
    } catch (err) {
      console.error("Global latest prescription fetch error:", err);
    }
  }, [
    isPatient,
    triggerConsultationFlow,
    patientId,
    storageReady,
    prescription?.id,
    showQR,
    syncLastPopupId,
    syncPersistedPopupId,
    acknowledgePopupId,
  ]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleReady = () => {
      void fetchLatestPrescription();
    };
    socket.on("prescription:ready", handleReady);
    return () => {
      socket.off("prescription:ready", handleReady);
    };
  }, [fetchLatestPrescription]);

  useEffect(() => {
    if (!isPatient || !storageReady) return;
    void fetchLatestPrescription();
    const id = setInterval(() => {
      void fetchLatestPrescription();
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
          setPrescription(null);
          await markSeenById(prescription?.id);
        }}
        onView={async () => {
          setShowQR(false);
          setPrescription(null);
          await markSeenById(prescription?.id);
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
