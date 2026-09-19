import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

export function ProgressRing({ progress, size = 64, stroke = 6, label, tint }: {
  progress: number; size?: number; stroke?: number; label?: string; tint?: string;
}) {
  const { colors } = useTheme();
  const color = tint ?? colors.blue;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const styles = StyleSheet.create({
    wrap: { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    label: { color: colors.text, fontSize: size * 0.26, fontWeight: '800' },
  });
  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.input} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap="round"
          // Start the arc at 12 o'clock rather than 3, which is where people expect progress to begin.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.label}>{label ?? `${Math.round(clamped * 100)}%`}</Text>
      </View>
    </View>
  );
}
