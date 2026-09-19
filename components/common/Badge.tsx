import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Tone = 'blue' | 'green' | 'orange' | 'red' | 'muted' | 'indigo';

export function Badge({ label, tone = 'blue' }: { label: string; tone?: Tone }) {
  const { colors, resolvedMode } = useTheme();
  const base: Record<Tone, string> = {
    blue: colors.blue, green: colors.green, orange: colors.orange,
    red: colors.red, muted: colors.muted, indigo: colors.indigo,
  };
  const tint = base[tone];
  const styles = StyleSheet.create({
    pill: {
      paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
      // A flat tint at low alpha reads as a chip in both themes without needing two palettes.
      backgroundColor: tint + (resolvedMode === 'dark' ? '2E' : '1F'), alignSelf: 'flex-start',
    },
    text: { color: tint, fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  });
  return <View style={styles.pill}><Text style={styles.text}>{label}</Text></View>;
}
