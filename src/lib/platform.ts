import { Capacitor } from '@capacitor/core';

/** True when running inside the Android (Capacitor) app rather than a browser. */
export const isNative = () => Capacitor.isNativePlatform();
export const platformName = () => Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

export const isStandalonePWA = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
