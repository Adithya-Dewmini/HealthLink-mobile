import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const THEME = {
  primary: "#2F80ED",
  primaryDark: "#1D4ED8",
  background: "#F4F8FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  normal: "#94A3B8",
  urgent: "#F59E0B",
  emergency: "#EF4444",
  softBlue: "#E3F2FD",
  softWarning: "#FEF7E6",
  softDanger: "#FEF2F2",
  cardRadius: 24,
};

type Priority = "Normal" | "Urgent" | "Emergency";

type WalkInHistoryItem = {
  id: string;
  name: string;
  phone: string;
  addedAt: string;
  priority: Priority;
};

const RECENT_WALK_INS: WalkInHistoryItem[] = [
  { id: "w1", name: "Nadun Perera", phone: "+94 77 123 4567", addedAt: "10:12 AM", priority: "Normal" },
  { id: "w2", name: "Saman Kumara", phone: "+94 71 555 1122", addedAt: "09:58 AM", priority: "Urgent" },
  { id: "w3", name: "Anula Devi", phone: "+94 76 444 8899", addedAt: "09:41 AM", priority: "Normal" },
  { id: "w4", name: "Kamal Silva", phone: "+94 70 221 3344", addedAt: "09:19 AM", priority: "Emergency" },
  { id: "w5", name: "Priyani Cooray", phone: "+94 75 908 7766", addedAt: "08:47 AM", priority: "Urgent" },
];

