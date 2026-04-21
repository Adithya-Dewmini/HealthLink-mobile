import React, { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import ActionButton from "../../components/receptionist/dashboard/ActionButton";
import StatCard from "../../components/receptionist/dashboard/StatCard";
import {
  DEFAULT_RECEPTION_DASHBOARD,
  normalizeReceptionDashboardData,
} from "../../utils/receptionistDashboard";

const THEME = {
  primary: "#2196F3",
  secondary: "#2BB673",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  softBlue: "#E3F2FD",
  softSuccess: "#E8F8EF",
  softWarning: "#FEF7E6",
  softDanger: "#FEF2F2",
};

const QUEUE_STATUS_LABELS = {
  LIVE: "Live",
  NOT_STARTED: "Not Started",
  ENDED: "Ended",
} as const;

export default function ReceptionDashboard() {
  const navigation = useNavigation<any>();
  const dashboardState = useMemo(
    () => normalizeReceptionDashboardData(DEFAULT_RECEPTION_DASHBOARD),
    []
  );

  if (!dashboardState.ok) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorState}>
          <Feather name="alert-circle" size={22} color="#DC2626" />
          <Text style={styles.errorTitle}>Dashboard unavailable</Text>
          <Text style={styles.errorMessage}>{dashboardState.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dashboard = dashboardState.data;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{dashboard.greeting}</Text>
            <Text style={styles.subtitle}>{dashboard.title}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Feather name="user" size={24} color={THEME.primary} />
            </View>
          </View>
        </View>

        <LinearGradient
          colors={[THEME.softBlue, "#DBEAFE"]}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroDoctor}>{dashboard.doctorName}</Text>
              <View style={styles.badge}>
                <View style={styles.pulseDot} />
                <Text style={styles.badgeText}>{QUEUE_STATUS_LABELS[dashboard.queueStatus]}</Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={dashboard.heroIcon}
              size={40}
              color="rgba(33, 150, 243, 0.2)"
            />
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroStat}>
              <Feather name="clock" size={16} color={THEME.primary} />
              <Text style={styles.heroStatText}>{dashboard.startedAtLabel}</Text>
            </View>
            <View style={styles.heroStat}>
              <Feather name="users" size={16} color={THEME.primary} />
              <Text style={styles.heroStatText}>{dashboard.totalPatientsLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          {dashboard.stats.map((stat) => (
            <StatCard
              key={stat.id}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              iconColor={stat.iconColor}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Next Up</Text>
        <View style={styles.nextPatientCard}>
          <View style={styles.patientInfo}>
            <View style={styles.queueNumberContainer}>
              <Text style={styles.queueNumber}>{dashboard.nextPatient.queueNumber}</Text>
            </View>
            <View>
              <Text style={styles.patientName}>{dashboard.nextPatient.name}</Text>
              <Text style={styles.patientSubtext}>{dashboard.nextPatient.etaLabel}</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <View style={styles.callButton}>
              <Text style={styles.callButtonText}>{dashboard.nextPatient.callToAction}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.alertCard}>
          <Feather name="alert-circle" size={20} color="#DC2626" />
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertText}>{dashboard.alert.title}</Text>
            <Text style={styles.alertSubtext}>{dashboard.alert.subtitle}</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {dashboard.actions.map((action) => (
            <ActionButton
              key={action.id}
              title={action.title}
              isPrimary={action.isPrimary}
              icon={action.icon}
              onPress={() => {
                if (action.id === "add-walk-in") {
                  navigation.navigate("ReceptionistRegistration");
                  return;
                }

                if (action.id === "view-appointments") {
                  navigation.navigate("ReceptionistAppointments");
                }
              }}
            />
          ))}
          <ActionButton title="View Patients" onPress={() => navigation.navigate("ReceptionistPatients")} />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  greeting: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  avatarContainer: {
    padding: 0,
    backgroundColor: THEME.white,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  heroDoctor: {
    color: THEME.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.softSuccess,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.secondary,
    marginRight: 6,
  },
  badgeText: {
    color: THEME.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroFooter: {
    flexDirection: "row",
    gap: 20,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroStatText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 15,
  },
  nextPatientCard: {
    backgroundColor: THEME.white,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    flex: 1,
    paddingRight: 12,
  },
  queueNumberContainer: {
    backgroundColor: THEME.softBlue,
    padding: 12,
    borderRadius: 14,
  },
  queueNumber: {
    color: THEME.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  patientSubtext: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  callButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  callButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  alertCard: {
    backgroundColor: THEME.softWarning,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  alertTextContainer: {
    flex: 1,
  },
  alertText: {
    color: THEME.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  alertSubtext: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  actionsContainer: {
    gap: 12,
  },
  errorState: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  errorMessage: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },
});
