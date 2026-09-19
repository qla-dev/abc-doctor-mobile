import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function EmptyState({ icon, title, body }: { icon?: ReactNode; title: string; body?: string }) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
    title: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
    body: { color: colors.muted, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  });
  return (
    <View style={styles.wrap}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}
