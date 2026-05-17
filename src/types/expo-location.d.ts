declare module "expo-location" {
  export type PermissionStatus = "granted" | "denied" | "undetermined";
  export type LocationObject = {
    coords: {
      latitude: number;
      longitude: number;
    };
  };

  export function requestForegroundPermissionsAsync(): Promise<{ status: PermissionStatus }>;
  export function getCurrentPositionAsync(options?: unknown): Promise<LocationObject>;
}
