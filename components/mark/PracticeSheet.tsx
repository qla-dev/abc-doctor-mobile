import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Award, CheckCircle, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { CustomBottomSheet, FooterCta } from '@/components/common/Sheets';
import { AppButton } from '@/components/common/AppButton';
import { Practice, type Attempt } from '@/services/practice';

export function PracticeSheet({ open, onClose, conversationId, workflowName, onFinish, finishDisabled }: {
  open: boolean;
  onClose: () => void;
  conversationId: number;
  workflowName: string | null;
  onFinish: () => Promise<void>;
  finishDisabled: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !conversationId) return;
    let alive = true;
    setAttempt(null);
    setError('');
    Practice.attempt(conversationId)
      .then(value => { if (alive) setAttempt(value); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [open, conversationId]);

  const goToFull = useCallback(() => {
    void Haptics.selectionAsync();
    onClose();
    router.push({ pathname: '/practice', params: { conversationId: String(conversationId) } });
  }, [conversationId, onClose]);

  const finish = async () => {
    if (finishing || finishDisabled) return;
    setFinishing(true);
    setError('');
    void Haptics.selectionAsync();
    try {
      await onFinish();
      goToFull();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFinishing(false);
    }
  };

  const styles = StyleSheet.create({
    workflow: { backgroundColor: colors.blue + '12', borderRadius: 12, padding: 12, marginBottom: 14, gap: 4 },
    workflowLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    workflowName: { color: colors.blue, fontSize: 16, lineHeight: 22, fontWeight: '700' },
    brief: { color: colors.text, fontSize: 15, lineHeight: 22 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    statusText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    error: { color: colors.red, fontSize: 13, lineHeight: 19, marginTop: 12 },
  });

  return (
    <CustomBottomSheet
      open={open}
      onClose={onClose}
      title={t('sim.practiceDetails')}
      scrollable
      footer={attempt ? (
        <FooterCta surface="sheet">
          {attempt.status === 'active' ? (
            <AppButton
              label={t(finishing ? 'sim.finishingPractice' : 'sim.finishPractice')}
              onPress={() => void finish()}
              disabled={finishDisabled}
              loading={finishing}
              icon={<CheckCircle size={18} color="#FFF" />}
              glass rounded full
            />
          ) : null}
          <AppButton
            label={t('sim.practiceDetails')}
            onPress={goToFull}
            disabled={finishing}
            tone={attempt.status === 'active' ? 'secondary' : 'primary'}
            trailingIcon={<ChevronRight size={16} color={attempt.status === 'active' ? colors.text : '#FFF'} />}
            glass rounded full
          />
        </FooterCta>
      ) : undefined}
      >
        {workflowName ? (
          <View style={styles.workflow}>
            <Text style={styles.workflowLabel}>{t('sim.practiceType')}</Text>
            <Text style={styles.workflowName}>{workflowName}</Text>
          </View>
        ) : null}
        {!attempt && !error ? (
          <ActivityIndicator color={colors.blue} style={{ marginVertical: 16 }} />
        ) : attempt ? (
          <>
            {attempt.brief ? <Text style={styles.brief}>{attempt.brief}</Text> : null}
            <View style={styles.status}>
              <Award size={15} color={colors.muted} />
              <Text style={styles.statusText}>{attempt.status}</Text>
              {attempt.report?.score != null ? (
                <Text style={[styles.statusText, { color: colors.blue, fontWeight: '800' }]}>{attempt.report.score}%</Text>
              ) : null}
            </View>
          </>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </CustomBottomSheet>
  );
}
