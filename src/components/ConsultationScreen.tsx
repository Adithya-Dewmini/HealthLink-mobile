import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Switch,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getQueueDashboard } from "../services/doctorQueueService";
import {
  completeConsultation,
  createConsultationDraft,
  updateConsultationDraft,
} from "../services/consultationService";
import { API_BASE_URL } from "../config/api";

const { width } = Dimensions.get("window");

const THEME = {
  background: "#F8FAFC",
  white: "#FFFFFF",
  charcoal: "#0F172A",
  accentBlue: "#3B82F6",
  softBlue: "#EFF6FF",
  textGray: "#64748B",
  border: "#F1F5F9",
  danger: "#EF4444",
  softDanger: "#FEF2F2",
  success: "#10B981",
  softSuccess: "#ECFDF5",
  warning: "#F59E0B",
  accentGreen: "#4CAF50",
  softGreen: "#E8F5E9",
};

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

export default function ConsultationScreen({ queueId }: ConsultationScreenProps) {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState("Notes");
  const [isChronic, setIsChronic] = useState(false);
  const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>([
    "Blood Count",
  ]);
  const [actionAdvice, setActionAdvice] = useState("");
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!queueId) {
        setLoading(false);
        return;
      }
      try {
        const token = await AsyncStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/doctor/consultation/${queueId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const contentType = res.headers.get("content-type") || "";
        const raw = await res.text();
        if (!res.ok) {
          console.log("Patient fetch failed:", res.status, raw.slice(0, 200));
          throw new Error("Patient fetch failed");
        }
        const data = contentType.includes("application/json") ? JSON.parse(raw) : null;
        if (!data) {
          console.log("Unexpected response:", raw.slice(0, 200));
          throw new Error("Invalid response");
        }
        setPatientData(data);
        if (data?.patient?.name) {
          setPatientName(data.patient.name);
        }
        if (data?.patient?.age) {
          const gender = data?.patient?.gender
            ? String(data.patient.gender).charAt(0).toUpperCase()
            : "";
          setPatientAge(gender ? `${data.patient.age}${gender}` : `${data.patient.age}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void fetchPatientData();
  }, [queueId]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        const data = await getQueueDashboard(token);
        const current = data?.currentPatient;
        if (current) {
          setPatientId(current.patient_id ?? null);
          setPatientName(current.name || "—");
          const age = current.age ? `${current.age}` : "—";
          const gender = current.gender ? String(current.gender).charAt(0).toUpperCase() : "";
          setPatientAge(gender ? `${age}${gender}` : age);
          setPatientToken(current.token_number ?? null);
          if (current.consultation_id) {
            setConsultationId(current.consultation_id);
          }
        }
      } catch (error) {
        console.log("Consultation load error:", error);
      }
    };
    void load();
  }, [queueId]);

  useEffect(() => {
    const createDraft = async () => {
      if (!patientId || consultationId) return;
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
  }, [patientId, queueId, consultationId, symptoms, diagnosis, doctorNotes, medicines]);

  useEffect(() => {
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
  }, [consultationId, symptoms, diagnosis, doctorNotes, medicines]);

  const handleSaveDraft = () => {
    Alert.alert(
      "Save Draft",
      "Save all current consultation data?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            try {
              if (!consultationId) {
                Alert.alert("Not ready", "Consultation draft not created yet.");
                return;
              }
              const token = await AsyncStorage.getItem("token");
              if (!token) return;
              const payload = { symptoms, diagnosis, notes: doctorNotes, medicines };
              await updateConsultationDraft(token, consultationId, payload);
              lastSavedRef.current = JSON.stringify(payload);
              setSaveStatus("saved");
              Alert.alert("Saved", "Draft saved successfully.");
            } catch (error) {
              console.log("Save draft error:", error);
              Alert.alert("Error", "Failed to save draft.");
            }
          },
        },
      ]
    );
  };

  const handleComplete = async () => {
    try {
      if (!consultationId) return;
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await completeConsultation(token, consultationId, medicines);
      if (res?.success) {
        Alert.alert("Success", "Prescription sent to patient");
        navigation.replace("DoctorTabs", { screen: "DoctorQueueControl" });
        return;
      }
      Alert.alert("Done", res?.message ?? "Consultation completed.");
    } catch (error) {
      console.log("Complete consultation error:", error);
      Alert.alert("Error", "Unable to complete consultation");
    }
  };

  const handleAddMedicine = () => {
    setModalVisible(true);
  };

  const handleAddMedicineItem = (newMedicine: MedicineItem) => {
    setMedicines((prev) => {
      const exists = prev.find((m) => m.name === newMedicine.name);
      if (exists) return prev;
      return [...prev, newMedicine];
    });
    Alert.alert("Added", "Medicine added successfully.");
  };

  const handleRemoveMedicine = (id: number) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const patient = {
    name: patientName || "—",
    age: patientAge || "—",
    token: patientToken ?? "—",
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with Back Button + Patient Info */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={THEME.charcoal} />
        </TouchableOpacity>
        <View style={styles.patientInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={THEME.accentBlue} />
          </View>
          <View>
            <Text style={styles.patientName}>
              {patient.name} | {patient.age}
            </Text>
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenText}>Token #{patient.token}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color={THEME.charcoal} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        {["History", "Notes", "Action"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.activeTabText]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "History" ? (
            <View style={styles.historyContainer}>
              {(patientData?.conditions?.length || patientData?.allergies?.length) ? (
                <View style={styles.riskCard}>
                  <View style={styles.riskHeader}>
                    <Ionicons name="warning" size={20} color={THEME.danger} />
                    <Text style={styles.riskTitle}>High Risk Alerts</Text>
                  </View>
                  <View style={styles.riskList}>
                    {(patientData?.conditions || []).map((c: string, i: number) => (
                      <Text key={`cond-${i}`} style={styles.riskItem}>
                        • {c}
                      </Text>
                    ))}
                    {(patientData?.allergies || []).map((a: string, i: number) => (
                      <Text key={`allergy-${i}`} style={styles.riskItem}>
                        • {a} Allergy
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.historySectionHeader}>
                <Text style={styles.historySectionLabel}>Chronic Conditions</Text>
              </View>
              <View style={styles.chipContainer}>
                {(patientData?.conditions || []).map((c: string, i: number) => (
                  <View key={`cond-chip-${i}`} style={[styles.chipBase, { backgroundColor: THEME.softBlue }]}>
                    <Text style={[styles.chipBaseText, { color: THEME.accentBlue }]}>{c}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.historySectionHeader}>
                <Text style={styles.historySectionLabel}>Allergies</Text>
              </View>
              <View style={styles.chipContainer}>
                {(patientData?.allergies || []).map((a: string, i: number) => (
                  <View key={`allergy-chip-${i}`} style={[styles.chipBase, { backgroundColor: THEME.softDanger }]}>
                    <Text style={[styles.chipBaseText, { color: THEME.danger }]}>{a}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.historySectionHeader}>
                <Text style={styles.historySectionLabel}>Recent Visits</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>View Full History</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.whiteCard}>
                {(patientData?.visits || []).map((visit: any, i: number) => (
                  <React.Fragment key={`visit-${i}`}>
                    <HistoryTimelineItem
                      date={visit.date}
                      diagnosis={visit.diagnosis}
                      treatment={visit.notes}
                      isLast={i === (patientData?.visits?.length ?? 0) - 1}
                    />
                    {i < (patientData?.visits?.length ?? 0) - 1 ? (
                      <View style={styles.timelineDivider} />
                    ) : null}
                  </React.Fragment>
                ))}
              </View>

              <View style={styles.historySectionHeader}>
                <Text style={styles.historySectionLabel}>Recent Medications</Text>
              </View>
              <View style={styles.whiteCard}>
                {(patientData?.medications || []).map((med: string, i: number) => (
                  <View key={`med-${i}`} style={styles.medRow}>
                    <Ionicons name="medical" size={16} color={THEME.accentBlue} />
                    <Text style={styles.medText}>{med}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.smartHighlight}>
                <Ionicons name="bulb" size={18} color="#FBC02D" />
                <Text style={styles.smartText}>
                  Frequent visits detected (3 in last 30 days)
                </Text>
              </View>
            </View>
          ) : null}

          {activeTab === "Notes" ? (
            <>
              {/* Chief Complaint */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="medkit-outline" size={16} color={THEME.charcoal} />
                </View>
                <Text style={styles.sectionTitle}>Chief Complaint</Text>
              </View>
              <View style={styles.card}>
                <TextInput
                  placeholder="Fever, headache for 2 days..."
                  style={styles.complaintInput}
                  multiline
                  value={symptoms}
                  onChangeText={setSymptoms}
                />
              </View>

              {/* Diagnosis Section */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="bulb-outline" size={16} color={THEME.charcoal} />
                </View>
                <Text style={styles.sectionTitle}>Diagnosis</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={THEME.textGray} />
                  <TextInput
                    placeholder="Search disease or ICD code"
                    style={styles.searchInput}
                    value={diagnosis}
                    onChangeText={setDiagnosis}
                  />
                </View>

                <View style={styles.chipRow}>
                  {["Viral Fever", "Migraine"].map((item) => (
                    <View key={item} style={styles.chip}>
                      <Text style={styles.chipText}>{item}</Text>
                      <Ionicons name="close-circle" size={16} color={THEME.textGray} />
                    </View>
                  ))}
                </View>

                <View style={styles.divider} />

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Mark as Chronic Condition</Text>
                  <Switch
                    value={isChronic}
                    onValueChange={setIsChronic}
                    trackColor={{ false: "#D1D1D1", true: THEME.accentBlue }}
                  />
                </View>
              </View>

              {/* Clinical Notes */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="document-text-outline" size={16} color={THEME.charcoal} />
                </View>
                <Text style={styles.sectionTitle}>Clinical Notes (Optional)</Text>
              </View>
              <View style={[styles.card, { paddingVertical: 10 }]}>
                <TextInput
                  placeholder="Observations or remarks..."
                  style={styles.notesInput}
                  multiline
                  value={doctorNotes}
                  onChangeText={setDoctorNotes}
                />
              </View>

              {/* Investigations */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="flask-outline" size={16} color={THEME.charcoal} />
                </View>
                <Text style={styles.sectionTitle}>Investigations</Text>
                <Text style={styles.seeAll}>See all</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.investigationRow}
              >
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="add" size={20} color={THEME.charcoal} />
                </TouchableOpacity>
                {selectedInvestigations.map((test) => (
                  <TouchableOpacity key={test} style={styles.testChip}>
                    <Text style={styles.testChipText}>{test}</Text>
                  </TouchableOpacity>
                ))}
                {["Urine Test", "X-Ray Chest"].map((test) => (
                  <TouchableOpacity key={test} style={styles.testChip}>
                    <Text style={styles.testChipText}>{test}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.saveHint}>
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved just now"
                    : saveStatus === "error"
                      ? "Save failed"
                      : ""}
              </Text>
            </>
          ) : null}

          {activeTab === "Action" ? (
            <>
              <View style={styles.actionSectionHeader}>
                <Text style={styles.actionSectionTitle}>Medicines</Text>
                <TouchableOpacity style={styles.addMedicineBtn} onPress={handleAddMedicine}>
                  <Ionicons name="add-circle" size={20} color={THEME.accentBlue} />
                  <Text style={styles.addText}>Add Medicine</Text>
                </TouchableOpacity>
              </View>

              {medicines.map((item) => (
                <View key={item.id} style={styles.medicineCard}>
                  <View style={styles.medHeader}>
                    <View>
                      <Text style={styles.medName}>{item.name}</Text>
                      <Text style={styles.medStrength}>
                        {item.type} | {item.strength}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveMedicine(item.id)}>
                      <Ionicons name="trash-outline" size={20} color={THEME.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionDivider} />

                  <View style={styles.dosageRow}>
                    <View style={styles.dosageItem}>
                      <Text style={styles.dosageLabel}>Dosage</Text>
                      <View style={styles.dosageBadge}>
                        <Text style={styles.dosageText}>
                          {item.dosage.morning}-{item.dosage.afternoon}-{item.dosage.night}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dosageItem}>
                      <Text style={styles.dosageLabel}>Duration</Text>
                      <Text style={styles.dosageValue}>{item.duration} days</Text>
                    </View>
                    <View style={styles.dosageItem}>
                      <Text style={styles.dosageLabel}>Timing</Text>
                      <Text style={styles.dosageValue}>{item.timing}</Text>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.actionSectionHeader}>
                <Text style={styles.actionSectionTitle}>Additional Advice</Text>
              </View>
              <View style={styles.adviceCard}>
                <TextInput
                  placeholder="e.g. Drink plenty of water, Rest for 3 days..."
                  placeholderTextColor={THEME.textGray}
                  multiline
                  style={styles.adviceInput}
                  value={actionAdvice}
                  onChangeText={setActionAdvice}
                />
              </View>

              <View style={styles.qrStatusInfo}>
                <Ionicons name="checkmark-circle" size={16} color={THEME.accentGreen} />
                <Text style={styles.qrStatusText}>
                  QR will be generated for the Patient App upon completion.
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <AddMedicineModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddMedicineItem}
      />

      {/* Bottom Action Bar */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft}>
          <Text style={styles.draftBtnText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeBtnText}>Complete & Next Patient</Text>
          <Ionicons name="arrow-forward" size={18} color={THEME.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const HistoryTimelineItem = ({ date, diagnosis, treatment, isLast }: any) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelinePointContainer}>
      <View style={[styles.timelineDot, isLast && styles.activeDot]} />
    </View>
    <View style={styles.timelineContent}>
      <Text style={styles.timelineDate}>{date}</Text>
      <Text style={styles.timelineDiagnosis}>{diagnosis}</Text>
      <Text style={styles.timelineTreatment}>{treatment}</Text>
    </View>
  </View>
);

const AddMedicineModal = ({ visible, onClose, onAdd }: any) => {
  const [selectedMedicine, setSelectedMedicine] = useState({
    name: "Paracetamol",
    type: "Tablet",
    strength: "500mg",
  });
  const [dosage, setDosage] = useState({ morning: 1, afternoon: 0, night: 1 });
  const [timing, setTiming] = useState("After Meal");
  const [duration, setDuration] = useState("5 days");
  const [notes, setNotes] = useState("");

  const cycleDosage = (key: keyof typeof dosage) => {
    setDosage((prev) => ({
      ...prev,
      [key]: prev[key] >= 2 ? 0 : prev[key] + 1,
    }));
  };

  const handleSubmit = () => {
    const parsedDuration = Number(duration.split(" ")[0]) || 0;
    const medicineData = {
      id: Date.now(),
      name: selectedMedicine.name.trim() || "Untitled",
      type: selectedMedicine.type.trim() || "Tablet",
      strength: selectedMedicine.strength.trim() || "—",
      dosage: {
        morning: dosage.morning,
        afternoon: dosage.afternoon,
        night: dosage.night,
      },
      duration: parsedDuration,
      timing,
      notes: notes.trim(),
    };
    onAdd?.(medicineData);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Medicine</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={THEME.charcoal} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScroll}
          >
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={20} color={THEME.textGray} style={styles.modalSearchIcon} />
              <TextInput
                placeholder="Search medicine (e.g. Paracetamol)"
                style={styles.modalSearchInput}
                placeholderTextColor={THEME.textGray}
                value={selectedMedicine.name}
                onChangeText={(text) =>
                  setSelectedMedicine((prev) => ({ ...prev, name: text }))
                }
              />
            </View>

            <View style={styles.modalSelectedCard}>
              <View style={styles.modalMedIconBox}>
                <Ionicons name="medical" size={20} color={THEME.accentBlue} />
              </View>
              <View>
                <Text style={styles.modalSelectedName}>{selectedMedicine.name}</Text>
                <Text style={styles.modalSelectedSub}>
                  {selectedMedicine.type} | {selectedMedicine.strength}
                </Text>
              </View>
            </View>

            <View style={styles.modalMetaRow}>
              <TextInput
                placeholder="Type (e.g. Tablet)"
                style={styles.modalMetaInput}
                value={selectedMedicine.type}
                onChangeText={(text) =>
                  setSelectedMedicine((prev) => ({ ...prev, type: text }))
                }
              />
              <TextInput
                placeholder="Strength (e.g. 500mg)"
                style={styles.modalMetaInput}
                value={selectedMedicine.strength}
                onChangeText={(text) =>
                  setSelectedMedicine((prev) => ({ ...prev, strength: text }))
                }
              />
            </View>

            <Text style={styles.modalSectionLabel}>Dosage (Tap to change)</Text>
            <View style={styles.modalDosageRow}>
              <DosagePill
                label="Morning"
                value={dosage.morning}
                onPress={() => cycleDosage("morning")}
              />
              <DosagePill
                label="Afternoon"
                value={dosage.afternoon}
                onPress={() => cycleDosage("afternoon")}
              />
              <DosagePill
                label="Night"
                value={dosage.night}
                onPress={() => cycleDosage("night")}
              />
            </View>

            <Text style={styles.modalSectionLabel}>Duration</Text>
            <View style={styles.modalChipRow}>
              {["3 days", "5 days", "7 days", "Custom"].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.modalChip, duration === d && styles.modalChipActive]}
                  onPress={() => setDuration(d)}
                >
                  <Text
                    style={[styles.modalChipText, duration === d && styles.modalChipTextActive]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>Timing</Text>
            <View style={styles.modalTimingBox}>
              {["Before Meal", "After Meal", "With Food"].map((t) => (
                <TouchableOpacity key={t} style={styles.modalRadioRow} onPress={() => setTiming(t)}>
                  <Ionicons
                    name={timing === t ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={timing === t ? THEME.accentBlue : THEME.textGray}
                  />
                  <Text style={[styles.modalRadioLabel, timing === t && { color: THEME.charcoal }]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Notes (optional): e.g. Take with warm water"
              style={styles.modalNotesInput}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalAddBtn} onPress={handleSubmit}>
              <Text style={styles.modalAddText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DosagePill = ({ label, value, onPress }: any) => (
  <TouchableOpacity
    style={[styles.modalDosagePill, value > 0 && styles.modalDosagePillActive]}
    onPress={onPress}
  >
    <Text style={styles.modalDosageLabel}>{label}</Text>
    <View style={[styles.modalDosageCircle, value > 0 && styles.modalDosageCircleActive]}>
      <Text style={[styles.modalDosageValue, value > 0 && styles.modalDosageValueActive]}>
        {value}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  patientInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  patientName: { fontSize: 16, fontWeight: "700", color: THEME.charcoal },
  tokenBadge: {
    backgroundColor: "#E0E6ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  tokenText: { fontSize: 10, fontWeight: "800", color: THEME.textGray },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E0E6ED",
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 5,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 20 },
  activeTab: { backgroundColor: THEME.charcoal },
  tabText: { fontSize: 14, fontWeight: "600", color: THEME.textGray },
  activeTabText: { color: THEME.white },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 15,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: THEME.charcoal, flex: 1 },
  seeAll: { fontSize: 13, color: THEME.accentBlue },

  card: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  complaintInput: { fontSize: 18, fontWeight: "600", color: THEME.charcoal, minHeight: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7F9",
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 15 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: THEME.accentBlue },
  divider: { height: 1, backgroundColor: THEME.background, marginVertical: 15 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleLabel: { fontSize: 14, color: THEME.textGray },

  notesInput: { fontSize: 14, color: THEME.charcoal, minHeight: 60, textAlignVertical: "top" },

  investigationRow: { flexDirection: "row", marginTop: 5 },
  addBtn: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  testChip: {
    backgroundColor: THEME.white,
    paddingHorizontal: 20,
    height: 45,
    borderRadius: 22,
    justifyContent: "center",
    marginRight: 10,
  },
  testChipText: { fontWeight: "600", color: THEME.charcoal },
  saveHint: { marginTop: 12, fontSize: 12, color: THEME.textGray, fontWeight: "600" },

  placeholderText: { fontSize: 14, color: THEME.textGray },

  historyContainer: { flex: 1 },
  riskCard: {
    backgroundColor: THEME.softDanger,
    borderRadius: 24,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: THEME.danger,
    marginBottom: 20,
  },
  riskHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  riskTitle: { fontSize: 15, fontWeight: "800", color: THEME.danger },
  riskList: { paddingLeft: 28 },
  riskItem: { fontSize: 14, fontWeight: "600", color: THEME.danger, marginBottom: 2 },

  historySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  historySectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  seeAllText: { fontSize: 12, fontWeight: "700", color: THEME.accentBlue },

  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 5 },
  chipBase: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  chipBaseText: { fontSize: 13, fontWeight: "700" },

  whiteCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },

  timelineItem: { flexDirection: "row", gap: 12 },
  timelinePointContainer: { alignItems: "center" },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.border,
    marginTop: 5,
  },
  activeDot: { backgroundColor: THEME.accentBlue, transform: [{ scale: 1.2 }] },
  timelineContent: { flex: 1, paddingBottom: 5 },
  timelineDate: { fontSize: 12, fontWeight: "700", color: THEME.textGray, marginBottom: 2 },
  timelineDiagnosis: { fontSize: 15, fontWeight: "800", color: THEME.charcoal },
  timelineTreatment: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  timelineDivider: {
    width: 1,
    backgroundColor: THEME.border,
    height: 20,
    marginLeft: 4.5,
    marginVertical: 2,
  },

  medRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  medText: { fontSize: 14, fontWeight: "600", color: THEME.charcoal },

  smartHighlight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9C4",
    padding: 12,
    borderRadius: 16,
    marginTop: 25,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FBC02D",
  },
  smartText: { fontSize: 12, fontWeight: "700", color: "#827717", flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: THEME.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: width * 1.35,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: THEME.charcoal },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: { paddingHorizontal: 24, paddingBottom: 120 },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 54,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalSearchIcon: { marginRight: 10 },
  modalSearchInput: { flex: 1, fontSize: 16, color: THEME.charcoal },
  modalSelectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softBlue,
    padding: 15,
    borderRadius: 20,
    gap: 12,
    marginBottom: 20,
  },
  modalMedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSelectedName: { fontSize: 16, fontWeight: "700", color: THEME.charcoal },
  modalSelectedSub: { fontSize: 13, color: THEME.textGray },
  modalMetaRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  modalMetaInput: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.charcoal,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textGray,
    marginBottom: 12,
    marginTop: 10,
    textTransform: "uppercase",
  },
  modalDosageRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  modalDosagePill: {
    flex: 1,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalDosagePillActive: { borderColor: THEME.accentBlue, backgroundColor: "#EBF5FF" },
  modalDosageLabel: { fontSize: 11, fontWeight: "700", color: THEME.textGray, marginBottom: 8 },
  modalDosageCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  modalDosageCircleActive: { backgroundColor: THEME.accentBlue },
  modalDosageValue: { fontSize: 16, fontWeight: "800", color: THEME.charcoal },
  modalDosageValueActive: { color: THEME.white },
  modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalChipActive: { backgroundColor: THEME.charcoal, borderColor: THEME.charcoal },
  modalChipText: { fontSize: 14, fontWeight: "600", color: THEME.textGray },
  modalChipTextActive: { color: THEME.white },
  modalTimingBox: { backgroundColor: THEME.white, borderRadius: 20, padding: 15, marginBottom: 20 },
  modalRadioRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  modalRadioLabel: { fontSize: 15, fontWeight: "600", color: THEME.textGray },
  modalNotesInput: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 15,
    minHeight: 80,
    textAlignVertical: "top",
    color: THEME.charcoal,
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    width: width,
    flexDirection: "row",
    padding: 24,
    gap: 12,
    backgroundColor: THEME.white,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  modalCancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
  },
  modalCancelText: { fontWeight: "700", color: THEME.textGray },
  modalAddBtn: {
    flex: 2,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.accentBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  modalAddText: { color: THEME.white, fontWeight: "700", fontSize: 16 },

  actionSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 10,
  },
  actionSectionTitle: { fontSize: 16, fontWeight: "700", color: THEME.charcoal },
  addMedicineBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  addText: { color: THEME.accentBlue, fontWeight: "700", fontSize: 13 },

  medicineCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  medHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  medName: { fontSize: 17, fontWeight: "800", color: THEME.charcoal },
  medStrength: { fontSize: 13, color: THEME.textGray, marginTop: 2 },

  actionDivider: { height: 1, backgroundColor: "#F0F3F7", marginVertical: 15 },

  dosageRow: { flexDirection: "row", justifyContent: "space-between" },
  dosageItem: { flex: 1 },
  dosageLabel: {
    fontSize: 11,
    color: THEME.textGray,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dosageBadge: {
    backgroundColor: THEME.softBlue,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  dosageText: { color: THEME.accentBlue, fontWeight: "800", fontSize: 14 },
  dosageValue: { fontSize: 14, fontWeight: "600", color: THEME.charcoal },

  adviceCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 20,
    minHeight: 100,
  },
  adviceInput: { fontSize: 15, color: THEME.charcoal, textAlignVertical: "top" },

  qrStatusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 25,
    backgroundColor: THEME.softGreen,
    padding: 12,
    borderRadius: 15,
  },
  qrStatusText: { fontSize: 12, color: THEME.textGray, flex: 1, fontWeight: "500" },

  bottomActions: {
    position: "absolute",
    bottom: 0,
    width: width,
    flexDirection: "row",
    padding: 20,
    backgroundColor: "rgba(242, 245, 249, 0.9)",
    gap: 12,
  },
  draftBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  draftBtnText: { fontWeight: "700", color: THEME.textGray },
  completeBtn: {
    flex: 2,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.charcoal,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  completeBtnText: { color: THEME.white, fontWeight: "700", fontSize: 15 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontWeight: "600", color: THEME.textGray },
});
