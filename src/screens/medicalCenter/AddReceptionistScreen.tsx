import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import FormInput from "../../components/medicalCenter/FormInput";
import { apiFetch } from "../../config/api";
import type { MedicalCenterStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<MedicalCenterStackParamList, "MedicalCenterAddReceptionist">;

const THEME = {
  primary: "#10B981",
  background: "#F4F7FB",
  white: "#FFFFFF",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  danger: "#EF4444",
  border: "#E5E7EB",
};

const loadClipboard = async () => import("expo-clipboard");

const getExpoHostUri = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  return typeof hostUri === "string" && hostUri.trim().length > 0 ? hostUri.trim() : null;
};

const isRunningInExpoGo = () => Constants.executionEnvironment === "storeClient";

const buildExpoGoInviteLink = (setupLink: string) => {
  const hostUri = getExpoHostUri();
  if (!hostUri || !setupLink) {
    return "";
  }

  try {
    const parsed = new URL(setupLink);
    const token = parsed.searchParams.get("token")?.trim() || "";
    if (!token) {
      return "";
    }

    return `exp://${hostUri}/--/set-password?token=${encodeURIComponent(token)}`;
  } catch {
    return "";
  }
};

export default function AddReceptionistScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<{
    setupLink: string;
    webLink: string;
    emailSent: boolean;
    emailError: string | null;
  } | null>(null);

  const isEmailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase()),
    [email]
  );
  const isFormValid = name.trim().length > 0 && isEmailValid;

  const handleInvite = async () => {
    if (!isFormValid || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch("/api/center/receptionists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitting(false);
        Alert.alert("Invite Failed", data.message || "Failed to create receptionist.");
        return;
      }

      setSubmitting(false);
      setInviteLinks({
        setupLink: String(data.setupLink || ""),
        webLink: String(data.webLink || ""),
        emailSent: Boolean(data.emailSent),
        emailError: typeof data.emailError === "string" ? data.emailError : null,
      });
      setInviteModalOpen(true);
    } catch (error) {
      setSubmitting(false);
      Alert.alert("Invite Failed", "Unable to connect to server.");
      console.log("Create receptionist error:", error);
    }
  };

  const handleCopyLink = async () => {
    const expoGoLink = buildExpoGoInviteLink(inviteLinks?.setupLink?.trim() || "");
    const linkToCopy =
      (isRunningInExpoGo() ? expoGoLink : inviteLinks?.setupLink?.trim()) ||
      inviteLinks?.webLink?.trim() ||
      "";
    if (!linkToCopy) {
      Alert.alert("Copy Failed", "Invite link is not available.");
      return;
    }

    try {
      const Clipboard = await loadClipboard();
      await Clipboard.setStringAsync(linkToCopy);
      Alert.alert("Copied", "Invite link copied to clipboard.");
    } catch (error) {
      console.log("Clipboard error:", error);
      Alert.alert("Copy Failed", "Clipboard is not available in the current app client.");
    }
  };

  const handleCloseInviteModal = () => {
    setInviteModalOpen(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Receptionist</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <FormInput
              label="Full Name"
              placeholder="Full name"
              icon="person-outline"
              value={name}
              onChange={setName}
            />
            <FormInput
              label="Email Address"
              placeholder="Email address"
              icon="mail-outline"
              value={email}
              onChange={setEmail}
              keyboardType="email-address"
            />
            <FormInput
              label="Phone Number (Optional)"
              placeholder="Phone number"
              icon="call-outline"
              value={phone}
              onChange={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.helperText}>
            An invitation will be sent to the receptionist to set their password.
          </Text>

          {!isEmailValid && email.trim().length > 0 ? (
            <Text style={styles.errorText}>Enter a valid email address.</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, !isFormValid && styles.buttonDisabled]}
            onPress={handleInvite}
            disabled={!isFormValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={THEME.white} />
            ) : (
              <Text style={styles.buttonText}>Create & Send Invite</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={inviteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseInviteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="mail-open-outline" size={24} color={THEME.primary} />
            </View>
            <Text style={styles.modalTitle}>Invitation sent</Text>
            <Text style={styles.modalSubtitle}>
              {inviteLinks?.emailSent
                ? "The receptionist invite has been emailed successfully. You can also copy the link if you want to share it manually."
                : `The receptionist was created, but email delivery failed${
                    inviteLinks?.emailError ? `: ${inviteLinks.emailError}` : "."
                  } Copy the app link and share it manually.`}
            </Text>
            {isRunningInExpoGo() ? (
              <Text style={styles.modalHelperText}>
                Copy Link will generate an Expo Go link for the current local session.
              </Text>
            ) : null}

            <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleCopyLink}>
              <Ionicons name="copy-outline" size={18} color={THEME.white} />
              <Text style={styles.modalPrimaryButtonText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSecondaryButton} onPress={handleCloseInviteModal}>
              <Text style={styles.modalSecondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  title: { fontSize: 22, fontWeight: "800", color: THEME.textPrimary },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  button: {
    backgroundColor: THEME.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: { color: THEME.white, fontSize: 18, fontWeight: "800" },
  helperText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  errorText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    color: THEME.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  modalSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  modalHelperText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  modalPrimaryButton: {
    marginTop: 22,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalPrimaryButtonText: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: "800",
  },
  modalSecondaryButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButtonText: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
