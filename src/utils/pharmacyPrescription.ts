import type {
  PharmacyPrescription,
  PharmacyPrescriptionDetails,
} from "../services/pharmacyApi";

export const parsePrescriptionQrPayload = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Invalid QR");
  }

  if (trimmed.includes("#")) {
    const extractedId = trimmed.split("#")[1]?.trim();
    if (!extractedId) {
      throw new Error("Invalid QR");
    }
    return extractedId;
  }

  return trimmed;
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
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
    availableStock: item.currentStock,
    unitPrice: null,
  })),
});
