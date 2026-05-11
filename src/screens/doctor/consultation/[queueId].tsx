import React from "react";
import ConsultationScreen from "../../../components/ConsultationScreen";

type ConsultationPageProps = {
  route: {
    params?: {
      queueId?: string | number;
    };
  };
};

export default function ConsultationPage({ route }: ConsultationPageProps) {
  const { queueId } = route.params ?? {};

  return <ConsultationScreen queueId={queueId} />;
}
