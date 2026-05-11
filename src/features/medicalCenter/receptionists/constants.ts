import type { FilterValue, ReceptionistPermissions } from "./types";
import { DEFAULT_RECEPTIONIST_PERMISSIONS } from "../../../utils/receptionistPermissions";

export const THEME = {
  primary: "#2F6FED",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#D97706",
  softBlue: "#EFF6FF",
  softGreen: "#DCFCE7",
  softRed: "#FEE2E2",
  softYellow: "#FEF3C7",
  overlay: "rgba(15, 23, 42, 0.38)",
} as const;

export const FILTERS: Array<{ key: FilterValue; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
];

export const DEFAULT_PERMISSIONS: ReceptionistPermissions = DEFAULT_RECEPTIONIST_PERMISSIONS;
