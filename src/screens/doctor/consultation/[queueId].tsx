import React from "react";
import ConsultationScreen from "../../../components/ConsultationScreen";

type ConsultationPageProps = {
  route: {
    params?: {
      queueId?: string | number;
      patientId?: string | number | null;
      appointmentId?: string | number | null;
      sessionId?: string | number | null;
    };
  };
};

export default function ConsultationPage({ route }: ConsultationPageProps) {
  const { queueId, patientId, appointmentId, sessionId } = route.params ?? {};

  return (
    <ConsultationScreen
      queueId={queueId}
      patientId={patientId}
      appointmentId={appointmentId}
      sessionId={sessionId}
    />
  );
}
