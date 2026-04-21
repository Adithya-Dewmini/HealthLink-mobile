import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  type GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type SymptomPillProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  selected: boolean;
};

export default function SymptomPill({
  label,
  onPress,
  selected,
}: SymptomPillProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        style={[styles.pill, selected && styles.pillSelected]}
      >
        <Ionicons
          name="add"
          size={16}
          color={selected ? "#FFFFFF" : "#3B82F6"}
        />
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginRight: 8,
    marginBottom: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#EEF4FF",
  },
  pillSelected: {
    backgroundColor: "#3B82F6",
  },
  label: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  labelSelected: {
    color: "#FFFFFF",
  },
});
