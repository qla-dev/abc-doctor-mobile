import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * A line of copy under a screen's name, saying what the screen is for — with an optional link at
 * the end of it. Cloned from fitness's SectionIntro.
 *
 * It is a real row of scroll content, not something positioned against the title: iOS draws its
 * large title above the scroll view rather than inside it, so nothing can be laid out beside the
 * title, and an overlay would have to be nudged into place by hand and would still sit wrong at
 * other text sizes. This just follows the title and scrolls with the content.
 *
 * The line stays on one line and truncates. Its height is part of the screen's chrome, and chrome
 * that grows a line on a long translation pushes everything below it down in that language alone.
 */
export function SectionIntro({ subtitle, actionLabel, onPress, style }: {
  subtitle: string;
  /** Omit both to make the line say what the block is for and nothing more. */
  actionLabel?: string;
  onPress?: () => void;
  /**
   * Spacing is the caller's. Screens space their children differently: a scroll view that already
   * puts a gap between every child would double it if this carried a margin of its own.
   */
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    subtitle: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 18 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    actionLabel: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  });

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
        {subtitle}
      </Text>
      {actionLabel && onPress ? (
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}
          style={styles.action}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <ChevronRight size={12} color={colors.blue} />
        </Pressable>
      ) : null}
    </View>
  );
}
