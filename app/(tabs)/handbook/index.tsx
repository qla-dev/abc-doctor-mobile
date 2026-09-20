import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { FallbackTabHeader, useTabScrollPadding } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useDayControl } from '@/hooks/useDayControl';
import { BookOpen, MessagesSquare, Search, Settings } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { GlassPanel } from '@/components/common/GlassPanel';
import { List } from '@/components/common/List';
import { ListItem } from '@/components/common/ListItem';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { TOPICS_DATA } from '@/data/topicsData';

export default function HandbookScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const bottomPad = useTabScrollPadding();
  const day = useDayControl();
  const usesNativeHeader = useScreenHeader({ title: t('tabs.handbook'),
    leftText: day.leftText,
    right: [
      { sfSymbol: 'bubble.left.and.bubble.right', accessibilityLabel: t('history.title'), identifier: 'history', onPress: () => router.push('/history') },
      { sfSymbol: 'gearshape', accessibilityLabel: t('common.settings'), identifier: 'settings', onPress: () => router.push('/settings') }],
  });
  const g = createGlobalStyles(colors);
  // Seeded by Home's specialty row, so tapping a branch there lands here already filtered.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q ?? '');

  const categories = useMemo(
    () => Array.from(new Set(TOPICS_DATA.map(topic => topic.category))),
    []
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TOPICS_DATA;
    // Search the clinical body too, not just the title: students look for a finding or a drug
    // far more often than they look for the name of the disease.
    return TOPICS_DATA.filter(topic =>
      [topic.title, topic.subtitle, topic.category, topic.overview,
       ...topic.clinicalPresentation.symptoms].join(' ').toLowerCase().includes(needle)
    );
  }, [query]);

  const styles = StyleSheet.create({
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 11 },
    input: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
    count: { color: colors.muted, fontSize: 12.5 },
  });

  return (
    <View style={g.screen} collapsable={false}>
      <FallbackTabHeader
        title={t('tabs.handbook')}
        dateLabel={day.dateLabel}
        onDatePress={day.onDatePress}
        chooseDateLabel={day.chooseDateLabel}
        right={[{
          icon: <MessagesSquare size={21} color={colors.blue} />,
          accessibilityLabel: t('history.title'),
          onPress: () => router.push('/history'),
        }, {
          icon: <Settings size={21} color={colors.blue} />,
          accessibilityLabel: t('common.settings'),
          onPress: () => router.push('/settings'),
        }]}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior={usesNativeHeader ? 'automatic' : 'never'}
        automaticallyAdjustsScrollIndicatorInsets={usesNativeHeader}
        contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <GlassPanel radius={14}>
            <View style={styles.searchRow}>
              <Search size={17} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('handbook.search')}
                placeholderTextColor={colors.muted}
                style={styles.input}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          </GlassPanel>
        </View>

        <View style={g.scrollContent}>
          <SectionHeader
            title={`${categories.length} ${t('handbook.allCategories')}`}
            action={<Text style={styles.count}>{results.length}</Text>}
          />
          {results.length === 0 ? (
            <EmptyState icon={<BookOpen size={34} color={colors.muted} />} title={t('handbook.empty')} />
          ) : (
            <List>
              {results.map((topic, index) => (
                <ListItem
                  key={topic.id}
                  title={topic.title}
                  subtitle={topic.subtitle}
                  trailing={<Badge label={topic.category} tone="indigo" />}
                  onPress={() => router.push(`/topic/${topic.id}`)}
                  last={index === results.length - 1}
                />
              ))}
            </List>
          )}
        </View>
      </ScrollView>
      {/* No footer here. A quiz or a set of cards is made OF something, and on this screen
          nothing has been chosen yet — the same two commands sit at the foot of every topic,
          where they know what they are about. */}
      {day.sheet}
    </View>
  );
}
