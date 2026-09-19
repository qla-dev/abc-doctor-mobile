import { Platform } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

let cached: boolean | undefined;

/**
 * Whether this device has the iOS 26 glass APIs. Cached because the answer cannot change while
 * the process lives, and it is read during render on nearly every screen.
 */
export function canUseLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (cached === undefined) {
    try {
      cached = isLiquidGlassAvailable();
    } catch {
      cached = false;
    }
  }
  return cached;
}

/**
 * True when the system draws the chrome itself — the iOS 26 native tab bar and its transparent
 * navigation bar. In that case the system also applies the content insets, so a screen adding
 * its own top or bottom padding gets double the gap. That was the bug this exists to prevent.
 */
export function systemOwnsChrome(): boolean {
  return canUseLiquidGlass();
}
