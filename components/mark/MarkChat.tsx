import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { ModePicker } from './ModePicker';
import { resolveMode, type ConversationMode } from '@/lib/conversationMode';
import { useConversationPreferences, currentMode, conversationKey, conversationStorage } from '@/stores/conversationPreferences';
import { useDeviceSpeech } from '@/lib/deviceSpeech';
import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
  type ScrollViewInstance, type StyleProp, type TextStyle,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, MessageSquare, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { FallbackTabHeader } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useNativeIOSHeadersActive } from '@/lib/nativeTabBarPreference';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TypingText } from '@/components/common/TypingText';
import { MarkCallBar } from '@/components/mark/MarkCallBar';
import {
  MarkComposer, useKeyboardHeight, type MarkComposerHandle,
} from '@/components/mark/MarkComposer';
import { SymptomsSheet } from '@/components/mark/SymptomsSheet';
import { MarkThinking } from '@/components/mark/MarkThinking';
import { SkillSheet } from '@/components/mark/SkillSheet';
import type { CaseSetup } from '@/lib/caseGenerator';
import { MarkHistorySheet } from '@/components/mark/MarkHistorySheet';
import { ApiError } from '@/lib/api';
import { usePurchaseState } from '@/hooks/usePurchases';
import { CreditLimitNotice } from '@/components/mark/CreditLimitNotice';
import {
  introFor, Mark,
  type Modality, type MarkConversation, type MarkMessage, type MarkSkill,
} from '@/services/mark';

/**
 * A turn that is on screen before it is on the server.
 *
 * Lena's chat does exactly this, for the same reason: a message that only appears once the round
 * trip finishes makes the app look like it dropped what you said — and a spoken turn would not
 * appear at all until something thought to refetch. Negative ids keep these apart from stored
 * rows, which are always positive, so the two can share one list without colliding.
 */
type Pending = MarkMessage & { pending: 'sending' | 'failed' | 'local' };

/** How far off the end still counts as being at it, before the thread stops following itself. */
const AT_BOTTOM = 60;

/** Appends stored messages, skipping any already held — a reload can race a save in flight. */
function merge(current: MarkMessage[], arriving: MarkMessage[]): MarkMessage[] {
  const held = new Set(current.map(message => message.id));

  return [...current, ...arriving.filter(message => !held.has(message.id))];
}

/** What a screen hosting the chat can ask it to do, for the inputs the chat does not own. */
export type MarkChatHandle = {
  /** Put a thread on screen. `seed` is its first turn, `call` opens the line as it lands. */
  open: (thread: MarkConversation, options?: { seed?: string; call?: boolean }) => void;
  /** Send a turn from an input somewhere else — the tab bar's search field is one. */
  send: (text: string) => void;
  /** Back to no conversation, so the host can show whatever it shows instead. */
  reset: () => void;
};

export type MarkChatProps = {
  /** A thread to open on mount, for a screen that is reached with one already chosen. */
  conversationId?: string;
  /** '1' when whoever handed the thread over has already asked for the call. */
  autoVoice?: string;
  /** A question asked before the thread existed, delivered as its first turn. */
  seed?: string;
  /** False when the text comes from somewhere else, such as the tab bar's search field. */
  composer?: boolean;
  /** False when the host screen already owns the bar — two hooks cannot write the same one. */
  header?: boolean;
  /** What stands in for the thread before there is one: a greeting, the skills, a form. */
  empty?: ReactNode;
};

/**
 * One conversation, whatever it is being held in and wherever it is being held.
 *
 * The skill and the mode are chosen before a thread reaches this: by the Mark tab, by history,
 * by the mic on another screen. A skill that opens has spoken by the time it arrives, so the
 * first bubble is his.
 *
 * Everything a conversation can be lives here — turns typed and spoken, the call over the top of
 * them, the history behind the corner of the header, the vitals and actions of a simulated
 * patient — which is why it is a component and not a screen: the tab is the same conversation
 * before it has started, and it would otherwise have to build all of it a second time.
 */
