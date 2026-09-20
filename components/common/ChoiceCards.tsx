import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type Choice<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  icon: (props: { size: number; color: string }) => React.ReactNode;
  tone?: 'blue' | 'indigo' | 'green' | 'orange' | 'red' | 'cyan';
};

/**
 * A row of cards you pick one of, scrolling sideways.
 *
 * The setups used segmented controls, which are fine for two or three words and wrong for a
 * choice you want someone to look at: every option read the same, and nothing about "Ispitni
 * režim" versus "Slabe tačke" was visible until you had read both. Each option gets an icon, a
 * colour and room for a line of explanation instead.
 */
export function ChoiceCards<T extends string>({ options, value, onChange }: {
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    row: { gap: 10, paddingVertical: 2, paddingRight: 4 },
    card: {
      width: 132, minHeight: 112, borderRadius: 18, padding: 12,
      backgroundColor: colors.card, gap: 7, justifyContent: 'flex-start',
      // The ring is kept in the layout and only coloured in when the card is chosen: a border
      // that appears on selection would nudge everything beside it by a point.
      borderWidth: 1, borderColor: 'transparent',
    },
    iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    label: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
    hint: { color: colors.muted, fontSize: 11.5, lineHeight: 15 },
    // The selected card says so twice — a tinted border and a tick — because on a dark screen a
    // border alone is easy to miss at a glance.
    tick: { position: 'absolute', top: 10, right: 10 },
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map(option => {
        const tint = colors[option.tone ?? 'blue'];
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.card,
              selected && { borderColor: tint, backgroundColor: tint + '1A' },
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: tint + '22' }]}>
              {option.icon({ size: 19, color: tint })}
            </View>
            <Text style={styles.label} numberOfLines={2}>{option.label}</Text>
            {option.hint ? <Text style={styles.hint} numberOfLines={2}>{option.hint}</Text> : null}
            {selected ? <Check size={15} color={tint} style={styles.tick} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
