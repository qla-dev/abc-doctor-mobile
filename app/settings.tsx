import { ModePicker } from '@/components/mark/ModePicker';
import { useAuth } from '@/context/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronRight, Moon, ShoppingBag, Smartphone, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
import { Auth, type AccountInfo, type SignInMethod } from '@/services/auth';
import { SignInMethodRow } from '@/components/auth/SignInMethodRow';
import type { ThemeMode } from '@/theme/colors';
import type { Language } from '@/i18n';

function AccountRow({ label, value, onPress }: { label: string; value?: string | null; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => { void Haptics.selectionAsync(); onPress?.(); }}
        disabled={!onPress}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingVertical: 13, paddingHorizontal: 14, minHeight: 48,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 180 }}>
          <Text style={{ color: value ? colors.secondaryText : colors.muted, fontSize: 14 }} numberOfLines={1}>
            {value || 'Nije postavljeno'}
          </Text>
          {onPress && <ChevronRight size={14} color={colors.muted} />}
        </View>
      </Pressable>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 14 }} />
    </>
  );
}

function EditNameSheet({ currentName, onSaved, onCancel }: { currentName: string; onSaved: (name: string) => void; onCancel: () => void }) {
  const { colors } = useTheme();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed !== currentName;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await Auth.updateProfile({ name: trimmed });
      onSaved(trimmed);
    } catch (e: any) {
      Alert.alert('Greška', e?.message ?? 'Pokušajte ponovo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Ime</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Unesite ime"
        placeholderTextColor={colors.muted}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void save()}
        style={{
          color: colors.text, fontSize: 16, backgroundColor: colors.input,
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        }}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppButton label="Odustani" tone="secondary" onPress={onCancel} full />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton
            label={saving ? 'Sprema se…' : 'Spremi'}
            onPress={() => void save()}
            disabled={!valid || saving}
            full
          />
        </View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const { t, language, setLanguage, languages } = useLanguage();
  const router = useRouter();
  const g = createGlobalStyles(colors);
  const [, forceRender] = useState(0);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [editingName, setEditingName] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const data = await Auth.me();
      setAccount(data);
    } catch {}
  }, []);

  useEffect(() => { void loadAccount(); }, [loadAccount]);

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

  const methods: SignInMethod[] = account?.sign_in_methods ?? [];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={g.screen} contentContainerStyle={g.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('common.settings') }} />

      {/* ── Korisničko ime ─────────────────────────────────── */}
      <SectionHeader title="Korisničko ime" />
      {editingName && account ? (
        <AppCard>
          <EditNameSheet
            currentName={account.name}
            onSaved={(newName) => {
              setAccount(prev => prev ? { ...prev, name: newName } : prev);
              setEditingName(false);
              void loadAccount();
            }}
            onCancel={() => setEditingName(false)}
          />
        </AppCard>
      ) : (
        <List>
          <AccountRow
            label="Ime"
            value={account?.name ?? user?.name}
            onPress={() => setEditingName(true)}
          />
          <AccountRow label="Email" value={account?.email ?? user?.email} />
        </List>
      )}

      {/* ── Načini prijave ─────────────────────────────────── */}
      <SectionHeader title="Načini prijave" />
      <List>
        {Platform.OS === 'ios' && (
          <SignInMethodRow provider="apple" methods={methods} onUpdated={() => void loadAccount()} />
        )}
        <SignInMethodRow provider="google" methods={methods} onUpdated={() => void loadAccount()} />
      </List>

      {/* ── Trgovina ────────────────────────────────────── */}
      <SectionHeader title="Kupovina" />
      <AppCard onPress={() => router.push('/store')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ShoppingBag size={20} color={colors.blue} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Trgovina</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Poruke, minute i pretplate</Text>
          </View>
          <ChevronRight size={16} color={colors.muted} />
        </View>
      </AppCard>

      <SectionHeader title="Conversation mode" />
      <ModePicker />
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

      <SectionHeader title="" />
      <AppButton label="Odjavi se" onPress={() => void signOut().catch(e => Alert.alert('Greška', e.message))} full />
    </ScrollView>
  );
}
