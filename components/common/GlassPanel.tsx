import { ReactNode } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Liquid glass where the OS provides it, a blur where it does not, and a plain tinted panel on
 * Android. All three keep the same footprint so layout never shifts between platforms.
 */
export function GlassPanel({ children, style, radius = 18 }: {
  children: ReactNode; style?: ViewStyle; radius?: number;
}) {
  const { colors, resolvedMode } = useTheme();
  const shape: ViewStyle = { borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder };

  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return <GlassView style={[shape, style]} glassEffectStyle="regular">{children}</GlassView>;
  }
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={40} tint={resolvedMode === 'dark' ? 'dark' : 'light'} style={[shape, style]}>
        {children}
      </BlurView>
    );
  }
  return <View style={[shape, { backgroundColor: colors.glass }, style]}>{children}</View>;
}
