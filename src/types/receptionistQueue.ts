export type QueuePatientStatus = "With Doctor" | "Waiting" | "Completed" | "Missed";

export type QueuePatient = {
  id: string;
  name: string;
  queueNo: string;
  status: QueuePatientStatus;
};

export type ReceptionQueueData = {
  doctorName: string;
  sessionLabel: string;
  startTimeLabel: string;
  patientCountLabel: string;
  isQueueLive: boolean;
  activePatientId: string | null;
  patients: QueuePatient[];
};
