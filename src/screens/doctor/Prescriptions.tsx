import React from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { useAuth } from "../../utils/AuthContext";
import PendingApprovalBanner from "../../components/doctor/PendingApprovalBanner";

const THEME = {
  background: "#F8FAFC",
  white: "#FFFFFF",
  textDark: "#0F172A",
  textGray: "#64748B",
  accentBlue: "#3B82F6",
  softBlue: "#EFF6FF",
  success: "#10B981",
  softSuccess: "#ECFDF5",
  border: "#E2E8F0",
};

export default function ModernPrescriptionHub() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const doctorStatus = String(user?.status || user?.verification_status || "pending").toLowerCase();
  const isVerifiedDoctor = doctorStatus === "verified" || doctorStatus === "approved";
  const showApprovalRequiredToast = () => {
    Toast.show({
      type: "info",
      text1: "Approval required",
      text2: "Your account must be verified before using this feature",
    });
  };
  const prescriptions = [
    { id: "RX-9920", patient: "Nadun Peiris", med: "Amoxicillin 500mg", status: "Issued", date: "Today" },
    { id: "RX-4412", patient: "Sarah Jenkins", med: "Metformin 850mg", status: "Pending", date: "15 Mar" },
    { id: "RX-1092", patient: "Amal Fernando", med: "Atorvastatin 20mg", status: "Issued", date: "12 Mar" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.88}>
            <Ionicons name="arrow-back" size={22} color={THEME.textDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSub}>Patient Care</Text>
            <Text style={styles.headerTitle}>Prescriptions</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.headerAddBtn, !isVerifiedDoctor ? styles.headerAddBtnDisabled : null]}
          onPress={() => {
            if (!isVerifiedDoctor) {
              showApprovalRequiredToast();
              return;
            }
            Alert.alert("Not wired yet", "Prescription creation is not connected yet.");
          }}
        >
          <Ionicons name="add" size={26} color={THEME.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!isVerifiedDoctor ? <PendingApprovalBanner /> : null}
        {!isVerifiedDoctor ? (
          <View style={styles.pendingInfoCard}>
            <Text style={styles.pendingInfoTitle}>Limited access</Text>
            <Text style={styles.pendingInfoText}>
              Your account is under review. You can explore your profile while waiting
              for approval.
            </Text>
          </View>
        ) : null}
        
        {/* Modern Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={THEME.textGray} />
          <TextInput 
            placeholder="Search RX number or patient..." 
            style={styles.searchInput}
            placeholderTextColor={THEME.textGray}
          />
        </View>

        {/* Prescription Cards */}
        {prescriptions.map((item) => (
          <View key={item.id} style={styles.rxCard}>
            <View style={styles.cardHeader}>
              <View style={styles.rxBadge}>
                <Text style={styles.rxBadgeText}>{item.id}</Text>
              </View>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: item.status === "Issued" ? THEME.softSuccess : "#FFF7ED" }
              ]}>
                <Text style={[
                  styles.statusText, 
                  { color: item.status === "Issued" ? THEME.success : "#EA580C" }
                ]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.medIconBox}>
                <Ionicons name="medical" size={24} color={THEME.accentBlue} />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.patientName}>{item.patient}</Text>
                <Text style={styles.medName}>{item.med}</Text>
              </View>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.mainAction}>
                <Ionicons name="eye-outline" size={18} color={THEME.accentBlue} />
                <Text style={styles.mainActionText}>View RX</Text>
              </TouchableOpacity>
              
              <View style={styles.iconActions}>
                <TouchableOpacity style={styles.circleIconBtn}>
                  <Ionicons name="download-outline" size={18} color={THEME.textGray} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleIconBtn}>
                  <Ionicons name="share-social-outline" size={18} color={THEME.textGray} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleIconBtn}>
                  <Ionicons name="ellipsis-vertical" size={18} color={THEME.textGray} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: THEME.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSub: { fontSize: 12, fontWeight: '700', color: THEME.textGray, textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: THEME.textDark, marginTop: 2 },
  headerAddBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: THEME.textDark, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  headerAddBtnDisabled: { opacity: 0.45 },

  container: { padding: 20 },
  pendingInfoCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
    marginBottom: 16,
  },
  pendingInfoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 6,
  },
  pendingInfoText: {
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textGray,
  },
  
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '500' },

  rxCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  rxBadge: { backgroundColor: THEME.softBlue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rxBadgeText: { fontSize: 12, fontWeight: '800', color: THEME.accentBlue },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  cardBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  medIconBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: THEME.softBlue, justifyContent: 'center', alignItems: 'center' },
  medInfo: { flex: 1, marginLeft: 16 },
  patientName: { fontSize: 17, fontWeight: '800', color: THEME.textDark },
  medName: { fontSize: 14, color: THEME.textGray, marginTop: 2, fontWeight: '500' },
  dateText: { fontSize: 12, fontWeight: '700', color: THEME.textGray },

  divider: { height: 1, backgroundColor: THEME.background, marginBottom: 15 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: THEME.softBlue, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12,
    gap: 8
  },
  mainActionText: { color: THEME.accentBlue, fontWeight: '700', fontSize: 14 },
  iconActions: { flexDirection: 'row', gap: 8 },
  circleIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.background, justifyContent: 'center', alignItems: 'center' },
});
