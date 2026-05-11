import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "../screens/pharmacist/Home";
import ScannerScreen from "../screens/pharmacist/ScannerScreen";
import Inventory from "../screens/pharmacist/Inventory";
import ToolsHub from "../screens/pharmacist/ToolsHub";
import OrderManagementScreen from "../screens/pharmacist/OrderManagementScreen";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { PHARMACY_PANEL_THEME } from "../components/pharmacist/PharmacyPanelUI";

const Tab = createBottomTabNavigator();

export default function PharmacistTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 70 + insets.bottom;
  const tabBarBottom = 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#DFF7FF",
        tabBarInactiveTintColor: "#6E859D",
        tabBarLabelStyle: { fontSize: 11, marginBottom: 6, fontWeight: "700" },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarStyle: {
          position: "absolute",
          bottom: tabBarBottom,
          left: 16,
          right: 16,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          backgroundColor: "transparent",
          borderRadius: 28,
          elevation: 14,
          shadowColor: "#020617",
          shadowOpacity: 0.38,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={["#091A2F", "#0D233C", "#12304E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBackground}
          >
            <View style={styles.tabGlowOne} />
            <View style={styles.tabGlowTwo} />
          </LinearGradient>
        ),
      }}
    >
      <Tab.Screen
        name="PharmacyHome"
        component={Home}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyScanner"
        component={ScannerScreen}
        options={{
          tabBarLabel: "Scanner",
          tabBarIcon: ({ color }) => (
            <Ionicons name="qr-code-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyTools"
        component={ToolsHub}
        options={{
          tabBarLabel: "",
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabWrap}>
              <View style={[styles.centerTabCircle, focused && styles.centerTabCircleActive]}>
                <Ionicons
                  name="grid"
                  size={22}
                  color={focused ? PHARMACY_PANEL_THEME.background : PHARMACY_PANEL_THEME.cyan}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyInventory"
        component={Inventory}
        options={{
          tabBarLabel: "Inventory",
          tabBarIcon: ({ color }) => (
            <Ionicons name="albums-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyReports"
        component={OrderManagementScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color }) => (
            <Ionicons name="receipt-outline" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerTabWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -12,
  },
  centerTabCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#020617",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(103, 232, 249, 0.18)",
  },
  centerTabCircleActive: {
    backgroundColor: "#67E8F9",
    borderColor: "#A5F3FC",
  },
  tabBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.12)",
    overflow: "hidden",
  },
  tabGlowOne: {
    position: "absolute",
    top: -16,
    right: 24,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.16)",
  },
  tabGlowTwo: {
    position: "absolute",
    bottom: -28,
    left: 12,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(52, 211, 153, 0.1)",
  },
});