export const MarkChat = forwardRef<MarkChatHandle, MarkChatProps>(function MarkChat({
  conversationId,
  autoVoice,
  seed,
  composer = true,
  header = true,
  empty,
}, handle) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const g = createGlobalStyles(colors);
  const { data: purchaseState } = usePurchaseState();
  const noMessages = purchaseState != null && purchaseState.messages <= 0;
  const noVoice = purchaseState != null && purchaseState.voice_minutes <= 0;
  const creditLimit = noMessages && noVoice ? 'both' : noMessages ? 'messages' : noVoice ? 'voice' : null;

  const [conversation, setConversation] = useState<MarkConversation | null>(null);
  const [messages, setMessages] = useState<MarkMessage[]>([]);
  const [draft, setDraft] = useState('');
  const mode = useConversationPreferences(state => state.mode);
  const effective = resolveMode(mode, conversation?.skill);
  const activeMode = useRef(mode);
  activeMode.current = mode;
  const activeScreen = useRef(true);
  const speech = useDeviceSpeech({ mode, conversationId: conversation?.id, language,
    onText: text => submit(text, 'voice'), onError: message => setError(message) });
  const speechNow = useRef(speech);
  speechNow.current = speech;
  const changeDraft = (text: string) => {
    setDraft(text);
    if (threadId.current) conversationStorage.set(conversationKey(`draft:${threadId.current}`), text);
  };

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Mark's turns are revealed as they land; a thread you are re-opening is not. Lena draws the
   * line in the same place — replaying a week-old consultation character by character is a wait,
   * not an effect. `seen` is every message id this screen has already rendered, and exactly one
   * message types at a time: the one that just arrived.
   */
  const seen = useRef(new Set<number>());
  const [typingId, setTypingId] = useState<number | null>(null);

  const [pending, setPending] = useState<Pending[]>([]);
  /** Counts down, so an optimistic id can never be mistaken for a stored one. */
  const nextPendingId = useRef(-1);

  /** The call, when there is one. It runs over the thread rather than in place of it. */
  const drainCall = useRef<(() => Promise<void>) | null>(null);
  const registerDrain = useCallback((drain: (() => Promise<void>) | null) => { drainCall.current = drain; }, []);
  const [calling, setCalling] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  /** What Mark can be, for the sheet behind the plus in the composer. */
  const [skills, setSkills] = useState<MarkSkill[]>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  /**
   * The bar, for the keyboard rather than for the text.
   *
   * A bottom sheet and the keyboard both open from the bottom of the screen, and neither knows
   * about the other: raising the skills over a keyboard that is already up puts the sheet behind
   * it, with the title showing above the keys and the skills themselves unreachable.
   */
  const bar = useRef<MarkComposerHandle>(null);
  /** True when the skill being started is a spoken one, so the keyboard stays down for the call. */
  const spokenSkill = useRef(false);

  const openSkills = useCallback(() => {
    spokenSkill.current = false;
    bar.current?.blur();
    setSkillsOpen(true);
  }, []);

  const closeSkills = useCallback(() => {
    setSkillsOpen(false);
    // Back where you were. The sheet was opened from the bar, whether it was closed by picking
    // something or by tapping past it, so the bar is where the sheet hands control back.
    if (!spokenSkill.current) bar.current?.focus();
  }, []);

  const openHistory = useCallback(() => {
    bar.current?.blur();
    setHistoryOpen(true);
  }, []);

  /** Typing grows the thread a character at a time, so the list has to follow it down. */
  const scroller = useRef<ScrollViewInstance>(null);

  /**
   * What following has to know first: how tall the list is, how tall the thread in it is, and
   * whether it is already at the bottom. All three are refs — they are read inside a scroll
   * handler and a layout callback, and a re-render per scroll event is a re-render of the whole
   * conversation.
   */
  const viewport = useRef(0);
  const content = useRef(0);
  const atBottom = useRef(true);

  /**
   * The bottom bar measures itself and the thread ends with a gap that size, so the last turn
   * clears it — and the gap grows with the keyboard, because the bar rises with it.
   */
  const [barHeight, setBarHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const tail = useAnimatedStyle(() => ({
    height: barHeight + Math.max(insets.bottom, keyboard.value) + 12,
  }));

  /**
   * The open thread's id, held where a callback can read it without naming it as a dependency —
   * a send or a save that re-created itself on every message would be a new function mid-flight.
   */
  const threadId = useRef<number | null>(null);
  const conversationNow = useRef(conversation);
  conversationNow.current = conversation;
  useEffect(() => { setCalling(false); setError(null); speechNow.current.stop(); }, [mode]);
  useFocusEffect(useCallback(() => {
    activeScreen.current = true;
    return () => { activeScreen.current = false; setCalling(false); speechNow.current.stop(); };
  }, []));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      activeScreen.current = state === 'active';
      if (state !== 'active') { setCalling(false); speechNow.current.stop(); }
      else if (threadId.current) void reload(threadId.current);
    });
    return () => listener.remove();
  }, []);


  /**
   * Arriving with a thread means this screen is a chat, and it is a chat from the first frame.
   * Deciding that from `conversation` instead let the picker render for the one render before the
   * thread came back — which is how opening Konsultant flashed the whole catalogue first.
   */
  /**
   * Pulls the thread down again. This screen is not the only thing writing to it — a voice call
   * saves every turn it hears straight to the server — so what is on screen goes stale the moment
   * anyone speaks. Everything that comes back counts as seen: those turns were already said out
   * loud, and typing them out now would be a replay of the conversation you just had.
   */
  const loadVersion = useRef(0);
  const reload = useCallback(async (id: number) => {
    const version = ++loadVersion.current;
    threadId.current = id;
    try {
      try { await Mark.flushTranscripts(id); } catch { /* Keep unsent turns visible for retry. */ }
      const thread = await Mark.conversation(id);
      if (version !== loadVersion.current) return;
      threadId.current = id;
      setDraft(conversationStorage.getString(conversationKey(`draft:${id}`)) ?? '');
      setConversation(thread);
      const loaded = thread.messages ?? [];
      seen.current = new Set(loaded.map(message => message.id));
      // A thread opens at its latest turn, whatever the last one you were reading was scrolled to.
      atBottom.current = true;
      setMessages(loaded);
      // What came back is the thread. A bubble still queued against it is either in there
      // already or belongs to the thread being left behind — but a local note is neither: the
      // server has never heard of it, so a reload cannot bring it back and does not take it away.
      setPending(Mark.pending().filter(entry => entry.conversation_id === id).map(entry => ({
        id: nextPendingId.current--, conversation_id: id, body: String(entry.payload.body),
        role: entry.payload.role === 'assistant' ? 'assistant' : 'user',
        modality: entry.path === '/messages' ? resolveMode(entry.payload.mode as ConversationMode).input : 'voice',
        sent_at: new Date().toISOString(), pending: 'failed',
        meta: { turn_id: entry.key, mode: entry.payload.mode, transcript: entry.path !== '/messages', item_id: entry.key },
      })));

    } catch (e) {
      setError((e as ApiError).message);
    }
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    void reload(Number(conversationId));
  }, [conversationId, reload]);

  useEffect(() => { threadId.current = conversation?.id ?? null; }, [conversation]);

  const returning = useRef(false);
  useFocusEffect(useCallback(() => {
    // The first focus is the mount, which has just fetched, or has nothing to fetch yet. The id
    // comes from the ref and not the deps, or a thread started here would re-focus the moment it
    // is created and refetch over its own opening line — which would come back marked as seen
    // and never type.
    if (!returning.current) { returning.current = true; return; }
    if (threadId.current !== null) void reload(threadId.current);
  }, [reload]));

  /**
   * Puts a bubble in the thread straight away and hands it back so it can be delivered. A
   * `local` one is not going anywhere: examine and investigations read the case on this device
   * and have no endpoint behind them, so those findings are on screen and nowhere else.
   */
  const queue = useCallback((
    role: MarkMessage['role'],
    body: string,
    modality: Modality,
    state: Pending['pending'] = 'sending',
    /** The thread it belongs to, for a turn queued in the same breath as the thread opening. */
    thread: number | null = null,
    meta: MarkMessage['meta'] = null,
  ): Pending => {
    const bubble: Pending = {
      id: nextPendingId.current--,
      conversation_id: thread ?? threadId.current ?? 0,
      role,
      body,
      modality,
      meta: { turn_id: randomUUID(), mode: currentMode(), ...meta },
      sent_at: new Date().toISOString(),
      pending: state,
    };
    // Everything queued here is something you just did — typed a turn, said one, examined the
    // patient — so the thread comes back down to it even if you had scrolled up to read.
    atBottom.current = true;
    setPending(current => [...current, bubble]);

    return bubble;
  }, []);

  /**
   * Puts a written bubble on the wire and swaps it for the stored copy. Both updates go in
   * together: dropping the bubble a render before the saved message lands leaves a frame where
   * the turn is in neither list, and the thread shrinks by a bubble and springs back.
   */
  const deliver = useCallback(async (bubble: Pending) => {
    // The thread comes off the bubble rather than out of state: a question queued in the same
    // breath as the thread opening would otherwise be posted to whatever was open before.
    if (!bubble.conversation_id) return;
    setPending(current => current.map(m => (m.id === bubble.id ? { ...m, pending: 'sending' } : m)));
    setBusy(true);
    try {
      const requestMode = bubble.meta?.mode as ConversationMode ?? currentMode();
      const { sent, reply, opening } = await Mark.send(bubble.conversation_id, bubble.body, bubble.modality, bubble.meta?.turn_id as string, requestMode);
      setPending(current => current.filter(m => m.id !== bubble.id));
      if (threadId.current === bubble.conversation_id) {
        setMessages(current => merge(current, [...(opening ? [opening] : []), sent, reply]));
        if (activeScreen.current && activeMode.current === requestMode && resolveMode(requestMode, conversationNow.current?.skill).output === 'voice') void speechNow.current.speak(reply.body);
      }
      setError(null);
    } catch (e) {
      setError((e as ApiError).message);
      setPending(current => current.map(m => (m.id === bubble.id ? { ...m, pending: 'failed' } : m)));
    } finally {
      setBusy(false);
    }
  }, []);

  /**
   * A call turn, stored behind the bubble that is already showing it. The words were spoken
   * before this ran, so the bubble is the record and the saved copy only takes its place.
   */
  const saveSpoken = useCallback(async (bubble: Pending) => {
    const id = bubble.conversation_id;
    if (!id) return;
    setPending(current => current.map(m => (m.id === bubble.id ? { ...m, pending: 'sending' } : m)));
    try {
      const saved = await Mark.saveTranscript(id, bubble.role === 'assistant' ? 'assistant' : 'user', bubble.body, bubble.meta?.item_id as string | undefined);
      // Heard, not read: the stored copy must not type itself out after the fact.
      setPending(current => current.filter(m => m.id !== bubble.id));
      if (threadId.current === id) {
        seen.current.add(saved.id);
        setMessages(current => merge(current, [saved]));
      }
    } catch {
      // The call is still up; the turn stays on screen as what was said, marked unsaved.
      setPending(current => current.map(m => (m.id === bubble.id ? { ...m, pending: 'failed' } : m)));
    }
  }, []);

  /** Each finished turn of the call, both sides, the moment the words come back. */
  const spoken = useCallback((id: number, role: 'user' | 'assistant', text: string, itemId?: string) => {
    const bubble = queue(role, text, 'voice', 'sending', id, { item_id: itemId ?? randomUUID(), transcript: true });
    void saveSpoken(bubble);
  }, [queue, saveSpoken]);

  /**
   * A thread, from wherever it came: the skills sheet here, or a host screen that opened one.
   * Everything it says is new, so it types, and a spoken one arrives with its line already open.
   */
  const adopt = useCallback((thread: MarkConversation, options?: { seed?: string; call?: boolean }) => {
    loadVersion.current++;
    threadId.current = thread.id;
    setDraft(conversationStorage.getString(conversationKey(`draft:${thread.id}`)) ?? '');
    setConversation(thread);
    seen.current = new Set();
    atBottom.current = true;
    setMessages(thread.messages ?? []);
    setPending([]);
    setError(null);
    setOpened(Boolean(options?.call));
    setCalling(Boolean(options?.call) && currentMode() === 'high_quality_voice');
    const opening = thread.messages?.at(-1);
    if (opening && currentMode() !== 'high_quality_voice' && resolveMode(currentMode(), thread.skill).output === 'voice') void speechNow.current.speak(opening.body);
    if (options?.seed && currentMode() !== 'high_quality_voice') void deliver(queue('user', options.seed, thread.modality, 'sending', thread.id));
  }, [deliver, queue]);

  useEffect(() => {
    Mark.skills().then(setSkills).catch((e: ApiError) => setError(e.message));
  }, []);

  /**
   * Send setup choices once. The server selects and saves the case, and returns its display data.
   */
  const startSkill = useCallback(async (
    /** The skill's key rather than the row: the first thing typed opens a consultation whether
        or not the catalogue has finished loading. */
    key: string,
    modality: Modality,
    setup?: CaseSetup,
    seed?: string,
  ) => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const thread = await Mark.startConversation(key, modality, undefined, undefined, undefined, setup);
      adopt(thread, { seed, call: modality === 'voice' });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setStarting(false);
    }
  }, [adopt, starting, t]);

  /**
   * A turn, however it was made: typed into the box or said into the microphone. Both end up
   * here because they are the same thing by the time they have words — the skill, the thread and
   * the answer do not care which one it was.
   */
  const submit = useCallback((body: string, modality: Modality) => {
    if (!body || busy || starting || noMessages || !effective.compatible || effective.realtime || pending.some(item => item.pending !== 'local')) return;
    if (conversation) {
      void deliver(queue('user', body, modality));

      return;
    }
    // Nothing open yet: what you said opens a consultation and becomes its first turn, so the
    // empty chat does not make you pick something before it will listen.
    void startSkill('consultant', modality, undefined, body);
  }, [busy, conversation, deliver, queue, startSkill, starting, mode, pending]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body || busy || starting || pending.some(item => item.pending !== 'local')) return;
    // The box empties as the bubble appears. Holding the text until the server answers is the
    // same wait in a different place.
    changeDraft('');
    submit(body, 'text');
  }, [conversation, draft, submit, busy, starting, pending]);

  // The server stores one case per conversation, including when reopened from history.
  const patient = conversation?.patient ?? null;

  const examine = useCallback(() => {
    const finding = patient?.source.physicalExamFindings.find(item => item.isAbnormal)
      ?? patient?.source.physicalExamFindings[0];
    if (finding) queue('system', finding.system + ': ' + finding.findings, 'text', 'local');
  }, [patient, queue]);

  const investigate = useCallback(() => {
    const test = patient?.source.investigations[0] as { name?: string; result?: string } | undefined;
    if (test) queue('system', (test.name ?? 'Result') + ': ' + (test.result ?? '-'), 'text', 'local');
  }, [patient, queue]);

  /**
   * A question typed into the tab's search field before this thread existed. It is delivered
   * once, as the first turn, the moment there is a thread to hold it.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (!seed || seeded.current || !conversation) return;
    seeded.current = true;
    if (!effective.realtime && effective.input === 'text') void deliver(queue('user', seed, 'text'));
  }, [conversation, deliver, queue, seed]);

  useImperativeHandle(handle, () => ({
    open: (thread, options) => adopt(thread, options),
    send: text => {
      const body = text.trim();
      if (body && conversation && !effective.realtime && effective.input === 'text') submit(body, 'text');
    },
    reset: () => {
      loadVersion.current++;
      threadId.current = null;
      speechNow.current.stop();
      setConversation(null);
      setMessages([]);
      setPending([]);
      setCalling(false);
      setOpened(false);
      setError(null);
    },
  }), [adopt, conversation, deliver, queue]);

  const retry = useCallback((bubble: Pending) => {
    // A spoken turn was answered inside the call already; sending it again would ask Mark for a
    // second answer to something he has said his piece about.
    if (bubble.meta?.transcript) { void saveSpoken(bubble); return; }
    void deliver(bubble);
  }, [deliver, saveSpoken]);

  /** The call opens over the thread, and its bar closes it. Nothing navigates away any more. */
  const talk = useCallback(() => {
    if (!effective.compatible || busy || noVoice || pending.some(item => item.pending !== 'local')) return;
    if (effective.realtime && conversation) setCalling(true);
    else if (effective.input === 'voice') void speech.start();
  }, [conversation, mode, busy, speech, pending]);

  /**
   * A voice thread opens talking. Nobody picks Diktafon in order to then be asked whether they
   * would like to speak.
   */
  const [opened, setOpened] = useState(false);

  const intro = useMemo(() => introFor(conversation?.skill, language), [conversation?.skill, language]);

  /**
   * Worked out during render as well as held in state: a reply that only becomes the typing one
   * in an effect gets one commit at its full height first, and the thread visibly jumps down and
   * snaps back when the typing takes over at one character. State then carries it to the end,
   * after the effect below has written the id into `seen`.
   */
  /** What is on screen: everything stored, then everything still on its way. */
  const thread = useMemo(() => [...messages, ...pending.filter(message => message.conversation_id === conversation?.id)], [messages, pending, conversation?.id]);

  const latest = messages[messages.length - 1];
  const landing = latest && latest.role !== 'user' && !seen.current.has(latest.id) ? latest.id : null;
  const typing = landing ?? typingId;

  useEffect(() => {
    if (landing !== null) setTypingId(landing);
    messages.forEach(message => seen.current.add(message.id));
  }, [landing, messages]);

  const follow = useCallback(() => {
    // Only inside a thread: the skill picker is a list you scroll yourself, not a conversation.
    if (!conversation) return;
    // Nothing is known about the list until it has been laid out, and the content size can
    // arrive first.
    if (!viewport.current) return;
    /**
     * A thread that fits has nowhere to go — and scrolling it anyway is not the no-op it looks
     * like. `scrollToEnd` asks for `content - height`, clamped at zero, while a list the bar is
     * insetting rests at minus the bar's height; zero is therefore a bar's height further down
     * than where the thread belongs. That is what put the opening line behind the header, and
     * what shunted the whole thread every time the composer grew by a line, because the gap at
     * the end of the thread grows with it and every growth is a content size change.
     */
    if (content.current <= viewport.current) return;
    // Someone reading further up is not waiting to be dragged back down.
    if (!atBottom.current) return;
    scroller.current?.scrollToEnd({ animated: false });
  }, [conversation]);
  useEffect(() => {
    // Only `autoVoice` opens the line: whoever started the thread says so when they hand it
    // over. A thread picked out of history is being read, not resumed, and placing a call over
    // it is a session — and a bill — nobody asked for.
    if (!conversation || mode !== 'high_quality_voice' || opened || autoVoice !== '1') return;
    setOpened(true);
    talk();
  }, [autoVoice, conversation, opened, talk, mode]);

  // Only for the inset below: the bar itself is a child, so that a host with its own header can
  // simply not mount it.
  const usesNativeHeader = useNativeIOSHeadersActive();

  const styles = StyleSheet.create({
    error: { color: colors.red, fontSize: 13.5 },
    empty: { color: colors.muted, fontSize: 14, lineHeight: 20 },
    // Claude's shape on a phone: a softer corner, tighter than a card, and never wider than it
    // needs to be.
    bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, maxWidth: '85%' },
    mine: { alignSelf: 'flex-end', backgroundColor: colors.blue },
    /**
     * His answers are not bubbles. Lena's web chat draws exactly this line: what you said is a
     * bubble, because a bubble is a thing you handed over, and what she answers is the page —
     * full width, no fill, no padding of its own.
     *
     * It is not only a look. An answer can run to a paragraph or a list of steps, and a bubble
     * capped at 85% of the screen turns that into a narrow column with a coloured margin down
     * one side, which is the shape of a chat message and not the shape of something to read.
     */
    answer: { alignSelf: 'stretch', maxWidth: '100%' },
    /** Without a bubble the only thing separating a turn from the answer to it is air. */
    turn: { marginTop: 14 },
    aside: {
      alignSelf: 'center', maxWidth: '94%', backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator,
    },
    asideText: { color: colors.muted, fontSize: 14.5, lineHeight: 21, fontStyle: 'italic' },
    sending: { opacity: 0.55 },
    failed: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.red },
    unsent: { color: colors.red, fontSize: 11, fontWeight: '700', marginTop: 4 },
    mineText: { color: '#FFFFFF', fontSize: 16.5 },
    // A line with the width of the screen behind it can afford the size a bubble could not.
    hisText: { color: colors.text, fontSize: 17.5, lineHeight: 26 },
  });

  return (
    <View style={g.screen}>
      {header ? <ChatHeader onHistory={openHistory} patientName={patient ? `${patient.name}, ${patient.age}` : undefined} /> : null}
      <ScrollView
        ref={scroller}
        onLayout={event => {
          viewport.current = event.nativeEvent.layout.height;
          follow();
        }}
        onContentSizeChange={(_width, height) => {
          content.current = height;
          follow();
        }}
        onScroll={event => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          content.current = contentSize.height;
          viewport.current = layoutMeasurement.height;
          // A thread is at the bottom while its last turn is on screen, not only when the offset
          // is exact: the gap at the end of it is the bar's height, so an answer landing while
          // you are a few points short of the end should still bring itself into view.
          atBottom.current
            = contentOffset.y >= contentSize.height - layoutMeasurement.height - AT_BOTTOM;
        }}
        scrollEventThrottle={16}
        // Only the native bar insets the content under itself; the fallback one takes real room.
        contentInsetAdjustmentBehavior={usesNativeHeader ? 'automatic' : 'never'}
        contentContainerStyle={{ padding: 16, gap: 12, width: '100%', maxWidth: 860, alignSelf: 'center' }}
      >
        {error && !composer ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {/* Before there is a thread: whatever the host puts here, or a wait if one is coming. */}
        {!conversation && !error ? (empty ?? (
          conversationId ? <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} /> : null
        )) : null}

        {conversation ? (
          <>
            {thread.length === 0 ? (
              <TypingText text={intro} style={styles.empty} />
            ) : null}
            {thread.map((message, index) => {
              // You wrote your own turns, so there is nothing left to reveal about them.
              const mine = message.role === 'user';
              // A finding is not a turn. It is what you saw, so it sits down the middle.
              const aside = message.role === 'system';
              const state = 'pending' in message ? message.pending : null;
              // Who spoke before this, so a change of speaker can be given room.
              const before = thread[index - 1];
              const turned = Boolean(before) && before.role !== message.role;

              return (
                <Pressable
                  key={message.id}
                  // Only a bubble that failed does anything when tapped; the rest are not buttons.
                  disabled={state !== 'failed'}
                  onPress={() => retry(message as Pending)}
                  style={[
                    aside || mine ? styles.bubble : styles.answer,
                    aside ? styles.aside : mine ? styles.mine : null,
                    turned ? styles.turn : null,
                    state === 'sending' ? styles.sending : null,
                    state === 'failed' ? styles.failed : null,
                  ]}
                >
                  {mine ? (
                    <Hugging body={message.body} style={styles.mineText} />
                  ) : typing === message.id ? (
                    <TypingText
                      text={message.body}
                      style={styles.hisText}
                      startDelay={120}
                      onDone={() => setTypingId(current => (current === message.id ? null : current))}
                    />
                  ) : (
                    <Text style={aside ? styles.asideText : styles.hisText}>
                      {message.body}
                    </Text>
                  )}
                  {state === 'failed' ? <Text style={styles.unsent}>{t('common.retry')}</Text> : null}
                </Pressable>
              );
            })}
          </>
        ) : null}

        {/* The wait, said out loud. It goes after the last turn rather than inside a bubble:
            nothing has been said yet, and a bubble would be a message that never arrives.

            Not during a call. On the line there is nothing to wait for — he answers out loud as
            you speak, and a line saying he is thinking would be describing the silence between
            two people talking. */}
        {conversation?.is_practice ? <Pressable onPress={() => router.push({pathname:'/practice',params:{conversationId:String(conversation.id)}})}><Text style={{color:colors.blue,padding:16}}>Practice brief and feedback</Text></Pressable> : null}
        {(busy || starting) && !calling ? <MarkThinking skill={conversation?.skill?.name} /> : null}

        <Animated.View style={tail} />
      </ScrollView>

      {/* Everything that belongs at the bottom travels together: the patient's vitals, the
          live call, and the bar you write in. It is here before there is a conversation too —
          the first thing typed is what opens one. */}
      {composer ? (
        <MarkComposer
          value={effective.input === 'text' ? draft : ''}
          onChangeText={changeDraft}
          allowText={effective.input === 'text' && effective.compatible && (!conversationId || Boolean(conversation))}
          onSend={send}
          onTalk={talk}
          ref={bar}
          onSkills={patient ? () => setSymptomsOpen(true) : openSkills}
          skillLabel={patient ? t('sim.symptoms') : (conversation?.skill?.name ?? t('ai.title'))}
          busy={busy || starting || Boolean(conversationId && !conversation)}
          disabled={!effective.compatible || noMessages || pending.some(item => item.pending !== 'local')}
          canSpeak={effective.compatible && effective.input === 'voice' && !noVoice && !calling && !speech.listening}
          onHeight={setBarHeight}
          above={
            <>
              {creditLimit ? <CreditLimitNotice kind={creditLimit} /> : null}
              {error ? <Text accessibilityRole="alert" style={[styles.error, { paddingHorizontal: 12, paddingBottom: 8 }]}>{error}</Text> : null}
              {!patient ? <ModePicker skill={conversation?.skill} disabled={busy} beforeChange={async () => { speech.stop(); await drainCall.current?.(); if (conversation) { await Mark.flushTranscripts(conversation.id); await reload(conversation.id); } setCalling(false); }} /> : null}
              {effective.input === 'voice' && !calling && !speech.listening && !speech.speaking ? <Text style={{ color: colors.muted, paddingHorizontal: 12, paddingBottom: 8 }}>Tap the microphone to speak.</Text> : null}
              {!effective.realtime && effective.output === 'voice' && !speech.listening && !speech.speaking && messages.some(message => message.role === 'assistant') ? <ChatAction title="Hear last reply" onPress={() => { const reply = [...messages].reverse().find(message => message.role === 'assistant'); if (reply) void speech.speak(reply.body); }} /> : null}
              {speech.listening || speech.speaking ? <ChatAction title={speech.listening ? 'Stop listening' : 'Stop playback'} onPress={speech.stop} /> : null}
              {conversation?.is_practice ? <ChatAction title="Practice overview / finish" onPress={async () => { try { speech.stop(); await drainCall.current?.(); await Mark.flushTranscripts(conversation.id); setCalling(false); router.push({ pathname: '/practice', params: { conversationId: String(conversation.id) } }); } catch (e) { setError((e as Error).message); } }} /> : null}
              {conversation && calling && effective.realtime && effective.compatible ? (
                <MarkCallBar
                  key={`${conversation.id}:${mode}`}
                  conversationId={conversation.id}
                  practice={conversation.is_practice}
                  onDrainReady={registerDrain}
                  onTurn={(role, text, itemId) => spoken(conversation.id, role, text, itemId)}
                  onClose={() => setCalling(false)}
                />
              ) : null}
            </>
          }
        />
      ) : null}

      <SkillSheet
        open={skillsOpen}
        onClose={closeSkills}
        skills={skills}
        activeKey={conversation?.skill?.key ?? null}
        onStart={(skill, modality) => {
          spokenSkill.current = modality === 'voice';
          void startSkill(skill.key, modality);
        }}
        starting={starting}
      />

      {patient ? (
        <SymptomsSheet
          open={symptomsOpen}
          onClose={() => setSymptomsOpen(false)}
          patient={patient}
          onExamine={examine}
          onInvestigate={investigate}
        />
      ) : null}

      <MarkHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeId={conversation?.id ?? null}
        onSelect={id => {
          // The line was opened on the thread being left, so switching threads ends the call.
          setCalling(false);
          speech.stop();
          void reload(id);
        }}
      />
    </View>
  );
});

