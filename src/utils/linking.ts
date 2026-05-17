import type { LinkingOptions } from "@react-navigation/native";
import type { RootStackParamList } from "../types/navigation";

const prefixes = [
  "healthlink://",
  ...(process.env.EXPO_PUBLIC_APP_WEB_URL ? [process.env.EXPO_PUBLIC_APP_WEB_URL] : []),
];

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes,
  config: {
    screens: {
      PatientStack: {
        screens: {
          PatientTabs: {
            screens: {
              PatientDashboard: "patient/dashboard",
            },
          },
          Orders: {
            path: "patient/orders",
          },
          OrderDetails: {
            path: "patient/orders/:orderId",
            parse: {
              orderId: (value: string) => Number(value),
            },
          },
          PaymentStatus: {
            path: "payment/status/:orderId",
            parse: {
              orderId: (value: string) => Number(value),
            },
          },
        },
      },
      SetPassword: {
        path: "set-password",
        parse: {
          token: (value: string) => value,
        },
      },
    },
  },
};
