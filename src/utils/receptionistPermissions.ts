export type ReceptionistPermissions = {
  queue_access: boolean;
  appointments: boolean;
  check_in: boolean;
  schedule_management: boolean;
};

export const DEFAULT_RECEPTIONIST_PERMISSIONS: ReceptionistPermissions = {
  queue_access: false,
  appointments: false,
  check_in: false,
  schedule_management: false,
};

export const normalizeReceptionistPermissions = (
  value?: Partial<
    ReceptionistPermissions & {
      can_manage_queue: boolean;
      can_manage_appointments: boolean;
      can_check_in: boolean;
    }
  > | null
): ReceptionistPermissions => ({
  queue_access: Boolean(value?.queue_access ?? value?.can_manage_queue),
  appointments: Boolean(value?.appointments ?? value?.can_manage_appointments),
  check_in: Boolean(value?.check_in ?? value?.can_check_in),
  schedule_management: Boolean(value?.schedule_management),
});

export const toLegacyReceptionistPermissions = (permissions: ReceptionistPermissions) => ({
  can_manage_queue: permissions.queue_access,
  can_manage_appointments: permissions.appointments,
  can_check_in: permissions.check_in,
  schedule_management: permissions.schedule_management,
});

export const hasAnyReceptionistPermission = (permissions: ReceptionistPermissions) =>
  permissions.queue_access ||
  permissions.appointments ||
  permissions.check_in ||
  permissions.schedule_management;
