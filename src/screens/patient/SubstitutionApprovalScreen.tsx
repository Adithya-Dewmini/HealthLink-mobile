import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import { patientTheme } from "../../constants/patientTheme";
import { getOrderDetails, type OrderSummary } from "../../services/commerceService";
import { PatientEmptyState, PatientErrorState } from "../../components/patient/PatientFeedback";

const THEME = patientTheme.colors;

export default function SubstitutionApprovalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const route = useRoute<RouteProp<PatientStackParamList, "SubstitutionApproval">>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrderDetails(orderId);
        setOrder(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load substitution review");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orderId]);

  const pendingItems =
    order?.items.filter((item) => item.substitutedInventoryItemId && !item.substitutionApproved) ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={THEME.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Substitution Approval</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={THEME.modernAccentDark} />
          <Text style={styles.helperText}>Loading substitution requests</Text>
        </View>
      ) : error ? (
        <PatientErrorState message={error} onRetry={() => navigation.replace("SubstitutionApproval", { orderId })} />
      ) : pendingItems.length === 0 ? (
        <PatientEmptyState
          icon="swap-horizontal-outline"
          title="No pending substitutions"
          message="This order does not currently require substitution approval."
          actionLabel="Back to Orders"
          onAction={() => navigation.navigate("Orders")}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Order #{order?.id}</Text>
          <Text style={styles.sub}>
            Substitution approval UI is now connected to the order model. Approval actions can be added on top of this screen without changing the route structure.
          </Text>
          {pendingItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardText}>
                This item has a pending substitution suggestion from the pharmacy.
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 42, height: 42 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: THEME.navy },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  helperText: { fontSize: 15, color: THEME.textSecondary },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: THEME.navy },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 22, color: THEME.textSecondary },
  card: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: THEME.navy },
  cardText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: THEME.textSecondary },
});
