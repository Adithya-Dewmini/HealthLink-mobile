const prefixes = [
  "healthlink://",
  ...(process.env.EXPO_PUBLIC_APP_WEB_URL ? [process.env.EXPO_PUBLIC_APP_WEB_URL] : []),
];

export const linking: any = {
  prefixes,
  config: {
    screens: {
      AuthStack: {
        screens: {
          SetPassword: {
            path: "set-password",
            parse: {
              token: (value: string) => value,
            },
          },
        },
      },
    },
  },
};
