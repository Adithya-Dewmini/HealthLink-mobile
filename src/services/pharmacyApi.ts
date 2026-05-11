import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "../config/api";

export type PharmacyMedicineItem = {
  id: number;
  medicineId: number | null;
  medicineName: string;
  requiredQuantity?: number | null;
  dispensedQuantity?: number | null;
  remainingQuantity?: number | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  availableStock: number | null;
  unitPrice: number | null;
  demandCount?: number;
  lowStockAlert?: boolean;
  substitutions?: PharmacySubstitutionOption[];
};

export type PharmacySubstitutionOption = {
  medicineId: number;
  medicineName: string;
  availableStock: number;
  unitPrice: number | null;
  matchType?: "generic" | "ingredient" | "category" | string;
  matchLabel?: string;
  requiresPharmacistReview?: boolean;
};

export type PharmacyPrescriptionDetailItem = {
  id: number;
  medicineId: number | null;
  medicineName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  requiredQuantity: number;
  dispensedQuantity?: number;
  remainingQuantity?: number;
  currentStock: number;
  demandCount?: number;
  lowStockAlert?: boolean;
  substitutions?: PharmacySubstitutionOption[];
};

export type PharmacyPrescriptionDetails = {
  prescription: {
    id: number | string;
    qrCode?: string;
    token?: string;
    status?: string;
    isSeen?: boolean;
    issuedAt?: string;
    dispensedAt?: string | null;
    dispensedBy?: number | null;
    patientName?: string;
    doctorName?: string;
  };
  items: PharmacyPrescriptionDetailItem[];
};

export type PharmacyPrescription = {
  prescription: {
    id: number | string;
    qrCode?: string;
    isSeen?: boolean;
    issuedAt?: string;
    dispensedAt?: string | null;
    dispensedBy?: number | null;
    patientName?: string;
    doctorName?: string;
  };
  items: PharmacyMedicineItem[];
};

type SessionContext = {
  token: string;
  pharmacistUserId: number | string | null;
  pharmacyId: number | string | null;
};

const getSessionContext = async (providedPharmacyId?: number | string | null): Promise<SessionContext> => {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Session expired");
  }

  const decoded: any = jwtDecode(token);
  const pharmacyId =
    providedPharmacyId ??
    decoded?.pharmacyId ??
    decoded?.pharmacy_id ??
    (await AsyncStorage.getItem("pharmacyId"));

  return {
    token,
    pharmacistUserId: decoded?.id ?? null,
    pharmacyId: pharmacyId ?? null,
  };
};

const apiRequest = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
};

const normalizeRouteId = (value: number | string, label: string) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`Invalid ${label}`);
  }
  return normalized;
};

const parseQrToken = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.token) return String(parsed.token);
  } catch {
    // ignore invalid JSON
  }

  const marker = "/prescription/";
  if (trimmed.includes(marker)) {
    return trimmed.split(marker).pop() || "";
  }

  return trimmed;
};

export const getPrescription = async (
  qrToken: string,
  pharmacyId?: number | string | null
): Promise<PharmacyPrescription> => {
  const session = await getSessionContext(pharmacyId);
  const normalizedToken = parseQrToken(qrToken);
  if (!normalizedToken) {
    throw new Error("Invalid QR code");
  }

  const query = session.pharmacyId
    ? `?pharmacy_id=${encodeURIComponent(String(session.pharmacyId))}`
    : "";
  return apiRequest<PharmacyPrescription>(
    `/api/pharmacy/prescription/${encodeURIComponent(normalizedToken)}${query}`,
    { method: "GET" },
    session.token
  );
};

export const getPrescriptionById = async (
  prescriptionId: number | string
): Promise<PharmacyPrescriptionDetails> => {
  const normalizedPrescriptionId = normalizeRouteId(prescriptionId, "prescription id");
  const session = await getSessionContext();
  return apiRequest<PharmacyPrescriptionDetails>(
    `/api/pharmacy/prescriptions/${encodeURIComponent(normalizedPrescriptionId)}`,
    { method: "GET" },
    session.token
  );
};

export const confirmDispense = async (prescriptionId: number | string) => {
  const normalizedPrescriptionId = normalizeRouteId(prescriptionId, "prescription id");
  const session = await getSessionContext();
  return apiRequest<{
    message: string;
    prescription_id: number | string;
    status: string;
    dispensed_items: Array<{
      medicine_id: number;
      medicine_name: string;
      dispensed_quantity: number;
      remaining_quantity: number;
      prescription_item_ids: number[];
    }>;
  }>(
    `/api/pharmacy/dispense/${encodeURIComponent(normalizedPrescriptionId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pharmacist_user_id: session.pharmacistUserId,
      }),
    },
    session.token
  );
};

export const dispense = async (payload: {
  prescriptionId: number | string;
  selectedItems: Array<{ prescription_item_id: number; quantity: number }>;
  pharmacyId?: number | string | null;
}) => {
  const session = await getSessionContext(payload.pharmacyId);
  if (!session.pharmacyId) {
    throw new Error("Missing pharmacy assignment");
  }

  return apiRequest<{
    message: string;
    prescription_id: number | string;
    dispense_status?: "completed" | "partially_dispensed";
    is_partial?: boolean;
    dispensed_items: Array<{
      prescription_item_id: number;
      medicine_id: number;
      medicine_name: string;
      quantity: number;
      required_quantity?: number;
      dispensed_quantity?: number;
      remaining_quantity?: number;
      remaining_stock: number;
    }>;
    remaining_items?: Array<{
      prescription_item_id: number;
      medicine_id: number | null;
      medicine_name: string;
      required_quantity: number;
      dispensed_quantity: number;
      remaining_quantity: number;
    }>;
  }>(
    "/api/pharmacy/dispense",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_id: payload.prescriptionId,
        pharmacy_id: session.pharmacyId,
        pharmacist_user_id: session.pharmacistUserId,
        selected_items: payload.selectedItems,
      }),
    },
    session.token
  );
};

export const createSale = async (payload: {
  prescriptionId: number | string;
  items: Array<{
    prescription_item_id: number;
    quantity: number;
    unit_price?: number | null;
    medicine_id?: number | null;
  }>;
  pharmacyId?: number | string | null;
}) => {
  const session = await getSessionContext(payload.pharmacyId);
  if (!session.pharmacyId) {
    throw new Error("Missing pharmacy assignment");
  }

  return apiRequest<{
    message: string;
    sale_id: number | string;
    total_amount: number;
    items: Array<{
      medicine_id: number;
      prescription_item_id: number | null;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  }>(
    "/api/pharmacy/sale",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prescription_id: payload.prescriptionId,
        pharmacy_id: session.pharmacyId,
        pharmacist_user_id: session.pharmacistUserId,
        items: payload.items,
      }),
    },
    session.token
  );
};
