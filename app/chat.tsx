import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AudioLines, ChevronLeft, Send, Sparkles } from 'lucide-react-native';
import { darkColors } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';
import { GlassPanel } from '@/components/common/GlassPanel';
import { ApiError } from '@/lib/api';
import { Nina } from '@/services/nina';
import { playClickSound } from '@/lib/sound';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

// The chat surface is always dark, whatever the system theme: it is an immersive full-bleed
// conversation, not a themed settings screen. freightbook's Lena screen takes the same line.
const c = darkColors;

export default function ChatScreen() {
  const { skill, seed } = useLocalSearchParams<{ skill?: string; seed?: string }>();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);

  const [draft, setDraft] = useState(seed ?? '');
  const [messages, setMessages] = useState<Message[]>([]);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * A call needs a thread to hold it. This button used to open the call screen with nothing
   * behind it — no conversation id, so the session was never even cut and the orb sat there
   * connecting to nothing. It opens a spoken consultation instead and hands it to the
   * conversation screen, which is where the turns land as they are said.
   */
  const talk = async () => {
    if (placing) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlacing(true);
    try {
      const thread = await Nina.startConversation('consultant', 'voice');
      // replace, not push: nothing here survives the call, and a back chevron onto an empty
      // prototype chat is not a destination.
      router.replace({ pathname: '/nina', params: { conversationId: String(thread.id), autoVoice: '1' } });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setPlacing(false);
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    void playClickSound();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages((current) => [...current, { id: String(Date.now()), role: 'user', text }]);
    setDraft('');
    requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
  };

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: insets.top + 8, paddingHorizontal: 12, paddingBottom: 10,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    back: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.input,
    },
    title: { color: c.text, fontSize: 17, fontWeight: '700', flex: 1 },
    skillTag: { color: c.blue, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    error: { color: c.red, fontSize: 13, paddingHorizontal: 16, paddingBottom: 6 },
    thread: { padding: 16, gap: 12, paddingBottom: 24 },
    bubbleUser: {
      alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.blue,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderBottomRightRadius: 6,
    },
    bubbleAssistant: {
      alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: c.card,
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderBottomLeftRadius: 6,
    },
    userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
    assistantText: { color: c.text, fontSize: 15, lineHeight: 21 },
    empty: { alignItems: 'center', gap: 10, paddingTop: 80, paddingHorizontal: 40 },
    emptyTitle: { color: c.text, fontSize: 19, fontWeight: '700', textAlign: 'center' },
    emptyBody: { color: c.muted, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
    composerWrap: { paddingHorizontal: 12, paddingBottom: insets.bottom + 10 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
    input: { flex: 1, color: c.text, fontSize: 15.5, maxHeight: 110, paddingTop: 8, paddingBottom: 8 },
    circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  });

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable
          onPress={() => { void playClickSound(); router.back(); }}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        >
          <ChevronLeft size={21} color={c.text} />
        </Pressable>
        <Text style={styles.title}>{t('ai.title')}</Text>
        {skill ? <Text style={styles.skillTag}>{skill}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView ref={scroller} contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Sparkles size={30} color={c.blue} />
            <Text style={styles.emptyTitle}>{t('ai.title')}</Text>
            <Text style={styles.emptyBody}>{t('ai.disclaimer')}</Text>
          </View>
        ) : (
          messages.map((message) => (
            <View key={message.id} style={message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}>
              <Text style={message.role === 'user' ? styles.userText : styles.assistantText}>{message.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.composerWrap}>
        <GlassPanel radius={24}>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('ai.placeholder')}
              placeholderTextColor={c.muted}
              style={styles.input}
              multiline
            />
            {/* Voice sits beside send, not behind a menu: it is a peer way to ask, not a setting. */}
            <Pressable
              onPress={() => void talk()}
              disabled={placing}
              accessibilityRole="button"
              accessibilityLabel={t('simulator.voiceCall')}
              style={({ pressed }) => [styles.circle, { backgroundColor: c.input, opacity: pressed ? 0.6 : 1 }]}
            >
              <AudioLines size={18} color={c.text} />
            </Pressable>
            <Pressable
              onPress={send}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.circle,
                { backgroundColor: c.blue, opacity: !draft.trim() ? 0.35 : pressed ? 0.7 : 1 },
              ]}
            >
              <Send size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </GlassPanel>
      </View>
    </KeyboardAvoidingView>
  );
}
