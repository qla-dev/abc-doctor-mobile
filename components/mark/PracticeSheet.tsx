import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Award, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { CustomBottomSheet } from '@/components/common/Sheets';
import { Practice, type Attempt } from '@/services/practice';

export function PracticeSheet({ open, onClose, conversationId }: {
  open: boolean;
  onClose: () => void;
  conversationId: number;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    if (!open || !conversationId) return;
    Practice.attempt(conversationId).then(setAttempt).catch(() => {});
  }, [open, conversationId]);

  const goToFull = useCallback(() => {
    void Haptics.selectionAsync();
    onClose();
    router.push({ pathname: '/practice', params: { conversationId: String(conversationId) } });
  }, [conversationId, onClose]);

  const styles = StyleSheet.create({
    brief: { color: colors.text, fontSize: 15, lineHeight: 22 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    statusText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    fullBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 13, borderRadius: 14, backgroundColor: colors.blue, marginTop: 12,
    },
    fullText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  });

  return (
    <CustomBottomSheet open={open} onClose={onClose} title={t('sim.practiceDetails')}>
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {!attempt ? (
          <ActivityIndicator color={colors.blue} style={{ marginVertical: 16 }} />
        ) : (
          <>
            {attempt.brief ? <Text style={styles.brief}>{attempt.brief}</Text> : null}
            <View style={styles.status}>
              <Award size={15} color={colors.muted} />
              <Text style={styles.statusText}>{attempt.status}</Text>
              {attempt.report?.score != null ? (
                <Text style={[styles.statusText, { color: colors.blue, fontWeight: '800' }]}>{attempt.report.score}%</Text>
              ) : null}
            </View>
            <Pressable onPress={goToFull} style={styles.fullBtn} accessibilityRole="button">
              <Text style={styles.fullText}>{t('sim.practiceDetails')}</Text>
              <ChevronRight size={16} color="#FFF" />
            </Pressable>
          </>
        )}
      </BottomSheetScrollView>
    </CustomBottomSheet>
  );
}
