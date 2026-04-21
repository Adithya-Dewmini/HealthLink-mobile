import { CommonActions, createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();
let pendingSetPasswordToken: string | null = null;

export function resetToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  }
}

export function navigateToSetPassword(token: string) {
  const trimmedToken = String(token || "").trim();
  if (!trimmedToken) {
    return;
  }

  if (!navigationRef.isReady()) {
    pendingSetPasswordToken = trimmedToken;
    return;
  }

  navigationRef.dispatch(
    CommonActions.navigate("AuthStack" as never, {
      screen: "SetPassword",
      params: { token: trimmedToken },
    } as never)
  );
}

export function flushPendingSetPasswordLink() {
  if (!pendingSetPasswordToken || !navigationRef.isReady()) {
    return;
  }

  const token = pendingSetPasswordToken;
  pendingSetPasswordToken = null;
  navigateToSetPassword(token);
}
