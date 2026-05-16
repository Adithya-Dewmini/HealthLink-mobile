import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions, Animated } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { buildPrescriptionQrValue } from "../../utils/pharmacyPrescription";

const { height, width } = Dimensions.get("window");

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E3F2FD",
  border: "#E0E6ED",
};

export default function PrescriptionPopup({
  visible,
  onClose,
  prescription,
  onView,
}: any) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const qrValue = useMemo(() => buildPrescriptionQrValue(prescription), [prescription]);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, opacityAnim, scaleAnim]);

  if (!prescription) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.iconFloat}>
            <Ionicons name="receipt" size={22} color={THEME.accentBlue} />
          </View>
          <Text style={styles.title}>Prescription Ready</Text>

          <View style={styles.qrContainer}>
            <View style={styles.qrWhiteBox}>
              {qrValue ? (
                <QRCode
                  value={qrValue}
                  size={160}
                  color={THEME.textDark}
                  backgroundColor={THEME.white}
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={48} color={THEME.textGray} />
                  <Text style={styles.qrPlaceholderText}>QR not available yet</Text>
                </View>
              )}
            </View>
            <Text style={styles.qrHint}>Show this QR at the Pharmacy</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.doctorName}>
              {prescription.doctor?.name ?? prescription.doctorName ?? "Doctor"}
            </Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={14} color={THEME.textGray} />
              <Text style={styles.timeText}>
                {prescription.time ?? (prescription.createdAt
                  ? new Date(prescription.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—")}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={onView}>
              <Text style={styles.primaryBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(26, 28, 30, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    backgroundColor: THEME.white,
    borderRadius: 28,
    padding: 22,
    paddingTop: 36,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
    alignItems: "center",
  },
  iconFloat: {
    position: "absolute",
    top: -28,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: THEME.white,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textDark,
    marginBottom: 8,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  qrWhiteBox: {
    padding: 20,
    backgroundColor: THEME.white,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME.background,
    gap: 8,
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: THEME.textGray,
    fontWeight: "600",
    textAlign: "center",
  },
  qrHint: {
    fontSize: 12,
    color: THEME.textGray,
    fontWeight: "600",
    marginTop: 12,
    letterSpacing: 0.3,
  },
  infoCard: {
    backgroundColor: THEME.background,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    width: "100%",
  },
  doctorName: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.textDark,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  timeText: {
    fontSize: 13,
    color: THEME.textGray,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  primaryBtn: {
    backgroundColor: THEME.accentBlue,
    height: 56,
    borderRadius: 18,
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: THEME.white,
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: THEME.white,
    height: 56,
    borderRadius: 18,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  secondaryBtnText: {
    color: THEME.textGray,
    fontWeight: "700",
    fontSize: 16,
  },
});
