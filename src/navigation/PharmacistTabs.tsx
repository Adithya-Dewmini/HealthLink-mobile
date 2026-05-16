import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Home from "../screens/pharmacist/Home";
import Inventory from "../screens/pharmacist/Inventory";
import OrderManagementScreen from "../screens/pharmacist/OrderManagementScreen";
import ScannerScreen from "../screens/pharmacist/ScannerScreen";
import ToolsHub from "../screens/pharmacist/ToolsHub";
import { pharmacyTheme } from "../theme/pharmacyTheme";

const Tab = createBottomTabNavigator();

export default function PharmacistTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 76 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: pharmacyTheme.colors.navy,
        tabBarInactiveTintColor: pharmacyTheme.colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 6, fontWeight: "700" },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 16,
          right: 16,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderRadius: 28,
          elevation: 8,
          shadowColor: pharmacyTheme.colors.navy,
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={["rgba(255,255,255,0.96)", "rgba(247,250,255,0.98)", "rgba(255,246,236,0.98)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBarBackground}
          />
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
                  color={focused ? pharmacyTheme.colors.navy : pharmacyTheme.colors.orange}
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
    backgroundColor: "#FFF4E3",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: pharmacyTheme.colors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F8D9AE",
  },
  centerTabCircleActive: {
    backgroundColor: pharmacyTheme.colors.yellow,
    borderColor: "#FFD68C",
  },
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: pharmacyTheme.colors.border,
    shadowColor: pharmacyTheme.colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
