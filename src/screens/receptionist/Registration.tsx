import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useReceptionPermissionGuard } from "../../hooks/useReceptionPermissionGuard";
import ReceptionAccessNotAssigned from "../../components/ReceptionAccessNotAssigned";
import {
  fetchReceptionQueue,
  registerReceptionPatient,
} from "../../services/receptionService";
import {
  ErrorState,
  LoadingState,
  RECEPTION_THEME,
  ReceptionistButton,
  StatusBadge,
  SurfaceCard,
} from "../../components/receptionist/PanelUI";
import { getFriendlyError } from "../../utils/friendlyErrors";

const WALK_IN_REGISTRATION_BANNER = require("../../../assets/images/walk-in-registration-banner.png");

type QueueSessionOption = {
  queueId: number | null;
  sessionId: number;
  doctorName: string;
  specialty: string;
  startTime: string;
  endTime: string;
  queueStatus: "LIVE" | "PAUSED";
  waitingCount: number;
};

type Priority = "normal" | "elderly" | "emergency" | "follow_up" | "pregnant" | "child";
type Gender = "" | "male" | "female" | "other" | "prefer_not_to_say";

type RegistrationForm = {
  name: string;
  phone: string;
  nic: string;
  age: string;
  gender: Gender;
  reason: string;
  priority: Priority;
  notes: string;
};

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "normal", label: "Normal", icon: "person-outline" },
  { value: "elderly", label: "Elderly", icon: "heart-outline" },
  { value: "emergency", label: "Emergency", icon: "warning-outline" },
  { value: "follow_up", label: "Follow-up", icon: "pulse-outline" },
  { value: "pregnant", label: "Pregnant", icon: "medkit-outline" },
  { value: "child", label: "Child", icon: "happy-outline" },
];

const STEP_TABS = [
  { key: 0, label: "Patient" },
  { key: 1, label: "Visit" },
  { key: 2, label: "Queue" },
] as const;

