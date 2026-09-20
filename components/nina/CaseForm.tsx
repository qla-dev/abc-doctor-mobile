import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mic, MessageSquareText, Shuffle } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { AGE_BANDS, availableSpecialties, randomSetup, type CaseSetup } from '@/lib/caseGenerator';
import type { Modality } from '@/services/nina';

/**
 * The case, as one step inside the chat instead of a screen of its own.
 *
 * Four choices, one line each: the label on the left and the options as chips beside it, so the
 * whole form is about the height of two skill cards and the thing it configures is still on
 * screen behind it. The setup screen laid the same four out as stacked segmented controls under
 * their own headings, which is a page — and a page is what turned "start a case" into a trip.
 */
export function CaseForm({ setup, onChange, onStart, starting }: {
  setup: CaseSetup;
  onChange: (next: Partial<CaseSetup>) => void;
  /** Text or voice: a thread is opened in one mode and stays in it, so this is what starts it. */
  onStart: (modality: Modality) => void;
  starting: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
    label: { width: 62, color: colors.muted, fontSize: 11.5, fontWeight: '700' },
    chips: { flexDirection: 'row', gap: 6, flex: 1 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.input },
    chipOn: { backgroundColor: colors.blue },
    chipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
    chipTextOn: { color: '#FFFFFF' },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    dice: {
      width: 34, height: 34, borderRadius: 17,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input,
    },
    start: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 9, borderRadius: 13, backgroundColor: colors.blue,
    },
    startVoice: { backgroundColor: colors.indigo },
    startText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  });

  /** One row of the form. Long lists scroll sideways rather than wrapping into a second line. */
  const Row = <T extends string>({ label, value, options, onPick, scrolls }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onPick: (value: T) => void;
    scrolls?: boolean;
  }) => {
    const chips = options.map(option => {
      const on = option.value === value;

      return (
        <Pressable
          key={option.value}
          onPress={() => { void Haptics.selectionAsync(); onPick(option.value); }}
          accessibilityRole="button"
          accessibilityState={{ selected: on }}
          style={[styles.chip, on ? styles.chipOn : null]}
        >
          <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{option.label}</Text>
        </Pressable>
      );
    });

    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {scrolls ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {chips}
          </ScrollView>
        ) : (
          <View style={styles.chips}>{chips}</View>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: 6 }}>
      <Row
        label={t('setup.difficulty')}
        value={setup.difficulty}
        onPick={difficulty => onChange({ difficulty })}
        options={[
          { value: 'easy', label: t('setup.easy') },
          { value: 'medium', label: t('setup.medium') },
          { value: 'hard', label: t('setup.hard') },
        ]}
      />
      <Row
        label={t('setup.gender')}
        value={setup.gender}
        onPick={gender => onChange({ gender })}
        options={[
          { value: 'any', label: t('setup.anyGender') },
          { value: 'M', label: t('setup.male') },
          { value: 'F', label: t('setup.female') },
        ]}
      />
      <Row
        label={t('setup.age')}
        value={setup.ageBand}
        onPick={ageBand => onChange({ ageBand })}
        options={AGE_BANDS.map(band => ({ value: band, label: band }))}
        scrolls
      />
      <Row
        label={t('setup.specialty')}
        value={setup.specialty}
        onPick={specialty => onChange({ specialty })}
        options={[
          { value: 'any', label: t('setup.anySpecialty') },
          ...availableSpecialties().map(name => ({ value: name, label: name })),
        ]}
        scrolls
      />

      <View style={styles.footer}>
        <Pressable
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onChange(randomSetup()); }}
          accessibilityRole="button"
          accessibilityLabel={t('setup.randomize')}
          style={styles.dice}
        >
          <Shuffle size={15} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => onStart('text')} disabled={starting} style={styles.start} accessibilityRole="button">
          <MessageSquareText size={14} color="#FFFFFF" />
          <Text style={styles.startText}>{starting ? t('setup.starting') : t('setup.modeText')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onStart('voice')}
          disabled={starting}
          style={[styles.start, styles.startVoice]}
          accessibilityRole="button"
        >
          <Mic size={14} color="#FFFFFF" />
          <Text style={styles.startText}>{t('setup.modeVoice')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
