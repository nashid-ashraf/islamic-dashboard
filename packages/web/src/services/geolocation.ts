import type { GeolocationProvider, Coords } from '@islamic-dashboard/shared';

class WebGeolocationProvider implements GeolocationProvider {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  getCurrentPosition(timeoutMs = 10_000): Promise<Coords> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation not supported in this browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => reject(new Error(err.message || 'Failed to get location')),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60 * 60 * 1000 },
      );
    });
  }
}

export const geolocationProvider: GeolocationProvider = new WebGeolocationProvider();
