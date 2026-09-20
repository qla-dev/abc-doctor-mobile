import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { MessageSquare, Mic } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { ApiError } from '@/lib/api';
import { Nina, type NinaConversation } from '@/services/nina';
import { formatDateLabel, localeFor, toDateString } from '@/lib/dateLabel';

/**
 * Every thread Nina has held, newest first, and a way back into any of them.
 *
 * Re-reads on focus rather than once on mount: a consultation started, backed out of, and looked
 * for here a second later has to be in the list, and it was not there when this screen first ran.
 */
export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const g = createGlobalStyles(colors);

  const [threads, setThreads] = useState<NinaConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setThreads(await Nina.conversations());
      setError(null);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  /**
   * Every thread goes back to the same screen. The simulator used to have a room of its own for
   * the vitals and the two action buttons; the chat carries those itself now, so a case is just
   * a conversation with a patient in it.
   */
  const reopen = (thread: NinaConversation) => {
    router.push({ pathname: '/nina', params: { conversationId: String(thread.id) } });
  };

  const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    title: { color: colors.text, fontSize: 15, fontWeight: '700' },
    meta: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
    error: { color: colors.red, fontSize: 13.5 },
  });

  return (
    <View style={g.screen}>
      <Stack.Screen options={{ title: t('history.title') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.blue}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {threads === null && !error ? <ActivityIndicator color={colors.blue} /> : null}

        {threads?.length === 0 ? (
          <EmptyState title={t('history.empty')} />
        ) : null}

        {threads?.map(thread => {
          const day = thread.last_message_at
            ? formatDateLabel(toDateString(new Date(thread.last_message_at)), t, localeFor(language))
            : null;
          const spoken = thread.modality === 'voice';

          return (
            <AppCard key={thread.id} onPress={() => reopen(thread)}>
              <View style={styles.row}>
                {spoken
                  ? <Mic size={19} color={colors.indigo} />
                  : <MessageSquare size={19} color={colors.blue} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {thread.title ?? thread.skill?.name ?? `#${thread.id}`}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[thread.skill?.name, day, thread.context].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Badge label={spoken ? t('setup.modeVoice') : t('setup.modeText')} tone={spoken ? 'indigo' : 'blue'} />
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </View>
  );
}
