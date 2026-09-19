import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Search } from 'lucide-react-native';
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
  const insets = useSafeAreaInsets();
  const g = createGlobalStyles(colors);
  const [query, setQuery] = useState('');

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
    header: { paddingTop: insets.top + 12, paddingHorizontal: 16, gap: 12 },
    title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.9 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 11 },
    input: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
    count: { color: colors.muted, fontSize: 12.5 },
  });

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('handbook.title')}</Text>
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

      <View style={[g.scrollContent, { paddingTop: 14 }]}>
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
  );
}
