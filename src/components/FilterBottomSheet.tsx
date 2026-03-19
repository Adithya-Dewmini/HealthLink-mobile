import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

const THEME = {
  background: "#F2F5F9",
  white: "#FFFFFF",
  textDark: "#1A1C1E",
  textGray: "#6A6D7C",
  accentBlue: "#2196F3",
  softBlue: "#E1EEF9",
  border: "#E0E6ED",
};

type Filters = {
  location: string;
  specialty: string;
  rating: number | null;
  queue: number | null;
  availableToday: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  setFilters: (next: Filters) => void;
  onApply: (nextFilters: Filters) => void;
  locations?: string[];
  specialties?: string[];
};

const getNextOption = (options: string[], current: string) => {
  if (options.length === 0) return "";
  const index = options.indexOf(current);
  const nextIndex = index === -1 ? 0 : (index + 1) % options.length;
  return options[nextIndex];
};

export default function FilterBottomSheet({
  visible,
  onClose,
  filters,
  setFilters,
  onApply,
  locations = [],
  specialties = [],
}: Props) {
  const [activeSelector, setActiveSelector] = useState<"location" | "specialty" | null>(
    null
  );
  const [selectedRating, setSelectedRating] = useState(
    filters.rating ? `${filters.rating}+` : "4+"
  );
  const [availability, setAvailability] = useState(
    filters.availableToday ? "Today" : "This Week"
  );

  const handleReset = () => {
    const resetFilters = {
      location: "",
      specialty: "",
      rating: null,
      queue: null,
      availableToday: false,
    };
    setSelectedRating("4+");
    setAvailability("This Week");
    setFilters(resetFilters);
    onApply(resetFilters);
  };

  const handleApply = () => {
    const ratingValue =
      selectedRating === "5.0" ? 5.0 : Number(selectedRating.replace("+", ""));
    const nextFilters = {
      ...filters,
      rating: Number.isNaN(ratingValue) ? null : ratingValue,
      availableToday: availability === "Today",
    };
    setFilters(nextFilters);
    onApply(nextFilters);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => undefined}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filter Doctors</Text>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.actionGroup}>
              <SelectorRow
                icon="location-outline"
                label="Location"
                value={filters.location || "Select City"}
                color={THEME.accentBlue}
                onPress={() => setActiveSelector("location")}
              />
              <SelectorRow
                icon="medical-outline"
                label="Specialty"
                value={filters.specialty || "All Specialties"}
                color={THEME.accentBlue}
                isLast
                onPress={() => setActiveSelector("specialty")}
              />
            </View>

            {activeSelector && (
              <View style={styles.selectorContainer}>
                <Text style={styles.sectionLabel}>
                  Select {activeSelector === "location" ? "City" : "Specialty"}
                </Text>

                {(activeSelector === "location" ? locations : specialties).map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.selectorItem}
                    onPress={() => {
                      if (activeSelector === "location") {
                        setFilters({ ...filters, location: item });
                      } else {
                        setFilters({ ...filters, specialty: item });
                      }
                      setActiveSelector(null);
                    }}
                  >
                    <Text style={styles.selectorItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <FilterLabel title="Minimum Rating" />
            <View style={styles.chipRow}>
              {["3+", "4+", "4.5+", "5.0"].map((item) => (
                <SelectableChip
                  key={item}
                  label={item}
                  isSelected={selectedRating === item}
                  onPress={() => setSelectedRating(item)}
                />
              ))}
            </View>

            <FilterLabel title="Max Queue Length" />
            <View style={styles.chipRow}>
              {["< 5", "< 10", "< 20", "Any"].map((item) => {
                const value = item === "Any" ? null : Number(item.replace("<", "").trim());
                return (
                  <SelectableChip
                    key={item}
                    label={item}
                    isSelected={filters.queue === value}
                    onPress={() => setFilters({ ...filters, queue: value })}
                  />
                );
              })}
            </View>

            <FilterLabel title="Availability" />
            <View style={styles.chipRow}>
              {["Today", "Tomorrow", "This Week"].map((item) => (
                <SelectableChip
                  key={item}
                  label={item}
                  isSelected={availability === item}
                  onPress={() => setAvailability(item)}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
              <Ionicons name="arrow-forward" size={20} color={THEME.white} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const SelectorRow = ({ icon, label, value, color, isLast, onPress }: any) => (
  <TouchableOpacity style={[styles.selectorRow, !isLast && styles.rowBorder]} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.selectorText}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <Text style={styles.selectorValue}>{value}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={THEME.textGray} />
  </TouchableOpacity>
);

const FilterLabel = ({ title }: { title: string }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

const SelectableChip = ({ label, isSelected, onPress }: any) => (
  <TouchableOpacity style={[styles.chip, isSelected && styles.chipActive]} onPress={onPress}>
    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 12,
    maxHeight: height * 0.85,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: THEME.textDark },
  resetBtn: { padding: 5 },
  resetText: { color: THEME.accentBlue, fontWeight: "600", fontSize: 14 },
  scrollContent: { padding: 24 },
  actionGroup: {
    backgroundColor: THEME.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 25,
  },
  selectorContainer: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  selectorItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectorItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectorText: { flex: 1, marginLeft: 15 },
  selectorLabel: { fontSize: 12, color: THEME.textGray },
  selectorValue: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.textDark,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: THEME.textDark,
    marginBottom: 15,
    marginTop: 5,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 25 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: THEME.accentBlue,
    shadowColor: THEME.accentBlue,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: { fontSize: 14, fontWeight: "600", color: THEME.textGray },
  chipTextActive: { color: THEME.white },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: THEME.white,
  },
  applyBtn: {
    backgroundColor: THEME.textDark,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  applyBtnText: { color: THEME.white, fontSize: 16, fontWeight: "bold" },
});
