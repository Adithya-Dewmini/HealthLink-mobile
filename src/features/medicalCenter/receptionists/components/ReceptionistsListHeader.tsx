import React from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FILTERS, THEME } from "../constants";
import { styles } from "../styles";
import { StatsCard } from "./StatsCard";
import type { FilterValue } from "../types";

export function ReceptionistsListHeader({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  stats,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
  stats: { total: number; pending: number; active: number; disabled: number };
}) {
  return (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={THEME.primary} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search receptionist..."
            placeholderTextColor={THEME.textSecondary}
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPills}
      >
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => onFilterChange(filter.key)}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.statsGrid}>
        <StatsCard
          icon="people-outline"
          label="Total"
          value={String(stats.total)}
          tint="#DBEAFE"
          color={THEME.primary}
        />
        <StatsCard
          icon="time-outline"
          label="Pending"
          value={String(stats.pending)}
          tint={THEME.softYellow}
          color={THEME.warning}
        />
        <StatsCard
          icon="checkmark-circle-outline"
          label="Active"
          value={String(stats.active)}
          tint={THEME.softGreen}
          color={THEME.success}
        />
        <StatsCard
          icon="power-outline"
          label="Disabled"
          value={String(stats.disabled)}
          tint={THEME.softRed}
          color={THEME.danger}
        />
      </View>

      <Text style={styles.sectionLabel}>Receptionist List</Text>
    </View>
  );
}
