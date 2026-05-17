import type {
  PharmacyPrescription,
  PharmacyPrescriptionDetails,
} from "../services/pharmacyApi";

export type ParsedPrescriptionQrPayload = {
  qrToken: string;
  prescriptionId?: string | null;
};

const MAX_PRESCRIPTION_QR_VALUE_LENGTH = 512;

const sanitizePrescriptionQrToken = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Legacy image/data payloads and oversized values should never be handed to the QR renderer.
  if (trimmed.startsWith("data:") || trimmed.length > MAX_PRESCRIPTION_QR_VALUE_LENGTH) {
    return null;
  }

  return trimmed;
};

const resolveQrTokenFromObject = (value: Record<string, unknown>): string | null => {
  const directCandidates = [
    value.qrToken,
    value.qr_code,
    value.qrCode,
    value.token,
    value.value,
    value.url,
  ];

  for (const candidate of directCandidates) {
    const resolved = resolvePrescriptionQrToken(candidate);
    if (resolved) {
      return resolved;
    }
  }

  const nestedCandidates = [value.prescription, value.data, value.payload];
  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const resolved = resolveQrTokenFromObject(candidate as Record<string, unknown>);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
};

const extractTokenFromUrl = (raw: string) => {
  try {
    const parsedUrl = new URL(raw);
    const tokenFromQuery =
      parsedUrl.searchParams.get("token") ||
      parsedUrl.searchParams.get("qrToken") ||
      parsedUrl.searchParams.get("qr_code");
    if (tokenFromQuery?.trim()) {
      return tokenFromQuery.trim();
    }

    const marker = "/prescription/";
    if (parsedUrl.pathname.includes(marker)) {
      return parsedUrl.pathname.split(marker).pop()?.trim() || "";
    }
  } catch {
    // Ignore invalid URLs and continue with other parsers.
  }

  return "";
};

export const parsePrescriptionQrPayload = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Invalid QR code");
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const qrToken =
        parsed?.token ??
        parsed?.qrToken ??
        parsed?.qr_code ??
        null;
      const prescriptionId =
        parsed?.prescriptionId ??
        parsed?.prescription_id ??
        parsed?.id ??
        null;

      if (typeof qrToken === "string" && qrToken.trim()) {
        const sanitizedQrToken = sanitizePrescriptionQrToken(qrToken);
        if (!sanitizedQrToken) {
          throw new Error("Invalid QR code");
        }

        return {
          qrToken: sanitizedQrToken,
          prescriptionId:
            prescriptionId !== null && prescriptionId !== undefined
              ? String(prescriptionId).trim()
              : null,
        } satisfies ParsedPrescriptionQrPayload;
      }
    } catch {
      throw new Error("Invalid QR code");
    }
  }

  const tokenFromUrl = extractTokenFromUrl(trimmed);
  if (tokenFromUrl) {
    const sanitizedQrToken = sanitizePrescriptionQrToken(tokenFromUrl);
    if (!sanitizedQrToken) {
      throw new Error("Invalid QR code");
    }

    return {
      qrToken: sanitizedQrToken,
      prescriptionId: null,
    } satisfies ParsedPrescriptionQrPayload;
  }

  if (trimmed.includes("#")) {
    const extractedToken = trimmed.split("#").pop()?.trim();
    if (extractedToken) {
      const sanitizedQrToken = sanitizePrescriptionQrToken(extractedToken);
      if (!sanitizedQrToken) {
        throw new Error("Invalid QR code");
      }

      return {
        qrToken: sanitizedQrToken,
        prescriptionId: null,
      } satisfies ParsedPrescriptionQrPayload;
    }
  }

  const sanitizedQrToken = sanitizePrescriptionQrToken(trimmed);
  if (!sanitizedQrToken) {
    throw new Error("Invalid QR code");
  }

  return {
    qrToken: sanitizedQrToken,
    prescriptionId: null,
  } satisfies ParsedPrescriptionQrPayload;
};

export const resolvePrescriptionQrToken = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const sanitizedValue = sanitizePrescriptionQrToken(value);
    if (!sanitizedValue) {
      return null;
    }

    if (sanitizedValue.startsWith("{") && sanitizedValue.endsWith("}")) {
      try {
        const parsed = JSON.parse(sanitizedValue);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const resolved = resolveQrTokenFromObject(parsed as Record<string, unknown>);
          if (resolved) {
            return resolved;
          }
        }
      } catch {
        // Fall back to generic QR parsers below.
      }
    }

    try {
      return parsePrescriptionQrPayload(sanitizedValue).qrToken;
    } catch {
      return sanitizedValue;
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return resolveQrTokenFromObject(value as Record<string, unknown>);
  }

  return null;
};

export const buildPrescriptionQrValue = (prescription: unknown) => {
  if (!prescription || typeof prescription !== "object" || Array.isArray(prescription)) {
    return null;
  }

  return resolveQrTokenFromObject(prescription as Record<string, unknown>);
};

export const mapPrescriptionDetailsToPreview = (
  details: PharmacyPrescriptionDetails
): PharmacyPrescription => ({
  prescription: {
    id: details.prescription.id,
    qrCode: details.prescription.qrCode,
    isSeen: details.prescription.isSeen,
    issuedAt: details.prescription.issuedAt,
    dispensedAt: details.prescription.dispensedAt,
    dispensedBy: details.prescription.dispensedBy,
    patientName: details.prescription.patientName,
    doctorName: details.prescription.doctorName,
  },
  items: details.items.map((item) => ({
    id: item.id,
    medicineId: item.medicineId,
    medicineName: item.medicineName,
    requiredQuantity: item.requiredQuantity,
    dispensedQuantity: item.dispensedQuantity,
    remainingQuantity: item.remainingQuantity,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
    availableStock: item.currentStock,
    unitPrice: null,
    demandCount: item.demandCount,
    lowStockAlert: item.lowStockAlert,
    substitutions: item.substitutions,
  })),
});
