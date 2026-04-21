import axios from "axios";
import { API_BASE_URL } from "../config/api";

const API_URL = `${API_BASE_URL}/api`;

export const createConsultationDraft = async (token: string, payload: any) => {
  const res = await axios.post(`${API_URL}/consultations`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateConsultationDraft = async (
  token: string,
  consultationId: number | string,
  payload: any
) => {
  const res = await axios.patch(
    `${API_URL}/consultations/${consultationId}`,
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
  const res = await axios.post(
    `${API_URL}/consultations/${consultationId}/medicines`,
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
  const res = await axios.post(
    `${API_URL}/consultations/${consultationId}/complete`,
    { medicines },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const searchMedicines = async (token: string, q: string) => {
  const res = await axios.get(`${API_URL}/medicines`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { q },
  });
  return res.data;
};
