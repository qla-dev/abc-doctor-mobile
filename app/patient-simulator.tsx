import { modeLabels } from '@/lib/conversationMode';
import { useConversationPreferences, currentMode } from '@/stores/conversationPreferences';
import { resolveMode } from '@/lib/conversationMode';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Stethoscope, ChevronRight, Shuffle, MessageSquareText, Mic } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Mark, type Modality } from '@/services/mark';
import { ApiError } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { AppCard } from '@/components/common/AppCard';
import { createGlobalStyles } from '@/theme/styles';
import {
  AGE_BANDS, DIFFICULTIES, availableSpecialties, randomSetup,
  type AgeBand, type CaseSetup, type Difficulty, type GenderChoice,
} from '@/lib/caseGenerator';

export default function PatientSimulatorScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const conversationMode = useConversationPreferences(s => s.mode);

  const [setup, setSetup] = useState<CaseSetup>({
    difficulty: 'medium', specialty: 'any', gender: 'any', ageBand: '35-54',
  });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const patch = (next: Partial<CaseSetup>) => setSetup(current => ({ ...current, ...next }));

  const start = async (modality: Modality) => {
    setStarting(true);
    setError('');
    try {
      const thread = await Mark.startConversation('patient_simulator', modality, undefined, undefined, undefined, setup);
      router.replace({ pathname: '/mark', params: { conversationId: String(thread.id) } });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setStarting(false);
    }
  };

  const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Pressable
      onPress={() => { void Haptics.selectionAsync(); onPress(); }}
      style={[s.chip, { backgroundColor: on ? colors.blue : colors.input }]}
    >
      <Text style={[s.chipText, { color: on ? '#FFF' : colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen}
      contentContainerStyle={g.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t('skills.patient_simulator') ?? 'Patient Simulator' }} />

      <AppCard onPress={() => router.push('/conversation-mode')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[s.modeLabel, { color: colors.muted }]}>CONVERSATION MODE</Text>
            <Text style={[s.modeValue, { color: colors.blue }]}>{modeLabels[conversationMode]}</Text>
          </View>
          <ChevronRight size={16} color={colors.muted} />
        </View>
      </AppCard>

      <View style={s.hero}>
        <View style={[s.heroIcon, { backgroundColor: colors.orange + '18' }]}>
          <Stethoscope size={28} color={colors.orange} />
        </View>
        <Text style={[s.heroTitle, { color: colors.text }]}>{t('skills.patient_simulator') ?? 'Patient Simulator'}</Text>
        <Text style={[s.heroDesc, { color: colors.muted }]}>
          {t('sim.setupDesc') ?? 'Configure your patient case. Mark plays the patient — you take the history, examine, and diagnose.'}
        </Text>
      </View>

      {error ? (
        <AppCard>
          <Text style={{ color: colors.red, fontSize: 14, fontWeight: '600' }}>{error}</Text>
        </AppCard>
      ) : null}

      <AppCard>
        <View style={s.chipRow}>
          <Text style={[s.chipLabel, { color: colors.muted }]}>{t('setup.difficulty')}</Text>
          <View style={s.chipGroup}>
            {([['easy', t('setup.easy')], ['medium', t('setup.medium')], ['hard', t('setup.hard')]] as [Difficulty, string][]).map(([v, label]) => (
              <Chip key={v} on={setup.difficulty === v} label={label} onPress={() => patch({ difficulty: v })} />
            ))}
          </View>
        </View>
        <View style={s.chipRow}>
          <Text style={[s.chipLabel, { color: colors.muted }]}>{t('setup.specialty')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
            <Chip on={setup.specialty === 'any'} label={t('setup.anySpecialty') ?? 'Any'} onPress={() => patch({ specialty: 'any' })} />
            {availableSpecialties().map(name => (
              <Chip key={name} on={setup.specialty === name} label={name} onPress={() => patch({ specialty: name })} />
            ))}
          </ScrollView>
        </View>
        <View style={s.chipRow}>
          <Text style={[s.chipLabel, { color: colors.muted }]}>{t('setup.gender')}</Text>
          <View style={s.chipGroup}>
            {([['any', t('setup.anyGender')], ['M', t('setup.male')], ['F', t('setup.female')]] as [GenderChoice, string][]).map(([v, label]) => (
              <Chip key={v} on={setup.gender === v} label={label} onPress={() => patch({ gender: v })} />
            ))}
          </View>
        </View>
        <View style={s.chipRow}>
          <Text style={[s.chipLabel, { color: colors.muted }]}>{t('setup.age')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
            {AGE_BANDS.map(band => (
              <Chip key={band} on={setup.ageBand === band} label={band} onPress={() => patch({ ageBand: band })} />
            ))}
          </ScrollView>
        </View>
      </AppCard>

      <View style={s.actions}>
        <Pressable
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); patch(randomSetup()); }}
          style={[s.randomBtn, { backgroundColor: colors.input }]}
        >
          <Shuffle size={16} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => void start('text')}
          disabled={starting}
          style={[s.startBtn, { backgroundColor: colors.blue }]}
        >
          {starting ? <ActivityIndicator size="small" color="#FFF" /> : <MessageSquareText size={16} color="#FFF" />}
          <Text style={s.startText}>{starting ? t('setup.starting') ?? 'Starting…' : t('setup.modeText') ?? 'Text'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void start('voice')}
          disabled={starting}
          style={[s.startBtn, { backgroundColor: colors.indigo }]}
        >
          <Mic size={16} color="#FFF" />
          <Text style={s.startText}>{t('setup.modeVoice') ?? 'Voice'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  modeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  modeValue: { fontSize: 15, fontWeight: '600' },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  chipLabel: { width: 62, fontSize: 11.5, fontWeight: '700' },
  chipGroup: { flexDirection: 'row', gap: 6, flex: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  randomBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  startBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 14,
  },
  startText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
