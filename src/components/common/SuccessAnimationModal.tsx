import React, { useEffect } from "react";
import { View, Text, Modal, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";

const THEME = {
  backdrop: "rgba(15, 23, 42, 0.45)",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
};

export default function SuccessAnimationModal({ visible, onFinish }: any) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onFinish?.();
    }, 1800);
    return () => clearTimeout(timer);
  }, [visible, onFinish]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LottieView
            source={require("../../assets/animations/success.json")}
            autoPlay
            loop={false}
            style={styles.lottie}
          />
          <Text style={styles.title}>Consultation Completed</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: THEME.backdrop,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 30,
    alignItems: "center",
  },
  lottie: { width: 160, height: 160 },
  title: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textDark,
  },
});
