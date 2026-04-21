import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const THEME = {
  textPrimary: "#1F2937",
  textSecondary: "#9CA3AF",
  border: "#E5E7EB",
  inputBg: "#F9FAFB",
};

export default function PasswordInput({ label, value, onChange }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={THEME.textSecondary}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter password"
          placeholderTextColor={THEME.textSecondary}
          secureTextEntry={!show}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setShow((current) => !current)} hitSlop={8}>
          <Ionicons
            name={show ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={THEME.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 56,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: THEME.textPrimary,
  },
});
