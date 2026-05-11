import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Home from "../screens/receptionist/Home";
import Registration from "../screens/receptionist/Registration";
import AppointmentManagement from "../screens/receptionist/AppointmentManagement";
import QueueManagement from "../screens/receptionist/QueueManagement";
import ReceptionistSessions from "../screens/receptionist/Sessions";
import { AuthContext } from "../utils/AuthContext";
import { getSocket } from "../services/socket";
import { RECEPTION_THEME } from "../components/receptionist/PanelUI";

const Tab = createBottomTabNavigator();

const SCREEN_PERMISSION_MAP: Record<
  string,
  "queue_access" | "appointments" | "check_in" | "schedule_management"
> = {
  queue: "queue_access",
  registration: "check_in",
  appointments: "appointments",
  schedule: "schedule_management",
};

export default function ReceptionistTabs() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {
    receptionistPermissions,
    pendingPermissionUpdate,
    activeTask,
    refreshReceptionPermissions,
    setPendingPermissionUpdate,
  } = useContext(AuthContext);
  const [bannerVisible, setBannerVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lastPermissionSnapshot = useRef(JSON.stringify(receptionistPermissions));

  const hasAnyTabs = useMemo(
    () =>
      receptionistPermissions.queue_access ||
      receptionistPermissions.appointments ||
      receptionistPermissions.check_in ||
      receptionistPermissions.schedule_management,
    [receptionistPermissions]
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: bannerVisible ? 0 : -120,
        duration: bannerVisible ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: bannerVisible ? 1 : 0,
        duration: bannerVisible ? 220 : 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bannerVisible, opacity, translateY]);

  useEffect(() => {
    lastPermissionSnapshot.current = JSON.stringify(receptionistPermissions);
  }, [receptionistPermissions]);

  const syncPermissions = React.useCallback(async () => {
    const nextPermissions = await refreshReceptionPermissions();
    const nextSnapshot = JSON.stringify(nextPermissions);
    const changed = nextSnapshot !== lastPermissionSnapshot.current;

    if (changed) {
      lastPermissionSnapshot.current = nextSnapshot;
      setBannerVisible(true);
    }

    const requiredPermission =
      activeTask && SCREEN_PERMISSION_MAP[activeTask] ? SCREEN_PERMISSION_MAP[activeTask] : null;

    if (requiredPermission && !nextPermissions[requiredPermission]) {
      navigation.navigate("ReceptionistHome");
    }

    return nextPermissions;
  }, [activeTask, navigation, refreshReceptionPermissions]);

  useEffect(() => {
    const socket = getSocket();
    const handlePermissionUpdate = () => {
      setPendingPermissionUpdate(true);
      void syncPermissions().catch(() => {
        setBannerVisible(true);
      });
    };

    socket.on("reception:permissionsUpdated", handlePermissionUpdate);
    return () => {
      socket.off("reception:permissionsUpdated", handlePermissionUpdate);
    };
  }, [setPendingPermissionUpdate, syncPermissions]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const run = async () => {
        try {
          await syncPermissions();
        } catch {
          if (active) {
            setBannerVisible(true);
          }
        }
      };

      void run();
      return () => {
        active = false;
      };
    }, [syncPermissions])
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={RECEPTION_THEME.background} />

      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: RECEPTION_THEME.primary,
          tabBarInactiveTintColor: "#8B97A8",
          tabBarLabelStyle: { fontSize: 11, marginBottom: 4, fontWeight: "700" },
          tabBarItemStyle: { paddingVertical: 4 },
          tabBarStyle: {
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 8,
            height: 80 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 8,
            backgroundColor: RECEPTION_THEME.surface,
            borderRadius: 28,
            borderTopWidth: 0,
            shadowColor: RECEPTION_THEME.navy,
            shadowOpacity: 0.12,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 16,
          },
          tabBarBackground: () => (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: RECEPTION_THEME.surface,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(3, 4, 94, 0.06)",
              }}
            />
          ),
        }}
      >
        <Tab.Screen
          name="ReceptionistHome"
          component={Home}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home-outline" color={color} focused={focused} pending={pendingPermissionUpdate} />
            ),
          }}
        />
        {receptionistPermissions.queue_access && (
          <Tab.Screen
            name="ReceptionistQueue"
            component={QueueManagement}
            options={{
              tabBarLabel: "Queue",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon
                  name="people-circle-outline"
                  color={color}
                  focused={focused}
                  pending={pendingPermissionUpdate}
                />
              ),
            }}
          />
        )}
        {receptionistPermissions.appointments && (
          <Tab.Screen
            name="ReceptionistAppointments"
            component={AppointmentManagement}
            options={{
              tabBarLabel: "Visits",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="calendar-outline" color={color} focused={focused} pending={pendingPermissionUpdate} />
              ),
            }}
          />
        )}
        {receptionistPermissions.check_in && (
          <Tab.Screen
            name="ReceptionistRegistration"
            component={Registration}
            options={{
              tabBarLabel: "Check-in",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="person-add-outline" color={color} focused={focused} pending={pendingPermissionUpdate} />
              ),
            }}
          />
        )}
        {receptionistPermissions.schedule_management && (
          <Tab.Screen
            name="ReceptionistSessions"
            component={ReceptionistSessions}
            options={{
              tabBarLabel: "Sessions",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="time-outline" color={color} focused={focused} pending={pendingPermissionUpdate} />
              ),
            }}
          />
        )}
      </Tab.Navigator>

      <Animated.View
        pointerEvents={bannerVisible ? "auto" : "none"}
        style={[
          styles.bannerWrap,
          {
            paddingTop: insets.top + 4,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.bannerCard}>
          <View style={styles.bannerIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color={RECEPTION_THEME.navy} />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Your responsibilities were updated.</Text>
            <Text style={styles.bannerSubtitle}>
              Review the latest access changes in the panel.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerAction}
            onPress={() => {
              void syncPermissions().finally(() => {
                navigation.navigate("ReceptionistHome");
                setBannerVisible(false);
              });
            }}
          >
            <Text style={styles.bannerActionText}>Review</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {!hasAnyTabs ? <View pointerEvents="none" style={styles.bottomSpacer} /> : null}
    </View>
  );
}

function TabIcon({
  name,
  color,
  focused,
  pending,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  pending: boolean;
}) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Ionicons name={name} size={20} color={color} />
      {pending ? <View style={styles.pendingDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
  },
  bannerWrap: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    zIndex: 20,
  },
  bannerCard: {
    backgroundColor: RECEPTION_THEME.lightAqua,
    borderWidth: 1,
    borderColor: "#B9E6F0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: RECEPTION_THEME.navy,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  bannerTitle: {
    color: RECEPTION_THEME.navy,
    fontWeight: "800",
    fontSize: 13,
  },
  bannerSubtitle: {
    marginTop: 2,
    color: RECEPTION_THEME.navy,
    fontSize: 12,
    lineHeight: 17,
  },
  bannerAction: {
    backgroundColor: RECEPTION_THEME.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 10,
  },
  bannerActionText: {
    color: RECEPTION_THEME.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: {
    backgroundColor: RECEPTION_THEME.infoSurface,
  },
  pendingDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RECEPTION_THEME.danger,
    borderWidth: 1.5,
    borderColor: RECEPTION_THEME.surface,
  },
  bottomSpacer: {
    height: 90,
  },
});
