import type { NavigatorScreenParams } from "@react-navigation/native";

export type PatientTabParamList = {
  PatientDashboard: undefined;
  PatientAppointments: undefined;
  PatientPrescriptions: undefined;
};

export type PatientStackParamList = {
  PatientTabs: NavigatorScreenParams<PatientTabParamList> | undefined;
  PatientProfile: undefined;
  PatientSettings: undefined;
  PatientQueue: undefined;
  HeartRateScreen: undefined;
  SleepTrackerScreen: undefined;
  MedicalHistoryScreen: undefined;
  DoctorSearchScreen: undefined;
  DoctorAvailabilityScreen: { doctorId: string };
  BookAppointmentScreen: undefined;
  AppointmentSummaryScreen: {
    doctorName?: string;
    clinicName?: string;
    specialty?: string;
    date?: string;
    clinicTime?: string;
    tokenNumber?: string;
    nowServing?: string;
    estimatedWait?: string;
    queueOpensAt?: string;
  };
};
