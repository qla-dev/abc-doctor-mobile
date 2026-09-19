import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function List({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    list: {
      backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator,
    },
  });
  return <View style={[styles.list, style]}>{children}</View>;
}
