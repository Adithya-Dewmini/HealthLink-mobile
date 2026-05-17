import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { patientTheme } from "../../constants/patientTheme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
};

export default function LocationSearchInput({ value, onChangeText, onClear }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color="#64748B" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search for an address"
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
      {value ? (
        <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: patientTheme.colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: patientTheme.colors.navy,
    minHeight: 48,
  },
  clearBtn: {
    padding: 2,
  },
});
