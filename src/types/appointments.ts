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
  medical_center_id?: string | null;
  medical_center_name?: string | null;
  session_id?: string | number | null;
  session_date?: string | null;
  session_start_time?: string | null;
  session_end_time?: string | null;
  date?: string | null;
  time?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  status?: string | null;
  queue_id?: string | number | null;
  queue_status?: string | null;
  queue_started_at?: string | null;
  queue_ended_at?: string | null;
  queue_patient_status?: string | null;
  queue_token_number?: string | number | null;
  queue_checked_in_at?: string | null;
  queue_missed_at?: string | null;
  current_serving_token?: string | number | null;
  waiting_count?: string | number | null;
  is_late?: boolean | null;
  cancelledBy?: "PATIENT" | "DOCTOR" | null;
  cancelledReason?: string | null;
  missedAt?: string | null;
};

export type AppointmentItem = {
  id: string;
  doctorId: number | null;
  clinicId: string | null;
  clinicName: string;
  sessionId: number | null;
  sessionDate: string;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
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
  queueId: number | null;
  queueStatus: string | null;
  queueStartedAt: string | null;
  queueEndedAt: string | null;
  queuePatientStatus: string | null;
  queueTokenNumber: number | null;
  queueCheckedInAt: string | null;
  queueMissedAt: string | null;
  currentServingToken: number | null;
  waitingCount: number;
  startedAt: string | null;
  endedAt: string | null;
  cancelledBy?: "PATIENT" | "DOCTOR" | null;
  cancelledReason?: string | null;
  missedAt?: string | null;
};
