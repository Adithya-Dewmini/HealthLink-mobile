import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import QuickReplyButton from "./QuickReplyButton";

type Props = {
  suggestions: string[];
  onPressSuggestion: (suggestion: string) => void;
};

export default function ChatSuggestionBar({ suggestions, onPressSuggestion }: Props) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {suggestions.map((suggestion) => (
          <QuickReplyButton
            key={suggestion}
            label={suggestion}
            variant="ghost"
            onPress={() => onPressSuggestion(suggestion)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  content: {
    gap: 10,
    paddingHorizontal: 2,
  },
});
