import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { useNativeIOSHeadersActive, useNativeIOSTabsActive } from '@/lib/nativeTabBarPreference';

/**
 * Adjusted from fitness's TabHeader. Structure and every measurement are theirs; the fitness
 * dependencies it carried (uniwind classNames, their Icon set, the day-picker props) are
 * swapped for ours, and the date controls are dropped because no tab here is scoped to a day.
 */

/** Tap target for each header button, and the gap that keeps them apart. */
const BUTTON_SIZE = 44;
const BUTTON_GAP = 4;

/**
 * Base width for the outer slots, so the centered title stays centered. Both
 * sides use the same width; a header carrying more buttons than this fits
 * grows both slots together rather than shifting the title off centre.
 */
const SLOT_WIDTH = 96;

export interface TabHeaderAction {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
}

interface TabHeaderProps {
  /** Centered title — the screen's own name. */
  title: string;
  /** A glyph set immediately before the title, for a screen that has a face as well as a name. */
  titleIcon?: ReactNode;
  /**
   * Left slot: the day this screen is showing, already formatted. Tapping it opens the picker.
   * Omitted on tabs that are not scoped to a day — fitness's TabHeader states the same rule.
   */
  dateLabel?: string;
  onDatePress?: () => void;
  /** Accessibility label for the day button, since its text is a date and not a name. */
  chooseDateLabel?: string;
  left?: TabHeaderAction[];
  right?: TabHeaderAction[];
  skipTopInset?: boolean;
}

/**
 * The header every tab shares on the platforms that do not get the native one: the screen name
 * centered, actions in equal-width slots either side. It has no background of its own, so the
 * screen's runs straight through it.
 */
const TabHeader: React.FC<TabHeaderProps> = ({
  title,
  titleIcon,
  dateLabel,
  onDatePress,
  chooseDateLabel,
  left,
  right,
  skipTopInset,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const leftActions = left ?? [];
  const rightActions = right ?? [];

  /**
   * Every button in this bar answers a press with the selection haptic, the
   * same as the buttons the native header renders. Wrapped here rather than at
   * each call site so a new button cannot be added silently.
   */
  const withHaptic = (onPress: () => void) => () => {
    void Haptics.selectionAsync();
    onPress();
  };

  // Both slots share one width so the title stays centred, and it only grows
  // past the base when a header actually carries more buttons than that fits.
  const buttonCount = Math.max(leftActions.length, rightActions.length);
  const slotWidth = Math.max(
    SLOT_WIDTH,
    buttonCount * BUTTON_SIZE + Math.max(buttonCount - 1, 0) * BUTTON_GAP
  );

  const styles = StyleSheet.create({
    bar: {
      paddingTop: skipTopInset ? 12 : insets.top + 12,
      paddingHorizontal: 8,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    slot: { minWidth: slotWidth, minHeight: BUTTON_SIZE, flexDirection: 'row', alignItems: 'center' },
    dateButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: BUTTON_SIZE },
    dateLabel: { color: colors.text, fontSize: 16, fontWeight: '500' },
    title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    button: { width: BUTTON_SIZE, height: BUTTON_SIZE, alignItems: 'center', justifyContent: 'center' },
  });

  const renderAction = (action: TabHeaderAction, index: number) => (
    <TouchableOpacity
      key={index}
      onPress={withHaptic(action.onPress)}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      style={styles.button}
    >
      {action.icon}
    </TouchableOpacity>
  );

  return (
    <View style={styles.bar}>
      <View style={styles.slot}>
        {dateLabel ? (
          <TouchableOpacity
            onPress={onDatePress ? withHaptic(onDatePress) : undefined}
            accessibilityRole="button"
            accessibilityLabel={chooseDateLabel ?? dateLabel}
            style={styles.dateButton}
          >
            <Text style={styles.dateLabel} numberOfLines={1}>{dateLabel}</Text>
            {onDatePress ? <ChevronDown size={12} color={colors.muted} style={{ marginLeft: 3 }} /> : null}
          </TouchableOpacity>
        ) : null}
        {leftActions.map(renderAction)}
      </View>

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {titleIcon}
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      </View>

      {/* Buttons are spaced apart rather than flush, so a row of icons reads
          as separate controls instead of one joined block. */}
      <View style={[styles.slot, { width: slotWidth, justifyContent: 'flex-end', gap: BUTTON_GAP }]}>
        {rightActions.map(renderAction)}
      </View>
    </View>
  );
};

export default TabHeader;

/**
 * Renders the bar only where the system does not draw one. On iOS the native header owns the
 * title, so returning null here is what keeps the two from stacking — the bug that put every
 * screen twice too low.
 */
export function FallbackTabHeader(props: TabHeaderProps) {
  const usesNativeHeader = useNativeIOSHeadersActive();
  if (usesNativeHeader) return null;
  return <TabHeader {...props} />;
}

/**
 * Bottom clearance for content PINNED above the tab bar — a composer, a toolbar, anything that
 * is not a scroll view. The native bar floats over the screen and only insets scroll views, so
 * such content has to clear it itself. UIKit already reports the cost: RNSTabsScreenComponentView
 * is an RNSSafeAreaProviding returning the view's own `safeAreaInsets`, and UITabBarController
 * adds its bar's height to its children's bottom inset — so `insets.bottom` is the bar plus the
 * home indicator, with no tab-bar constant to guess at. Under the JS bar, which shortens the
 * screen rather than floating over it, the same expression collapses to just the gap.
 */
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return insets.bottom + 12;
}

/**
 * Bottom padding for a scroll view inside the tabs. The native tab bar applies its own content
 * inset, so anything added there is doubled.
 */
export function useTabScrollPadding() {
  const insets = useSafeAreaInsets();
  // Keyed to the TAB BAR, not the header: on iOS before the glass APIs the native header is on
  // while the tab bar is the JS one, and that bar adds no inset of its own.
  const usesNativeTabs = useNativeIOSTabsActive();
  if (usesNativeTabs) return 16;
  return insets.bottom + 60;
}
