import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
    label: {
      color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.55, marginLeft: 5,
    },
  });
  return <View style={styles.row}><Text style={styles.label}>{title}</Text>{action}</View>;
}
