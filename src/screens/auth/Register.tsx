import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function Register({ navigation }: any) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Register Screen
      </Text>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={{ color: "blue", marginTop: 15 }}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
