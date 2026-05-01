import { api } from "./apiClient";

export const verifyPrescription = async (token: string, qrToken: string) => {
  const res = await api.get(`/api/prescriptions/verify/${qrToken}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const fetchPrescription = async (token: string, id: string | number) => {
  const res = await api.get(`/api/prescriptions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const dispensePrescription = async (token: string, id: string | number) => {
  const res = await api.post(
    `/api/prescriptions/${id}/dispense`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};
