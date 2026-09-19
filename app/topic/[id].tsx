import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { TOPICS_DATA } from '@/data/topicsData';

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const topic = TOPICS_DATA.find((item) => item.id === id);

  const styles = StyleSheet.create({
    title: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 6 },
    body: { color: colors.text, fontSize: 14.5, lineHeight: 21 },
    bullet: { color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: 3 },
    pearlRow: { flexDirection: 'row', gap: 9 },
    pearl: { color: colors.text, fontSize: 13.5, lineHeight: 20, flex: 1 },
    metaRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 6 },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  });

  if (!topic) {
    return (
      <View style={g.screen}>
        <Stack.Screen options={{ title: t('handbook.title') }} />
        <EmptyState title={t('handbook.empty')} />
      </View>
    );
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: topic.title, headerBackTitle: t('handbook.title') }} />

      <Text style={styles.title}>{topic.title}</Text>
      <Text style={styles.subtitle}>{topic.subtitle}</Text>
      <View style={styles.metaRow}>
        <Badge label={topic.category} tone="indigo" />
        <Badge label={t('handbook.readTime', { minutes: topic.readTimeMinutes })} tone="muted" />
        <Badge label={'★'.repeat(topic.highYieldRating)} tone="orange" />
      </View>

      <SectionHeader title={t('topic.overview')} />
      <AppCard><Text style={styles.body}>{topic.overview}</Text></AppCard>

      <SectionHeader title={t('topic.mechanisms')} />
      <AppCard><Text style={styles.body}>{topic.mechanisms}</Text></AppCard>

      <SectionHeader title={t('topic.symptoms')} />
      <AppCard>
        {topic.clinicalPresentation.symptoms.map((symptom) => (
          <Text key={symptom} style={styles.bullet}>• {symptom}</Text>
        ))}
      </AppCard>

      <SectionHeader title={t('topic.signs')} />
      <AppCard>
        {topic.clinicalPresentation.physicalSigns.map((sign) => (
          <Text key={sign} style={styles.bullet}>• {sign}</Text>
        ))}
      </AppCard>

      <SectionHeader title={t('topic.treatment')} />
      <AppCard>
        {topic.treatment.acuteManagement.map((step) => (
          <Text key={step} style={styles.bullet}>• {step}</Text>
        ))}
      </AppCard>

      <SectionHeader title={t('topic.pearls')} />
      {topic.clinicalPearls.map((pearl) => (
        <AppCard key={pearl}>
          <View style={styles.pearlRow}>
            <Lightbulb size={17} color={colors.yellow} />
            <Text style={styles.pearl}>{pearl}</Text>
          </View>
        </AppCard>
      ))}

      <SectionHeader title={t('topic.askAi')} />
      <View style={styles.actions}>
        <AppButton label={t('topic.explainSimply')} tone="secondary" />
        <AppButton label={t('topic.quizMe')} tone="secondary" />
        <AppButton label={t('topic.makeCards')} tone="secondary" />
      </View>
    </ScrollView>
  );
}
