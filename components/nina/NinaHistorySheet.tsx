import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MessageSquare, Mic } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CustomBottomSheet } from '@/components/common/Sheets';
import { ApiError } from '@/lib/api';
import { Nina, type NinaConversation } from '@/services/nina';

/**
 * Every thread Nina has held, over the one you are in — Lena keeps its history a tap from the
 * header for the same reason. Picking a skill always opens a new chat, so without this the
 * previous one is only reachable by leaving the conversation entirely.
 *
 * Fetched when it opens rather than held by the screen: it is a list that goes stale the moment
 * anyone says anything, and nothing behind the sheet needs it.
 */
export function NinaHistorySheet({ open, onClose, activeId, onSelect }: {
  open: boolean;
  onClose: () => void;
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [threads, setThreads] = useState<NinaConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setThreads(null);
    Nina.conversations()
      .then(list => { if (alive) { setThreads(list); setError(null); } })
      .catch((e: ApiError) => { if (alive) setError(e.message); });

    return () => { alive = false; };
  }, [open]);

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 11,
      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11,
    },
    icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
    title: { color: colors.text, fontSize: 14, fontWeight: '700' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    time: { color: colors.muted, fontSize: 10 },
    empty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
    emptyText: { color: colors.muted, fontSize: 13 },
    error: { color: colors.red, fontSize: 13.5 },
  });

  return (
    <CustomBottomSheet open={open} onClose={onClose} title={t('history.title')}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!threads && !error ? <ActivityIndicator color={colors.blue} style={{ marginVertical: 28 }} /> : null}
      {threads?.length === 0 ? (
        <View style={styles.empty}>
          <MessageSquare color={colors.muted} size={22} />
          <Text style={styles.emptyText}>{t('history.empty')}</Text>
        </View>
      ) : null}

      <BottomSheetScrollView contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
        {threads?.map(thread => {
          const active = thread.id === activeId;
          const spoken = thread.modality === 'voice';

          return (
            <Pressable
              key={thread.id}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(thread.id);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: active || pressed ? colors.input : 'transparent' },
              ]}
            >
              <View style={styles.icon}>
                {spoken
                  ? <Mic color={active ? colors.blue : colors.muted} size={16} />
                  : <MessageSquare color={active ? colors.blue : colors.muted} size={16} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.title}>
                  {thread.title ?? thread.skill?.name ?? t('ai.title')}
                </Text>
                <Text numberOfLines={1} style={styles.meta}>{thread.skill?.name ?? ''}</Text>
              </View>
              {/* The clock alone: a list of threads from today does not need the date on each row. */}
              <Text style={styles.time}>{thread.last_message_at?.slice(11, 16) ?? ''}</Text>
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </CustomBottomSheet>
  );
}