export default function WalkInRegistration() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [actionModalVisible, setActionModalVisible] = useState(false);

  const recentWalkIns = useMemo(() => RECENT_WALK_INS.slice(0, 5), []);

  const validateForm = () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      Alert.alert("Missing Info", "Please enter the patient's name and phone number.");
      return null;
    }

    return { trimmedName, trimmedPhone };
  };

  const handleAddToQueue = () => {
    const payload = validateForm();
    if (!payload) return;
    setActionModalVisible(false);
    Alert.alert("Success", `${payload.trimmedName} has been added to the queue.`);
  };

  const handleConvertToAppointment = () => {
    const payload = validateForm();
    if (!payload) return;
    setActionModalVisible(false);
    Alert.alert("Converted", `${payload.trimmedName} is ready to be converted to an appointment.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Walk-in Registration</Text>
            <Text style={styles.subtitle}>Quickly add a patient to the queue</Text>
          </View>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="person-add-outline" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <InputField
              label="Full Name"
              icon="person-outline"
              placeholder="Enter patient name"
              value={name}
              onChangeText={setName}
            />

            <InputField
              label="Phone Number"
              icon="call-outline"
              placeholder="Enter phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="numeric"
            />

            <InputField
              label="Symptoms (Optional)"
              icon="comment-text-outline"
              placeholder="Describe symptoms (e.g. Fever, Cough)"
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
            />

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.priorityRow}>
                <PriorityPill
                  label="Normal"
                  current={priority}
                  color={THEME.normal}
                  onPress={() => setPriority("Normal")}
                />
                <PriorityPill
                  label="Urgent"
                  current={priority}
                  color={THEME.urgent}
                  onPress={() => setPriority("Urgent")}
                />
                <PriorityPill
                  label="Emergency"
                  current={priority}
                  color={THEME.emergency}
                  onPress={() => setPriority("Emergency")}
                />
              </View>
            </View>
          </View>

          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Walk-ins</Text>
            {recentWalkIns.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>

        <FloatingActionButton
          bottom={insets.bottom + tabBarHeight + 16}
          onPress={() => setActionModalVisible(true)}
        />

        <ActionSheetModal
          visible={actionModalVisible}
          insetBottom={insets.bottom}
          onClose={() => setActionModalVisible(false)}
          onAddToQueue={handleAddToQueue}
          onConvertToAppointment={handleConvertToAppointment}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  const isMaterialIcon = icon === "comment-text-outline";

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputBox, multiline && styles.textAreaBox]}>
        {isMaterialIcon ? (
          <MaterialCommunityIcons
            name="comment-text-outline"
            size={20}
            color={THEME.primary}
            style={[styles.inputIcon, multiline && styles.textAreaIcon]}
          />
        ) : (
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={THEME.primary}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[styles.textInput, multiline && styles.textArea]}
          placeholder={placeholder}
          placeholderTextColor={THEME.textSecondary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
    </View>
  );
}

function PriorityPill({
  label,
  current,
  color,
  onPress,
}: {
  label: Priority;
  current: Priority;
  color: string;
  onPress: () => void;
}) {
  const isActive = current === label;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        { borderColor: color },
        isActive ? { backgroundColor: color } : styles.pillInactive,
      ]}
    >
      <Text style={[styles.pillText, { color: isActive ? THEME.white : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function HistoryCard({ item }: { item: WalkInHistoryItem }) {
  const priorityStyle = getPriorityStyle(item.priority);

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyTextWrap}>
          <Text style={styles.historyName}>{item.name}</Text>
          <Text style={styles.historyPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.historyPriorityBadge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.historyPriorityText, { color: priorityStyle.text }]}>
            {item.priority}
          </Text>
        </View>
      </View>
      <View style={styles.historyMetaRow}>
        <Ionicons name="time-outline" size={14} color={THEME.textSecondary} />
        <Text style={styles.historyMetaText}>Added at {item.addedAt}</Text>
      </View>
    </View>
  );
}

function FloatingActionButton({
  bottom,
  onPress,
}: {
  bottom: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.fab, { bottom }]}
    >
      <LinearGradient
        colors={[THEME.primary, THEME.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}
      >
        <Ionicons name="add" size={28} color={THEME.white} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ActionSheetModal({
  visible,
  insetBottom,
  onClose,
  onAddToQueue,
  onConvertToAppointment,
}: {
  visible: boolean;
  insetBottom: number;
  onClose: () => void;
  onAddToQueue: () => void;
  onConvertToAppointment: () => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: insetBottom + 20 }]}>
          <View style={styles.sheetHandle} />

          <ActionRow
            icon="add-circle-outline"
            label="Add to Queue"
            onPress={onAddToQueue}
          />
          <ActionRow
            icon="calendar-outline"
            label="Convert to Appointment"
            onPress={onConvertToAppointment}
          />
          <ActionRow
            icon="close-outline"
            label="Cancel"
            danger
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

function ActionRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <View style={[styles.actionIconWrap, danger && styles.actionIconWrapDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? THEME.emergency : THEME.primary}
        />
      </View>
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getPriorityStyle(priority: Priority) {
  switch (priority) {
    case "Urgent":
      return { bg: THEME.softWarning, text: THEME.urgent };
    case "Emergency":
      return { bg: THEME.softDanger, text: THEME.emergency };
    case "Normal":
    default:
      return { bg: THEME.softBlue, text: THEME.primary };
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: "800", color: THEME.textPrimary },
  subtitle: { fontSize: 13, color: THEME.textSecondary, marginTop: 2 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  formCard: {
    backgroundColor: THEME.white,
    borderRadius: THEME.cardRadius,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputWrapper: { marginBottom: 18 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBFDFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  textAreaBox: { alignItems: "flex-start" },
  inputIcon: { marginRight: 10 },
  textAreaIcon: { marginTop: 14 },
  textInput: { flex: 1, height: 54, fontSize: 16, color: THEME.textPrimary },
  textArea: { height: 100, paddingTop: 15 },
  priorityRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
  },
  pillInactive: { backgroundColor: THEME.white },
  pillText: { fontSize: 13, fontWeight: "800" },
  historySection: { marginTop: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  historyTextWrap: { flex: 1, minWidth: 0 },
  historyName: { fontSize: 15, fontWeight: "700", color: THEME.textPrimary },
  historyPhone: { fontSize: 13, color: THEME.textSecondary, marginTop: 3 },
  historyPriorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  historyPriorityText: { fontSize: 11, fontWeight: "800" },
  historyMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  historyMetaText: { fontSize: 12, color: THEME.textSecondary, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D5DEE8",
    alignSelf: "center",
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionIconWrapDanger: {
    backgroundColor: THEME.softDanger,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  actionLabelDanger: {
    color: THEME.emergency,
  },
});
