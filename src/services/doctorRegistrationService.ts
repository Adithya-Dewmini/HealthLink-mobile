import { api } from "../api/client";

export type DoctorRegistrationPayload = {
  full_name: string;
  nic: string;
  email: string;
  phone: string;
  slmc_number: string;
  qualification: string;
  specialization: string;
  experience_years: number;
  workplace: string;
  password: string;
  slmc_certificate: {
    uri: string;
    name: string;
    type: string;
  };
  degree_certificate: {
    uri: string;
    name: string;
    type: string;
  };
  id_proof: {
    uri: string;
    name: string;
    type: string;
  };
};

export type DoctorRegistrationResponse = {
  success: boolean;
  message: string;
  doctorId: number;
  verificationStatus: "pending" | "approved" | "rejected" | "suspended";
  requiresApproval: boolean;
  requiresPasswordSetup: boolean;
  canLogin: boolean;
  email: string;
};

export const registerDoctor = async (
  payload: DoctorRegistrationPayload
): Promise<DoctorRegistrationResponse> => {
  const formData = new FormData();

  formData.append("full_name", payload.full_name);
  formData.append("nic", payload.nic);
  formData.append("email", payload.email);
  formData.append("phone", payload.phone);
  formData.append("slmc_number", payload.slmc_number);
  formData.append("qualification", payload.qualification);
  formData.append("specialization", payload.specialization);
  formData.append("experience_years", String(payload.experience_years));
  formData.append("workplace", payload.workplace);
  formData.append("password", payload.password);
  formData.append("slmc_certificate", payload.slmc_certificate as any);
  formData.append("degree_certificate", payload.degree_certificate as any);
  formData.append("id_proof", payload.id_proof as any);

  const response = await api.post<DoctorRegistrationResponse>("/api/doctors/register", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
