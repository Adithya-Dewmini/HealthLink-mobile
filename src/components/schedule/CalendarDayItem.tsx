import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type CalendarDayItemProps = {
  dayNumber?: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  hasSessions: boolean;
  dotColor?: string;
  onPress?: () => void;
};

function CalendarDayItemComponent({
  dayNumber,
  isCurrentMonth,
  isSelected,
  isToday,
  hasSessions,
  dotColor,
  onPress,
}: CalendarDayItemProps) {
  if (!dayNumber || !isCurrentMonth) {
    return <View style={styles.placeholder} />;
  }

  return (
    <TouchableOpacity
      style={[
        styles.dayButton,
        isToday && styles.todayDayButton,
        isSelected && styles.selectedDayButton,
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dayText,
          isToday && styles.todayDayText,
          isSelected && styles.selectedDayText,
        ]}
      >
        {dayNumber}
      </Text>
      {hasSessions ? (
        <View
          style={[
            styles.dot,
            dotColor ? { backgroundColor: dotColor } : null,
            isSelected && styles.selectedDot,
          ]}
        />
      ) : null}
    </TouchableOpacity>
  );
}

export default memo(CalendarDayItemComponent);

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  todayDayButton: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
  },
  selectedDayButton: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  todayDayText: {
    color: "#1D4ED8",
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#10B981",
    marginTop: 6,
  },
  selectedDot: {
    backgroundColor: "#BFDBFE",
  },
});
