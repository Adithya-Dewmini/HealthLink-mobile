import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PendingApprovalBanner from "./doctor/PendingApprovalBanner";
import DoctorPanelHeader from "./doctor/DoctorPanelHeader";
import DoctorAvatar from "./common/DoctorAvatar";
import { getQueueDashboard } from "../services/doctorQueueService";
import {
  completeConsultation,
  createConsultationDraft,
  issueConsultationPrescription,
  updateConsultationDraft,
} from "../services/consultationService";
import { apiFetch } from "../config/api";
import { doctorColors } from "../constants/doctorTheme";
import { useAuth } from "../utils/AuthContext";
import { getFriendlyError } from "../utils/friendlyErrors";
import { getDisplayInitials, resolveDoctorImage } from "../utils/imageUtils";

type ConsultationScreenProps = {
  queueId?: string | number;
};

type MedicineItem = {
  id: number;
  name: string;
  type: string;
  strength: string;
  dosage: {
    morning: number;
    afternoon: number;
    night: number;
  };
  duration: number;
  timing: string;
  notes: string;
};

type MedicineConflict = {
  medicine: string;
  with: string[];
};

type MedicineFieldErrors = Partial<Record<"name" | "type" | "strength" | "dosage" | "duration" | "timing", string>>;

type ConsultationContextPayload = {
  patient?: {
    id?: number | null;
    name?: string | null;
    age?: number | null;
    gender?: string | null;
    profile_image?: string | null;
    avatarUrl?: string | null;
  } | null;
  queue?: {
    queueId?: number | string | null;
    tokenNumber?: number | string | null;
    complaint?: string | null;
    isWalkIn?: boolean;
  } | null;
  appointment?: {
    id?: number | string | null;
    time?: string | null;
    status?: string | null;
  } | null;
  session?: {
    id?: number | string | null;
    date?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    medicalCenterName?: string | null;
  } | null;
  consultation?: {
    id?: number | string | null;
    status?: string | null;
    symptoms?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    medicines?: any[];
    prescriptionId?: number | string | null;
    prescriptionIssuedAt?: string | null;
    prescriptionIssued?: boolean;
  } | null;
  conditions?: string[];
  allergies?: string[];
  visits?: Array<{ date?: string | null; diagnosis?: string | null; notes?: string | null }>;
  medications?: string[];
};

const THEME = {
  background: doctorColors.background,
  surface: doctorColors.surface,
  card: doctorColors.card,
  deep: doctorColors.deep,
  primary: doctorColors.primary,
  teal: doctorColors.teal,
  aqua: doctorColors.aqua,
  border: doctorColors.border,
  textPrimary: doctorColors.textPrimary,
  textSecondary: doctorColors.textSecondary,
  textMuted: doctorColors.textMuted,
  success: doctorColors.successText,
  successBg: doctorColors.successBg,
  warning: doctorColors.warningText,
  warningBg: doctorColors.warningBg,
  danger: doctorColors.dangerText,
  dangerBg: doctorColors.dangerBg,
};

const INITIAL_MEDICINE_FORM = {
  name: "",
  type: "Tablet",
  strength: "",
  dosage: { morning: 1, afternoon: 0, night: 1 },
  timing: "After Meal",
  duration: "5",
  notes: "",
};

const formatDateTime = (value?: string | number | Date | null) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getAutosavePresentation = (status: "idle" | "saving" | "saved" | "error") => {
  switch (status) {
    case "saving":
      return { label: "Saving draft", icon: "sync-outline" as const, tone: THEME.warningBg, color: THEME.warning };
    case "saved":
      return { label: "Draft saved", icon: "checkmark-circle-outline" as const, tone: THEME.successBg, color: THEME.success };
    case "error":
      return { label: "Save failed", icon: "alert-circle-outline" as const, tone: THEME.dangerBg, color: THEME.danger };
    case "idle":
    default:
      return { label: "Draft idle", icon: "time-outline" as const, tone: "#EDF7F7", color: THEME.textSecondary };
  }
};

const validateMedicine = (medicine: Partial<MedicineItem>): MedicineFieldErrors => {
  const errors: MedicineFieldErrors = {};
  const name = String(medicine.name || "").trim();
  const type = String(medicine.type || "").trim();
  const strength = String(medicine.strength || "").trim();
  const timing = String(medicine.timing || "").trim();
  const duration = Number(medicine.duration || 0);
  const dosage = medicine.dosage || { morning: 0, afternoon: 0, night: 0 };
  const totalDosage = Number(dosage.morning || 0) + Number(dosage.afternoon || 0) + Number(dosage.night || 0);

  if (!name) errors.name = "Medicine name is required.";
  if (name && !type) errors.type = "Select the medicine type.";
  if (name && !strength) errors.strength = "Add the medicine strength.";
  if (name && totalDosage <= 0) errors.dosage = "Select at least one dose time.";
  if (name && (!Number.isFinite(duration) || duration <= 0)) errors.duration = "Enter the number of days.";
  if (name && !timing) errors.timing = "Choose when the medicine should be taken.";

  return errors;
};

const formatConflictCopy = (conflicts: MedicineConflict[]) =>
  conflicts
    .map((conflict) => {
      const withList = conflict.with.map((item) => item.trim()).filter(Boolean).join(", ");
      return `${conflict.medicine} conflicts with ${withList}.`;
    })
    .join(" ");

