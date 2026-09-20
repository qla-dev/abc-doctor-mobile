import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Stack } from 'expo-router';
import { Mic, Send } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { createGlobalStyles } from '@/theme/styles';
import { AppCard } from '@/components/common/AppCard';
import { SectionHeader } from '@/components/common/SectionHeader';
import { API_BACKEND, API_BASE_URL, ApiError } from '@/lib/api';
import { modesOf, Nina, type Modality, type NinaMessage, type NinaSkill } from '@/services/nina';

const MODE_LABEL: Record<ReturnType<typeof modesOf>, string> = {
  text: 'samo tekst',
  voice: 'samo glas',
  both: 'tekst i glas',
  none: 'ništa',
};

/**
 * The smallest thing that exercises the whole protocol: list the skills, open a thread in one,
 * send a turn, show what Nina sends back. No styling beyond what the app already has.
 *
 * It names the backend it is talking to at the top, because the first question when nothing
 * answers is always "which one is it pointed at".
 */
export default function NinaScreen() {
  const { colors } = useTheme();
  const g = createGlobalStyles(colors);

  const [skills, setSkills] = useState<NinaSkill[]>([]);
  const [skill, setSkill] = useState<NinaSkill | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<NinaMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Nina.skills().then(setSkills).catch((e: ApiError) => setError(e.message));
  }, []);

  const choose = useCallback(async (next: NinaSkill) => {
    setError(null);
    setBusy(true);
    try {
      const conversation = await Nina.startConversation(next.key);
      setSkill(next);
      setConversationId(conversation.id);
      setMessages([]);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const send = useCallback(async (modality: Modality) => {
    const body = draft.trim();
    if (!body || conversationId === null) return;
    setError(null);
    setBusy(true);
    try {
      const { sent, reply } = await Nina.send(conversationId, body, modality);
      setMessages(current => [...current, sent, reply]);
      setDraft('');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }, [conversationId, draft]);

  const styles = StyleSheet.create({
    backend: { color: colors.muted, fontSize: 12, marginBottom: 4 },
    skillName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    skillMeta: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
    error: { color: colors.red, fontSize: 13.5 },
    bubble: { padding: 11, borderRadius: 14, maxWidth: '85%' },
    mine: { alignSelf: 'flex-end', backgroundColor: colors.blue },
    hers: { alignSelf: 'flex-start', backgroundColor: colors.card },
    mineText: { color: '#FFFFFF', fontSize: 14.5 },
    hersText: { color: colors.text, fontSize: 14.5 },
    composer: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 10, margin: 16,
      borderRadius: 18, backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator,
    },
    input: { flex: 1, color: colors.text, fontSize: 15, maxHeight: 90, padding: 0 },
    button: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  });

  const mode = skill ? modesOf(skill) : 'none';

  return (
    <KeyboardAvoidingView style={g.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Nina AI' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={styles.backend}>{API_BACKEND} · {API_BASE_URL}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SectionHeader title="Vještina" />
        {skills.map(item => {
          const selected = item.id === skill?.id;
          return (
            <AppCard
              key={item.id}
              onPress={() => choose(item)}
              style={selected ? { borderColor: colors.blue, borderWidth: 1 } : undefined}
            >
              <Text style={styles.skillName}>{item.name}</Text>
              <Text style={styles.skillMeta}>
                {item.key} · {MODE_LABEL[modesOf(item)]}
              </Text>
              {item.description ? <Text style={styles.skillMeta}>{item.description}</Text> : null}
            </AppCard>
          );
        })}

        {conversationId !== null ? (
          <>
            <SectionHeader title={`Razgovor #${conversationId}`} />
            {messages.length === 0 ? (
              <Text style={styles.skillMeta}>Pošalji nešto pa da vidimo šta Nina kaže.</Text>
            ) : null}
            {messages.map(message => {
              const mine = message.role === 'user';
              return (
                <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.hers]}>
                  <Text style={mine ? styles.mineText : styles.hersText}>{message.body}</Text>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      {conversationId !== null ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={mode === 'voice' ? 'Diktiraj (za sada se kuca)…' : 'Napiši poruku…'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            multiline
          />
          {busy ? <ActivityIndicator color={colors.blue} /> : null}
          {/* The buttons follow the skill's own flags rather than a guess, so a voice-only skill
              offers no text send and the server never has to refuse one. */}
          {skill?.supports_text ? (
            <Pressable
              onPress={() => send('text')}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Pošalji tekst"
              style={[styles.button, { backgroundColor: colors.blue }]}
            >
              <Send size={16} color="#FFFFFF" />
            </Pressable>
          ) : null}
          {skill?.supports_voice ? (
            <Pressable
              onPress={() => send('voice')}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Pošalji kao glas"
              style={[styles.button, { backgroundColor: colors.indigo }]}
            >
              <Mic size={16} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