/**
 * Your own words, in a line exactly as wide as the longest of them.
 *
 * React Native lays a wrapped `Text` out at the full width it was offered, not at the width it
 * actually used. A bubble capped at 85% of the screen is therefore 85% wide from the moment the
 * text runs past one line — so every message longer than a few words comes out the same width,
 * whatever it says, which is what reads as a fixed width.
 *
 * `onTextLayout` reports each line as it is laid out. The widest of them is the width the text
 * really needs, and setting it makes the bubble hug — the way it does everywhere a bubble is a
 * bubble. It settles in one pass: the same lines measure the same way, so the second layout
 * produces the same number and the state stops changing. `Math.ceil` is what guarantees that —
 * a width rounded down by a fraction of a point would re-wrap the last word and shrink again.
 */
function Hugging({ body, style }: { body: string; style: StyleProp<TextStyle> }) {
  const [width, setWidth] = useState<number>();

  return (
    <Text
      style={[style, width === undefined ? null : { width }]}
      onTextLayout={event => {
        const lines = event.nativeEvent.lines;
        if (!lines.length) return;
        const widest = Math.ceil(Math.max(...lines.map(line => line.width)));
        setWidth(current => (current === widest ? current : widest));
      }}
    >
      {body}
    </Text>
  );
}

/**
 * The bar, as a child rather than a hook in the chat itself: a host that already has a header —
 * the Mark tab has one — must not have a second `useScreenHeader` writing over its options, and
 * a hook cannot be skipped while a child can simply not be mounted.
 */
