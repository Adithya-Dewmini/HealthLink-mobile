import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RegisterPatient: undefined;
  RegisterDoctor: undefined;
  RegisterPharmacist: undefined;
  RegisterReceptionist: undefined;
  RegisterMedicalCenterAdmin: undefined;
  SetPassword: { token?: string } | undefined;
};

export type MedicalCenterStackParamList = {
  MedicalCenterTabsRoot: undefined;
  MedicalCenterSettings: undefined;
  MedicalCenterAddReceptionist: undefined;
};

export type PatientTabParamList = {
  PatientDashboard: undefined;
  PatientAppointments: undefined;
  PatientQuickActions: undefined;
  PatientExplore: undefined;
  PatientProfile: undefined;
};

export type PatientStackParamList = {
  PatientTabs: NavigatorScreenParams<PatientTabParamList> | undefined;
  PatientSettings: undefined;
  PatientQueue: { doctorId?: number };
  HeartRateScreen: undefined;
  SleepTrackerScreen: undefined;
  MedicalHistoryScreen: undefined;
  DoctorSearchScreen:
    | {
        specialty?: string;
        doctorId?: number;
      }
    | undefined;
  DoctorAvailabilityScreen: { doctorId: number };
  Appointments: undefined;
  BookAppointmentScreen: {
    doctorId?: number;
    doctorName?: string;
    specialty?: string;
    experienceYears?: number;
    rating?: number;
    reviewCount?: number;
  };
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
    doctorId?: number;
  };
  PrescriptionScreen: { token: string };
  PrescriptionDetails: { id: string };
  PatientPrescriptions: undefined;
  MedicineTracker: undefined;
  UploadPrescription: undefined;
  Favorites: undefined;
  SymptomChecker: undefined;
  MedicineSearch: undefined;
  PharmacyMarketplace: undefined;
  QuickActionsFab: undefined;
  PharmacyStore: { pharmacyId: number };
  MyHealthDashboard: undefined;
  ExploreScreen: undefined;
};
