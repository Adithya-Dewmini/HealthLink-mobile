import React, { useContext, useEffect, useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Animated,
  StatusBar,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Home from "../screens/receptionist/Home";
import Registration from "../screens/receptionist/Registration";
import AppointmentManagement from "../screens/receptionist/AppointmentManagement";
import QueueManagement from "../screens/receptionist/QueueManagement";
import AppointmentBooking from "../screens/receptionist/AppointmentBooking";
import Patients from "../screens/receptionist/Patients";
import { AuthContext } from "../utils/AuthContext";
import { getSocket } from "../services/socket";

const Tab = createBottomTabNavigator();
const SCREEN_PERMISSION_MAP: Record<string, "can_manage_queue" | "can_manage_appointments" | "can_check_in"> = {
  queue: "can_manage_queue",
  registration: "can_check_in",
  booking: "can_manage_appointments",
  appointments: "can_manage_appointments",
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
  const [toastVisible, setToastVisible] = useState(false);
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  const [accessModalMessage, setAccessModalMessage] = useState(
    "You no longer have permission for this feature."
  );
  const bannerTranslateY = useRef(new Animated.Value(-140)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bannerTranslateY, {
        toValue: toastVisible ? 0 : -140,
        duration: toastVisible ? 240 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(bannerOpacity, {
        toValue: toastVisible ? 1 : 0,
        duration: toastVisible ? 220 : 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bannerOpacity, bannerTranslateY, toastVisible]);

  useEffect(() => {
    const socket = getSocket();
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    const handlePermissionUpdate = async () => {
      Vibration.vibrate(35);
      setToastVisible(true);
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
      dismissTimer = setTimeout(() => {
        setToastVisible(false);
      }, 5500);

      setPendingPermissionUpdate(true);

      try {
        const nextPermissions = await refreshReceptionPermissions();
        const requiredPermission =
          activeTask && SCREEN_PERMISSION_MAP[activeTask]
            ? SCREEN_PERMISSION_MAP[activeTask]
            : null;

        if (requiredPermission && !nextPermissions[requiredPermission]) {
          setAccessModalMessage("You no longer have permission for this feature.");
          setAccessModalVisible(true);
          return;
        }
      } catch {
        setToastVisible(true);
      }
    };

    socket.on("reception:permissionsUpdated", () => {
      void handlePermissionUpdate();
    });
    return () => {
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
      socket.off("reception:permissionsUpdated");
    };
  }, [activeTask, refreshReceptionPermissions, setPendingPermissionUpdate]);

  useEffect(() => {
    if (!activeTask && pendingPermissionUpdate) {
      void refreshReceptionPermissions()
        .then(() => {})
        .catch(() => {
          setToastVisible(true);
        });
    }
  }, [activeTask, pendingPermissionUpdate, refreshReceptionPermissions]);

  const handleRefreshPermissions = async () => {
    try {
      await refreshReceptionPermissions();
      setToastVisible(false);
    } catch {
      setToastVisible(true);
    }
  };

  const handleReviewChanges = async () => {
    await handleRefreshPermissions();
    navigation.navigate("ReceptionistHome");
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={toastVisible ? "light-content" : "dark-content"}
        backgroundColor={toastVisible ? "#0F172A" : undefined}
      />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2BB673",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarLabelStyle: { fontSize: 10, marginBottom: 4, fontWeight: "600" },
          tabBarItemStyle: { paddingVertical: 4, paddingHorizontal: 0 },
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            left: 12,
            right: 12,
            height: 76,
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
            tabBarIcon: ({ color }) => (
              <TabIconWithPendingDot
                name="people-outline"
                color={color}
                pending={pendingPermissionUpdate}
              />
            ),
          }}
        />
        {receptionistPermissions.can_check_in && (
          <Tab.Screen
            name="ReceptionistRegistration"
            component={Registration}
            options={{
              headerShown: false,
              tabBarLabel: "Registration",
              headerTitle: "Patient Registration",
              tabBarIcon: ({ color }) => (
                <TabIconWithPendingDot
                  name="person-add-outline"
                  color={color}
                  pending={pendingPermissionUpdate}
                />
              ),
            }}
          />
        )}
        {receptionistPermissions.can_manage_appointments && (
          <Tab.Screen
            name="ReceptionistAppointments"
            component={AppointmentManagement}
            options={{
              tabBarLabel: "Appointments",
              headerTitle: "Appointment Management",
              tabBarIcon: ({ color }) => (
                <TabIconWithPendingDot name="calendar" color={color} pending={pendingPermissionUpdate} />
              ),
            }}
          />
        )}
        {receptionistPermissions.can_manage_queue && (
          <Tab.Screen
            name="ReceptionistQueue"
            component={QueueManagement}
            options={{
              tabBarLabel: "Queue",
              headerTitle: "Queue Management",
              tabBarIcon: ({ color }) => (
                <TabIconWithPendingDot
                  name="people-circle-outline"
                  color={color}
                  pending={pendingPermissionUpdate}
                />
              ),
            }}
          />
        )}
        {receptionistPermissions.can_manage_appointments && (
          <Tab.Screen
            name="ReceptionistBookAppointment"
            component={AppointmentBooking}
            options={{
              headerShown: false,
              tabBarLabel: "Book",
              headerTitle: "Book Appointment",
              tabBarIcon: ({ color }) => (
                <TabIconWithPendingDot
                  name="calendar-clear-outline"
                  color={color}
                  pending={pendingPermissionUpdate}
                />
              ),
            }}
          />
        )}
        <Tab.Screen
          name="ReceptionistPatients"
          component={Patients}
          options={{
            headerShown: false,
            tabBarLabel: "Patients",
            tabBarIcon: ({ color }) => (
              <TabIconWithPendingDot name="people" color={color} pending={pendingPermissionUpdate} />
            ),
          }}
        />
      </Tab.Navigator>
      <Animated.View
        pointerEvents={toastVisible ? "auto" : "none"}
        style={[
          styles.toastWrap,
          {
            paddingTop: insets.top,
            backgroundColor: "#0F172A",
            opacity: bannerOpacity,
            transform: [{ translateY: bannerTranslateY }],
          },
        ]}
      >
        <View style={styles.toastCard}>
          <View style={styles.toastHeader}>
            <View style={styles.toastHeaderLeft}>
              <View style={styles.toastIconWrap}>
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.toastTitle}>Responsibilities Updated</Text>
            </View>
            <TouchableOpacity style={styles.toastCloseButton} onPress={() => setToastVisible(false)}>
              <Ionicons name="close" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          <View style={styles.toastMetaRow}>
            <Text style={styles.toastSubtitle}>Permissions updated</Text>
            <TouchableOpacity
              style={styles.toastInlineAction}
              onPress={() => {
                void handleReviewChanges();
              }}
            >
              <Text style={styles.toastInlineActionText}>Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      {accessModalVisible ? (
        <AccessUpdatedModal
          message={accessModalMessage}
          onClose={() => setAccessModalVisible(false)}
        />
      ) : null}
    </View>
  );
}

function TabIconWithPendingDot({
  name,
  color,
  pending,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  pending: boolean;
}) {
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name={name} size={22} color={color} />
      {pending ? <View style={styles.pendingDot} /> : null}
    </View>
  );
}

function AccessUpdatedModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Access Updated</Text>
        <Text style={styles.modalBody}>
          {message} You can finish the current view, but further actions are restricted.
        </Text>
        <TouchableOpacity style={styles.modalButton} onPress={onClose}>
          <Text style={styles.modalButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 999,
    elevation: 20,
  },
  toastCard: {
    minHeight: 68,
    backgroundColor: "#0F172A",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 18,
  },
  toastHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toastHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toastIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  toastTitle: {
    marginLeft: 10,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  toastMetaRow: {
    marginTop: 6,
    marginLeft: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toastSubtitle: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  toastInlineAction: {
    marginLeft: 12,
    paddingHorizontal: 0,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  toastInlineActionText: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  toastCloseButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tabIconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingDot: {
    position: "absolute",
    top: 0,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.24)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#D9E2EC",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },
  modalBody: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
  modalButton: {
    alignSelf: "flex-end",
    marginTop: 18,
    backgroundColor: "#2196F3",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
