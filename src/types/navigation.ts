import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Register: undefined;
  RegisterPatient: undefined;
  RegisterDoctor: undefined;
  RegisterDoctorSuccess: {
    doctorId: number;
    status: "pending";
    email: string;
    setupToken?: string;
  };
  RegisterPharmacist: undefined;
  RegisterMedicalCenter: undefined;
};

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList> | undefined;
  SetPassword:
    | {
        token?: string;
        email?: string;
        role?: string;
        autoLogin?: boolean;
      }
    | undefined;
  PasswordSetupSuccess:
    | {
        role?: string;
        email?: string;
        autoLogin?: boolean;
      }
    | undefined;
  PasswordSetupWelcome:
    | {
        role?: string;
        email?: string;
      }
    | undefined;
  AuthSuccess:
    | {
        icon?: "checkmark-circle" | "shield-checkmark" | "sparkles";
        title: string;
        subtitle: string;
        message?: string;
        actionLabel: string;
        target:
          | "Login"
          | "PatientStack"
          | "Doctor"
          | "PharmacistStack"
          | "AdminTabs"
          | "ReceptionistTabs"
          | "MedicalCenterTabs";
      }
    | undefined;
  PatientStack: NavigatorScreenParams<PatientStackParamList> | undefined;
  Doctor: undefined;
  PharmacistStack: undefined;
  AdminTabs: undefined;
  ReceptionistTabs: undefined;
  MedicalCenterTabs: NavigatorScreenParams<MedicalCenterStackParamList> | undefined;
};

export type MedicalCenterStackParamList = {
  MedicalCenterTabsRoot: undefined;
  MedicalCenterSettings: undefined;
  MedicalCenterSpecialties: undefined;
  MedicalCenterAddReceptionist: undefined;
  MedicalCenterAddDoctor: undefined;
  MedicalCenterDoctorProfile: { doctorId: number };
  MedicalCenterDoctorDetails: {
    doctorId: number;
    doctorUserId: number;
    status: "ACTIVE" | "PENDING" | "INACTIVE";
  };
  MedicalCenterDoctorSchedule: {
    doctorId: number;
    doctorUserId: number;
    doctorName?: string;
    specialization?: string | null;
    initialTab?: "routine" | "manual";
    suggestedDate?: string;
    suggestedStartTime?: string;
    suggestedEndTime?: string;
    suggestedMaxPatients?: number | null;
  };
  MedicalCenterDoctorAvailability: {
    doctorId: number;
    doctorUserId: number;
    doctorName?: string;
    specialization?: string | null;
  };
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
  ProfileEdit: undefined;
  PatientSettings: undefined;
  PatientClinicDetails: {
    clinicId: string;
    clinicName: string;
    location: string;
    status: string;
    image: string;
    rating: number;
    waitTime: string;
    nextAvailable: string;
    specialty: string;
  };
  PatientQueue: { doctorId?: number; clinicId?: string; sessionId?: number };
  HeartRateScreen: undefined;
  SleepTrackerScreen: undefined;
  MedicalHistoryScreen: undefined;
  DoctorSearchScreen:
    | {
        specialty?: string;
        doctorId?: number;
      }
    | undefined;
  DoctorAvailabilityScreen: {
    doctorId: number;
    clinicId: string;
    clinicName?: string;
    doctorName?: string;
    specialty?: string;
  };
  Appointments: undefined;
  BookAppointmentScreen: {
    doctorId?: number;
    clinicId?: string;
    clinicName?: string;
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
  PrescriptionDetails: { id: string };
  PatientPrescriptions: undefined;
  MedicineTracker: undefined;
  UploadPrescription: undefined;
  Favorites: undefined;
  SymptomChecker: undefined;
  MedicineSearch: undefined;
  PharmacyMarketplace: undefined;
  PharmacyStore: { pharmacyId: number };
  MyHealthDashboard: undefined;
};