const parseDoseSchedule = (value: unknown) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      morning: Number((value as any).morning || 0),
      afternoon: Number((value as any).afternoon || 0),
      night: Number((value as any).night || 0),
    };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          morning: Number(parsed?.morning || 0),
          afternoon: Number(parsed?.afternoon || 0),
          night: Number(parsed?.night || 0),
        };
      } catch {
        return { morning: 1, afternoon: 0, night: 1 };
      }
    }
  }

  return { morning: 1, afternoon: 0, night: 1 };
};

const mapContextMedicine = (medicine: any, index: number): MedicineItem => ({
  id: Date.now() + index,
  name: String(medicine?.name || medicine?.medicine_name || "").trim(),
  type: String(medicine?.type || "Tablet").trim(),
  strength: String(medicine?.strength || medicine?.dosage || "").trim(),
  dosage: parseDoseSchedule(medicine?.frequency ?? medicine?.dosage),
  duration: Number(medicine?.duration || 0) || 5,
  timing: String(medicine?.timing || medicine?.instructions || "After Meal").trim(),
  notes: String(medicine?.instructions || medicine?.notes || "").trim(),
});

export default function ConsultationScreen({ queueId }: ConsultationScreenProps) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"History" | "Notes" | "Medicines">("Notes");
  const [isChronic, setIsChronic] = useState(false);
  const [selectedInvestigations] = useState<string[]>(["Blood Count"]);
  const [modalVisible, setModalVisible] = useState(false);

  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [consultationId, setConsultationId] = useState<number | string | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState("—");
  const [patientAge, setPatientAge] = useState<string>("—");
  const [patientToken, setPatientToken] = useState<string | number | null>(null);
  const [patientProfileImage, setPatientProfileImage] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [medicineErrors, setMedicineErrors] = useState<Record<number, MedicineFieldErrors>>({});
  const [conflictWarnings, setConflictWarnings] = useState<MedicineConflict[]>([]);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [notesValidationMessage, setNotesValidationMessage] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isIssuingPrescription, setIsIssuingPrescription] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState<number | string | null>(null);
  const [prescriptionIssuedAt, setPrescriptionIssuedAt] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<ConsultationContextPayload["session"]>(null);
  const [appointmentSummary, setAppointmentSummary] = useState<ConsultationContextPayload["appointment"]>(null);
  const [queueSummary, setQueueSummary] = useState<ConsultationContextPayload["queue"]>(null);
  const lastSavedRef = useRef<string>("");
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";

  useEffect(() => {
    if (!isVerifiedDoctor) {
      setLoading(false);
      return;
    }
    const fetchPatientData = async () => {
      if (!queueId) {
        setContextError("No active patient was selected for consultation.");
        setLoading(false);
        return;
      }
      try {
        setContextError(null);
        const res = await apiFetch(`/api/doctor/consultation/${queueId}`);
        const contentType = res.headers.get("content-type") || "";
        const raw = await res.text();
        if (!res.ok) {
          throw new Error("Could not load the consultation context.");
        }
        const data = contentType.includes("application/json")
          ? (JSON.parse(raw) as ConsultationContextPayload | null)
          : null;
        if (!data) {
          throw new Error("Invalid consultation response.");
        }
        setPatientData(data);
        if (data?.patient?.name) setPatientName(data.patient.name);
        setPatientProfileImage(resolveDoctorImage(data?.patient?.profile_image, data?.patient?.avatarUrl));
        if (data?.patient?.age) {
          const gender = data?.patient?.gender
            ? String(data.patient.gender).charAt(0).toUpperCase()
            : "";
          setPatientAge(gender ? `${data.patient.age}${gender}` : `${data.patient.age}`);
        }
        setPatientId(data?.patient?.id ?? null);
        setQueueSummary(data?.queue ?? null);
        setAppointmentSummary(data?.appointment ?? null);
        setSessionSummary(data?.session ?? null);
        setPatientToken(data?.queue?.tokenNumber ?? null);
        setPrescriptionId(data?.consultation?.prescriptionId ?? null);
        setPrescriptionIssuedAt(data?.consultation?.prescriptionIssuedAt ?? null);
        if (data?.consultation?.id) setConsultationId(data.consultation.id);
        if (typeof data?.consultation?.symptoms === "string") setSymptoms(data.consultation.symptoms);
        if (typeof data?.consultation?.diagnosis === "string") setDiagnosis(data.consultation.diagnosis);
        if (typeof data?.consultation?.notes === "string") setDoctorNotes(data.consultation.notes);
        if (Array.isArray(data?.consultation?.medicines)) {
          setMedicines(data.consultation.medicines.map(mapContextMedicine));
        }
      } catch (err) {
        console.error(err);
        setContextError("This consultation is no longer active. Return to the queue and select the current patient.");
      } finally {
        setLoading(false);
      }
    };
    void fetchPatientData();
  }, [isVerifiedDoctor, queueId]);

  useEffect(() => {
    if (!isVerifiedDoctor) return;
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const data = await getQueueDashboard(token);
        const current = data?.currentPatient;
        if (
          current &&
          String(current.status || "").toUpperCase() === "WITH_DOCTOR" &&
          String(current.queue_id ?? "") === String(queueId ?? "")
        ) {
          setPatientId(current.patient_id ?? null);
          setPatientName(current.name || "—");
          setPatientProfileImage(resolveDoctorImage(current.profile_image ?? null, patientData?.patient?.profile_image));
          const age = current.age ? `${current.age}` : "—";
          const gender = current.gender ? String(current.gender).charAt(0).toUpperCase() : "";
          setPatientAge(gender ? `${age}${gender}` : age);
          setPatientToken(current.token_number ?? null);
          if (current.consultation_id) setConsultationId(current.consultation_id);
        } else {
          setContextError("No active consultation patient was found for this queue.");
        }
      } catch (error) {
        console.log("Consultation load error:", error);
      }
    };
    void load();
  }, [isVerifiedDoctor, patientData?.patient?.profile_image, queueId]);

  useEffect(() => {
    if (!isVerifiedDoctor) return;
    const createDraft = async () => {
    if (!patientId || consultationId || contextError) return;
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const res = await createConsultationDraft(token, {
          patientId,
          queueId,
          symptoms,
          diagnosis,
          notes: doctorNotes,
          medicines,
        });
        if (res?.consultation?.id) {
          setConsultationId(res.consultation.id);
        }
      } catch (error) {
        console.log("Create consultation error:", error);
      }
    };
    void createDraft();
  }, [contextError, isVerifiedDoctor, patientId, queueId, consultationId, symptoms, diagnosis, doctorNotes, medicines]);

  useEffect(() => {
    if (!isVerifiedDoctor) return;
    if (!consultationId) return;
    const interval = setInterval(async () => {
      try {
        setSaveStatus("saving");
        const payload = {
          symptoms,
          diagnosis,
          notes: doctorNotes,
          medicines,
        };
        const serialized = JSON.stringify(payload);
        if (serialized === lastSavedRef.current) {
          setSaveStatus("saved");
          return;
        }
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        await updateConsultationDraft(token, consultationId, payload);
        lastSavedRef.current = serialized;
        setSaveStatus("saved");
      } catch (error) {
        console.log("Autosave error:", error);
        setSaveStatus("error");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isVerifiedDoctor, consultationId, symptoms, diagnosis, doctorNotes, medicines]);

  const autosaveState = getAutosavePresentation(saveStatus);
  const hasIssuedPrescription = Boolean(prescriptionId);
  const hasMedicineEntries = medicines.length > 0;

  const patient = {
    name: patientName || "—",
    age: patientAge || "—",
    token: patientToken ?? "—",
  };

  const validatedMedicineErrors = useMemo(() => {
    const next: Record<number, MedicineFieldErrors> = {};
    medicines.forEach((medicine) => {
      const errors = validateMedicine(medicine);
      if (Object.keys(errors).length > 0) {
        next[medicine.id] = errors;
      }
    });
    return next;
  }, [medicines]);

  const validateConsultationNotes = useCallback(() => {
    const nextSymptoms = symptoms.trim();
    const nextDiagnosis = diagnosis.trim();
    const nextNotes = doctorNotes.trim();

    if (!nextSymptoms && !nextNotes) {
      return "Add symptoms or consultation notes before saving this consultation.";
    }

    if (!nextDiagnosis) {
      return "Add a diagnosis before completing this consultation.";
    }

    return null;
  }, [diagnosis, doctorNotes, symptoms]);

  const handleSaveDraft = () => {
    if (!isVerifiedDoctor) {
      Alert.alert("Approval required", "Consultation drafts will be available after doctor approval.");
      return;
    }
    Alert.alert("Save Draft", "Save all current consultation data?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: async () => {
          try {
            setIsSavingDraft(true);
            setNotesValidationMessage(null);
            if (contextError || !queueId || !patientId) {
              Alert.alert("Consultation unavailable", contextError || "No active patient was found for this consultation.");
              return;
            }
            if (!consultationId) {
              Alert.alert("Not ready", "Consultation draft is not ready yet.");
              return;
            }
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            const validationMessage = validateConsultationNotes();
            if (validationMessage && !symptoms.trim() && !doctorNotes.trim()) {
              setActiveTab("Notes");
              setNotesValidationMessage(validationMessage);
              Alert.alert("Missing details", validationMessage);
              return;
            }
            const payload = { symptoms, diagnosis, notes: doctorNotes, medicines };
            await updateConsultationDraft(token, consultationId, payload);
            lastSavedRef.current = JSON.stringify(payload);
            setSaveStatus("saved");
            Alert.alert("Draft Saved", "Your consultation draft has been saved.");
          } catch (error) {
            console.log("Save draft error:", error);
            Alert.alert("Save Failed", getFriendlyError(error, "Could not save the consultation draft."));
          } finally {
            setIsSavingDraft(false);
          }
        },
      },
    ]);
  };

  const handleComplete = async () => {
    if (!isVerifiedDoctor) {
      Alert.alert("Approval required", "You can complete consultations after doctor approval.");
      return;
    }
    if (isCompleting) return;
    setCompletionMessage(null);
    setNotesValidationMessage(null);
    setConflictWarnings([]);
    setMedicineErrors(validatedMedicineErrors);

    if (contextError || !queueId || !patientId) {
      const message = contextError || "No active patient was found for this consultation.";
      setCompletionMessage(message);
      Alert.alert("Consultation unavailable", message);
      return;
    }

    const noteValidationMessage = validateConsultationNotes();
    if (noteValidationMessage) {
      setActiveTab("Notes");
      setNotesValidationMessage(noteValidationMessage);
      setCompletionMessage(noteValidationMessage);
      return;
    }

    if (hasMedicineEntries && Object.keys(validatedMedicineErrors).length > 0) {
      setActiveTab("Medicines");
      setCompletionMessage("Please review the highlighted medicine entries before completing this consultation.");
      return;
    }

    const runCompletion = async () => {
      try {
        setIsCompleting(true);
        if (!consultationId) {
          Alert.alert("Not ready", "Consultation draft is not ready yet.");
          return;
        }
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const res = await completeConsultation(token, consultationId, medicines);
        if (res?.success) {
          Alert.alert("Consultation Completed", res?.message ?? "Consultation completed successfully.");
          navigation.replace("DoctorTabs", { screen: "DoctorQueueControl" });
          return;
        }
        Alert.alert("Consultation Completed", res?.message ?? "Consultation completed.");
      } catch (error: any) {
        console.log("Complete consultation error:", error);
        const conflicts = Array.isArray(error?.response?.data?.conflicts)
          ? (error.response.data.conflicts as MedicineConflict[])
          : [];
        if (conflicts.length > 0) {
          setConflictWarnings(conflicts);
          setCompletionMessage(
            "Medicine conflict found. Please review the highlighted medicines before completing this consultation."
          );
          setActiveTab("Medicines");
          return;
        }
        const backendMessage = error?.response?.data?.message;
        Alert.alert("Complete Consultation Failed", getFriendlyError(error, backendMessage || "Unable to complete this consultation."));
      } finally {
        setIsCompleting(false);
      }
    };

    if (!hasIssuedPrescription && !hasMedicineEntries) {
      Alert.alert(
        "Complete without prescription",
        "No medicines were added. Complete this consultation without issuing a prescription?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Complete", onPress: () => void runCompletion() },
        ]
      );
      return;
    }

    await runCompletion();
  };

  const handleIssuePrescription = async () => {
    if (!isVerifiedDoctor) {
      Alert.alert("Approval required", "You can issue prescriptions after doctor approval.");
      return;
    }

    if (isIssuingPrescription) return;
    setCompletionMessage(null);
    setConflictWarnings([]);
    setMedicineErrors(validatedMedicineErrors);

    if (contextError || !queueId || !patientId) {
      Alert.alert("Consultation unavailable", contextError || "No active patient was found for this consultation.");
      return;
    }

    if (!consultationId) {
      Alert.alert("Not ready", "Consultation draft is not ready yet.");
      return;
    }

    if (!hasMedicineEntries) {
      setActiveTab("Medicines");
      setCompletionMessage("Add at least one medicine before issuing a prescription.");
      return;
    }

    if (Object.keys(validatedMedicineErrors).length > 0) {
      setActiveTab("Medicines");
      setCompletionMessage("Please review the highlighted medicine entries before issuing the prescription.");
      return;
    }

    try {
      setIsIssuingPrescription(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await issueConsultationPrescription(token, consultationId, medicines);
      if (res?.success) {
        setPrescriptionId(res.prescriptionId ?? null);
        setPrescriptionIssuedAt(new Date().toISOString());
        Alert.alert(
          hasIssuedPrescription ? "Prescription Updated" : "Prescription Issued",
          hasIssuedPrescription
            ? "The prescription was updated for this consultation."
            : "The prescription is now linked to this consultation.",
          res?.prescriptionId
            ? [
                { text: "Continue" },
                {
                  text: "View",
                  onPress: () =>
                    navigation.navigate("DoctorPrescriptionDetails", {
                      prescriptionId: String(res.prescriptionId),
                    }),
                },
              ]
            : [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      const conflicts = Array.isArray(error?.response?.data?.conflicts)
        ? (error.response.data.conflicts as MedicineConflict[])
        : [];
      if (conflicts.length > 0) {
        setConflictWarnings(conflicts);
        setCompletionMessage(
          "Medicine conflict found. Please review the highlighted medicines before issuing the prescription."
        );
        setActiveTab("Medicines");
        return;
      }
      Alert.alert(
        hasIssuedPrescription ? "Update Failed" : "Issue Prescription Failed",
        getFriendlyError(error, error?.response?.data?.message || "Unable to issue this prescription.")
      );
    } finally {
      setIsIssuingPrescription(false);
    }
  };

  const handleAddMedicineItem = (newMedicine: MedicineItem) => {
    setMedicines((prev) => {
      const exists = prev.find((medicine) => medicine.name.trim().toLowerCase() === newMedicine.name.trim().toLowerCase());
      if (exists) {
        Alert.alert("Medicine already added", "This medicine is already in the prescription list.");
        return prev;
      }
      return [...prev, newMedicine];
    });
    setMedicineErrors((prev) => ({ ...prev, [newMedicine.id]: {} }));
  };

  const handleRemoveMedicine = (id: number) => {
    setMedicines((prev) => prev.filter((medicine) => medicine.id !== id));
    setMedicineErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading consultation...</Text>
          <Text style={styles.loadingSubtext}>Preparing patient notes and prescription draft.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isVerifiedDoctor) {
    return (
      <SafeAreaView style={styles.safe}>
        <PendingApprovalBanner />
        <View style={styles.blockedScreen}>
          <View style={styles.blockedCard}>
            <Ionicons name="lock-closed-outline" size={28} color={THEME.warning} />
            <Text style={styles.blockedTitle}>Consultation access is limited</Text>
            <Text style={styles.blockedText}>
              Consultations and prescription actions will be available once your doctor account is approved.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.safe}>
      <DoctorPanelHeader
        showBack
        eyebrow="Doctor Consultation"
        title="Clinical Review"
        subtitle="Review patient notes, diagnosis, and treatment"
        rightAvatarUrl={resolveDoctorImage(user?.profile_image ?? null)}
        onAvatarPress={() => navigation.navigate("DoctorMyProfile")}
      />
      <View style={styles.headerMetaBar}>
        <View style={[styles.autosaveChip, { backgroundColor: autosaveState.tone }]}>
          <Ionicons name={autosaveState.icon} size={14} color={autosaveState.color} />
          <Text style={[styles.autosaveText, { color: autosaveState.color }]}>{autosaveState.label}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.patientSummaryCard}>
            <DoctorAvatar
              name={patient.name}
              imageUrl={patientProfileImage}
              size={52}
              fallbackLabel={getDisplayInitials(patient.name, "PT")}
            />
            <View style={styles.patientSummaryCopy}>
              <Text style={styles.patientSummaryName} numberOfLines={1}>
                {patient.name}
              </Text>
              <Text style={styles.patientSummaryMeta}>
                {patient.age} • Token #{patient.token}
              </Text>
            </View>
          </View>

          <View style={styles.contextCard}>
            <View style={styles.contextRow}>
              <ContextPill icon="business-outline" label={sessionSummary?.medicalCenterName || "Clinic session"} />
              <ContextPill icon="calendar-outline" label={sessionSummary?.date || "Today"} />
              <ContextPill
                icon="time-outline"
                label={
                  sessionSummary?.startTime && sessionSummary?.endTime
                    ? `${sessionSummary.startTime.slice(0, 5)} - ${sessionSummary.endTime.slice(0, 5)}`
                    : appointmentSummary?.time || "Session time"
                }
              />
            </View>
            <Text style={styles.contextText}>
              {queueSummary?.complaint
                ? `Reason for visit: ${queueSummary.complaint}`
                : appointmentSummary?.time
                  ? `Appointment time: ${appointmentSummary.time}`
                  : "Review the clinical notes and treatment plan for this patient."}
            </Text>
          </View>

          <View style={styles.contextCard}>
            <View style={styles.contextRow}>
              <ContextPill icon="medical-outline" label={`Queue ${queueId ?? "—"}`} />
              <ContextPill icon="document-text-outline" label={`Consultation ${consultationId ?? "Draft"}`} />
              <ContextPill
                icon="document-attach-outline"
                label={hasIssuedPrescription ? "Prescription Issued" : "No Prescription Yet"}
              />
            </View>
            <Text style={styles.contextText}>
              {hasIssuedPrescription
                ? `Prescription linked${prescriptionIssuedAt ? ` • ${formatDateTime(prescriptionIssuedAt)}` : ""}. Complete this consultation when your notes are final.`
                : "Issue a prescription if needed, or complete the consultation without one."}
            </Text>
            {hasIssuedPrescription ? (
              <TouchableOpacity
                style={styles.inlineLinkButton}
                onPress={() =>
                  navigation.navigate("DoctorPrescriptionDetails", {
                    prescriptionId: String(prescriptionId),
                  })
                }
              >
                <Text style={styles.inlineLinkText}>View Issued Prescription</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {contextError ? (
            <View style={styles.inlineValidationCard}>
              <Ionicons name="alert-circle-outline" size={18} color={THEME.danger} />
              <Text style={styles.inlineValidationText}>{contextError}</Text>
            </View>
          ) : null}

          {completionMessage ? (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={18} color={THEME.warning} />
              <Text style={styles.warningBannerText}>{completionMessage}</Text>
            </View>
          ) : null}

          {notesValidationMessage ? (
            <View style={styles.inlineValidationCard}>
              <Ionicons name="alert-circle-outline" size={18} color={THEME.warning} />
              <Text style={styles.inlineValidationText}>{notesValidationMessage}</Text>
            </View>
          ) : null}

          {conflictWarnings.length > 0 ? (
            <View style={styles.conflictCard}>
              <Text style={styles.conflictTitle}>Medicine conflict found</Text>
              <Text style={styles.conflictText}>{formatConflictCopy(conflictWarnings)}</Text>
            </View>
          ) : null}

          <View style={styles.tabBar}>
            {(["History", "Notes", "Medicines"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === "History" ? (
            <View style={styles.sectionStack}>
              {(patientData?.conditions?.length || patientData?.allergies?.length) ? (
                <View style={styles.alertCard}>
                  <Text style={styles.alertTitle}>Clinical alerts</Text>
                  {(patientData?.conditions || []).map((condition: string, index: number) => (
                    <Text key={`condition-${index}`} style={styles.alertLine}>
                      • {condition}
                    </Text>
                  ))}
                  {(patientData?.allergies || []).map((allergy: string, index: number) => (
                    <Text key={`allergy-${index}`} style={styles.alertLine}>
                      • {allergy} allergy
                    </Text>
                  ))}
                </View>
              ) : null}

              <InfoSection title="Chronic Conditions">
                <View style={styles.chipWrap}>
                  {(patientData?.conditions || []).length > 0 ? (
                    (patientData.conditions || []).map((condition: string, index: number) => (
                      <Tag key={`history-cond-${index}`} label={condition} tone="primary" />
                    ))
                  ) : (
                    <Text style={styles.emptyInlineText}>No chronic conditions recorded.</Text>
                  )}
                </View>
              </InfoSection>

              <InfoSection title="Allergies">
                <View style={styles.chipWrap}>
                  {(patientData?.allergies || []).length > 0 ? (
                    (patientData.allergies || []).map((allergy: string, index: number) => (
                      <Tag key={`history-allergy-${index}`} label={allergy} tone="danger" />
                    ))
                  ) : (
                    <Text style={styles.emptyInlineText}>No allergy notes recorded.</Text>
                  )}
                </View>
              </InfoSection>

              <InfoSection title="Recent Visits">
                <View style={styles.contentCard}>
                  {(patientData?.visits || []).length > 0 ? (
                    (patientData.visits || []).map((visit: any, index: number) => (
                      <View key={`visit-${index}`} style={[styles.timelineItem, index > 0 && styles.timelineItemBorder]}>
                        <Text style={styles.timelineDate}>{formatDateTime(visit.date)}</Text>
                        <Text style={styles.timelineTitle}>{visit.diagnosis || "Visit recorded"}</Text>
                        <Text style={styles.timelineBody}>{visit.notes || "No additional notes."}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyInlineText}>No recent visits found.</Text>
                  )}
                </View>
              </InfoSection>
            </View>
          ) : null}

          {activeTab === "Notes" ? (
            <View style={styles.sectionStack}>
              <InfoSection title="Symptoms">
                <LargeInput
                  value={symptoms}
                  onChangeText={setSymptoms}
                  placeholder="Describe the patient's symptoms"
                  minHeight={120}
                />
              </InfoSection>

              <InfoSection title="Diagnosis">
                <LargeInput
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  placeholder="Enter a diagnosis or working diagnosis"
                  minHeight={96}
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Mark as chronic condition</Text>
                  <Switch
                    value={isChronic}
                    onValueChange={setIsChronic}
                    trackColor={{ false: "#D4E7E7", true: THEME.teal }}
                    thumbColor={isChronic ? THEME.surface : "#FFFFFF"}
                  />
                </View>
              </InfoSection>

              <InfoSection title="Clinical Notes">
                <LargeInput
                  value={doctorNotes}
                  onChangeText={setDoctorNotes}
                  placeholder="Add observations, examination findings, or treatment notes"
                  minHeight={140}
                />
              </InfoSection>

              <InfoSection title="Investigations">
                <View style={styles.chipWrap}>
                  {selectedInvestigations.map((item) => (
                    <Tag key={item} label={item} tone="neutral" />
                  ))}
                </View>
              </InfoSection>
            </View>
          ) : null}

          {activeTab === "Medicines" ? (
            <View style={styles.sectionStack}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Medicine Builder</Text>
                <TouchableOpacity
                  style={styles.addMedicineButton}
                  onPress={() => setModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Add medicine"
                >
                  <Ionicons name="add" size={18} color={THEME.surface} />
                  <Text style={styles.addMedicineButtonText}>Add Medicine</Text>
                </TouchableOpacity>
              </View>

              {medicines.length === 0 ? (
                <View style={styles.emptyBuilderCard}>
                  <Text style={styles.emptyBuilderTitle}>No medicines added yet</Text>
                  <Text style={styles.emptyBuilderText}>
                    Add medicines now if this consultation needs a prescription.
                  </Text>
                  <TouchableOpacity style={styles.emptyBuilderAction} onPress={() => setModalVisible(true)}>
                    <Text style={styles.emptyBuilderActionText}>Add First Medicine</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                medicines.map((medicine) => {
                  const fieldErrors = medicineErrors[medicine.id] || validatedMedicineErrors[medicine.id] || {};
                  return (
                    <View key={medicine.id} style={styles.medicineCard}>
                      <View style={styles.medicineCardHeader}>
                        <View style={styles.medicineHeaderCopy}>
                          <Text style={styles.medicineName} numberOfLines={1}>
                            {medicine.name}
                          </Text>
                          <Text style={styles.medicineSubline} numberOfLines={1}>
                            {medicine.type} • {medicine.strength}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeMedicineButton}
                          onPress={() => handleRemoveMedicine(medicine.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${medicine.name}`}
                        >
                          <Ionicons name="trash-outline" size={18} color={THEME.danger} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.medicineMetaGrid}>
                        <MetaTile label="Dosage" value={`${medicine.dosage.morning}-${medicine.dosage.afternoon}-${medicine.dosage.night}`} />
                        <MetaTile label="Duration" value={`${medicine.duration} days`} />
                        <MetaTile label="Timing" value={medicine.timing} />
                      </View>

                      {medicine.notes ? <Text style={styles.medicineNotes}>{medicine.notes}</Text> : null}

                      {Object.values(fieldErrors).filter(Boolean).length > 0 ? (
                        <View style={styles.inlineErrorBox}>
                          {Object.values(fieldErrors).map((errorText) =>
                            errorText ? (
                              <Text key={errorText} style={styles.inlineErrorText}>
                                • {errorText}
                              </Text>
                            ) : null
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </ScrollView>

        <AddMedicineModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onAdd={(medicine: MedicineItem) => {
            handleAddMedicineItem(medicine);
            setModalVisible(false);
          }}
        />

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.draftButton,
              (isSavingDraft || isIssuingPrescription || isCompleting || Boolean(contextError)) &&
                styles.actionButtonDisabled,
            ]}
            onPress={handleSaveDraft}
            disabled={isSavingDraft || isIssuingPrescription || isCompleting || Boolean(contextError)}
            accessibilityRole="button"
            accessibilityLabel="Save consultation draft"
          >
            {isSavingDraft ? <ActivityIndicator size="small" color={THEME.deep} /> : <Text style={styles.draftButtonText}>Save Draft</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.issueButton,
              (isSavingDraft || isIssuingPrescription || isCompleting || Boolean(contextError)) &&
                styles.actionButtonDisabled,
            ]}
            onPress={handleIssuePrescription}
            disabled={isSavingDraft || isIssuingPrescription || isCompleting || Boolean(contextError)}
            accessibilityRole="button"
            accessibilityLabel={hasIssuedPrescription ? "Update prescription" : "Issue prescription"}
          >
            {isIssuingPrescription ? (
              <ActivityIndicator size="small" color={THEME.primary} />
            ) : (
              <Text style={styles.issueButtonText}>
                {hasIssuedPrescription ? "Update Prescription" : "Issue Prescription"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.completeButton,
              (isSavingDraft || isIssuingPrescription || isCompleting || Boolean(contextError)) &&
                styles.actionButtonDisabled,
            ]}
            onPress={handleComplete}
            disabled={isSavingDraft || isIssuingPrescription || isCompleting || Boolean(contextError)}
            accessibilityRole="button"
            accessibilityLabel="Complete consultation"
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color={THEME.surface} />
            ) : (
              <>
                <Text style={styles.completeButtonText}>Complete Consultation</Text>
                <Ionicons name="arrow-forward" size={18} color={THEME.surface} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Tag({ label, tone }: { label: string; tone: "primary" | "danger" | "neutral" }) {
  const palette =
    tone === "danger"
      ? { backgroundColor: THEME.dangerBg, color: THEME.danger }
      : tone === "primary"
        ? { backgroundColor: "#E7F6F5", color: THEME.primary }
        : { backgroundColor: "#EEF7F7", color: THEME.textSecondary };
  return (
    <View style={[styles.tag, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.tagText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function ContextPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.contextPill}>
      <Ionicons name={icon} size={14} color={THEME.primary} />
      <Text style={styles.contextPillText}>{label}</Text>
    </View>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaTile}>
      <Text style={styles.metaTileLabel}>{label}</Text>
      <Text style={styles.metaTileValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function LargeInput({
  value,
  onChangeText,
  placeholder,
  minHeight,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  minHeight: number;
}) {
  return (
    <View style={styles.contentCard}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={THEME.textMuted}
        multiline
        style={[styles.largeInput, { minHeight }]}
        textAlignVertical="top"
      />
    </View>
  );
}

function AddMedicineModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (medicine: MedicineItem) => void;
}) {
  const [form, setForm] = useState(INITIAL_MEDICINE_FORM);
  const [errors, setErrors] = useState<MedicineFieldErrors>({});

  useEffect(() => {
    if (!visible) {
      setForm(INITIAL_MEDICINE_FORM);
      setErrors({});
    }
  }, [visible]);

  const cycleDosage = (key: keyof typeof form.dosage) => {
    setForm((prev) => ({
      ...prev,
      dosage: {
        ...prev.dosage,
        [key]: prev.dosage[key] >= 2 ? 0 : prev.dosage[key] + 1,
      },
    }));
    setErrors((prev) => ({ ...prev, dosage: undefined }));
  };

  const submit = () => {
    const parsedDuration = Number(form.duration);
    const nextMedicine: MedicineItem = {
      id: Date.now(),
      name: form.name.trim(),
      type: form.type.trim(),
      strength: form.strength.trim(),
      dosage: form.dosage,
      duration: Number.isFinite(parsedDuration) ? parsedDuration : 0,
      timing: form.timing.trim(),
      notes: form.notes.trim(),
    };
    const nextErrors = validateMedicine(nextMedicine);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onAdd(nextMedicine);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Medicine</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close add medicine form"
            >
              <Ionicons name="close" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <TextInput
              placeholder="Medicine name"
              placeholderTextColor={THEME.textMuted}
              style={styles.modalInput}
              value={form.name}
              onChangeText={(value) => {
                setForm((prev) => ({ ...prev, name: value }));
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name ? <Text style={styles.fieldErrorText}>{errors.name}</Text> : null}

            <View style={styles.modalRow}>
              <TextInput
                placeholder="Type"
                placeholderTextColor={THEME.textMuted}
                style={[styles.modalInput, styles.modalHalfInput]}
                value={form.type}
                onChangeText={(value) => {
                  setForm((prev) => ({ ...prev, type: value }));
                  setErrors((prev) => ({ ...prev, type: undefined }));
                }}
              />
              <TextInput
                placeholder="Strength"
                placeholderTextColor={THEME.textMuted}
                style={[styles.modalInput, styles.modalHalfInput]}
                value={form.strength}
                onChangeText={(value) => {
                  setForm((prev) => ({ ...prev, strength: value }));
                  setErrors((prev) => ({ ...prev, strength: undefined }));
                }}
              />
            </View>
            {errors.type || errors.strength ? (
              <Text style={styles.fieldErrorText}>{errors.type || errors.strength}</Text>
            ) : null}

            <Text style={styles.modalSectionTitle}>Dosage</Text>
            <View style={styles.dosageRow}>
              {(["morning", "afternoon", "night"] as const).map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.dosagePill, form.dosage[slot] > 0 && styles.dosagePillActive]}
                  onPress={() => cycleDosage(slot)}
                >
                  <Text style={[styles.dosagePillLabel, form.dosage[slot] > 0 && styles.dosagePillLabelActive]}>
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </Text>
                  <Text style={[styles.dosagePillValue, form.dosage[slot] > 0 && styles.dosagePillValueActive]}>
                    {form.dosage[slot]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.dosage ? <Text style={styles.fieldErrorText}>{errors.dosage}</Text> : null}

            <View style={styles.modalRow}>
              <TextInput
                placeholder="Duration in days"
                placeholderTextColor={THEME.textMuted}
                keyboardType="number-pad"
                style={[styles.modalInput, styles.modalHalfInput]}
                value={form.duration}
                onChangeText={(value) => {
                  setForm((prev) => ({ ...prev, duration: value.replace(/[^0-9]/g, "") }));
                  setErrors((prev) => ({ ...prev, duration: undefined }));
                }}
              />
              <TextInput
                placeholder="Timing"
                placeholderTextColor={THEME.textMuted}
                style={[styles.modalInput, styles.modalHalfInput]}
                value={form.timing}
                onChangeText={(value) => {
                  setForm((prev) => ({ ...prev, timing: value }));
                  setErrors((prev) => ({ ...prev, timing: undefined }));
                }}
              />
            </View>
            {errors.duration || errors.timing ? (
              <Text style={styles.fieldErrorText}>{errors.duration || errors.timing}</Text>
            ) : null}

            <TextInput
              placeholder="Instructions or notes"
              placeholderTextColor={THEME.textMuted}
              style={[styles.modalInput, styles.modalNotesInput]}
              multiline
              value={form.notes}
              onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}>
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={submit}>
              <Text style={styles.modalPrimaryButtonText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: THEME.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: THEME.textSecondary, fontSize: 15 },
  loadingSubtext: { color: THEME.textMuted, fontSize: 13 },
  blockedScreen: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  blockedCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  blockedTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  blockedText: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  headerMetaBar: {
    paddingHorizontal: 20,
    paddingBottom: 6,
    backgroundColor: THEME.surface,
  },
  autosaveChip: {
    minHeight: 36,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  autosaveText: { fontSize: 12, fontWeight: "700" },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 112,
    gap: 16,
  },
  patientSummaryCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EAF7F7",
    alignItems: "center",
    justifyContent: "center",
  },
  patientSummaryCopy: { flex: 1 },
  patientSummaryName: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  patientSummaryMeta: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  contextCard: {
    backgroundColor: "#ECF8F7",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  contextRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  contextPill: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contextPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.primary,
  },
  contextText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  inlineLinkButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    minHeight: 36,
    justifyContent: "center",
  },
  inlineLinkText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.primary,
  },
  warningBanner: {
    backgroundColor: THEME.warningBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  warningBannerText: {
    flex: 1,
    color: THEME.warning,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  inlineValidationCard: {
    backgroundColor: "#FFF7EC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F5D79C",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  inlineValidationText: {
    flex: 1,
    color: THEME.warning,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  conflictCard: {
    backgroundColor: "#FFF7EC",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F5D79C",
  },
  conflictTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.warning,
  },
  conflictText: {
    marginTop: 6,
    color: THEME.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#DEECEC",
    borderRadius: 22,
    padding: 5,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: THEME.deep,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  tabButtonTextActive: {
    color: THEME.surface,
  },
  sectionStack: { gap: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 10,
  },
  contentCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
  },
  largeInput: {
    fontSize: 15,
    lineHeight: 21,
    color: THEME.textPrimary,
  },
  switchRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyInlineText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  alertCard: {
    backgroundColor: "#FFF4F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F4D1CB",
    padding: 16,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.danger,
    marginBottom: 8,
  },
  alertLine: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textPrimary,
  },
  timelineItem: {
    paddingVertical: 10,
  },
  timelineItemBorder: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  timelineDate: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  timelineTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  timelineBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  addMedicineButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addMedicineButtonText: {
    color: THEME.surface,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyBuilderCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 18,
  },
  emptyBuilderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  emptyBuilderText: {
    marginTop: 6,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  emptyBuilderAction: {
    marginTop: 14,
    alignSelf: "flex-start",
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#E7F6F5",
  },
  emptyBuilderActionText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  medicineCard: {
    backgroundColor: THEME.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
  },
  medicineCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  medicineHeaderCopy: { flex: 1 },
  medicineName: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  medicineSubline: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  removeMedicineButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#FFF4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  medicineMetaGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  metaTile: {
    flex: 1,
    backgroundColor: "#F5FAFA",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaTileLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textMuted,
    textTransform: "uppercase",
  },
  metaTileValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textPrimary,
    fontWeight: "700",
  },
  medicineNotes: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: THEME.textSecondary,
  },
  inlineErrorBox: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: THEME.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineErrorText: {
    fontSize: 12,
    lineHeight: 17,
    color: THEME.danger,
    fontWeight: "700",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: "column",
    gap: 12,
  },
  draftButton: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.card,
  },
  draftButtonText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  issueButton: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CAE9E7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF7F6",
  },
  issueButtonText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
  completeButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: THEME.deep,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  completeButtonText: {
    color: THEME.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(8, 20, 24, 0.32)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#EEF7F7",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    paddingBottom: 18,
  },
  modalInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: THEME.textPrimary,
    fontSize: 14,
  },
  modalRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalHalfInput: {
    flex: 1,
  },
  modalSectionTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  dosageRow: {
    flexDirection: "row",
    gap: 10,
  },
  dosagePill: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: THEME.card,
  },
  dosagePillActive: {
    backgroundColor: "#E9F7F6",
    borderColor: THEME.teal,
  },
  dosagePillLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  dosagePillLabelActive: {
    color: THEME.primary,
  },
  dosagePillValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  dosagePillValueActive: {
    color: THEME.deep,
  },
  modalNotesInput: {
    minHeight: 100,
    marginTop: 12,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.card,
  },
  modalSecondaryButtonText: {
    color: THEME.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  modalPrimaryButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  modalPrimaryButtonText: {
    color: THEME.surface,
    fontWeight: "800",
    fontSize: 14,
  },
  fieldErrorText: {
    marginTop: 8,
    color: THEME.danger,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
