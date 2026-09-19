import { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Settings } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { playClickSound } from '@/lib/sound';
import { systemOwnsChrome } from '@/lib/liquidGlass';

/**
 * The single source of top spacing, owned by the screen rather than the navigator.
 *
 * `insets.top` exactly — no extra. fitness uses the bare inset on 89 screens, and the reason is
 * that the title's own line height supplies the optical gap. Adding 8 on top of it is what made
 * every screen sit too low.
 */
export function ScreenHeader({ title, subtitle, trailing, compact, showSettings }: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  /** Pushed screens use the smaller title, as a navigation bar would. */
  compact?: boolean;
  /** Tab screens carry the settings button here rather than in a native toolbar. */
  showSettings?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const styles = StyleSheet.create({
    wrap: {
      // When the system owns the chrome it has already applied the safe-area inset to this
      // screen, so adding insets.top here is a second one and the content sits twice too low.
      // This is the rule fitness applies as usesNativeHeader ? 0 : insets.top.
      paddingTop: systemOwnsChrome() ? 0 : insets.top,
      paddingHorizontal: 16,
      paddingBottom: 8,
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
    button: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input,
    },
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          {subtitle ? <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {trailing}
        {showSettings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
            onPress={() => {
              void playClickSound();
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings');
            }}
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Settings size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Bottom padding for a scroll view inside the tabs.
 *
 * Zero on iOS 26: the native tab bar applies its own content inset, so anything added here is
 * doubled. Only the platforms that draw a bar over the content need a manual gap.
 */
export function useTabScrollPadding() {
  const insets = useSafeAreaInsets();
  if (systemOwnsChrome()) return 16;
  return insets.bottom + (Platform.OS === 'ios' ? 68 : 60);
}
