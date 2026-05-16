export const doctorColors = {
  deep: "#172338",
  primary: "#2C8C89",
  teal: "#2C8C89",
  aqua: "#8FD7D2",
  surface: "#FFFFFF",
  background: "#F4F7FA",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#172338",
  textSecondary: "#667085",
  textMuted: "#98A2B3",
  successBg: "#DFF7EA",
  successText: "#12B76A",
  liveBg: "#E8F8F3",
  liveText: "#2C8C89",
  warningBg: "#FFF3D6",
  warningText: "#F79009",
  dangerBg: "#FEE4E2",
  dangerText: "#F04438",
  badgeBg: "#E8F8F3",
  shadow: "#172338",
};

export const doctorSpacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
};

export const doctorRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const doctorTypography = {
  eyebrow: 12,
  title: 20,
  heroTitle: 30,
  subtitle: 13,
  body: 14,
  caption: 12,
};

export const doctorShadows = {
  card: {
    shadowColor: doctorColors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

export type DoctorStatusTone = "upcoming" | "live" | "completed" | "cancelled" | "conflict";

export const getDoctorStatusTone = (status?: string): DoctorStatusTone => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active" || normalized === "live") {
    return "live";
  }
  if (normalized === "completed") {
    return "completed";
  }
  if (normalized === "cancelled" || normalized === "missed") {
    return "cancelled";
  }
  if (normalized === "conflict") {
    return "conflict";
  }
  return "upcoming";
};

export const getDoctorStatusPalette = (tone: DoctorStatusTone) => {
  switch (tone) {
    case "live":
      return { backgroundColor: doctorColors.liveBg, textColor: doctorColors.liveText };
    case "completed":
      return { backgroundColor: "#E9F1F2", textColor: "#557078" };
    case "cancelled":
      return { backgroundColor: doctorColors.dangerBg, textColor: doctorColors.dangerText };
    case "conflict":
      return { backgroundColor: doctorColors.warningBg, textColor: doctorColors.warningText };
    case "upcoming":
    default:
      return { backgroundColor: doctorColors.badgeBg, textColor: doctorColors.primary };
  }
};

export type DoctorHeaderStatusVariant = "idle" | "live" | "pending" | "approved" | "error";

export const getDoctorHeaderStatusPalette = (variant: DoctorHeaderStatusVariant) => {
  switch (variant) {
    case "live":
      return { backgroundColor: doctorColors.liveBg, textColor: doctorColors.liveText };
    case "approved":
      return { backgroundColor: doctorColors.successBg, textColor: doctorColors.successText };
    case "pending":
      return { backgroundColor: doctorColors.warningBg, textColor: doctorColors.warningText };
    case "error":
      return { backgroundColor: doctorColors.dangerBg, textColor: doctorColors.dangerText };
    case "idle":
    default:
      return { backgroundColor: "#EEF6F5", textColor: doctorColors.textSecondary };
  }
};
