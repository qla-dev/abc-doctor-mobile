import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Bookmark, BookmarkCheck, Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { AppButton } from '@/components/common/AppButton';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { TOPICS_DATA } from '@/data/topicsData';
import { AppField } from '@/components/common/AppField';
import { HighYieldStars } from '@/components/common/Rows';
import { Bookmarks, Notes, Progress } from '@/services/storage';

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const topic = TOPICS_DATA.find((item) => item.id === id);

  const [bookmarked, setBookmarked] = useState(() => (id ? Bookmarks.has(id) : false));
  const [note, setNote] = useState(() => (id ? Notes.get(id) : ''));

  // Opening a topic counts as having read it. Progress.set only ever raises the stored value,
  // so re-reading a finished topic cannot undo it.
  useEffect(() => {
    if (id) Progress.set(id, Math.max(25, Progress.get(id)));
  }, [id]);

  const saveNote = useCallback((text: string) => {
    setNote(text);
    if (id) Notes.set(id, text);
  }, [id]);

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
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen
        options={{
          title: topic.title,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('handbook.bookmarked')}
              onPress={() => { if (id) setBookmarked(Bookmarks.toggle(id)); }}
              hitSlop={10}
            >
              {bookmarked
                ? <BookmarkCheck size={21} color={colors.blue} />
                : <Bookmark size={21} color={colors.muted} />}
            </Pressable>
          ),
        }}
      />

      <Text style={styles.title}>{topic.title}</Text>
      <Text style={styles.subtitle}>{topic.subtitle}</Text>
      <View style={styles.metaRow}>
        <Badge label={topic.category} tone="indigo" />
        <Badge label={t('handbook.readTime', { minutes: topic.readTimeMinutes })} tone="muted" />
        <HighYieldStars rating={topic.highYieldRating} />
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

      <SectionHeader title={t('settings.data')} />
      <AppCard>
        <AppField
          label={t('handbook.bookmarked')}
          hideLabel
          value={note}
          onChangeText={saveNote}
          placeholder={t('topic.overview')}
          multiline
        />
      </AppCard>

      <SectionHeader title={t('topic.askAi')} />
      <View style={styles.actions}>
        <AppButton label={t('topic.explainSimply')} tone="secondary" />
        <AppButton label={t('topic.quizMe')} tone="secondary" />
        <AppButton label={t('topic.makeCards')} tone="secondary" />
      </View>
    </ScrollView>
  );
}
