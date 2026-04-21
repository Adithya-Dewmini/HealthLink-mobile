import axios from "axios";
import { API_BASE_URL } from "../config/api";

const API_URL = `${API_BASE_URL}/api`;

export const verifyPrescription = async (token: string, qrToken: string) => {
  const res = await axios.get(`${API_URL}/prescriptions/verify/${qrToken}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const fetchPrescription = async (token: string, id: string | number) => {
  const res = await axios.get(`${API_URL}/prescriptions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const dispensePrescription = async (token: string, id: string | number) => {
  const res = await axios.post(
    `${API_URL}/prescriptions/${id}/dispense`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};
