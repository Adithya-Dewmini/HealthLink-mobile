import type { RootStackParamList } from "../../types/navigation";

export function getDashboardRouteForRole(role: string | null | undefined): keyof RootStackParamList {
  const normalizedRole = String(role || "").trim().toLowerCase();

  switch (normalizedRole) {
    case "doctor":
      return "Doctor";
    case "admin":
      return "AdminTabs";
    case "pharmacist":
      return "PharmacistStack";
    case "medical_center_admin":
      return "MedicalCenterTabs";
    case "receptionist":
      return "ReceptionistTabs";
    case "patient":
      return "PatientStack";
    default:
      return "AuthStack";
  }
}

export function getWelcomeMessageForRole(role: string | null | undefined) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  switch (normalizedRole) {
    case "doctor":
      return "Your account will be reviewed by admin before full activation.";
    case "admin":
      return "You can now manage the platform.";
    case "pharmacist":
      return "You can now manage inventory and prescriptions.";
    case "medical_center_admin":
      return "You can now manage clinic staff, schedules, and operations.";
    case "receptionist":
      return "You can now manage bookings and front-desk operations.";
    default:
      return "Your account is now ready to use.";
  }
}
