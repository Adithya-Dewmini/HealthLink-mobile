import React, { type PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AUTH_COLORS } from "./authTheme";

type Props = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardOffset?: number;
}>;

export default function AuthLayout({
  children,
  contentContainerStyle,
  keyboardOffset = 0,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={[styles.content, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 28,
    paddingBottom: 48,
  },
});
