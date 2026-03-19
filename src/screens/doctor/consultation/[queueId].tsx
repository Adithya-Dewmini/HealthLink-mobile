import React from "react";
import ConsultationScreen from "../../../components/ConsultationScreen";

export default function ConsultationPage({ route }: any) {
  const { queueId } = route.params ?? {};

  return <ConsultationScreen queueId={queueId} />;
}
