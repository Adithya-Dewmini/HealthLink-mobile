import type { SessionStatus } from "../utils/sessionPresentation";

export type DoctorSessionSourceType = "weekly" | "extra";

export type DoctorWeeklySchedule = {
  id: string;
  doctorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  maxPatients: number;
  slotDuration: number;
  isActive: boolean;
  notes: string | null;
  dayName: string;
  clinicName: string | null;
  timeSummary: string;
  shiftCount: number;
};

export type DoctorGeneratedSession = {
  id: number;
  doctorId: number;
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  maxPatients: number;
  bookedCount: number;
  status: SessionStatus;
  sourceType: DoctorSessionSourceType;
  slotDuration: number;
  notes: string | null;
  clinicName: string | null;
  availableSlots: number;
  isActive: boolean;
};

export type DoctorExtraSession = {
  id: number;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  maxPatients: number;
  bookedCount: number;
  status: SessionStatus;
  notes: string | null;
  slotDuration: number;
  clinicName: string | null;
  availableSlots: number;
  dayOfWeek: number;
  sourceType: "extra";
  isActive: boolean;
};
