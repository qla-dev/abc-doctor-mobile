import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { useTheme } from '@/theme/ThemeProvider';
import { useLiquidGlassActive } from '@/lib/nativeTabBarPreference';

/**
 * Glass follows the app preference; standard mode uses an opaque surface with the same shape.
 */
export function GlassPanel({ children, style, radius = 18 }: {
  children: ReactNode; style?: ViewStyle; radius?: number;
}) {
  const { colors, resolvedMode } = useTheme();
  const glassActive = useLiquidGlassActive();
  // No hairline around it. The panel is told apart from what is behind it by the glass itself —
  // an outline on top of that reads as a second edge, and the cards it sits among have none.
  const shape: ViewStyle = { borderRadius: radius, overflow: 'hidden' };

  if (glassActive) {
    return <GlassView style={[shape, style]} colorScheme={resolvedMode} glassEffectStyle="regular">{children}</GlassView>;
  }
  return <View style={[shape, { backgroundColor: colors.card }, style]}>{children}</View>;
}
