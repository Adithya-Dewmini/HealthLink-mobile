import type { NavigatorScreenParams } from "@react-navigation/native";
import type { ReceptionSessionItem } from "../services/receptionistSessionService";

export type AuthStackParamList = {
  Login:
    | {
        initialEmail?: string;
        flashMessage?: string;
      }
    | undefined;
  ForgotPassword: undefined;
  Register: undefined;
  RegisterPatient: undefined;
  RegisterDoctor: undefined;
  RegisterDoctorSuccess: {
    doctorId: number;
    verificationStatus: "pending" | "approved" | "rejected" | "suspended";
    email: string;
    canLogin: boolean;
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
          | "ReceptionistTabs"
          | "MedicalCenterTabs";
      }
    | undefined;
  DoctorPendingApproval:
    | {
        email?: string;
        verificationStatus?: "pending" | "approved" | "rejected" | "suspended" | "verified";
        verificationNotes?: string | null;
        fromRegistration?: boolean;
      }
    | undefined;
  ApprovalStatus:
    | {
        role?: "pharmacist" | "medical_center_admin";
        verificationStatus?: "pending" | "approved" | "rejected" | "suspended";
        verificationNotes?: string | null;
        email?: string;
        fromRegistration?: boolean;
      }
    | undefined;
  PatientStack: NavigatorScreenParams<PatientStackParamList> | undefined;
  Doctor: undefined;
  PharmacistStack: undefined;
  ReceptionistTabs: undefined;
  MedicalCenterTabs: NavigatorScreenParams<MedicalCenterStackParamList> | undefined;
};

export type ReceptionistStackParamList = {
  ReceptionistTabsRoot: undefined;
  ReceptionistBookAppointment: undefined;
  ReceptionistVisitDetails: {
    visitId: number;
  };
  ReceptionistQueueDetails: {
    queueId?: number;
    sessionId?: number;
    doctorName?: string;
  };
  ReceptionistDoctorAvailability: {
    doctorId: number;
    doctorUserId: number;
    doctorName?: string;
    specialization?: string | null;
  };
  ReceptionistDoctorSessionOverview: {
    doctorId: number;
    doctorUserId: number;
    doctorName?: string;
    specialization?: string | null;
  };
  ReceptionistDoctorSessionManagement: {
    doctorId: number;
    doctorUserId: number;
    doctorName?: string;
    specialization?: string | null;
    editScheduleId?: number;
    initialTab?: "routine" | "manual";
    suggestedDate?: string;
    suggestedStartTime?: string;
    suggestedEndTime?: string;
    suggestedSlotDuration?: number | null;
    suggestedMaxPatients?: number | null;
  };
  ReceptionistDoctorSessionDetails: {
    session: ReceptionSessionItem;
    doctorName?: string;
    specialization?: string | null;
  };
  ReceptionistCheckInPatients: {
    sessionId: number;
    doctorName?: string;
    specialization?: string | null;
  };
};

export type ReceptionistTabParamList = {
  ReceptionistHome: undefined;
  ReceptionistQueue: undefined;
  ReceptionistAppointments: undefined;
  ReceptionistRegistration: undefined;
  ReceptionistSessions: undefined;
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
  PatientQueue: {
    doctorId?: number;
    clinicId?: string;
    sessionId?: number;
    appointmentId?: string;
    queueId?: string;
  };
  HeartRateScreen: undefined;
  SleepTrackerScreen: undefined;
  MedicalHistoryScreen: undefined;
  DoctorSearchScreen:
    | {
        specialty?: string;
        doctorId?: number;
        initialQuery?: string;
        reason?: string;
        preferredDate?: string;
        preferredTime?: string;
      }
    | undefined;
  PatientDoctorDetails: {
    doctorId: number;
  };
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
    clinicId?: string;
    specialty?: string;
    date?: string;
    clinicTime?: string;
    tokenNumber?: string;
    nowServing?: string;
    estimatedWait?: string;
    queueOpensAt?: string;
    doctorId?: number;
    sessionId?: number;
  };
  PrescriptionDetails: { id: string };
  PrescriptionFulfillment: { prescriptionId: string; title?: string };
  SubstitutionApproval: { orderId: number };
  PatientAssistant: undefined;
  PatientPrescriptions: undefined;
  MedicineTracker: undefined;
  UploadPrescription: undefined;
  NotificationCenter:
    | {
        title?: string;
        panel?: "patient" | "doctor" | "pharmacy" | "medical_center" | "receptionist";
      }
    | undefined;
  ActivityFeed:
    | {
        title?: string;
      }
    | undefined;
  Favorites: undefined;
  SymptomChecker: undefined;
  MedicineSearch: undefined;
  PharmacyMarketplace:
    | {
        initialQuery?: string;
        medicineName?: string;
        category?: string;
        reason?: string;
      }
    | undefined;
  PharmacyStore: { pharmacyId: number };
  PharmacyProductDetails: { productId: string; pharmacyId: number };
  Cart: undefined;
  Checkout: undefined;
  Orders: undefined;
  OrderDetails: { orderId: number };
  PaymentStatus: {
    orderId: number;
    checkoutUrl?: string;
    autoOpenCheckout?: boolean;
  };
  InvoiceScreen: { orderId: number };
  MyHealthDashboard: undefined;
};
