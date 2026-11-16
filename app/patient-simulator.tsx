import { modeLabels } from '@/lib/conversationMode';
import { useConversationPreferences } from '@/stores/conversationPreferences';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  Stethoscope, ChevronRight, Shuffle, MessageSquareText, Mic,
  Shield, Zap, Flame, Heart, Scissors, Globe, User, Users,
  PersonStanding, Briefcase, Clock, Armchair,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Mark, type Modality } from '@/services/mark';
import { ApiError } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { AppCard } from '@/components/common/AppCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ChoiceCards, type Choice } from '@/components/common/ChoiceCards';
import { SegmentedControl } from '@/components/common/SegmentedControl';
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

  const difficulties: Choice<Difficulty>[] = [
    { value: 'easy', label: t('setup.easy'), hint: 'Straightforward cases', tone: 'green',
      icon: p => <Shield {...p} /> },
    { value: 'medium', label: t('setup.medium'), hint: 'Moderate complexity', tone: 'blue',
      icon: p => <Zap {...p} /> },
    { value: 'hard', label: t('setup.hard'), hint: 'Challenging cases', tone: 'orange',
      icon: p => <Flame {...p} /> },
  ];

  const specialtyOptions: Choice<string>[] = [
    { value: 'any', label: t('setup.anySpecialty') ?? 'Any', hint: 'Random specialty', tone: 'blue',
      icon: p => <Globe {...p} /> },
    ...availableSpecialties().map(name => ({
      value: name,
      label: name,
      hint: name === 'Cardiology' ? 'Heart conditions' : name === 'Surgery' ? 'Surgical cases' : name,
      tone: (name === 'Cardiology' ? 'red' : name === 'Surgery' ? 'indigo' : 'cyan') as 'red' | 'indigo' | 'cyan',
      icon: (p: { size: number; color: string }) =>
        name === 'Cardiology' ? <Heart {...p} /> : <Scissors {...p} />,
    })),
  ];

  const ageBandOptions: Choice<AgeBand>[] = [
    { value: '18-34', label: '18-34', hint: 'Young adult', tone: 'green',
      icon: p => <PersonStanding {...p} /> },
    { value: '35-54', label: '35-54', hint: 'Middle-aged', tone: 'blue',
      icon: p => <Briefcase {...p} /> },
    { value: '55-74', label: '55-74', hint: 'Senior', tone: 'indigo',
      icon: p => <Clock {...p} /> },
    { value: '75+', label: '75+', hint: 'Elderly', tone: 'orange',
      icon: p => <Armchair {...p} /> },
  ];

  const styles = StyleSheet.create({
    modeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
    modeValue: { fontSize: 15, fontWeight: '600' },
    hero: { alignItems: 'center', gap: 6, paddingVertical: 12 },
    heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    heroDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    randomBtn: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    startBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 14, borderRadius: 16, minHeight: 50,
    },
    startText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  });

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
            <Text style={[styles.modeLabel, { color: colors.muted }]}>CONVERSATION MODE</Text>
            <Text style={[styles.modeValue, { color: colors.blue }]}>{modeLabels[conversationMode]}</Text>
          </View>
          <ChevronRight size={16} color={colors.muted} />
        </View>
      </AppCard>

      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.orange + '18' }]}>
          <Stethoscope size={28} color={colors.orange} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{t('skills.patient_simulator') ?? 'Patient Simulator'}</Text>
        <Text style={[styles.heroDesc, { color: colors.muted }]}>
          {t('sim.setupDesc') ?? 'Configure your patient case. Mark plays the patient, you take the history, examine, and diagnose.'}
        </Text>
      </View>

      {error ? (
        <AppCard>
          <Text style={{ color: colors.red, fontSize: 14, fontWeight: '600' }}>{error}</Text>
        </AppCard>
      ) : null}

      <SectionHeader title={t('setup.difficulty')} />
      <ChoiceCards options={difficulties} value={setup.difficulty} onChange={v => patch({ difficulty: v })} />

      <SectionHeader title={t('setup.specialty')} />
      <ChoiceCards options={specialtyOptions} value={setup.specialty} onChange={v => patch({ specialty: v })} />

      <SectionHeader title={t('setup.gender')} />
      <AppCard>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([
            { value: 'any' as GenderChoice, label: t('setup.anyGender'), icon: Users, tint: colors.blue },
            { value: 'M' as GenderChoice, label: t('setup.male'), icon: User, tint: colors.indigo },
            { value: 'F' as GenderChoice, label: t('setup.female'), icon: User, tint: colors.orange },
          ]).map(opt => {
            const Icon = opt.icon;
            const on = setup.gender === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => { void Haptics.selectionAsync(); patch({ gender: opt.value }); }}
                style={{
                  flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 14,
                  backgroundColor: on ? opt.tint + '1A' : 'transparent',
                  borderWidth: 1, borderColor: on ? opt.tint : 'transparent',
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: opt.tint + '22',
                }}>
                  <Icon size={18} color={opt.tint} />
                </View>
                <Text style={{ color: on ? opt.tint : colors.text, fontSize: 13, fontWeight: '700' }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <SectionHeader title={t('setup.age')} />
      <ChoiceCards options={ageBandOptions} value={setup.ageBand} onChange={v => patch({ ageBand: v })} />

      <View style={styles.actions}>
        <Pressable
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); patch(randomSetup()); }}
          style={[styles.randomBtn, { backgroundColor: colors.input }]}
        >
          <Shuffle size={18} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => void start('text')}
          disabled={starting}
          style={[styles.startBtn, { backgroundColor: colors.blue }]}
        >
          {starting ? <ActivityIndicator size="small" color="#FFF" /> : <MessageSquareText size={18} color="#FFF" />}
          <Text style={styles.startText}>{starting ? t('setup.starting') ?? 'Starting...' : t('setup.modeText') ?? 'Text'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void start('voice')}
          disabled={starting}
          style={[styles.startBtn, { backgroundColor: colors.indigo }]}
        >
          <Mic size={18} color="#FFF" />
          <Text style={styles.startText}>{t('setup.modeVoice') ?? 'Voice'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
