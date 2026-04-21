import type { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

export type QueueStatus = "LIVE" | "NOT_STARTED" | "ENDED";

export type DashboardStat = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  iconColor: string;
};

export type DashboardAction = {
  id: string;
  title: string;
  isPrimary?: boolean;
  icon?: keyof typeof Feather.glyphMap;
};

export type ReceptionDashboardData = {
  greeting: string;
  title: string;
  doctorName: string;
  queueStatus: QueueStatus;
  startedAtLabel: string;
  totalPatientsLabel: string;
  stats: DashboardStat[];
  nextPatient: {
    queueNumber: string;
    name: string;
    etaLabel: string;
    callToAction: string;
  };
  alert: {
    title: string;
    subtitle: string;
  };
  actions: DashboardAction[];
  heroIcon: keyof typeof MaterialCommunityIcons.glyphMap;
};
