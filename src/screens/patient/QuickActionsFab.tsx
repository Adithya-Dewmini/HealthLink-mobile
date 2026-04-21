import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Pressable,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

const THEME = {
  white: "#FFFFFF",
  textDark: "#0F172A",
  textGray: "#64748B",
  primaryBlue: "#2196F3",
  secondaryBlue: "#3B82F6",
  pharmacy: "#8B5CF6",
  symptoms: "#F59E0B",
  overlay: "rgba(0, 0, 0, 0.4)",
};

export default function QuickActionsFab() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      setVisible(true);
      return () => {
        setVisible(false);
      };
    }, [])
  );

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.triggerPill} onPress={() => setVisible(true)}>
        <Ionicons name="apps" size={20} color={THEME.white} />
        <Text style={styles.triggerText}>Quick Actions</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

          <View style={styles.panelWrapper}>
            <BlurView intensity={95} tint="light" style={styles.glassPanel}>
              <View style={styles.dragHandle} />

              <Text style={styles.panelTitle}>Quick Actions</Text>

              <ToolPill
                icon="file-upload-outline"
                title="Upload Prescription"
                desc="Add a new prescription"
                color={THEME.primaryBlue}
                onPress={() => {
                  setVisible(false);
                  navigation.navigate("UploadPrescription");
                }}
              />
              <ToolPill
                icon="shield-check"
                title="Symptom Checker"
                desc="Check your symptoms"
                color={THEME.symptoms}
                onPress={() => {
                  setVisible(false);
                  navigation.navigate("SymptomChecker");
                }}
              />
              <ToolPill
                icon="pill"
                title="Pharmacy / Medicine"
                desc="Manage your medicines"
                color={THEME.pharmacy}
                onPress={() => {
                  setVisible(false);
                  navigation.navigate("MedicineSearch");
                }}
              />

              <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const ToolPill = ({ icon, title, desc, color, onPress }: any) => (
  <TouchableOpacity style={styles.pillCard} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <View style={styles.pillTextContent}>
      <Text style={styles.pillTitle}>{title}</Text>
      <Text style={styles.pillDesc}>{desc}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingBottom: 90,
  },
  triggerPill: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    gap: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  triggerText: { color: THEME.white, fontWeight: "700", fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 40 },
  panelWrapper: {
    width: width * 0.92,
    borderRadius: 32,
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 25,
  },
  glassPanel: {
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 15,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 20,
  },
  pillCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  pillTextContent: { flex: 1 },
  pillTitle: { fontSize: 17, fontWeight: "800", color: THEME.textDark },
  pillDesc: { fontSize: 13, color: THEME.textGray, marginTop: 2 },
  closeBtn: { marginTop: 10, padding: 15, alignItems: "center" },
  closeText: { color: THEME.textGray, fontWeight: "700", fontSize: 15 },
});
