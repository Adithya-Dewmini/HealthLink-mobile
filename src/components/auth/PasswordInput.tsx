import React from "react";
import AuthInput from "./AuthInput";

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

export default function PasswordInput({ label, value, onChange }: PasswordInputProps) {
  return (
    <AuthInput
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder="Enter password"
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      icon="lock-closed-outline"
    />
  );
}
