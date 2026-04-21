import React, { useMemo, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6B7280",
  border: "#E2E8F0",
  success: "#2BB673",
  softBlue: "#E3F2FD",
};

type Patient = {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
  isRecent: boolean;
};

const FILTERS = ["All Patients", "Recent", "+ New Patient"] as const;

const PATIENTS: Patient[] = [
  {
    id: "1",
    name: "Nadun Perera",
    phone: "+94 77 123 4567",
    lastVisit: "12 Apr 2026",
    isRecent: true,
  },
  {
    id: "2",
    name: "Anula Devi",
    phone: "+94 71 998 7766",
    lastVisit: "05 Apr 2026",
    isRecent: false,
  },
  {
    id: "3",
    name: "Saman Kumara",
    phone: "+94 76 555 4433",
    lastVisit: "28 Mar 2026",
    isRecent: false,
  },
  {
    id: "4",
    name: "Kamal Silva",
    phone: "+94 77 888 2211",
    lastVisit: "10 Mar 2026",
    isRecent: false,
  },
];

export default function PatientsScreen() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All Patients");

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const source = filter === "Recent" ? PATIENTS.filter((patient) => patient.isRecent) : PATIENTS;

    if (!normalizedSearch) {
      return source;
    }

    return source.filter(
      (patient) =>
        patient.name.toLowerCase().includes(normalizedSearch) ||
        patient.phone.toLowerCase().includes(normalizedSearch)
    );
  }, [filter, search]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Patients</Text>
          <Text style={styles.subtitle}>Manage and search patient records</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="settings-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={20} color={THEME.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or phone"
                  placeholderTextColor={THEME.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => {
                const active = filter === item;
                const disabled = item === "+ New Patient";

                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pill, active && styles.activePill]}
                    onPress={() => {
                      if (!disabled) {
                        setFilter(item);
                      }
                    }}
                  >
                    <Text style={[styles.pillText, active && styles.activePillText]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        renderItem={({ item }) => <PatientCard patient={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color={THEME.border} />
            <Text style={styles.emptyText}>No patients found</Text>
            <Text style={styles.emptySub}>Try searching by name or phone</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function PatientCard({ patient }: { patient: Patient }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{patient.name.charAt(0)}</Text>
          {patient.isRecent ? <View style={styles.onlineBadge} /> : null}
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.phoneText}>{patient.phone}</Text>
          <Text style={styles.visitText}>Last visit: {patient.lastVisit}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn}>
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  searchContainer: {
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: THEME.textPrimary,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activePill: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  activePillText: {
    color: THEME.white,
  },
  card: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F4F8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.softBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.primary,
  },
  onlineBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.success,
    borderWidth: 2,
    borderColor: THEME.white,
  },
  patientInfo: {
    marginLeft: 14,
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  phoneText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  visitText: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  cardRight: {
    gap: 8,
  },
  viewBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.white,
  },
  viewBtnText: {
    color: THEME.textSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  bookBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: THEME.primary,
  },
  bookBtnText: {
    color: THEME.white,
    fontWeight: "700",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginTop: 18,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 5,
  },
});
