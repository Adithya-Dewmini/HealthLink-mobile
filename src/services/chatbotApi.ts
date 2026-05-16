import { apiFetch } from "../config/api";

export type PatientAssistantIntent =
  | "BOOK_APPOINTMENT"
  | "SEARCH_DOCTORS"
  | "SELECT_SESSION"
  | "CONFIRM_BOOKING"
  | "VIEW_QUEUE"
  | "VIEW_APPOINTMENTS"
  | "VIEW_PRESCRIPTION"
  | "VIEW_MEDICAL_RECORDS"
  | "PHARMACY_SEARCH"
  | "MEDICINE_AVAILABILITY"
  | "PRESCRIPTION_FULFILLMENT"
  | "PHARMACY_ORDER_STATUS"
  | "ADD_TO_CART_DRAFT"
  | "HEALTH_PRODUCT_GUIDANCE"
  | "GENERAL_HEALTH_INFO"
  | "APP_HELP"
  | "SMALL_TALK"
  | "UNKNOWN";

export type PatientAssistantRiskLevel = "NONE" | "LOW" | "MODERATE" | "URGENT";

export type PatientAssistantActionType =
  | "OPEN_DOCTOR_SEARCH"
  | "SHOW_SESSION_RESULTS"
  | "SELECT_SESSION"
  | "CONFIRM_BOOKING"
  | "OPEN_QUEUE"
  | "OPEN_APPOINTMENTS"
  | "OPEN_PRESCRIPTIONS"
  | "OPEN_MEDICAL_RECORDS"
  | "SHOW_MEDICINE_RESULTS"
  | "SHOW_PHARMACY_RESULTS"
  | "OPEN_PHARMACY_SEARCH"
  | "OPEN_PHARMACY_PRODUCT"
  | "ADD_TO_CART"
  | "CONFIRM_ADD_TO_CART"
  | "OPEN_CART"
  | "OPEN_ORDER_STATUS"
  | "OPEN_PRESCRIPTION_ORDER"
  | "BOOK_DOCTOR_FOR_MEDICINE"
  | "CALL_EMERGENCY"
  | "ASK_FOLLOW_UP"
  | "CLEAR_CONTEXT";

export type PatientAssistantExtracted = {
  symptoms?: string[];
  specialty?: string;
  preferredDate?: string;
  preferredTime?: string;
  doctorName?: string;
  medicalCenterName?: string;
  medicineName?: string;
  medicineCategory?: string;
  pharmacyName?: string;
  orderId?: string;
  prescriptionId?: string;
  dosageForm?: string;
  appointmentId?: string;
  sessionId?: string;
};

export type PatientAssistantSessionCard = {
  sessionId: string;
  doctorName: string;
  specialty: string;
  medicalCenterName: string;
  date: string;
  time: string;
  availableSlots?: number;
};

export type MedicineRecommendation = {
  productId: string;
  medicineName: string;
  genericName?: string;
  brandName?: string;
  category?: string;
  dosageForm?: string;
  strength?: string;
  pharmacyName?: string;
  pharmacyId?: string;
  price?: number;
  currency?: string;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  requiresPrescription?: boolean;
  imageUrl?: string;
  safetyNote?: string;
  matchReason?: string;
  matchConfidence?: number;
};

export type PharmacyRecommendation = {
  pharmacyId: string;
  pharmacyName: string;
  address?: string;
  distanceKm?: number;
  openStatus?: "OPEN" | "CLOSED" | "UNKNOWN";
  availableItems?: number;
};

export type PatientChatbotAction = {
  type: PatientAssistantActionType;
  label: string;
  payload?: Record<string, unknown>;
  requiresConfirmation?: boolean;
};

export type PatientChatbotResponse = {
  reply: string;
  intent: PatientAssistantIntent;
  riskLevel: PatientAssistantRiskLevel;
  extracted: PatientAssistantExtracted;
  actions: PatientChatbotAction[];
  suggestions: string[];
  conversationId?: string;
  medicineResults?: MedicineRecommendation[];
  pharmacyResults?: PharmacyRecommendation[];
};

export type SendPatientChatMessageInput = {
  message: string;
  conversationId?: string;
  language?: "en" | "si" | "ta";
  actionPayload?: Record<string, unknown>;
};

const FALLBACK_ERROR = "I’m having trouble connecting right now. Please try again.";
const RECOVERY_SUGGESTIONS = ["Try again", "Book Doctor", "My Queue"];

export const getChatbotRecoverySuggestions = () => RECOVERY_SUGGESTIONS;

const normalizeActions = (value: unknown): PatientChatbotAction[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is PatientChatbotAction =>
          !!item &&
          typeof item === "object" &&
          typeof (item as PatientChatbotAction).type === "string" &&
          typeof (item as PatientChatbotAction).label === "string"
      )
    : [];

const normalizeMedicineResults = (value: unknown): MedicineRecommendation[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is MedicineRecommendation =>
          !!item &&
          typeof item === "object" &&
          typeof (item as MedicineRecommendation).productId === "string" &&
          typeof (item as MedicineRecommendation).medicineName === "string"
      )
    : [];

const normalizePharmacyResults = (value: unknown): PharmacyRecommendation[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is PharmacyRecommendation =>
          !!item &&
          typeof item === "object" &&
          typeof (item as PharmacyRecommendation).pharmacyId === "string" &&
          typeof (item as PharmacyRecommendation).pharmacyName === "string"
      )
    : [];

export const sendPatientChatMessage = async (
  input: SendPatientChatMessageInput
): Promise<PatientChatbotResponse> => {
  try {
    const response = await apiFetch("/api/patient/chatbot/message", {
      method: "POST",
      body: JSON.stringify({
        message: input.message.trim(),
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        ...(input.language ? { language: input.language } : {}),
        ...(input.actionPayload ? { actionPayload: input.actionPayload } : {}),
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        typeof payload?.message === "string" && payload.message.trim() ? payload.message : FALLBACK_ERROR
      );
    }
    return {
      reply: typeof payload?.reply === "string" ? payload.reply : "",
      intent: typeof payload?.intent === "string" ? payload.intent : "UNKNOWN",
      riskLevel:
        payload?.riskLevel === "LOW" || payload?.riskLevel === "MODERATE" || payload?.riskLevel === "URGENT"
          ? payload.riskLevel
          : "NONE",
      extracted:
        payload?.extracted && typeof payload.extracted === "object" && !Array.isArray(payload.extracted)
          ? payload.extracted
          : {},
      actions: normalizeActions(payload?.actions),
      suggestions: Array.isArray(payload?.suggestions)
        ? payload.suggestions.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        : [],
      medicineResults: normalizeMedicineResults(payload?.medicineResults),
      pharmacyResults: normalizePharmacyResults(payload?.pharmacyResults),
      conversationId:
        typeof payload?.conversationId === "string" && payload.conversationId.trim()
          ? payload.conversationId
          : undefined,
    };
  } catch {
    throw new Error(FALLBACK_ERROR);
  }
};
