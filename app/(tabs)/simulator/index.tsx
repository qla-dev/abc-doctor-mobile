import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FallbackTabHeader, useTabScrollPadding } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import * as Haptics from 'expo-haptics';
import { Shuffle, Stethoscope } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Badge } from '@/components/common/Badge';
import {
  AGE_BANDS, availableSpecialties, randomSetup,
  type AgeBand, type CaseSetup, type Difficulty, type GenderChoice,
} from '@/lib/caseGenerator';

export default function SimulatorSetupScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const bottomPad = useTabScrollPadding();
  const usesNativeHeader = useScreenHeader({ title: t('tabs.simulator'),
    right: [{ sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
  });
  const g = createGlobalStyles(colors);

  const specialties = availableSpecialties();
  const [setup, setSetup] = useState<CaseSetup>({
    difficulty: 'medium', specialty: 'any', gender: 'any', ageBand: '35-54',
  });

  const patch = (next: Partial<CaseSetup>) => setSetup(current => ({ ...current, ...next }));

  const styles = StyleSheet.create({
    field: { gap: 9 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    summaryText: { color: colors.text, fontSize: 14.5, fontWeight: '600', flex: 1 },
  });

  const genderLabel = { M: t('setup.male'), F: t('setup.female'), any: t('setup.anyGender') }[setup.gender];

  return (
    <View style={g.screen} collapsable={false}>
      <FallbackTabHeader title={t('tabs.simulator')} />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior={usesNativeHeader ? 'automatic' : 'never'}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeHeader}
        contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>

        <View style={g.scrollContent}>
          <SectionHeader title={t('setup.difficulty')} />
          <SegmentedControl<Difficulty>
            value={setup.difficulty}
            onChange={difficulty => patch({ difficulty })}
            options={[
              { value: 'easy', label: t('setup.easy') },
              { value: 'medium', label: t('setup.medium') },
              { value: 'hard', label: t('setup.hard') },
            ]}
          />

          <SectionHeader title={t('setup.specialty')} />
          <SegmentedControl<string>
            value={setup.specialty}
            onChange={specialty => patch({ specialty })}
            options={[{ value: 'any', label: t('setup.anySpecialty') }, ...specialties.map(s => ({ value: s, label: s }))]}
          />

          <SectionHeader title={t('setup.gender')} />
          <SegmentedControl<GenderChoice>
            value={setup.gender}
            onChange={gender => patch({ gender })}
            options={[
              { value: 'any', label: t('setup.anyGender') },
              { value: 'M', label: t('setup.male') },
              { value: 'F', label: t('setup.female') },
            ]}
          />

          <SectionHeader title={t('setup.age')} />
          <SegmentedControl<AgeBand>
            value={setup.ageBand}
            onChange={ageBand => patch({ ageBand })}
            options={AGE_BANDS.map(band => ({ value: band, label: band }))}
          />

          <SectionHeader title={t('setup.summary', { age: setup.ageBand, gender: genderLabel, specialty: setup.specialty === 'any' ? t('setup.anySpecialty') : setup.specialty })} />
          <AppCard>
            <View style={styles.summaryRow}>
              <Stethoscope size={20} color={colors.blue} />
              <Text style={styles.summaryText}>
                {t('setup.summary', {
                  age: setup.ageBand,
                  gender: genderLabel,
                  specialty: setup.specialty === 'any' ? t('setup.anySpecialty') : setup.specialty,
                })}
              </Text>
              <Badge label={t(`setup.${setup.difficulty}`)} tone={setup.difficulty === 'hard' ? 'red' : setup.difficulty === 'medium' ? 'orange' : 'green'} />
            </View>
          </AppCard>

          <AppButton
            label={t('setup.randomize')}
            tone="secondary"
            icon={<Shuffle size={16} color={colors.text} />}
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSetup(randomSetup()); }}
            full
          />
          <AppButton
            label={t('setup.start')}
            tone="primary"
            onPress={() => router.push({ pathname: '/simulation', params: { ...setup } })}
            full
          />
        </View>
      </ScrollView>
    </View>
  );
}
