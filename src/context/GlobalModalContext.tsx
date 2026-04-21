import React, { createContext, useContext, useMemo, useState } from "react";

type GlobalModalContextType = {
  showSuccess: boolean;
  showQR: boolean;
  prescription: any | null;
  triggerConsultationFlow: (data: any) => void;
  setShowSuccess: (value: boolean) => void;
  setShowQR: (value: boolean) => void;
  setPrescription: (value: any | null) => void;
};

const GlobalModalContext = createContext<GlobalModalContextType | null>(null);

export const useGlobalModal = () => {
  const ctx = useContext(GlobalModalContext);
  if (!ctx) throw new Error("useGlobalModal must be used within GlobalModalProvider");
  return ctx;
};

export const GlobalModalProvider = ({ children }: any) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [prescription, setPrescription] = useState<any | null>(null);

  const triggerConsultationFlow = (data: any) => {
    setPrescription(data);
    setShowSuccess(true);
  };

  const value = useMemo(
    () => ({
      showSuccess,
      showQR,
      prescription,
      triggerConsultationFlow,
      setShowSuccess,
      setShowQR,
      setPrescription,
    }),
    [showSuccess, showQR, prescription]
  );

  return (
    <GlobalModalContext.Provider value={value}>
      {children}
    </GlobalModalContext.Provider>
  );
};
