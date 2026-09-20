import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    // A section header belongs to what FOLLOWS it, so it hugs its own content and stands off
    // from the block above. The screens' scroll views already gap every child by 14, so the
    // bottom margin goes negative to pull that gap back in rather than add to it.
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: -6 },
    label: {
      color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.55, marginLeft: 5,
    },
  });
  return <View style={styles.row}><Text style={styles.label}>{title}</Text>{action}</View>;
}
