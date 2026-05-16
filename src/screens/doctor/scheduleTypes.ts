export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type TimeSlot = {
  id: string;
  start: string;
  end: string;
};

export type AvailabilityMap = Record<DayKey, TimeSlot[]>;

export type ScheduleSessionStatus = "Upcoming" | "Active" | "Completed" | "Missed" | "Cancelled";

export type ScheduleSession = {
  id: string;
  clinicId?: string;
  location?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  clinicName: string;
  date: string;
  startTime: string;
  endTime: string;
  patientCount: number;
  maxPatients?: number;
  slotDuration?: number;
  status: ScheduleSessionStatus;
  source?: "internal" | "external";
  note?: string | null;
};

export type ScheduleDayGroup = {
  date: string;
  sessions: ScheduleSession[];
};

export type DoctorRoutineItem = {
  id: string;
  clinicId: string;
  clinicName: string;
  location?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  roomNumber?: string | null;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
};

export type DoctorExternalSession = {
  id: string;
  day: string;
  dayKey: number;
  startTime: string;
  endTime: string;
  clinicName: string;
  note?: string | null;
  source: "external";
  hasConflict?: boolean;
  conflictReason?: string | null;
};

export type DoctorRoutineDay = {
  day: string;
  dayKey: number;
  routines: DoctorRoutineItem[];
};
