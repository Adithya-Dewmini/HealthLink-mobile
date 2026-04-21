export type AppointmentBackendStatus =
  | "BOOKED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "MISSED"
  | "CANCELLED";

export type AppointmentStatus =
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED";

export type AppointmentApiItem = {
  id?: string | number;
  doctor_id?: string | number | null;
  doctor_name?: string | null;
  date?: string | null;
  time?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  status?: string | null;
  is_late?: boolean | null;
  cancelledBy?: "PATIENT" | "DOCTOR" | null;
  cancelledReason?: string | null;
  missedAt?: string | null;
};

export type AppointmentItem = {
  id: string;
  doctorId: number | null;
  doctor: string;
  type: string;
  location: string;
  rawDate: string;
  rawTime: string;
  displayDate: string;
  displayTime: string;
  scheduledAt: string | null;
  status: AppointmentStatus;
  backendStatus: AppointmentBackendStatus;
  isLate: boolean;
  startedAt: string | null;
  endedAt: string | null;
  cancelledBy?: "PATIENT" | "DOCTOR" | null;
  cancelledReason?: string | null;
  missedAt?: string | null;
};
