import { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The single source of top spacing. Every screen's content begins below this, so the gap from
 * the status bar to the first pixel of content is identical everywhere instead of each screen
 * inventing its own inset arithmetic.
 *
 * `insets.top + 8` is what putni-nalozi and freightbook both use, and it is the reason their
 * screens sit right under the notch without looking cramped or adrift.
 */
export function ScreenHeader({ title, subtitle, trailing, compact }: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** Pushed screens use the smaller title, as a navigation bar would. */
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    wrap: {
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      // Deliberately the screen background, not a tinted bar: the header is not a painted
      // surface, it is the top of the page.
      backgroundColor: colors.background,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: {
      fontSize: compact ? 20 : 32,
      fontWeight: '800',
      letterSpacing: compact ? -0.4 : -0.9,
      color: colors.text,
    },
    subtitle: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {trailing}
      </View>
    </View>
  );
}

/**
 * Bottom padding for a scroll view under the floating tab bar. iOS 26's bar hovers over
 * content, so a list that stops at the safe area still ends up half-covered.
 */
export function useTabScrollPadding() {
  const insets = useSafeAreaInsets();
  return insets.bottom + (Platform.OS === 'ios' ? 96 : 76);
}
