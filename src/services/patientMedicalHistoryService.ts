import { apiFetch } from "../config/api";

export type PatientMedicalHistoryItem = {
  consultation_id: number | string;
  date: string | null;
  doctor_name: string;
  specialization: string;
  medical_center_id?: string | null;
  medical_center_name: string;
  diagnosis?: string | null;
  notes?: string | null;
  status?: string | null;
  prescription_id?: number | string | null;
  medicines?: Array<{
    name?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }>;
};

const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  const message = typeof data?.message === "string" ? data.message.trim() : "";
  return message || fallback;
};

export const fetchPatientMedicalHistory = async (): Promise<PatientMedicalHistoryItem[]> => {
  const response = await apiFetch("/api/patients/medical-history");

  if (!response.ok) {
    throw new Error(await readError(response, "Failed to load medical history"));
  }

  const payload = await response.json();
  const rows = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  return rows.map((item: any) => ({
    consultation_id: item.consultation_id,
    date: item.date ?? null,
    doctor_name: item.doctor_name ?? "Doctor",
    specialization: item.specialization ?? "General Physician",
    medical_center_id: item.medical_center_id ?? null,
    medical_center_name: item.medical_center_name ?? "Medical Center",
    diagnosis: item.diagnosis ?? null,
    notes: item.notes ?? null,
    status: item.status ?? "completed",
    prescription_id: item.prescription_id ?? null,
    medicines: Array.isArray(item.medicines) ? item.medicines : [],
  }));
};
