export interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Platform-agnostic geolocation port.
 * Web: navigator.geolocation. Mobile: expo-location.
 */
export interface GeolocationProvider {
  isSupported(): boolean;
  getCurrentPosition(timeoutMs?: number): Promise<Coords>;
}
