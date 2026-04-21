import type {
  QueuePatient,
  QueuePatientStatus,
  ReceptionQueueData,
} from "../types/receptionistQueue";

const VALID_QUEUE_STATUSES: QueuePatientStatus[] = [
  "With Doctor",
  "Waiting",
  "Completed",
  "Missed",
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizePatient = (patient: QueuePatient, index: number): QueuePatient | null => {
  if (
    !isNonEmptyString(patient?.id) ||
    !isNonEmptyString(patient?.name) ||
    !isNonEmptyString(patient?.queueNo) ||
    !VALID_QUEUE_STATUSES.includes(patient?.status)
  ) {
    console.warn("Invalid receptionist queue patient:", index, patient);
    return null;
  }

  return {
    id: patient.id.trim(),
    name: patient.name.trim(),
    queueNo: patient.queueNo.trim(),
    status: patient.status,
  };
};

export const DEFAULT_RECEPTION_QUEUE: ReceptionQueueData = {
  doctorName: "Dr. Aruna Silva",
  sessionLabel: "Clinic Session A",
  startTimeLabel: "08:30 AM",
  patientCountLabel: "18",
  isQueueLive: true,
  activePatientId: "1",
  patients: [
    { id: "1", name: "Nadun Perera", queueNo: "12", status: "With Doctor" },
    { id: "2", name: "Saman Kumara", queueNo: "13", status: "Waiting" },
    { id: "3", name: "Anula Devi", queueNo: "14", status: "Waiting" },
    { id: "4", name: "Kamal Silva", queueNo: "10", status: "Completed" },
    { id: "5", name: "Priyani Cooray", queueNo: "11", status: "Missed" },
  ],
};

export const normalizeReceptionQueueData = (
  input: ReceptionQueueData
): { ok: true; data: ReceptionQueueData } | { ok: false; message: string } => {
  if (
    !isNonEmptyString(input?.doctorName) ||
    !isNonEmptyString(input?.sessionLabel) ||
    !isNonEmptyString(input?.startTimeLabel) ||
    !isNonEmptyString(input?.patientCountLabel)
  ) {
    return { ok: false, message: "Queue header data is incomplete." };
  }

  const patients = (input.patients ?? [])
    .map(normalizePatient)
    .filter((patient): patient is QueuePatient => Boolean(patient));

  if (input.isQueueLive && patients.length === 0) {
    return { ok: false, message: "Queue is marked live but has no patients." };
  }

  if (input.activePatientId && input.isQueueLive && !patients.some((patient) => patient.id === input.activePatientId)) {
    return { ok: false, message: "Active patient is not present in the queue." };
  }

  return {
    ok: true,
    data: {
      ...input,
      doctorName: input.doctorName.trim(),
      sessionLabel: input.sessionLabel.trim(),
      startTimeLabel: input.startTimeLabel.trim(),
      patientCountLabel: input.patientCountLabel.trim(),
      activePatientId: input.activePatientId ? input.activePatientId.trim() : null,
      patients,
    },
  };
};
