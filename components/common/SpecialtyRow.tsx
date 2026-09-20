import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Brain, Heart, Scissors, Search, Siren, Stethoscope, Wind } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { TOPICS_DATA } from '@/data/topicsData';

/**
 * Fields, not job titles: the data files label a topic by its branch of medicine
 * (`category: 'Cardiology'`), so these name branches too rather than the doctors who practise
 * them. The list is derived from TOPICS_DATA instead of written out here, so a new topic in a new
 * branch appears without anyone remembering to add it.
 */
const ICONS: Record<string, { icon: typeof Heart; tone: keyof ReturnType<typeof useTheme>['colors'] }> = {
  Cardiology: { icon: Heart, tone: 'red' },
  Neurology: { icon: Brain, tone: 'indigo' },
  Pulmonology: { icon: Wind, tone: 'cyan' },
  Surgery: { icon: Scissors, tone: 'green' },
  'Internal Medicine': { icon: Stethoscope, tone: 'blue' },
  'Emergency Medicine': { icon: Siren, tone: 'orange' },
};

const FALLBACK = { icon: Stethoscope, tone: 'blue' as const };

/** Every branch that has at least one topic, in the order the topics list them. */
export function specialties(): string[] {
  return Array.from(new Set(TOPICS_DATA.map(topic => topic.category)));
}

/**
 * A field that looks like search but is a button: the screen that owns the real search is
 * elsewhere, and two live search boxes over the same data would be two states to keep in step.
 */
export function SpecialtySearchField({ placeholder, onPress }: {
  placeholder: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    search: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.card, borderRadius: 16,
      paddingHorizontal: 14, minHeight: 50,
    },
    label: { color: colors.muted, fontSize: 15 },
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
      style={({ pressed }) => [styles.search, { opacity: pressed ? 0.75 : 1 }]}
    >
      <Search size={18} color={colors.muted} />
      <Text style={styles.label}>{placeholder}</Text>
    </Pressable>
  );
}

/** The branches, as a row of cards that scrolls sideways. */
export function SpecialtyCards({ onSelect }: { onSelect: (category: string) => void }) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    row: { gap: 12, paddingVertical: 2 },
    card: {
      width: 104, minHeight: 96, borderRadius: 18,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
      gap: 9, paddingHorizontal: 8, paddingVertical: 12,
    },
    label: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  });

  return (
    // Horizontal rather than wrapped: the row is a shortcut, not the whole catalogue, and a
    // cut-off card at the edge is what tells people it scrolls.
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {specialties().map(category => {
        const { icon: Icon, tone } = ICONS[category] ?? FALLBACK;
        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            accessibilityRole="button"
            accessibilityLabel={category}
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Icon size={26} color={colors[tone] as string} />
            <Text style={styles.label} numberOfLines={2}>{category}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
