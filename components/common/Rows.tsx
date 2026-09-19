import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { playClickSound } from '@/lib/sound';

/** A togglable row: a checkbox that fills the width, for settings and multi-select lists. */
export function CheckRow({ label, description, checked, onToggle, last }: {
  label: string; description?: string; checked: boolean; onToggle: () => void; last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
    box: {
      width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: checked ? colors.blue : colors.separator,
      backgroundColor: checked ? colors.blue : 'transparent',
    },
    label: { color: colors.text, fontSize: 15, fontWeight: '600' },
    description: { color: colors.muted, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 48 },
  });
  return (
    <>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => { void Haptics.selectionAsync(); onToggle(); }}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={styles.box}>{checked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </Pressable>
      {last ? null : <View style={styles.divider} />}
    </>
  );
}

/** A single-choice row. The tick sits on the right, as iOS does it in its own settings lists. */
export function OptionRow({ label, description, leading, selected, onSelect, last }: {
  label: string; description?: string; leading?: ReactNode; selected: boolean; onSelect: () => void; last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
    label: { color: colors.text, fontSize: 15, fontWeight: '600' },
    description: { color: colors.muted, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 14 },
  });
  return (
    <>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => { void playClickSound(); void Haptics.selectionAsync(); onSelect(); }}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      >
        {leading}
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {selected ? <Check size={18} color={colors.blue} strokeWidth={2.5} /> : null}
      </Pressable>
      {last ? null : <View style={styles.divider} />}
    </>
  );
}

/** High-yield rating as filled stars, so the count reads at a glance rather than as a number. */
export function HighYieldStars({ rating, size = 12 }: { rating: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityLabel={`High yield ${rating} of 5`}
      style={{ color: colors.orange, fontSize: size, letterSpacing: 0.5 }}
    >
      {'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
    </Text>
  );
}

/** A category chip. Colour is derived from the name so a category keeps its colour everywhere. */
export function CategoryChip({ category }: { category: string }) {
  const { colors, resolvedMode } = useTheme();
  const palette = [colors.blue, colors.indigo, colors.green, colors.orange, colors.cyan, colors.red];
  // A cheap stable hash: the same category must not change colour between screens or renders.
  const hash = Array.from(category).reduce((total, character) => total + character.charCodeAt(0), 0);
  const tint = palette[hash % palette.length];
  return (
    <View style={{
      paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
      backgroundColor: tint + (resolvedMode === 'dark' ? '2E' : '1F'), alignSelf: 'flex-start',
    }}>
      <Text style={{ color: tint, fontSize: 11, fontWeight: '800' }}>{category}</Text>
    </View>
  );
}
