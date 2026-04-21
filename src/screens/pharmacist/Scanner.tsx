import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../../config/api";

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7;

export default function QRScannerScreen() {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  // 1. Scanning Line Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: SCAN_SIZE - 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (verifying || scanned) return;
    try {
      setScanned(true);
      setScanning(false);
      setVerifying(true);
      setScanError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setScanError("Please login to scan prescriptions.");
        setVerifying(false);
        setScanned(false);
        return;
      }

      let parsed: any = null;
      let tokenValue: string | null = null;
      let prescriptionId: string | number | null = null;

      try {
        parsed = JSON.parse(data);
      } catch {
        parsed = null;
      }

      if (parsed?.token && parsed?.prescriptionId) {
        tokenValue = String(parsed.token);
        prescriptionId = parsed.prescriptionId;
      } else if (typeof data === "string") {
        const trimmed = data.trim();
        const marker = "/prescription/";
        if (trimmed.includes(marker)) {
          tokenValue = trimmed.split(marker).pop() || trimmed;
        } else {
          tokenValue = trimmed || null;
        }
      }

      if (!tokenValue) {
        setScanError("Invalid QR");
        setVerifying(false);
        setScanned(false);
        return;
      }

      if (!prescriptionId) {
        const verifyRes = await apiFetch(`/api/prescriptions/verify/${encodeURIComponent(tokenValue)}`);
        if (!verifyRes.ok) {
          const err = await verifyRes.json().catch(() => ({}));
          setScanError(err.message || "Invalid QR");
          setVerifying(false);
          setScanned(false);
          return;
        }
        const verifyData = await verifyRes.json();
        prescriptionId = verifyData?.prescriptionId;
      }

      if (!prescriptionId) {
        setScanError("Invalid QR");
        setVerifying(false);
        setScanned(false);
        return;
      }

      const res = await apiFetch(`/api/prescriptions/${prescriptionId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setScanError(err.message || "Invalid QR");
        setVerifying(false);
        setScanned(false);
        return;
      }
      const result = await res.json();

      if (!result) {
        Alert.alert("Invalid QR");
        setVerifying(false);
        setScanned(false);
        return;
      }
      if (result?.prescription?.dispensed_at || result?.prescription?.dispensedAt) {
        Alert.alert("Already dispensed");
        setVerifying(false);
        setScanned(false);
        return;
      }

      setVerifying(false);
      navigation.navigate("PharmacyPrescriptionModal", {
        token: tokenValue,
        prescription: result?.prescription ?? result,
      });
    } catch (error) {
      console.log("Scan error:", error);
      setScanError("Scan failed");
      setVerifying(false);
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          style={styles.cameraPlaceholder}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>Camera permission required</Text>
        </View>
      )}

      {/* 2. MODERN OVERLAY (Darkened Edges) */}
      <View style={styles.overlayContainer}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          
          {/* THE SCAN FRAME */}
          <View style={styles.scanFrame}>
            {/* Animated Scan Line */}
            <Animated.View 
              style={[
                styles.scanLine, 
                { transform: [{ translateY: scanAnim }] }
              ]} 
            />
            {/* Corners */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* 3. HEADER (Minimal & Transparent) */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Prescription</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      {/* 4. INSTRUCTION & CONTROLS */}
      <View style={styles.bottomContent}>
        <View style={styles.textGroup}>
          <Text style={styles.instructionTitle}>Scan QR Code</Text>
          <Text style={styles.instructionSub}>Align the QR code within the frame</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlCircle}>
            <Ionicons name="flashlight" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => {
              setScanning(true);
              setScanError(null);
              setScanned(false);
            }}
          >
            <Text style={styles.manualBtnText}>
              {verifying ? "Verifying..." : scanError ? "Retry Scan" : "Enter Code Manually"}
            </Text>
          </TouchableOpacity>
        </View>

        {verifying ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.statusText}>Verifying QR...</Text>
          </View>
        ) : scanError ? (
          <Text style={styles.errorText}>{scanError}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1C1E",
  },
  cameraText: { color: "#FFF", opacity: 0.5 },

  // --- Overlay Mask Logic ---
  overlayContainer: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  overlayMiddle: { flexDirection: "row", height: SCAN_SIZE },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  overlayBottom: { flex: 1.5, backgroundColor: "rgba(0,0,0,0.6)" },

  // --- Scan Frame UI ---
  scanFrame: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderWidth: 1,
    borderColor: "rgba(43, 182, 115, 0.3)",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  scanLine: {
    height: 2,
    width: "100%",
    backgroundColor: "#2BB673",
    shadowColor: "#2BB673",
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  corner: {
    position: "absolute",
    width: 25,
    height: 25,
    borderColor: "#2BB673",
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },

  // --- Header ---
  headerSafeArea: { position: "absolute", top: 0, width: "100%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  iconBtn: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },

  // --- Bottom UI ---
  bottomContent: { position: "absolute", bottom: 130, width: "100%", alignItems: "center" },
  textGroup: { alignItems: "center", marginBottom: 40 },
  instructionTitle: { color: "#FFF", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  instructionSub: { color: "#A0AEC0", fontSize: 14, textAlign: "center" },

  controlsRow: { flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 20 },
  controlCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  manualBtn: {
    height: 60,
    paddingHorizontal: 30,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  manualBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  statusText: { color: "#FFF", fontWeight: "700" },
  errorText: { color: "#FCA5A5", marginTop: 12, fontWeight: "700" },
});
