import { useEffect } from "react";
import { Linking } from "react-native";
import {
  flushPendingSetPasswordLink,
  navigateToSetPassword,
  navigationRef,
} from "../navigation/navigationRef";

const getTokenFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get("token")?.trim() || "";
  } catch {
    return "";
  }
};

const getNormalizedPath = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.replace(/^\/+/, "").replace(/^--\//, "");
  } catch {
    return "";
  }
};

const handleDeepLinkUrl = (url: string | null | undefined) => {
  if (!url) {
    return;
  }

  const normalizedPath = getNormalizedPath(url);
  const token = getTokenFromUrl(url);

  console.log("DEEP LINK URL:", url);
  console.log("DEEP LINK PATH:", normalizedPath || "<missing>");
  console.log("DEEP LINK TOKEN:", token || "<missing>");

  if ((normalizedPath === "set-password" || normalizedPath.endsWith("/set-password")) && token) {
    navigateToSetPassword(token);
  }
};

export function useDeepLinking() {
  useEffect(() => {
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLinkUrl(initialUrl);
    };

    void handleInitialUrl();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLinkUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (navigationRef.isReady()) {
        flushPendingSetPasswordLink();
      }
    }, 250);

    return () => {
      clearInterval(timer);
    };
  }, []);
}
