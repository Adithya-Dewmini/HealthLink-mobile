export const doctorColors = {
  deep: "#0D5C63",
  primary: "#247B7B",
  teal: "#44A1A0",
  aqua: "#78CDD7",
  surface: "#FFFFFA",
  background: "#F6FBFB",
  card: "#FFFFFF",
  border: "#D9ECEB",
  textPrimary: "#15323A",
  textSecondary: "#5D767B",
  textMuted: "#7D9598",
  successBg: "#DDF5EC",
  successText: "#166A4A",
  liveBg: "#DDF4F7",
  liveText: "#176C79",
  warningBg: "#FFF1D6",
  warningText: "#A25A00",
  dangerBg: "#FDE4E2",
  dangerText: "#B53A2C",
  badgeBg: "#EAF6F5",
  shadow: "#0D5C63",
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
