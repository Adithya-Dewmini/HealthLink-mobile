export const pharmacyTheme = {
  colors: {
    navy: "#120A3D",
    indigo: "#2B1B7A",
    peach: "#F7D2AD",
    yellow: "#FFB21A",
    orange: "#FF7900",
    lightBlue: "#DCE7FA",
    card: "#FFFFFF",
    mutedText: "#66728A",
    border: "#E4E9F2",
    success: "#2EBD85",
    danger: "#EF4444",
    background: "#EEF4FF",
    backgroundWarm: "#FFF6EC",
    textPrimary: "#171E32",
    textSecondary: "#66728A",
    textOnDark: "#F8FAFC",
    tabInactive: "#7B8498",
  },
  radii: {
    small: 16,
    medium: 24,
    large: 30,
    xlarge: 32,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  shadows: {
    soft: {
      shadowColor: "#120A3D",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    card: {
      shadowColor: "#120A3D",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
  },
} as const;

export type PharmacyTheme = typeof pharmacyTheme;
