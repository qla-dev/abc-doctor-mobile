import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { playClickSound } from '@/lib/sound';

export function AppCard({ children, onPress, style, padded = true }: {
  children: ReactNode; onPress?: () => void; style?: ViewStyle; padded?: boolean;
}) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card, borderRadius: 18, padding: padded ? 16 : 0,
    },
  });
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        void playClickSound();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.card, style, { opacity: pressed ? .75 : 1 }]}
    >
      {children}
    </Pressable>
  );
}
