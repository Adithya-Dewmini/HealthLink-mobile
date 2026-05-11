import type { ReceptionistPermissions } from "../../../utils/receptionistPermissions";
export type { ReceptionistPermissions } from "../../../utils/receptionistPermissions";

export type ReceptionistStatus = "PENDING" | "ACTIVE" | "DISABLED";

export type Receptionist = {
  id: string;
  userId: number;
  name: string;
  email: string;
  phone: string;
  status: ReceptionistStatus;
  isPasswordSet: boolean;
  createdAt: string;
  permissions: ReceptionistPermissions;
};

export type FilterValue = "all" | "pending" | "active" | "disabled";
