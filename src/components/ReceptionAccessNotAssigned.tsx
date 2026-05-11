import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  EmptyState,
  RECEPTION_THEME,
  ReceptionistButton,
} from "./receptionist/PanelUI";

type Props = {
  title?: string;
  message?: string;
};

export default function ReceptionAccessNotAssigned({
  title = "Access not assigned",
  message = "Your clinic admin has not assigned this responsibility to your account.",
}: Props) {
  const navigation = useNavigation<any>();

  const handleGoHome = () => {
    const routeNames = navigation?.getState?.()?.routeNames;
    if (Array.isArray(routeNames) && routeNames.includes("ReceptionistTabsRoot")) {
      navigation.navigate("ReceptionistTabsRoot");
      return;
    }

    if (Array.isArray(routeNames) && routeNames.includes("ReceptionistHome")) {
      navigation.navigate("ReceptionistHome");
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <EmptyState
          title={title}
          message={message}
          icon="shield-checkmark-outline"
          action={<ReceptionistButton label="Go to Home" onPress={handleGoHome} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RECEPTION_THEME.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
});
