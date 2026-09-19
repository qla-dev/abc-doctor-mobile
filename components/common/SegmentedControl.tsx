import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';

export function SegmentedControl<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    track: { flexDirection: 'row', backgroundColor: colors.input, borderRadius: 12, padding: 3, gap: 3 },
    segment: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
    label: { fontSize: 13, fontWeight: '700' },
  });
  return (
    <View style={styles.track}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => { void Haptics.selectionAsync(); onChange(option.value); }}
            style={[styles.segment, active && { backgroundColor: colors.card }]}
          >
            <Text style={[styles.label, { color: active ? colors.text : colors.muted }]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
