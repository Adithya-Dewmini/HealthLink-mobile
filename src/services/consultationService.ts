import { api } from "./apiClient";

export const createConsultationDraft = async (token: string, payload: any) => {
  const res = await api.post("/api/consultations", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateConsultationDraft = async (
  token: string,
  consultationId: number | string,
  payload: any
) => {
  const res = await api.patch(
    `/api/consultations/${consultationId}`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const saveConsultationMedicines = async (
  token: string,
  consultationId: number | string,
  medicines: any[]
) => {
  const res = await api.post(
    `/api/consultations/${consultationId}/medicines`,
    { medicines },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const completeConsultation = async (
  token: string,
  consultationId: number | string,
  medicines: any[]
) => {
  const res = await api.post(
    `/api/consultations/${consultationId}/complete`,
    { medicines },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const issueConsultationPrescription = async (
  token: string,
  consultationId: number | string,
  medicines: any[]
) => {
  const res = await api.post(
    `/api/consultations/${consultationId}/issue-prescription`,
    { medicines },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const searchMedicines = async (token: string, q: string) => {
  const res = await api.get("/api/medicines", {
    headers: { Authorization: `Bearer ${token}` },
    params: { q },
  });
  return res.data;
};
