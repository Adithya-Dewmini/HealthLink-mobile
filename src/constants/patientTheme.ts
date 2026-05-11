export const patientTheme = {
  colors: {
    navy: "#03045E",
    blue: "#0077B6",
    aqua: "#00B4D8",
    softAqua: "#90E0EF",
    lightAqua: "#CAF0F8",
    background: "#F8FCFD",
    surface: "#FFFFFF",
    textPrimary: "#03045E",
    textSecondary: "#475569",
    textMuted: "#64748B",
    border: "#D8F3F8",
    borderStrong: "#B6E6F1",
    highlight: "#EAFBFF",
    white: "#FFFFFF",
    textDark: "#03045E",
    textGray: "#475569",
    primary: "#0077B6",
    primaryBlue: "#0077B6",
    accentBlue: "#0077B6",
    accentBlueSoft: "#EAFBFF",
    softBlue: "#CAF0F8",
    lightBlueBg: "#EAFBFF",
    heroStart: "#CAF0F8",
    heroEnd: "#F8FCFD",
    accentGreen: "#059669",
    accentGreenSoft: "#DCFCE7",
    accentAmber: "#D97706",
    accentAmberSoft: "#FEF3C7",
    accentRed: "#DC2626",
    danger: "#DC2626",
    dangerSoft: "#FEE2E2",
    success: "#059669",
    successSoft: "#DCFCE7",
    warning: "#D97706",
    warningSoft: "#FEF3C7",
    softAmber: "#FEF3C7",
    info: "#00B4D8",
    infoSoft: "#EAFBFF",
    green: "#059669",
    red: "#DC2626",
    blueTextOnSoft: "#075985",
    amber: "#D97706",
    gray: "#64748B",
    graySoft: "#E2E8F0",
    inProgress: "#00B4D8",
    inProgressSoft: "#EAFBFF",
    chipBg: "#F2FBFD",
    chipActive: "#CAF0F8",
    star: "#D97706",
    softGreen: "#DCFCE7",
    softOrange: "#FEF3C7",
    softGray: "#F1F5F9",
    softPurple: "#EAFBFF",
    modernPrimary: "#0F172A",
    modernPrimaryAlt: "#1E293B",
    modernAccent: "#38BDF8",
    modernAccentDark: "#0284C7",
    modernBackground: "#F8FAFC",
    modernSurface: "#FFFFFF",
    modernText: "#1E293B",
    modernMuted: "#64748B",
    modernBorder: "#E2E8F0",
    modernGlass: "rgba(255, 255, 255, 0.16)",
    modernGlassBorder: "rgba(255, 255, 255, 0.24)",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  typography: {
    screenTitle: 28,
    sectionTitle: 20,
    cardTitle: 17,
    body: 15,
    helper: 13,
    caption: 12,
  },
  shadows: {
    card: {
      shadowColor: "#0F172A",
      shadowOpacity: 0.07 as const,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    soft: {
      shadowColor: "#03045E",
      shadowOpacity: 0.05 as const,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  },
  statusColors: {
    upcoming: { bg: "#EAFBFF", text: "#0077B6" },
    booked: { bg: "#EAFBFF", text: "#0077B6" },
    confirmed: { bg: "#EAFBFF", text: "#0077B6" },
    waiting: { bg: "#FEF3C7", text: "#B45309" },
    current: { bg: "#E6FFFB", text: "#0F766E" },
    called: { bg: "#DCFCE7", text: "#047857" },
    completed: { bg: "#DCFCE7", text: "#059669" },
    missed: { bg: "#FEE2E2", text: "#DC2626" },
    cancelled: { bg: "#E2E8F0", text: "#64748B" },
  },
  cardStyles: {
    base: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#D8F3F8",
      padding: 16,
    },
  },
  buttonStyles: {
    primary: {
      backgroundColor: "#0077B6",
      borderRadius: 16,
      minHeight: 50,
      paddingHorizontal: 18,
    },
    secondary: {
      backgroundColor: "#EAFBFF",
      borderRadius: 16,
      minHeight: 50,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: "#90E0EF",
    },
  },
} as const;

export type PatientTheme = typeof patientTheme;

export function getPatientStatusTone(status?: string | null) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (["upcoming", "booked", "confirmed"].includes(normalized)) {
    return patientTheme.statusColors.confirmed;
  }
  if (["waiting", "queued"].includes(normalized)) {
    return patientTheme.statusColors.waiting;
  }
  if (["current", "called", "in_progress", "with_doctor"].includes(normalized)) {
    return patientTheme.statusColors.called;
  }
  if (normalized === "completed") {
    return patientTheme.statusColors.completed;
  }
  if (normalized === "missed") {
    return patientTheme.statusColors.missed;
  }
  if (normalized === "cancelled") {
    return patientTheme.statusColors.cancelled;
  }

  return patientTheme.statusColors.upcoming;
}
