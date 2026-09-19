import { useMemo } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router/build/react-navigation/native-stack/types';
import { useTheme } from '@/theme/ThemeProvider';
import { useNativeIOSHeadersActive } from '@/lib/nativeTabBarPreference';
import { createIOSNativeHeaderOptions } from '@/lib/nativeHeaderItems';

/**
 * Each tab is its own native Stack, as fitness does it: that stack is what owns the large
 * title, and it is the only way to get one inside a tab navigator.
 *
 * The header only exists on the native path. fitness never mounts one in its fallback layout —
 * FallbackTabsLayout hands the screen straight to the tab with `headerShown: false`, and the
 * screen's own TabHeader is the only bar. Mounting this stack with a header everywhere put two
 * bars on Android, the upper one titled after the route file, because useScreenHeader returned
 * early off iOS and never got to hide it.
 */
export function TabStack() {
  const { colors } = useTheme();
  const usesNativeHeader = useNativeIOSHeadersActive();

  const screenOptions = useMemo<NativeStackNavigationOptions>(() => {
    // One painted surface behind every screen in the stack. expo-router forces the bar itself
    // transparent whenever a large title is on (useHeaderConfigProps turns
    // headerLargeTitleEnabled into backgroundColor 'transparent' + translucent), so without
    // this the content shows straight through the bar instead of blurring under it.
    const contentStyle = { backgroundColor: colors.background };

    if (!usesNativeHeader) return { headerShown: false, contentStyle };

    return {
      ...createIOSNativeHeaderOptions(colors.blue, colors.text),
      headerBackButtonDisplayMode: 'minimal',
      contentStyle,
    };
  }, [colors, usesNativeHeader]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} collapsable={false}>
      <Stack screenOptions={screenOptions} />
    </View>
  );
}