const createInitialForm = (): RegistrationForm => ({
  name: "",
  phone: "",
  nic: "",
  age: "",
  gender: "",
  reason: "",
  priority: "normal",
  notes: "",
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeQueueSession = (input: unknown): QueueSessionOption | null => {
  const value = isRecord(input) ? input : {};
  const sessionId = Number(value.sessionId ?? value.session_id ?? 0);
  if (!Number.isFinite(sessionId) || sessionId <= 0) return null;

  const queueStatus = String(value.queueStatus || value.queue_status || "").toUpperCase();
  if (queueStatus !== "LIVE" && queueStatus !== "PAUSED") return null;

  return {
    queueId: value.queueId || value.queue_id ? Number(value.queueId ?? value.queue_id) : null,
    sessionId,
    doctorName: String(value.doctorName || value.doctor_name || "Doctor"),
    specialty: String(value.specialty || "General Physician"),
    startTime: String(value.startTime || value.start_time || "").slice(0, 5),
    endTime: String(value.endTime || value.end_time || "").slice(0, 5),
    queueStatus,
    waitingCount: Number(value.waitingCount ?? value.waiting_count ?? 0),
  };
};

const priorityTone = (priority: Priority): {
  bg: string;
  border: string;
  text: string;
} => {
  if (priority === "emergency") {
    return { bg: "#FEF2F2", border: "#FECACA", text: RECEPTION_THEME.danger };
  }
  if (priority === "elderly" || priority === "pregnant" || priority === "child") {
    return { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" };
  }
  if (priority === "follow_up") {
    return { bg: "#EFF8FF", border: "#BAE6FD", text: RECEPTION_THEME.primary };
  }
  return { bg: "#F8FAFC", border: RECEPTION_THEME.border, text: RECEPTION_THEME.textSecondary };
};

export default function WalkInRegistration() {
  const hasAccess = useReceptionPermissionGuard("registration", "check_in");
  const [form, setForm] = useState<RegistrationForm>(() => createInitialForm());
  const [addToQueue, setAddToQueue] = useState(true);
  const [queueSessions, setQueueSessions] = useState<QueueSessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setSessionError(null);

    try {
      const queueDashboard = await fetchReceptionQueue();
      const dashboard = isRecord(queueDashboard) ? queueDashboard : {};
      const liveQueues = Array.isArray(dashboard.liveQueues) ? dashboard.liveQueues : [];
      const upcomingQueues = Array.isArray(dashboard.upcomingQueues) ? dashboard.upcomingQueues : [];
      const pausedQueues = [...liveQueues, ...upcomingQueues].filter((item) => {
        const value = isRecord(item) ? item : {};
        return String(value.queueStatus || value.queue_status || "").toUpperCase() === "PAUSED";
      });

      // TODO: Replace upcomingQueues fallback when backend exposes pausedQueues directly.
      const nextQueueSessions = [...liveQueues, ...pausedQueues]
        .map(normalizeQueueSession)
        .filter((item): item is QueueSessionOption => Boolean(item));

      setQueueSessions(nextQueueSessions);
      setSelectedSessionId((current) => {
        if (current && nextQueueSessions.some((item) => item.sessionId === current)) return current;
        return nextQueueSessions[0]?.sessionId ?? null;
      });

      if (nextQueueSessions.length === 0) setAddToQueue(false);
    } catch (error) {
      setQueueSessions([]);
      setSelectedSessionId(null);
      setAddToQueue(false);
      setSessionError(getFriendlyError(error, "Could not load current queue sessions."));
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSession();
    }, [loadSession])
  );

  const selectedSession = useMemo(
    () => queueSessions.find((item) => item.sessionId === selectedSessionId) ?? null,
    [queueSessions, selectedSessionId]
  );

  const canRouteToQueue = Boolean(selectedSession);
  const selectedPriorityTone = useMemo(() => priorityTone(form.priority), [form.priority]);
  const goToStep = useCallback((step: number) => {
    setActiveStep(step);
  }, []);

  const updateField = useCallback(<K extends keyof RegistrationForm>(field: K, value: RegistrationForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(createInitialForm());
  }, []);

  const validateForm = useCallback(() => {
    if (!form.name.trim()) return "Patient name is required.";
    if (!form.phone.trim() && !form.nic.trim()) return "Phone number or NIC is required.";
    if (!form.reason.trim()) return "Reason for visit is required.";
    if (addToQueue && !selectedSessionId) return "Select a live or paused queue session.";
    return "";
  }, [addToQueue, form.name, form.nic, form.phone, form.reason, selectedSessionId]);

  const handleSubmit = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      setNotice(validationError);
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const result = await registerReceptionPatient({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        sessionId: addToQueue ? selectedSessionId : null,
        addToQueue: addToQueue && Boolean(selectedSessionId),
      });

      const resultRecord = isRecord(result) ? result : null;
      if (resultRecord && "queue" in resultRecord) {
        setNotice(
          selectedSession
            ? `Patient saved and added to ${selectedSession.doctorName}'s ${selectedSession.queueStatus.toLowerCase()} queue.`
            : "Patient saved and added to the live queue."
        );
      } else {
        setNotice("Patient profile created and saved successfully.");
      }

      resetForm();
    } catch (error) {
      setNotice(getFriendlyError(error, "Unable to register patient."));
    } finally {
      setSubmitting(false);
    }
  }, [addToQueue, form.name, form.phone, resetForm, selectedSession, selectedSessionId, validateForm]);

  if (!hasAccess) {
    return (
      <ReceptionAccessNotAssigned message="Patient check-in has not been assigned to your account." />
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={RECEPTION_THEME.navy} />
      </SafeAreaView>

      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.topBrandRow}>
            <Ionicons name="medical" size={18} color={RECEPTION_THEME.aqua} />
            <Text style={styles.topHeaderBrandText}>HealthLink</Text>
          </View>
          <Text style={styles.topHeaderTitle}>Walk-ins</Text>
        </View>

        <TouchableOpacity style={styles.topIconButton} onPress={() => void loadSession()} activeOpacity={0.88}>
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.topIntroBlock}>
          <View style={styles.bannerCard}>
            <Image
              source={WALK_IN_REGISTRATION_BANNER}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View>

          {loadingSession ? (
            <LoadingState label="Loading queue sessions..." />
          ) : sessionError ? (
            <ErrorState title="Session unavailable" message={sessionError} onRetry={() => void loadSession()} />
          ) : null}

          {notice ? (
            <SurfaceCard style={styles.noticeCard}>
              <Text style={styles.noticeText}>{notice}</Text>
            </SurfaceCard>
          ) : null}
        </View>

        <View style={styles.stepTabsStickyWrap}>
          <View style={styles.stepTabsShell}>
            <View style={styles.stepTabsContent}>
              <View style={styles.stepRailTrack} />
              {STEP_TABS.map((item, index) => {
                const selected = activeStep === item.key;
                const completed = activeStep > item.key;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.stepTab}
                    onPress={() => goToStep(item.key)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.stepNode,
                        selected && styles.stepNodeActive,
                        completed && styles.stepNodeCompleted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepTabIndex,
                          selected && styles.stepTabIndexActive,
                          completed && styles.stepTabIndexCompleted,
                        ]}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepTabText,
                        selected && styles.stepTabTextActive,
                        completed && styles.stepTabTextCompleted,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.formContent}>
          {activeStep === 0 ? (
            <SectionCard step="01" title="Patient Details" subtitle="Basic patient identity for front desk intake.">
                <Field label="Patient Name" required>
                  <InputRow icon="person-outline">
                    <TextInput
                      style={styles.input}
                      placeholder="Enter patient name"
                      placeholderTextColor={RECEPTION_THEME.textSecondary}
                      value={form.name}
                      onChangeText={(value) => updateField("name", value)}
                    />
                  </InputRow>
                </Field>

                <View style={styles.fieldGrid}>
                  <Field label="Phone Number" half>
                    <InputRow icon="call-outline">
                      <TextInput
                        style={styles.input}
                        placeholder="Enter phone number"
                        placeholderTextColor={RECEPTION_THEME.textSecondary}
                        keyboardType="phone-pad"
                        value={form.phone}
                        onChangeText={(value) => updateField("phone", value)}
                      />
                    </InputRow>
                  </Field>

                  <Field label="NIC / ID" half>
                    <InputRow icon="card-outline">
                      <TextInput
                        style={styles.input}
                        placeholder="Enter NIC or ID"
                        placeholderTextColor={RECEPTION_THEME.textSecondary}
                        value={form.nic}
                        onChangeText={(value) => updateField("nic", value)}
                      />
                    </InputRow>
                  </Field>

                  <Field label="Age" half>
                    <InputRow icon="hourglass-outline">
                      <TextInput
                        style={styles.input}
                        placeholder="Enter age"
                        placeholderTextColor={RECEPTION_THEME.textSecondary}
                        keyboardType="number-pad"
                        value={form.age}
                        onChangeText={(value) => updateField("age", value.replace(/[^0-9]/g, ""))}
                      />
                    </InputRow>
                  </Field>

                  <Field label="Gender">
                    <View style={styles.segmentRow}>
                      {[
                        { value: "male" as Gender, label: "Male" },
                        { value: "female" as Gender, label: "Female" },
                        { value: "other" as Gender, label: "Other" },
                      ].map((option) => {
                        const selected = form.gender === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            activeOpacity={0.88}
                            style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                            onPress={() => updateField("gender", option.value)}
                          >
                            <Text style={[styles.segmentButtonText, selected && styles.segmentButtonTextActive]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Field>
                </View>

                <SlideActions
                  showBack={false}
                  nextLabel="Continue"
                  onNext={() => goToStep(1)}
                />
            </SectionCard>
          ) : null}

          {activeStep === 1 ? (
            <SectionCard step="02" title="Visit Details" subtitle="Capture the walk-in reason and front desk priority.">
                <Field label="Reason for Visit" required>
                  <View style={styles.textAreaWrap}>
                    <TextInput
                      style={styles.textArea}
                      multiline
                      textAlignVertical="top"
                      placeholder="Short reason for this walk-in visit"
                      placeholderTextColor={RECEPTION_THEME.textSecondary}
                      value={form.reason}
                      onChangeText={(value) => updateField("reason", value)}
                    />
                  </View>
                </Field>

                <View style={styles.priorityHeader}>
                  <Text style={styles.inputLabel}>Priority Level</Text>
                  <View
                    style={[
                      styles.priorityPreview,
                      {
                        backgroundColor: selectedPriorityTone.bg,
                        borderColor: selectedPriorityTone.border,
                      },
                    ]}
                  >
                    <Text style={[styles.priorityPreviewText, { color: selectedPriorityTone.text }]}>
                      {PRIORITY_OPTIONS.find((option) => option.value === form.priority)?.label || "Normal"}
                    </Text>
                  </View>
                </View>

                <View style={styles.priorityGrid}>
                  {PRIORITY_OPTIONS.map((option) => {
                    const selected = form.priority === option.value;
                    const tone = priorityTone(option.value);
                    return (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.88}
                        style={[
                          styles.priorityCard,
                          { backgroundColor: selected ? tone.bg : "#FBFEFF", borderColor: selected ? tone.border : RECEPTION_THEME.border },
                        ]}
                        onPress={() => updateField("priority", option.value)}
                      >
                        <View style={[styles.priorityIconWrap, { backgroundColor: selected ? "#FFFFFF" : RECEPTION_THEME.lightAqua }]}>
                          <Ionicons name={option.icon} size={16} color={selected ? tone.text : RECEPTION_THEME.primary} />
                        </View>
                        <Text style={[styles.priorityLabel, selected && { color: tone.text }]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Field label="Notes">
                  <View style={styles.textAreaWrap}>
                    <TextInput
                      style={[styles.textArea, styles.notesArea]}
                      multiline
                      textAlignVertical="top"
                      placeholder="Optional receptionist notes"
                      placeholderTextColor={RECEPTION_THEME.textSecondary}
                      value={form.notes}
                      onChangeText={(value) => updateField("notes", value)}
                    />
                  </View>
                </Field>

                <SlideActions
                  onBack={() => goToStep(0)}
                  onNext={() => goToStep(2)}
                  nextLabel="Continue"
                />
            </SectionCard>
          ) : null}

          {activeStep === 2 ? (
            <SectionCard step="03" title="Queue Routing" subtitle="Choose whether the patient should be saved only or added to an active queue.">
                <View style={styles.toggleRow}>
                  <View style={styles.toggleCopy}>
                    <Text style={styles.toggleTitle}>Add directly to queue</Text>
                    <Text style={styles.toggleSubtitle}>
                      {canRouteToQueue
                        ? "Enable this to insert the saved patient into a live or paused doctor queue."
                        : "No live or paused queue is available right now. The patient will be saved only."}
                    </Text>
                  </View>
                  <Switch
                    value={addToQueue && canRouteToQueue}
                    disabled={!canRouteToQueue}
                    onValueChange={setAddToQueue}
                    trackColor={{ false: "#D7DEE8", true: "#BFEAF5" }}
                    thumbColor={addToQueue && canRouteToQueue ? RECEPTION_THEME.primary : "#FFFFFF"}
                  />
                </View>

                <View style={styles.queueSectionHeader}>
                  <Text style={styles.queueSectionTitle}>Queue Sessions</Text>
                  {selectedSession ? (
                    <StatusBadge
                      label={selectedSession.queueStatus === "PAUSED" ? "Paused" : "Live"}
                      tone={selectedSession.queueStatus === "PAUSED" ? "neutral" : "warning"}
                    />
                  ) : null}
                </View>

                {queueSessions.length === 0 ? (
                  <View style={styles.sessionEmptyState}>
                    <Text style={styles.sessionEmptyTitle}>No queue session available</Text>
                    <Text style={styles.sessionEmptyMessage}>
                      Start a queue first if you want to register and send the patient directly to a doctor queue.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sessionScrollContent}
                  >
                    {queueSessions.map((session) => {
                      const isSelected = session.sessionId === selectedSessionId;
                      return (
                        <TouchableOpacity
                          key={session.sessionId}
                          activeOpacity={0.9}
                          style={[styles.sessionCard, isSelected && styles.sessionCardActive]}
                          onPress={() => setSelectedSessionId(session.sessionId)}
                        >
                          <View style={styles.sessionCardTop}>
                            <Text style={[styles.sessionDoctorName, isSelected && styles.sessionDoctorNameActive]}>
                              {session.doctorName}
                            </Text>
                            <StatusBadge
                              label={session.queueStatus === "PAUSED" ? "Paused" : "Live"}
                              tone={session.queueStatus === "PAUSED" ? "neutral" : "warning"}
                            />
                          </View>
                          <Text style={[styles.sessionSpecialty, isSelected && styles.sessionSpecialtyActive]}>
                            {session.specialty}
                          </Text>
                          <Text style={[styles.sessionTime, isSelected && styles.sessionTimeActive]}>
                            {session.startTime} - {session.endTime}
                          </Text>
                          <Text style={[styles.sessionMeta, isSelected && styles.sessionMetaActive]}>
                            {session.waitingCount} waiting patients
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <SlideActions
                  onBack={() => goToStep(1)}
                  onSubmit={() => void handleSubmit()}
                  submitting={submitting}
                  submitLabel={addToQueue && selectedSession ? "Save and Add to Queue" : "Register Patient"}
                />
            </SectionCard>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionStep}>
          <Text style={styles.sectionStepText}>{step}</Text>
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </SurfaceCard>
  );
}

function Field({
  label,
  required = false,
  half = false,
  children,
}: {
  label: string;
  required?: boolean;
  half?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.fieldBlock, half ? styles.fieldHalf : null]}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function SlideActions({
  showBack = true,
  onBack,
  onNext,
  onSubmit,
  nextLabel = "Next",
  submitLabel = "Submit",
  submitting = false,
}: {
  showBack?: boolean;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  nextLabel?: string;
  submitLabel?: string;
  submitting?: boolean;
}) {
  return (
    <View style={styles.slideActions}>
      {showBack ? (
        <TouchableOpacity activeOpacity={0.88} style={styles.secondaryAction} onPress={onBack}>
          <Text style={styles.secondaryActionText}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionSpacer} />
      )}
      {onSubmit ? (
        <View style={styles.primaryActionWrap}>
          <ReceptionistButton
            label={submitLabel}
            icon="checkmark-circle-outline"
            onPress={onSubmit}
            loading={submitting}
            disabled={submitting}
          />
        </View>
      ) : (
        <TouchableOpacity activeOpacity={0.88} style={styles.primaryAction} onPress={onNext}>
          <Text style={styles.primaryActionText}>{nextLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function InputRow({
  icon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color={RECEPTION_THEME.primary} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  topSafeArea: {
    backgroundColor: RECEPTION_THEME.navy,
  },
  topHeader: {
    backgroundColor: RECEPTION_THEME.navy,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  topHeaderLeft: {
    flexDirection: "column",
    justifyContent: "center",
  },
  topBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  topHeaderBrandText: {
    fontSize: 12,
    fontWeight: "700",
    color: RECEPTION_THEME.aqua,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 14,
  },
  topIntroBlock: {
    gap: 12,
  },
  bannerCard: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  bannerImage: {
    width: "100%",
    height: 210,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: RECEPTION_THEME.surface,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    paddingHorizontal: 18,
    paddingVertical: 17,
    shadowColor: RECEPTION_THEME.navy,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroEyebrow: {
    color: RECEPTION_THEME.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  heroSubtitle: {
    marginTop: 12,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  noticeCard: {
    backgroundColor: RECEPTION_THEME.infoSurface,
    borderRadius: 18,
  },
  noticeText: {
    color: RECEPTION_THEME.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  stepTabsStickyWrap: {
    backgroundColor: RECEPTION_THEME.background,
    paddingBottom: 8,
  },
  stepTabsShell: {
    backgroundColor: RECEPTION_THEME.navy,
    borderRadius: 32,
    paddingTop: 12,
    paddingBottom: 10,
    overflow: "hidden",
    marginTop: 2,
  },
  stepTabsContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 2,
    position: "relative",
  },
  stepRailTrack: {
    position: "absolute",
    left: 42,
    right: 42,
    top: 24,
    height: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  stepTab: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingTop: 0,
    alignItems: "center",
    marginHorizontal: 0,
  },
  stepNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    backgroundColor: RECEPTION_THEME.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stepNodeActive: {
    borderColor: RECEPTION_THEME.aqua,
    backgroundColor: "rgba(0, 180, 216, 0.16)",
  },
  stepNodeCompleted: {
    borderColor: "rgba(52, 211, 153, 0.9)",
    backgroundColor: "rgba(16, 185, 129, 0.16)",
  },
  stepTabIndex: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 0.5,
  },
  stepTabIndexActive: {
    color: RECEPTION_THEME.aqua,
  },
  stepTabIndexCompleted: {
    color: "#34D399",
  },
  stepTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.64)",
  },
  stepTabTextActive: {
    color: "#FFFFFF",
  },
  stepTabTextCompleted: {
    color: "#C7F9E9",
  },
  formContent: {
    gap: 12,
  },
  sectionCard: {
    borderRadius: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionStep: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: RECEPTION_THEME.lightAqua,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionStepText: {
    color: RECEPTION_THEME.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    marginTop: 3,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  fieldRow: {
    marginBottom: 2,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  fieldBlock: {
    marginBottom: 10,
  },
  fieldHalf: {
    width: "50%",
    paddingHorizontal: 6,
  },
  inputLabel: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  requiredMark: {
    color: RECEPTION_THEME.danger,
  },
  inputWrap: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    paddingHorizontal: 13,
    alignItems: "center",
    flexDirection: "row",
  },
  input: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    color: RECEPTION_THEME.textPrimary,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segmentButton: {
    minHeight: 44,
    minWidth: 86,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentButtonActive: {
    borderColor: RECEPTION_THEME.primary,
    backgroundColor: RECEPTION_THEME.lightAqua,
  },
  segmentButtonText: {
    color: RECEPTION_THEME.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentButtonTextActive: {
    color: RECEPTION_THEME.navy,
  },
  textAreaWrap: {
    minHeight: 104,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  textArea: {
    minHeight: 76,
    fontSize: 14,
    color: RECEPTION_THEME.textPrimary,
  },
  notesArea: {
    minHeight: 58,
  },
  priorityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  priorityPreview: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  priorityPreviewText: {
    fontSize: 11,
    fontWeight: "800",
  },
  priorityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    justifyContent: "space-between",
  },
  priorityCard: {
    width: "48%",
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },
  priorityIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  priorityLabel: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  toggleSubtitle: {
    marginTop: 4,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  queueSectionHeader: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  queueSectionTitle: {
    color: RECEPTION_THEME.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  sessionEmptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    padding: 15,
  },
  sessionEmptyTitle: {
    color: RECEPTION_THEME.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  sessionEmptyMessage: {
    marginTop: 6,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sessionScrollContent: {
    paddingRight: 6,
    gap: 10,
  },
  sessionCard: {
    width: 208,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FBFEFF",
    padding: 13,
  },
  sessionCardActive: {
    borderColor: RECEPTION_THEME.primary,
    backgroundColor: "#EEF9FF",
  },
  sessionCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sessionDoctorName: {
    flex: 1,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  sessionDoctorNameActive: {
    color: RECEPTION_THEME.navy,
  },
  sessionSpecialty: {
    marginTop: 5,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  sessionSpecialtyActive: {
    color: RECEPTION_THEME.navy,
  },
  sessionTime: {
    marginTop: 8,
    color: RECEPTION_THEME.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  sessionTimeActive: {
    color: RECEPTION_THEME.navy,
  },
  sessionMeta: {
    marginTop: 6,
    color: RECEPTION_THEME.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  sessionMetaActive: {
    color: RECEPTION_THEME.primary,
  },
  submitWrap: {
    marginTop: 18,
  },
  slideActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  actionSpacer: {
    flex: 1,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: RECEPTION_THEME.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: RECEPTION_THEME.textPrimary,
  },
  primaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: RECEPTION_THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  primaryActionWrap: {
    flex: 1.5,
  },
});
