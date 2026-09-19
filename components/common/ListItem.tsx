import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { playClickSound } from '@/lib/sound';

export function ListItem({ title, subtitle, leading, trailing, onPress, showChevron = true, last }: {
  title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode;
  onPress?: () => void; showChevron?: boolean; last?: boolean;
}) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 14 },
    title: { color: colors.text, fontSize: 15, fontWeight: '600' },
    subtitle: { color: colors.muted, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  });
  return (
    <>
      <Pressable
        disabled={!onPress}
        onPress={() => {
          void playClickSound();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        style={({ pressed }) => [styles.row, { opacity: pressed ? .6 : 1 }]}
      >
        {leading}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {trailing}
        {showChevron && onPress ? <ChevronRight size={17} color={colors.muted} /> : null}
      </Pressable>
      {last ? null : <View style={styles.divider} />}
    </>
  );
}