function ChatHeader({ onHistory, patientName }: { onHistory: () => void; patientName?: string | null }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const title = patientName ?? t('ai.title');

  /**
   * The button goes through the app's own header plumbing rather than `headerRight`: on the
   * native iOS bar the buttons are real system bar-button items, and a React view handed to
   * `headerRight` is not one, so it never appears there. Off that path the hook hides the stack
   * header and the screen draws its own bar — which is why both branches carry the same button.
   */
  const usesNativeHeader = useScreenHeader({
    title,
    right: [{
      sfSymbol: 'bubble.left.and.bubble.right',
      accessibilityLabel: t('history.title'),
      identifier: 'history',
      onPress: onHistory,
    }],
    // A conversation is not a large-title screen: the name belongs in the bar, next to the back
    // chevron, with the thread starting at the top.
    nativeOptions: {
      headerLargeTitleEnabled: false,
      /**
       * The glyph has to come with the title, and a title is the one slot on the native bar that
       * does take a view — the buttons beside it do not, which is why they go through the items
       * API instead. If a build ever renders this empty, dropping `headerTitle` puts the plain
       * string back.
       */
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Sparkles size={17} color={colors.blue} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>
        </View>
      ),
    },
  });

  if (usesNativeHeader) return null;

  return (
    <FallbackTabHeader
      title={title}
      titleIcon={<Sparkles size={17} color={colors.blue} />}
      left={[{
        icon: <ChevronLeft size={21} color={colors.blue} />,
        accessibilityLabel: t('common.cancel'),
        onPress: () => router.back(),
      }]}
      right={[{
        icon: <MessageSquare size={21} color={colors.blue} />,
        accessibilityLabel: t('history.title'),
        onPress: onHistory,
      }]}
    />
  );
}

function ChatAction({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ alignSelf: 'flex-start', marginHorizontal: 10, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.input, opacity: pressed ? 0.6 : 1 })}>
    <Text style={{ color: colors.blue, fontSize: 14, fontWeight: '600' }}>{title}</Text>
  </Pressable>;
}
