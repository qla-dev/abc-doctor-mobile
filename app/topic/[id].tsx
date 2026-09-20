import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Bookmark, BookmarkCheck, ClipboardList, Layers, Lightbulb, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { FooterCta } from '@/components/common/Sheets';
import { Badge } from '@/components/common/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { TOPICS_DATA } from '@/data/topicsData';
import { AppField } from '@/components/common/AppField';
import { HighYieldStars } from '@/components/common/Rows';
import { Bookmarks, Notes, Progress } from '@/services/storage';
import { Mark } from '@/services/mark';
import { ApiError } from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const g = createGlobalStyles(colors);
  const insets = useSafeAreaInsets();
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

  /**
   * The three commands at the foot of the page, which until now were three labels and nothing
   * else — no handler behind any of them.
   *
   * Each opens a thread in the skill that suits it and hands over the question as its first
   * turn, so what arrives is already about this topic rather than a chat waiting to be told
   * which one you were reading.
   */
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (skill: string, seed: string) => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const thread = await Mark.startConversation(skill, 'text');
      router.push({ pathname: '/mark', params: { conversationId: String(thread.id), seed } });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setStarting(false);
    }
  }, [starting]);

  const styles = StyleSheet.create({
    title: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 6 },
    body: { color: colors.text, fontSize: 14.5, lineHeight: 21 },
    bullet: { color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: 3 },
    pearlRow: { flexDirection: 'row', gap: 9 },
    pearl: { color: colors.text, fontSize: 13.5, lineHeight: 20, flex: 1 },
    metaRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 6 },
    // The handbook's own footer, brought along with the commands: one row, each button carrying
    // an equal share of it, drawn rather than filled so the page above stays the page.
    actions: { flexDirection: 'row', gap: 10 },
    action: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 7, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
    },
    actionLabel: { fontSize: 13, fontWeight: '700' },
    error: { color: colors.red, fontSize: 13 },
  });

  /** What each command asks, in the language the page is being read in. */
  const about = topic ? `"${topic.title}" (${topic.category})` : '';

  if (!topic) {
    return (
      <View style={g.screen}>
        <Stack.Screen options={{ title: t('handbook.title') }} />
        <EmptyState title={t('handbook.empty')} />
      </View>
    );
  }

  return (
    <View style={g.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
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
      </ScrollView>

      {/* Pinned rather than scrolled to. It was the last thing on a long page, which on a topic
          this length meant it was the thing nobody reached. */}
      <FooterCta inset={insets.bottom}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable
            disabled={starting}
            onPress={() => void ask('consultant', `${t('topic.seedExplain')} ${about}`)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.blue + '1A', borderColor: colors.blue, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Sparkles size={16} color={colors.blue} />
            <Text style={[styles.actionLabel, { color: colors.blue }]} numberOfLines={1}>
              {t('topic.explainSimply')}
            </Text>
          </Pressable>

          <Pressable
            disabled={starting}
            onPress={() => void ask('study_buddy', `${t('topic.seedQuiz')} ${about}`)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.indigo + '1A', borderColor: colors.indigo, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <ClipboardList size={16} color={colors.indigo} />
            <Text style={[styles.actionLabel, { color: colors.indigo }]} numberOfLines={1}>
              {t('topic.quizMe')}
            </Text>
          </Pressable>

          <Pressable
            disabled={starting}
            onPress={() => void ask('consultant', `${t('topic.seedCards')} ${about}`)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.green + '1A', borderColor: colors.green, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Layers size={16} color={colors.green} />
            <Text style={[styles.actionLabel, { color: colors.green }]} numberOfLines={1}>
              {t('topic.makeCards')}
            </Text>
          </Pressable>
        </View>
      </FooterCta>
    </View>
  );
}
