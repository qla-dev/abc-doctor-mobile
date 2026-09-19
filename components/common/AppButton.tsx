import { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { playClickSound } from '@/lib/sound';

type Tone = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'success';

export function AppButton({ label, onPress, tone = 'primary', icon, trailingIcon, disabled, full }: {
  label: string; onPress?: () => void; tone?: Tone; icon?: ReactNode; trailingIcon?: ReactNode;
  disabled?: boolean; full?: boolean;
}) {
  const { colors, resolvedMode } = useTheme();
  const palette: Record<Tone, [string, string]> = {
    primary: [colors.blue, '#FFFFFF'],
    dark: [resolvedMode === 'dark' ? '#FFFFFF' : '#1C1C1E', resolvedMode === 'dark' ? '#000000' : '#FFFFFF'],
    secondary: [colors.input, colors.text],
    ghost: ['transparent', colors.blue],
    danger: [resolvedMode === 'dark' ? '#3A1515' : '#FFF0EF', colors.red],
    success: [resolvedMode === 'dark' ? '#12351C' : '#EAF9EE', colors.green],
  };
  const styles = StyleSheet.create({
    button: {
      minHeight: Platform.OS === 'android' ? 54 : 50, paddingHorizontal: 16, borderRadius: 16,
      flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
      alignSelf: full ? 'stretch' : undefined,
    },
    label: { fontSize: Platform.OS === 'android' ? 16 : 15, fontWeight: '700' },
  });
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      onPress={() => {
        void playClickSound();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [styles.button, { backgroundColor: palette[tone][0], opacity: disabled ? .4 : pressed ? .7 : 1 }]}
    >
      {icon}<Text style={[styles.label, { color: palette[tone][1] }]}>{label}</Text>{trailingIcon}
    </Pressable>
  );
}
