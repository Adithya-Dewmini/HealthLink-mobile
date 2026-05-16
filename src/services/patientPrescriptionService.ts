import { apiFetch } from "../config/api";

export type PatientPrescriptionMedicine = {
  id?: string | number | null;
  name?: string | null;
  medicine_name?: string | null;
  dosage?: string | null;
  frequency?: string | { morning?: number; afternoon?: number; night?: number } | null;
  duration?: string | number | null;
  instructions?: string | null;
};

export type PrescriptionFulfillmentMatchItem = {
  prescriptionItemId: string;
  inventoryItemId: number;
  marketplaceProductId: number;
  medicineName: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  unitPrice: number;
  totalPrice: number;
  requiresPrescription: boolean;
};

export type PrescriptionFulfillmentMissingItem = {
  prescriptionItemId: string;
  medicineName: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
};

export type PrescriptionFulfillmentMatch = {
  pharmacy: {
    id: number;
    name: string;
    location: string | null;
  };
  coveragePercentage: number;
  availableItems: PrescriptionFulfillmentMatchItem[];
  missingItems: PrescriptionFulfillmentMissingItem[];
  estimatedTotal: number;
  fullyAvailable: boolean;
};

export type PrescriptionFulfillmentResponse = {
  prescriptionId: string;
  matches: PrescriptionFulfillmentMatch[];
};

export type PrescriptionDeliveryAddress = {
  line1: string;
  line2?: string | null;
  city?: string | null;
  district?: string | null;
  postalCode?: string | null;
  landmark?: string | null;
};

export type PatientPrescriptionListItem = {
  id: string | number;
  qrToken?: string | null;
  doctor?: {
    name?: string | null;
    specialization?: string | null;
  } | null;
  doctor_name?: string | null;
  doctorName?: string | null;
  specialization?: string | null;
  medical_center_name?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  status?: string | null;
  medicines?: PatientPrescriptionMedicine[];
  isSeen?: boolean;
};

const parseError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  return typeof data?.message === "string" && data.message.trim() ? data.message : fallback;
};

export const fetchPatientPrescriptions = async (): Promise<PatientPrescriptionListItem[]> => {
  const response = await apiFetch("/api/patients/prescriptions");

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load prescriptions"));
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
};

export const fetchPatientPrescriptionDetail = async (prescriptionId: string | number) => {
  const response = await apiFetch(`/api/patients/prescriptions/${encodeURIComponent(String(prescriptionId))}`);

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load prescription"));
  }

  return response.json();
};

export const markPatientPrescriptionSeen = async (prescriptionId: string | number) => {
  const response = await apiFetch(`/api/patients/prescriptions/${encodeURIComponent(String(prescriptionId))}/seen`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to update prescription"));
  }
};

export const buildPrescriptionCart = async (
  prescriptionId: string | number
): Promise<PrescriptionFulfillmentResponse> => {
  const response = await apiFetch(
    `/api/patients/prescriptions/${encodeURIComponent(String(prescriptionId))}/build-cart`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to analyze prescription fulfillment"));
  }

  return response.json();
};

export const createPrescriptionOrder = async (
  prescriptionId: string | number,
  input: {
    pharmacyId: number;
    acceptPartial: boolean;
    fulfillmentMethod?: "pickup" | "delivery";
    paymentMethod?: "cash" | "online";
    notes?: string;
    deliveryAddress?: PrescriptionDeliveryAddress | null;
    deliveryNotes?: string | null;
    deliveryContactName?: string | null;
    deliveryContactPhone?: string | null;
  }
) => {
  const response = await apiFetch(
    `/api/patients/prescriptions/${encodeURIComponent(String(prescriptionId))}/create-order`,
    {
      method: "POST",
      body: JSON.stringify({
        pharmacy_id: input.pharmacyId,
        accept_partial: input.acceptPartial,
        fulfillment_method: input.fulfillmentMethod ?? "pickup",
        payment_method: input.paymentMethod ?? "cash",
        notes: input.notes?.trim() || undefined,
        delivery_address: input.deliveryAddress ?? undefined,
        delivery_notes: input.deliveryNotes?.trim() || undefined,
        delivery_contact_name: input.deliveryContactName?.trim() || undefined,
        delivery_contact_phone: input.deliveryContactPhone?.trim() || undefined,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to create prescription order"));
  }

  return response.json();
};
