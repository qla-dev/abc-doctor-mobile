import { useLayoutEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useNativeIOSHeadersActive } from '@/lib/nativeTabBarPreference';
import type { NativeStackNavigationOptions } from 'expo-router/build/react-navigation/native-stack/types';
import {
  createIOSNativeHeaderOptions,
  createNativeHeaderIconButtonItem,
} from '@/lib/nativeHeaderItems';

export type HeaderIconItem = {
  /** SF Symbol name; the native bar takes symbols or images, never a component. */
  sfSymbol: string;
  accessibilityLabel: string;
  onPress: () => void;
  identifier: string;
};

/**
 * Drives the native iOS header: large title at rest, tucked into the bar as content scrolls,
 * with real system bar-button items either side.
 *
 * Adjusted from fitness's useScreenHeader. Theirs supports menus, badges and a duplicate-press
 * guard on the primary action; this is the same shape reduced to what our screens actually use.
 */
export function useScreenHeader({ title, nativeTitle, left, right, nativeOptions }: {
  /** Title for the in-screen bar, which has no scroll state and always shows it. */
  title: string;
  /**
   * Title for the NATIVE bar, when it should differ from the one above. Pass '' to leave the bar
   * empty and the screen's own heading to carry the name, then pass the title once the content
   * has scrolled — fitness's SettingsScreen drives its `nativeTitle` from an onScroll threshold
   * exactly this way.
   */
  nativeTitle?: string;
  left?: HeaderIconItem[];
  right?: HeaderIconItem[];
  /** Per-screen overrides, applied last: large title off, a transparent bar, and so on. */
  nativeOptions?: Partial<NativeStackNavigationOptions>;
}) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const usesNativeHeader = useNativeIOSHeadersActive();

  // Handlers dispatch through a ref so the native buttons — rebuilt only when their visible
  // state changes — always invoke the current closure rather than the one they were built with.
  const handlers = useRef<Record<string, () => void>>({});
  [...(left ?? []), ...(right ?? [])].forEach(item => {
    handlers.current[item.identifier] = item.onPress;
  });

  // Every value that changes the native output, so the effect reruns when it should and not on
  // every render.
  const signature = JSON.stringify({
    title,
    nativeTitle: nativeTitle ?? null,
    nativeOptions: nativeOptions ?? null,
    usesNativeHeader,
    tint: colors.blue,
    text: colors.text,
    left: (left ?? []).map(item => [item.identifier, item.sfSymbol, item.accessibilityLabel]),
    right: (right ?? []).map(item => [item.identifier, item.sfSymbol, item.accessibilityLabel]),
  });

  useLayoutEffect(() => {
    // Android and the non-glass iOS path both draw their bar inside the screen, so the stack
    // header has to go or the two stack. This ran behind a `Platform.OS !== 'ios'` guard, which
    // meant Android never reached it and kept a stack header titled after the route file.
    if (!usesNativeHeader) {
      navigation.setOptions({ headerShown: false });
      return;
    }

    const build = (item: HeaderIconItem) =>
      createNativeHeaderIconButtonItem({
        sfSymbol: item.sfSymbol,
        onPress: () => handlers.current[item.identifier]?.(),
        tintColor: colors.blue,
        identifier: item.identifier,
        accessibilityLabel: item.accessibilityLabel,
        // Each button keeps its own glass capsule, so a row reads as separate controls.
        separated: true,
      });

    const leftItems = (left ?? []).map(build);
    const rightItems = (right ?? []).map(build);

    navigation.setOptions({
      ...createIOSNativeHeaderOptions(colors.blue, colors.text),
      title: nativeTitle ?? title,
      unstable_headerLeftItems: leftItems.length ? () => leftItems : undefined,
      unstable_headerRightItems: rightItems.length ? () => rightItems : undefined,
      ...nativeOptions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, signature]);

  return usesNativeHeader;
}
