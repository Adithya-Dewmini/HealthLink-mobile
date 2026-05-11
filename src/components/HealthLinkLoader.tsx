import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { patientTheme } from "../constants/patientTheme";

const THEME = patientTheme.colors;

export default function HealthLinkLoader() {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0.72)).current;
  const barTranslateAnim = useRef(new Animated.Value(-54)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.04,
            duration: 950,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.96,
            duration: 950,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 950,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.72,
            duration: 950,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const loadingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(barTranslateAnim, {
          toValue: 54,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(barTranslateAnim, {
          toValue: -54,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    loadingLoop.start();

    return () => {
      pulseLoop.stop();
      loadingLoop.stop();
    };
  }, [barTranslateAnim, opacityAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={["#F8FCFD", "#EAFBFF", "#F8FCFD"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.logoWrap,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Image
          source={require("../../assets/HealthLink-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Text style={styles.title}>HealthLink</Text>
      <Text style={styles.subtitle}>Smart Healthcare & Pharmacy</Text>

      <View style={styles.loadingBar}>
        <Animated.View
          style={[
            styles.loadingFill,
            {
              opacity: opacityAnim,
              transform: [{ translateX: barTranslateAnim }],
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: 166,
    height: 166,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: THEME.borderStrong,
    shadowColor: "#03045E",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  logo: {
    width: 130,
    height: 130,
  },
  title: {
    marginTop: 22,
    fontSize: 28,
    fontWeight: "800",
    color: THEME.accentBlue,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: "500",
  },
  loadingBar: {
    marginTop: 28,
    width: 132,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#DCEEFF",
    overflow: "hidden",
  },
  loadingFill: {
    width: 76,
    height: "100%",
    borderRadius: 999,
    backgroundColor: THEME.accentGreen,
  },
});
