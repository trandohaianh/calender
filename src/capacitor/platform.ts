import { Capacitor } from '@capacitor/core';

export type AppPlatform = 'web' | 'android' | 'ios';

export function getPlatform(): AppPlatform {
  const p = Capacitor.getPlatform();
  if (p === 'android' || p === 'ios') return p;
  return 'web';
}

export function isPlatform(platform: AppPlatform): boolean {
  return getPlatform() === platform;
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
