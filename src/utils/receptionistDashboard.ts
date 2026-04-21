import type {
  DashboardAction,
  DashboardStat,
  QueueStatus,
  ReceptionDashboardData,
} from "../types/receptionistDashboard";

const VALID_QUEUE_STATUSES: QueueStatus[] = ["LIVE", "NOT_STARTED", "ENDED"];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeStat = (stat: DashboardStat, index: number): DashboardStat | null => {
  if (
    !isNonEmptyString(stat?.id) ||
    !isNonEmptyString(stat?.label) ||
    !isNonEmptyString(stat?.value) ||
    !isNonEmptyString(stat?.iconColor)
  ) {
    console.warn("Invalid receptionist dashboard stat:", index, stat);
    return null;
  }

  return {
    ...stat,
    id: stat.id.trim(),
    label: stat.label.trim(),
    value: stat.value.trim(),
    iconColor: stat.iconColor.trim(),
  };
};

const normalizeAction = (action: DashboardAction, index: number): DashboardAction | null => {
  if (!isNonEmptyString(action?.id) || !isNonEmptyString(action?.title)) {
    console.warn("Invalid receptionist dashboard action:", index, action);
    return null;
  }

  return {
    ...action,
    id: action.id.trim(),
    title: action.title.trim(),
  };
};

export const DEFAULT_RECEPTION_DASHBOARD: ReceptionDashboardData = {
  greeting: "Good Morning",
  title: "Reception Dashboard",
  doctorName: "Dr. Silva",
  queueStatus: "LIVE",
  startedAtLabel: "Started 8:00 AM",
  totalPatientsLabel: "42 Patients",
  heroIcon: "stethoscope",
  stats: [
    { id: "in-queue", icon: "users", label: "In Queue", value: "12", iconColor: "#2196F3" },
    { id: "today", icon: "calendar", label: "Today", value: "48", iconColor: "#2BB673" },
    { id: "missed", icon: "slash", label: "Missed", value: "03", iconColor: "#EF4444" },
    { id: "avg-wait", icon: "clock", label: "Avg Wait", value: "14m", iconColor: "#F59E0B" },
  ],
  nextPatient: {
    queueNumber: "#12",
    name: "Amara Jayawardena",
    etaLabel: "Est. wait: 5 mins",
    callToAction: "Call Next",
  },
  alert: {
    title: "2 patients are late for check-in",
    subtitle: "3 missed appointments in the last hour",
  },
  actions: [
    { id: "start-queue", title: "Start Queue", isPrimary: true, icon: "play" },
    { id: "add-walk-in", title: "Add Walk-in" },
    { id: "view-appointments", title: "View Appointments" },
  ],
};

export const normalizeReceptionDashboardData = (
  input: ReceptionDashboardData
): { ok: true; data: ReceptionDashboardData } | { ok: false; message: string } => {
  if (
    !isNonEmptyString(input?.greeting) ||
    !isNonEmptyString(input?.title) ||
    !isNonEmptyString(input?.doctorName) ||
    !isNonEmptyString(input?.startedAtLabel) ||
    !isNonEmptyString(input?.totalPatientsLabel) ||
    !isNonEmptyString(input?.nextPatient?.queueNumber) ||
    !isNonEmptyString(input?.nextPatient?.name) ||
    !isNonEmptyString(input?.nextPatient?.etaLabel) ||
    !isNonEmptyString(input?.nextPatient?.callToAction) ||
    !isNonEmptyString(input?.alert?.title) ||
    !isNonEmptyString(input?.alert?.subtitle)
  ) {
    return { ok: false, message: "Dashboard data is incomplete." };
  }

  if (!VALID_QUEUE_STATUSES.includes(input.queueStatus)) {
    return { ok: false, message: "Dashboard queue status is invalid." };
  }

  const stats = input.stats.map(normalizeStat).filter((item): item is DashboardStat => Boolean(item));
  if (stats.length === 0) {
    return { ok: false, message: "Dashboard stats are unavailable." };
  }

  const actions = input.actions
    .map(normalizeAction)
    .filter((item): item is DashboardAction => Boolean(item));
  if (actions.length === 0) {
    return { ok: false, message: "Dashboard actions are unavailable." };
  }

  return {
    ok: true,
    data: {
      ...input,
      greeting: input.greeting.trim(),
      title: input.title.trim(),
      doctorName: input.doctorName.trim(),
      startedAtLabel: input.startedAtLabel.trim(),
      totalPatientsLabel: input.totalPatientsLabel.trim(),
      nextPatient: {
        queueNumber: input.nextPatient.queueNumber.trim(),
        name: input.nextPatient.name.trim(),
        etaLabel: input.nextPatient.etaLabel.trim(),
        callToAction: input.nextPatient.callToAction.trim(),
      },
      alert: {
        title: input.alert.title.trim(),
        subtitle: input.alert.subtitle.trim(),
      },
      stats,
      actions,
    },
  };
};
