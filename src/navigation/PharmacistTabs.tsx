import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Home from "../screens/pharmacist/Home";
import ScannerScreen from "../screens/pharmacist/ScannerScreen";
import Inventory from "../screens/pharmacist/Inventory";
import ToolsHub from "../screens/pharmacist/ToolsHub";
import Reports from "../screens/pharmacist/Reports";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../utils/AuthContext";

const Tab = createBottomTabNavigator();

export default function PharmacistTabs() {
  const { logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 70 + insets.bottom;
  const tabBarBottom = 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity
            onPress={logout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#1976D2" />
            <Text style={{ color: "#1976D2", marginLeft: 6, fontWeight: "600" }}>
              Logout
            </Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: "#2BB673",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontSize: 12, marginBottom: 5 },
        tabBarItemStyle: { paddingVertical: 5 },
        tabBarStyle: {
          position: "absolute",
          bottom: tabBarBottom,
          left: 16,
          right: 16,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          backgroundColor: "#FFFFFF",
          borderRadius: 25,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          borderTopWidth: 0,
        },
        tabBarBackground: () => (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "#FFFFFF",
              borderRadius: 25,
              bottom: 0,
            }}
          />
        ),
      }}
    >
      <Tab.Screen
        name="PharmacyHome"
        component={Home}
        options={{
          tabBarLabel: "Home",
          headerShown: false,
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
          headerShown: false,
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
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabWrap}>
              <View style={[styles.centerTabCircle, focused && styles.centerTabCircleActive]}>
                <Ionicons
                  name="grid"
                  size={22}
                  color="#2BB673"
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
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="albums-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyReports"
        component={Reports}
        options={{
          tabBarLabel: "Reports",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart-outline" size={22} color={color} />
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
    marginTop: -10,
  },
  centerTabCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  centerTabCircleActive: {
    backgroundColor: "#E6F7EF",
    borderColor: "#CDEFE0",
  },
});
