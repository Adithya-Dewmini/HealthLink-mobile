import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { API_BASE_URL } from "../../config/api";
import { patientTheme } from "../../constants/patientTheme";

const THEME = patientTheme.colors;

type Step = "upload" | "extract" | "results";

type PrescriptionResult = {
  medicines?: Array<{
    name?: string;
    dosage?: string;
    frequency?: string;
  }>;
};

const loadImagePicker = async () => import("expo-image-picker");

export default function UploadPrescriptionScreen() {
  const navigation = useNavigation<any>();
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrescriptionResult | null>(null);

  const pickImage = async () => {
    const ImagePicker = await loadImagePicker();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow photo library access to choose a prescription image."
      );
      return;
    }

    const imageResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (imageResult.canceled) return;

    const asset = imageResult.assets?.[0];
    if (!asset?.uri) return;

    setSelectedImage(asset);
    setResult(null);
    setStep("upload");
  };

  const openCamera = async () => {
    const ImagePicker = await loadImagePicker();
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow camera access to capture a prescription image."
      );
      return;
    }

    const imageResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (imageResult.canceled) return;

    const asset = imageResult.assets?.[0];
    if (!asset?.uri) return;

    setSelectedImage(asset);
    setResult(null);
    setStep("upload");
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select or capture an image first.");
      return;
    }

    setLoading(true);
    setStep("extract");

    try {
      const formData = new FormData();
      formData.append("image", {
        uri: selectedImage.uri,
        name: "prescription.jpg",
        type: "image/jpeg",
      } as any);

      const res = await fetch(`${API_BASE_URL}/api/upload/prescription`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Analysis failed");
      }

      console.log("ANALYSIS SUCCESS:", data);
      setResult(data?.data ?? null);
      setStep("results");
    } catch (err) {
      console.log("Upload error:", err);
      Alert.alert("Analysis Failed", err instanceof Error ? err.message : "Something went wrong");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setSelectedImage(null);
    setResult(null);
    setStep("upload");
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Upload Prescription</Text>
          <Text style={styles.headerSub}>Check availability instantly</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.stepContainer}>
          <StepItem
            label="Upload"
            active={step === "upload" || step === "extract" || step === "results"}
            current={step === "upload"}
          />
          <View
            style={[
              styles.stepLine,
              (step === "extract" || step === "results") && styles.activeLine,
            ]}
          />
          <StepItem
            label="Extract"
            active={step === "extract" || step === "results"}
            current={step === "extract"}
          />
          <View style={[styles.stepLine, step === "results" && styles.activeLine]} />
          <StepItem label="Results" active={step === "results"} current={step === "results"} />
        </View>

        {step === "upload" && (
          <View style={styles.uploadSection}>
            <TouchableOpacity style={styles.dashedCard} onPress={pickImage} activeOpacity={0.9}>
              <Ionicons name="cloud-upload-outline" size={48} color={THEME.primary} />
              <Text style={styles.uploadTitle}>Upload Image</Text>
              <Text style={styles.uploadSub}>JPG or PNG supported</Text>
            </TouchableOpacity>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
                <Ionicons name="images-outline" size={20} color={THEME.white} />
                <Text style={styles.btnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={openCamera}>
                <Ionicons name="camera-outline" size={20} color={THEME.primary} />
                <Text style={styles.secondaryBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Selected Prescription</Text>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />

                <TouchableOpacity style={styles.uploadServerBtn} onPress={uploadImage} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color={THEME.primary} />
                  ) : (
                    <>
                      <Ionicons name="sparkles-outline" size={18} color={THEME.primary} />
                      <Text style={styles.uploadServerBtnText}>Analyze Prescription</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {step === "extract" && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Analyzing prescription...</Text>
            <Text style={styles.loadingSub}>Reading medicines, dosage, and notes from the image</Text>
          </View>
        )}

        {step === "results" && (
          <View style={styles.resultsSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionLabel}>Detected Medicines</Text>
              <TouchableOpacity onPress={resetFlow}>
                <Text style={styles.changeText}>Upload Another</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            )}

            <View style={styles.resultsList}>
              {result?.medicines?.length ? (
                result.medicines.map((med, index) => (
                  <View key={index} style={styles.medicineCard}>
                    <Text style={styles.medName}>{med.name || "Unknown Medicine"}</Text>
                    <Text style={styles.medDetail}>Dosage: {med.dosage || "N/A"}</Text>
                    <Text style={styles.medDetail}>Frequency: {med.frequency || "N/A"}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.medicineCard}>
                  <Text style={styles.medName}>No medicines extracted</Text>
                  <Text style={styles.medDetail}>
                    The prescription could not be read clearly. Try uploading another image.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.nextStepCard}>
              <Ionicons name="information-circle-outline" size={22} color={THEME.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nextStepTitle}>Availability checking is being connected</Text>
                <Text style={styles.nextStepText}>
                  Use this extracted list for testing. Real pharmacy matching and cost estimates will appear here once the pharmacy inventory API is connected.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StepItem = ({ label, active, current }: any) => (
  <View style={styles.stepItem}>
    <View style={[styles.stepCircle, active && styles.activeCircle, current && styles.currentCircle]}>
      {active && !current ? (
        <Ionicons name="checkmark" size={14} color={THEME.white} />
      ) : (
        <View style={[styles.innerDot, current && { backgroundColor: THEME.white }]} />
      )}
    </View>
    <Text style={[styles.stepLabel, active && styles.activeLabel]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: THEME.white,
    gap: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: THEME.textPrimary },
  headerSub: { fontSize: 13, color: THEME.textSecondary },
  scrollContent: { padding: 20 },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  stepItem: { alignItems: "center", width: 60 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCircle: { backgroundColor: THEME.primary },
  currentCircle: { borderWidth: 4, borderColor: THEME.softBlue },
  innerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.white },
  stepLine: { flex: 1, height: 2, backgroundColor: THEME.border, marginHorizontal: -10, marginTop: -15 },
  activeLine: { backgroundColor: THEME.primary },
  stepLabel: { fontSize: 10, fontWeight: "700", color: THEME.textSecondary, marginTop: 5 },
  activeLabel: { color: THEME.primary },
  uploadSection: { marginTop: 10 },
  dashedCard: {
    height: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    borderStyle: "dashed",
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  uploadTitle: { fontSize: 18, fontWeight: "700", color: THEME.textPrimary, marginTop: 15 },
  uploadSub: { fontSize: 14, color: THEME.textSecondary, marginTop: 5 },
  buttonGroup: { flexDirection: "row", gap: 15, marginTop: 25 },
  primaryBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  btnText: { color: THEME.white, fontWeight: "800", fontSize: 16 },
  secondaryBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.softBlue,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  secondaryBtnText: { color: THEME.primary, fontWeight: "800", fontSize: 16 },
  previewSection: {
    marginTop: 24,
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: THEME.softBlue,
  },
  uploadServerBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  uploadServerBtnText: {
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  loadingContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginTop: 20,
  },
  loadingSub: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 5,
    textAlign: "center",
  },
  resultsSection: {
    gap: 16,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  changeText: {
    color: THEME.primary,
    fontWeight: "700",
  },
  resultsList: {
    marginTop: 4,
  },
  nextStepCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: THEME.softBlue,
    borderWidth: 1,
    borderColor: "#D7E8FF",
  },
  nextStepTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  nextStepText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textSecondary,
  },
  medicineCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
  },
  medName: {
    fontWeight: "600",
    fontSize: 16,
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  medDetail: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
  },
});
