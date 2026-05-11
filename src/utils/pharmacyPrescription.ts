import type {
  PharmacyPrescription,
  PharmacyPrescriptionDetails,
} from "../services/pharmacyApi";

export type ParsedPrescriptionQrPayload = {
  qrToken: string;
  prescriptionId?: string | null;
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
        return {
          qrToken: qrToken.trim(),
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
    return {
      qrToken: tokenFromUrl,
      prescriptionId: null,
    } satisfies ParsedPrescriptionQrPayload;
  }

  if (trimmed.includes("#")) {
    const extractedToken = trimmed.split("#").pop()?.trim();
    if (extractedToken) {
      return {
        qrToken: extractedToken,
        prescriptionId: null,
      } satisfies ParsedPrescriptionQrPayload;
    }
  }

  return {
    qrToken: trimmed,
    prescriptionId: null,
  } satisfies ParsedPrescriptionQrPayload;
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
