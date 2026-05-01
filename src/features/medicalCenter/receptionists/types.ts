export type ReceptionistStatus = "PENDING" | "ACTIVE" | "DISABLED";

export type ReceptionistPermissions = {
  can_manage_queue: boolean;
  can_manage_appointments: boolean;
  can_check_in: boolean;
};

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
