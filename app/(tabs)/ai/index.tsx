import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FallbackTabHeader, useTabBarClearance } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useDayControl } from '@/hooks/useDayControl';
import { Brain, ClipboardList, Layers, Send, Siren, Stethoscope } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { GlassPanel } from '@/components/common/GlassPanel';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SectionIntro } from '@/components/common/SectionIntro';

type Tone = 'indigo' | 'blue' | 'green' | 'orange' | 'red';

const SKILLS: { id: string; label: string; icon: typeof Brain; tone: Tone }[] = [
  { id: 'tutor', label: 'Medical Tutor', icon: Brain, tone: 'indigo' },
  { id: 'quiz', label: 'Quiz Generator', icon: ClipboardList, tone: 'blue' },
  { id: 'cards', label: 'Flashcard Generator', icon: Layers, tone: 'green' },
  { id: 'case', label: 'Clinical Case', icon: Stethoscope, tone: 'orange' },
  { id: 'triage', label: 'Triage', icon: Siren, tone: 'red' },
];

export default function AiScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const composerClearance = useTabBarClearance();
  const day = useDayControl();
  const usesNativeHeader = useScreenHeader({ title: t('tabs.ai'),
    leftText: day.leftText,
    right: [{ sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
  });
  const g = createGlobalStyles(colors);
  const [draft, setDraft] = useState('');

  const tintFor = (tone: Tone) => ({
    indigo: colors.indigo, blue: colors.blue, green: colors.green,
    orange: colors.orange, red: colors.red,
  })[tone];

  const styles = StyleSheet.create({
    skillRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    skillLabel: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
    composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
    input: { flex: 1, color: colors.text, fontSize: 15, maxHeight: 90, padding: 0 },
    send: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
    composerWrap: { paddingHorizontal: 16, paddingBottom: composerClearance },
  });

  return (
    <KeyboardAvoidingView style={g.screen} collapsable={false} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FallbackTabHeader
        title={t('tabs.ai')}
        dateLabel={day.dateLabel}
        onDatePress={day.onDatePress}
        chooseDateLabel={day.chooseDateLabel}
      />
      <ScrollView
      style={{ flex: 1 }}
      contentInsetAdjustmentBehavior={usesNativeHeader ? 'automatic' : 'never'}
      automaticallyAdjustsScrollIndicatorInsets={usesNativeHeader}
      contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={g.scrollContent}>
          <SectionIntro
            subtitle={t('ai.subtitle')}
            actionLabel="Nina AI"
            onPress={() => router.push('/nina')}
          />
          <SectionHeader title={t('ai.skills')} />
          {SKILLS.map((skill) => {
            const Icon = skill.icon;
            return (
              <AppCard key={skill.id} onPress={() => router.push({ pathname: "/chat", params: { skill: skill.id } })}>
                <View style={styles.skillRow}>
                  <View style={[styles.iconWrap, { backgroundColor: tintFor(skill.tone) + '22' }]}>
                    <Icon size={20} color={tintFor(skill.tone)} />
                  </View>
                  <Text style={styles.skillLabel}>{skill.label}</Text>
                  <Badge label={skill.id} tone={skill.tone} />
                </View>
              </AppCard>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.composerWrap}>
        <GlassPanel radius={22}>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('ai.placeholder')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={() => router.push({ pathname: '/chat', params: draft.trim() ? { seed: draft.trim() } : {} })}
              accessibilityRole="button"
              style={styles.send}
            >
              <Send size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        </GlassPanel>
      </View>
      {day.sheet}
    </KeyboardAvoidingView>
  );
}
