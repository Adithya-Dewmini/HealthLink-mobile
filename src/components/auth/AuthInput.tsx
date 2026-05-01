import React, { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AUTH_COLORS } from "./authTheme";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  editable?: boolean;
  error?: string;
};

export default function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  autoCorrect = false,
  secureTextEntry = false,
  icon,
  editable = true,
  error,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(!secureTextEntry);
  const inputRef = useRef<TextInput | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => {
          if (editable) {
            inputRef.current?.focus();
          }
        }}
        style={[
          styles.inputWrap,
          isFocused && styles.inputWrapFocused,
          error ? styles.inputWrapError : null,
        ]}
      >
        {icon ? (
          <View style={styles.leadingIcon}>
            <Ionicons name={icon} size={18} color={isFocused ? AUTH_COLORS.accent : "#94A3B8"} />
          </View>
        ) : null}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry && !isVisible}
          editable={editable}
          showSoftInputOnFocus
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setIsVisible((current) => !current)}
            hitSlop={10}
            style={styles.trailingIcon}
          >
            <Ionicons
              name={isVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={isFocused ? AUTH_COLORS.accent : "#94A3B8"}
            />
          </TouchableOpacity>
        ) : null}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: AUTH_COLORS.textPrimary,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AUTH_COLORS.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    minHeight: 54,
  },
  inputWrapFocused: {
    borderColor: AUTH_COLORS.accent,
    shadowColor: AUTH_COLORS.accent,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inputWrapError: {
    borderColor: AUTH_COLORS.danger,
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: AUTH_COLORS.textPrimary,
    fontSize: 16,
    paddingVertical: 14,
  },
  trailingIcon: {
    marginLeft: 10,
  },
  errorText: {
    marginTop: 6,
    color: AUTH_COLORS.danger,
    fontSize: 13,
  },
});
