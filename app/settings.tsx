import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { List } from '@/components/common/List';
import { OptionRow } from '@/components/common/Rows';
import { SectionHeader } from '@/components/common/SectionHeader';
import { AppButton } from '@/components/common/AppButton';
import { AppCard } from '@/components/common/AppCard';
import { FLASHCARDS_DATA } from '@/data/flashcardsData';
import { QuizHistory, Reviews, Streak, resetAll } from '@/services/storage';
import type { ThemeMode } from '@/theme/colors';
import type { Language } from '@/i18n';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { t, language, setLanguage, languages } = useLanguage();
  const g = createGlobalStyles(colors);
  const [, forceRender] = useState(0);

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'system', label: t('settings.system'), icon: Smartphone },
    { value: 'light', label: t('settings.light'), icon: Sun },
    { value: 'dark', label: t('settings.dark'), icon: Moon },
  ];

  const dueCount = Reviews.dueCount(FLASHCARDS_DATA.map(card => card.id));
  const accuracy = QuizHistory.accuracy();
  const streak = Streak.read();

  const styles = StyleSheet.create({
    statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    statLabel: { color: colors.muted, fontSize: 13.5 },
    statValue: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
  });

  const confirmReset = () => {
    Alert.alert(
      t('settings.reset'),
      t('settings.resetBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.reset'),
          style: 'destructive',
          onPress: () => { resetAll(); forceRender(value => value + 1); },
        },
      ]
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('common.settings') }} />

      <SectionHeader title={t('common.theme')} />
      <List>
        {themeOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <OptionRow
              key={option.value}
              label={option.label}
              leading={<Icon size={18} color={colors.muted} />}
              selected={mode === option.value}
              onSelect={() => setMode(option.value)}
              last={index === themeOptions.length - 1}
            />
          );
        })}
      </List>

      <SectionHeader title={t('common.language')} />
      <List>
        {languages.map((option, index) => (
          <OptionRow
            key={option.code}
            label={option.label}
            leading={<Text style={{ fontSize: 19 }}>{option.flag}</Text>}
            selected={language === option.code}
            onSelect={() => setLanguage(option.code as Language)}
            last={index === languages.length - 1}
          />
        ))}
      </List>

      <SectionHeader title={t('progress.title')} />
      <AppCard>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t('home.dueToday')}</Text>
          <Text style={styles.statValue}>{dueCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t('progress.accuracy')}</Text>
          <Text style={styles.statValue}>{accuracy === null ? '—' : `${accuracy}%`}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t('home.streak', { count: streak.days })}</Text>
          <Text style={styles.statValue}>{streak.days}</Text>
        </View>
      </AppCard>

      <SectionHeader title={t('settings.data')} />
      <AppButton label={t('settings.reset')} tone="danger" onPress={confirmReset} full />
    </ScrollView>
  );
}
