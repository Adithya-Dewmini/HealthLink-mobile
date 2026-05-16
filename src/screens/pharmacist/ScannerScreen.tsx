import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PrescriptionModal from "../../components/pharmacist/PrescriptionModal";
import {
  getPrescription,
  type PharmacyPrescription,
} from "../../services/pharmacyApi";
import {
  parsePrescriptionQrPayload,
} from "../../utils/pharmacyPrescription";

const { width } = Dimensions.get("window");
const FRAME_SIZE = width * 0.7;

const THEME = {
  primary: "#2BB673",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#CBD5E1",
};

const getScanFailureMessage = (message: string) => {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return "Unable to read this prescription QR right now.";
  }
  if (normalized.includes("already dispensed")) {
    return "This prescription has already been dispensed.";
  }
  if (normalized.includes("expired")) {
    return "This prescription QR has expired. Ask the patient to refresh the prescription.";
  }
  if (normalized.includes("not found")) {
    return "Prescription not found for this QR code.";
  }
  if (normalized.includes("invalid qr") || normalized.includes("invalid prescription") || normalized.includes("invalid")) {
    return "Invalid QR code. Please scan a valid HealthLink prescription QR.";
  }

  return message;
};

export default function ScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scanAnim = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [prescription, setPrescription] = useState<PharmacyPrescription | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: FRAME_SIZE - 4,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanAnim]);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const cameraEnabled = useMemo(
    () => Boolean(permission?.granted) && !loading && !modalVisible && !scanned,
    [permission?.granted, loading, modalVisible, scanned]
  );
  const bottomPanelOffset = useMemo(() => insets.bottom + 96, [insets.bottom]);

  const resetScanner = useCallback(() => {
    setScanned(false);
    setPrescription(null);
    setModalVisible(false);
    setLoading(false);
    setError(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetScanner();
      return undefined;
    }, [resetScanner])
  );

  const onScan = async ({ data }: { data: string }) => {
    if (scanned || loading || modalVisible) return;

    try {
      setScanned(true);
      setLoading(true);
      setError(null);

      const parsedPayload = parsePrescriptionQrPayload(data);
      const response = await getPrescription(parsedPayload.qrToken);

      if (response?.prescription?.dispensedAt) {
        throw new Error("This prescription has already been dispensed.");
      }

      setPrescription(response);
      setModalVisible(true);
    } catch (err) {
      const message = getScanFailureMessage(
        err instanceof Error ? err.message : "Failed to fetch prescription"
      );
      setError(message);
      Alert.alert("Scan Failed", message);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={cameraEnabled ? onScan : undefined}
        />
      ) : (
        <View style={[styles.camera, styles.permissionFallback]}>
          <Text style={styles.permissionText}>Camera access is required to scan prescriptions</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={() => void requestPermission()}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrame}>
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={THEME.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescription Scanner</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={resetScanner}>
            <Ionicons name="refresh-outline" size={22} color={THEME.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={[styles.bottomPanel, { bottom: bottomPanelOffset }]}>
        <View style={styles.panelHeaderRow}>
          <Text style={styles.panelTitle}>Scan prescription QR</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{loading ? "Checking" : error ? "Paused" : "Ready"}</Text>
          </View>
        </View>
        <Text style={styles.panelSubtitle}>
          {error
            ? "Reset the scanner and try the QR again."
            : "Hold the camera steady and align the QR code inside the frame."}
        </Text>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={THEME.white} />
            <Text style={styles.loadingText}>Fetching prescription...</Text>
          </View>
        )}
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
              <Text style={styles.resetButtonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <PrescriptionModal
        visible={modalVisible}
        prescription={prescription}
        loading={loading}
        onClose={resetScanner}
        onContinue={() => {
          setModalVisible(false);
          navigation.navigate("PharmacyPrescriptionDetails", {
            prescriptionId: prescription?.prescription?.id,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  permissionFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 28,
  },
  permissionText: {
    color: THEME.white,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  permissionBtnText: {
    color: THEME.white,
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: { flex: 1, backgroundColor: "rgba(2, 6, 23, 0.62)" },
  overlayMiddle: { flexDirection: "row", height: FRAME_SIZE },
  overlaySide: { flex: 1, backgroundColor: "rgba(2, 6, 23, 0.62)" },
  overlayBottom: { flex: 1.35, backgroundColor: "rgba(2, 6, 23, 0.62)" },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: 28,
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 999,
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: THEME.primary,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 24 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 24 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 24 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 24 },
  headerSafe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: THEME.white,
    fontSize: 18,
    fontWeight: "800",
  },
  bottomPanel: {
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
  },
  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitle: {
    color: THEME.white,
    fontSize: 20,
    fontWeight: "800",
  },
  statusBadge: {
    backgroundColor: "rgba(43, 182, 115, 0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: "#C6F6D5",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  panelSubtitle: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  loadingText: {
    color: THEME.white,
    fontWeight: "600",
  },
  errorText: {
    color: "#FCA5A5",
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
  errorWrap: {
    marginTop: 2,
  },
  resetButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  resetButtonText: {
    color: THEME.white,
    fontWeight: "700",
    fontSize: 12,
  },
});
