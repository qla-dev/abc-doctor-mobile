import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLanguage } from '@/context/LanguageContext';
import { createGlobalStyles } from '@/theme/styles';
import { FallbackTabHeader } from '@/components/common/TabHeader';
import { useScreenHeader } from '@/hooks/useScreenHeader';
import { useNativeIOSHeadersActive } from '@/lib/nativeTabBarPreference';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TypingText } from '@/components/common/TypingText';
import { NinaCallBar } from '@/components/nina/NinaCallBar';
import {
  NinaComposer, useKeyboardHeight, type NinaComposerHandle,
} from '@/components/nina/NinaComposer';
import { SimulatorTools } from '@/components/nina/SimulatorTools';
import { SkillSheet } from '@/components/nina/SkillSheet';
import {
  generateCase,
  type AgeBand, type CaseSetup, type Difficulty, type GenderChoice,
} from '@/lib/caseGenerator';
import { NinaHistorySheet } from '@/components/nina/NinaHistorySheet';
import { ApiError } from '@/lib/api';
import { useVoiceNote } from '@/lib/voiceNote';
import {
  introFor, Nina,
  type Modality, type NinaConversation, type NinaMessage, type NinaSkill,
} from '@/services/nina';

/**
 * A turn that is on screen before it is on the server.
 *
 * Lena's chat does exactly this, for the same reason: a message that only appears once the round
 * trip finishes makes the app look like it dropped what you said — and a spoken turn would not
 * appear at all until something thought to refetch. Negative ids keep these apart from stored
 * rows, which are always positive, so the two can share one list without colliding.
 */
type Pending = NinaMessage & { pending: 'sending' | 'failed' | 'local' };

/** How far off the end still counts as being at it, before the thread stops following itself. */
const AT_BOTTOM = 60;

/** Appends stored messages, skipping any already held — a reload can race a save in flight. */
function merge(current: NinaMessage[], arriving: NinaMessage[]): NinaMessage[] {
  const held = new Set(current.map(message => message.id));

  return [...current, ...arriving.filter(message => !held.has(message.id))];
}

/** What a screen hosting the chat can ask it to do, for the inputs the chat does not own. */
export type NinaChatHandle = {
  /** Put a thread on screen. `seed` is its first turn, `call` opens the line as it lands. */
  open: (thread: NinaConversation, options?: { seed?: string; call?: boolean }) => void;
  /** Send a turn from an input somewhere else — the tab bar's search field is one. */
  send: (text: string) => void;
  /** Back to no conversation, so the host can show whatever it shows instead. */
  reset: () => void;
};

export type NinaChatProps = {
  /** A thread to open on mount, for a screen that is reached with one already chosen. */
  conversationId?: string;
  /** '1' when whoever handed the thread over has already asked for the call. */
  autoVoice?: string;
  /** A question asked before the thread existed, delivered as its first turn. */
  seed?: string;
  /** The case behind a simulated patient, for the vitals and actions above the composer. */
  difficulty?: string;
  specialty?: string;
  gender?: string;
  ageBand?: string;
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
 * The skill and the mode are chosen before a thread reaches this: by the Nina tab, by history,
 * by the mic on another screen. A skill that opens has spoken by the time it arrives, so the
 * first bubble is hers.
 *
 * Everything a conversation can be lives here — turns typed and spoken, the call over the top of
 * them, the history behind the corner of the header, the vitals and actions of a simulated
 * patient — which is why it is a component and not a screen: the tab is the same conversation
 * before it has started, and it would otherwise have to build all of it a second time.
 */
export const NinaChat = forwardRef<NinaChatHandle, NinaChatProps>(function NinaChat({
  conversationId,
  autoVoice,
  seed,
  difficulty,
  specialty,
  gender,
  ageBand,
  composer = true,
  header = true,
  empty,
}, handle) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const g = createGlobalStyles(colors);

  const [conversation, setConversation] = useState<NinaConversation | null>(null);
  const [messages, setMessages] = useState<NinaMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Nina's turns are revealed as they land; a thread you are re-opening is not. Lena draws the
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
  const [calling, setCalling] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  /** What Nina can be, for the sheet behind the plus in the composer. */
  const [skills, setSkills] = useState<NinaSkill[]>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  /** The case a simulated patient was started with here, when it was started here. */
  const [caseSetup, setCaseSetup] = useState<CaseSetup | null>(null);

  /**
   * The bar, for the keyboard rather than for the text.
   *
   * A bottom sheet and the keyboard both open from the bottom of the screen, and neither knows
   * about the other: raising the skills over a keyboard that is already up puts the sheet behind
   * it, with the title showing above the keys and the skills themselves unreachable.
   */
  const bar = useRef<NinaComposerHandle>(null);
  /** True when the skill being started is a spoken one, so the keyboard stays down for the call. */
  const spokenSkill = useRef(false);

  /**
   * What was already written when the microphone opened. A voice message adds to the sentence
   * you had started rather than wiping it, and every partial transcript is measured from here —
   * the live text rewrites itself as it is heard, and it must rewrite only its own half.
   */
  const typed = useRef('');
  const draftNow = useRef(draft);
  useEffect(() => { draftNow.current = draft; });

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
  const scroller = useRef<ScrollView>(null);

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
  const reload = useCallback(async (id: number) => {
    try {
      const thread = await Nina.conversation(id);
      setConversation(thread);
      const loaded = thread.messages ?? [];
      seen.current = new Set(loaded.map(message => message.id));
      // A thread opens at its latest turn, whatever the last one you were reading was scrolled to.
      atBottom.current = true;
      setMessages(loaded);
      // What came back is the thread. A bubble still queued against it is either in there
      // already or belongs to the thread being left behind — but a local note is neither: the
      // server has never heard of it, so a reload cannot bring it back and does not take it away.
      setPending(current => current.filter(bubble => bubble.pending === 'local'));
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
    role: NinaMessage['role'],
    body: string,
    modality: Modality,
    state: Pending['pending'] = 'sending',
    /** The thread it belongs to, for a turn queued in the same breath as the thread opening. */
    thread: number | null = null,
  ): Pending => {
    const bubble: Pending = {
      id: nextPendingId.current--,
      conversation_id: thread ?? threadId.current ?? 0,
      role,
      body,
      modality,
      meta: null,
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
      const { sent, reply } = await Nina.send(bubble.conversation_id, bubble.body, bubble.modality);
      setPending(current => current.filter(m => m.id !== bubble.id));
      setMessages(current => merge(current, [sent, reply]));
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
    const id = threadId.current;
    if (id === null) return;
    setPending(current => current.map(m => (m.id === bubble.id ? { ...m, pending: 'sending' } : m)));
    try {
      const saved = await Nina.saveTranscript(id, bubble.role === 'assistant' ? 'assistant' : 'user', bubble.body);
      // Heard, not read: the stored copy must not type itself out after the fact.
      seen.current.add(saved.id);
      setPending(current => current.filter(m => m.id !== bubble.id));
      setMessages(current => merge(current, [saved]));
    } catch {
      // The call is still up; the turn stays on screen as what was said, marked unsaved.
      setPending(current => current.map(m => (m.id === bubble.id ? { ...m, pending: 'failed' } : m)));
    }
  }, []);

  /** Each finished turn of the call, both sides, the moment the words come back. */
  const spoken = useCallback((role: 'user' | 'assistant', text: string) => {
    void saveSpoken(queue(role, text, 'voice'));
  }, [queue, saveSpoken]);

  /**
   * A thread, from wherever it came: the skills sheet here, or a host screen that opened one.
   * Everything it says is new, so it types, and a spoken one arrives with its line already open.
   */
  const adopt = useCallback((thread: NinaConversation, options?: { seed?: string; call?: boolean }) => {
    setConversation(thread);
    seen.current = new Set();
    atBottom.current = true;
    setMessages(thread.messages ?? []);
    setPending([]);
    setError(null);
    setOpened(Boolean(options?.call));
    setCalling(Boolean(options?.call));
    if (options?.seed) void deliver(queue('user', options.seed, thread.modality, 'sending', thread.id));
  }, [deliver, queue]);

  useEffect(() => {
    Nina.skills().then(setSkills).catch((e: ApiError) => setError(e.message));
  }, []);

  /**
   * Opening a conversation from the composer. The case, when there is one, goes over as the
   * thread's context so Nina plays the patient that was asked for rather than inventing one —
   * and stays here as well, for the vitals and the two actions above the composer.
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
      const context = setup ? [
        `Pacijent: ${setup.ageBand} godina`,
        setup.gender === 'any' ? null : setup.gender === 'M' ? 'muškarac' : 'žena',
        setup.specialty === 'any' ? null : `oblast: ${setup.specialty}`,
        `težina slučaja: ${t('setup.' + setup.difficulty)}`,
      ].filter(Boolean).join(', ') + '.' : undefined;

      const thread = await Nina.startConversation(key, modality, undefined, context, setup?.gender);
      setCaseSetup(setup ?? null);
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
    if (!body || busy || starting) return;
    if (conversation) {
      void deliver(queue('user', body, modality));

      return;
    }
    // Nothing open yet: what you said opens a consultation and becomes its first turn, so the
    // empty chat does not make you pick something before it will listen.
    void startSkill('consultant', 'text', undefined, body);
  }, [busy, conversation, deliver, queue, startSkill, starting]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    // The box empties as the bubble appears. Holding the text until the server answers is the
    // same wait in a different place.
    setDraft('');
    submit(body, conversation?.modality ?? 'text');
  }, [conversation, draft, submit]);

  /**
   * The microphone in the bar, which is not the call: one recording, transcribed on the server,
   * sent as the turn it would have been if it had been typed.
   *
   * It goes in marked `voice` only where the skill takes voice at all — the modality records how
   * the turn was made, and MessageController refuses one a text-only skill does not accept. A
   * transcript is words either way, so a skill that cannot be called can still be spoken to.
   *
   * The bar hides it outright while a call is up: the line already holds the microphone, and a
   * recording made during one would be Nina's own voice coming back at her.
   */
  const dictation = useVoiceNote({
    conversationId: conversation?.id,
    // The words arrive while they are still being said, so they are written into the box the
    // same way they would be typed — after whatever was already in it.
    onPartial: text => setDraft(typed.current ? typed.current + ' ' + text : text),
    onText: (text, send) => {
      const full = typed.current ? typed.current + ' ' + text : text;
      // Stop keeps the words: they stay in the box, where a misheard term can be fixed before
      // anyone answers it. Only the send button skips that.
      if (!send) { setDraft(full); return; }
      setDraft('');
      submit(full, conversation?.skill?.supports_voice ? 'voice' : 'text');
    },
    onError: setError,
  });

  /**
   * The simulated patient, when the thread is one. Generated once from the setup that opened it:
   * re-rolling per render would hand the doctor a different patient mid-consultation.
   *
   * It is still generated on the device rather than read back from the thread, which is why a
   * case reopened from history comes back with the same setup but a new patient behind it. The
   * separate simulator screen had exactly this limitation; folding it in here did not add it.
   */
  const caseDifficulty = caseSetup?.difficulty ?? (difficulty as Difficulty) ?? 'medium';
  const caseSpecialty = caseSetup?.specialty ?? specialty ?? 'any';
  const caseGender = caseSetup?.gender ?? (gender as GenderChoice) ?? 'any';
  const caseAge = caseSetup?.ageBand ?? (ageBand as AgeBand) ?? '35-54';

  const patient = useMemo(() => (conversation?.skill?.key === 'patient_simulator' ? generateCase({
    difficulty: caseDifficulty,
    specialty: caseSpecialty,
    gender: caseGender,
    ageBand: caseAge,
  }) : null), [caseAge, caseDifficulty, caseGender, caseSpecialty, conversation?.skill?.key]);

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
    void deliver(queue('user', seed, conversation.modality));
  }, [conversation, deliver, queue, seed]);

  useImperativeHandle(handle, () => ({
    open: (thread, options) => adopt(thread, options),
    send: text => {
      const body = text.trim();
      if (body && conversation) void deliver(queue('user', body, conversation.modality));
    },
    reset: () => {
      setConversation(null);
      setMessages([]);
      setPending([]);
      setCalling(false);
      setOpened(false);
      setCaseSetup(null);
      setError(null);
    },
  }), [adopt, conversation, deliver, queue]);

  const retry = useCallback((bubble: Pending) => {
    // A spoken turn was answered inside the call already; sending it again would ask Nina for a
    // second answer to something she has said her piece about.
    if (bubble.modality === 'voice') { void saveSpoken(bubble); return; }
    void deliver(bubble);
  }, [deliver, saveSpoken]);

  /** The call opens over the thread, and its bar closes it. Nothing navigates away any more. */
  const talk = useCallback(() => {
    if (conversation) setCalling(true);
  }, [conversation]);

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
  const thread = useMemo(() => [...messages, ...pending], [messages, pending]);

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
    if (!conversation || conversation.modality !== 'voice' || opened || autoVoice !== '1') return;
    setOpened(true);
    talk();
  }, [autoVoice, conversation, opened, talk]);

  const title = conversation?.skill?.name ?? t('ai.title');

  // Only for the inset below: the bar itself is a child, so that a host with its own header can
  // simply not mount it.
  const usesNativeHeader = useNativeIOSHeadersActive();

  const styles = StyleSheet.create({
    error: { color: colors.red, fontSize: 13.5 },
    empty: { color: colors.muted, fontSize: 14, lineHeight: 20 },
    bubble: { padding: 11, borderRadius: 14, maxWidth: '85%' },
    mine: { alignSelf: 'flex-end', backgroundColor: colors.blue },
    hers: { alignSelf: 'flex-start', backgroundColor: colors.card },
    aside: {
      alignSelf: 'center', maxWidth: '94%', backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator,
    },
    asideText: { color: colors.muted, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
    sending: { opacity: 0.55 },
    failed: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.red },
    unsent: { color: colors.red, fontSize: 11, fontWeight: '700', marginTop: 4 },
    mineText: { color: '#FFFFFF', fontSize: 14.5 },
    hersText: { color: colors.text, fontSize: 14.5 },
  });

  return (
    <View style={g.screen}>
      {header ? <ChatHeader title={title} onHistory={openHistory} /> : null}
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
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Before there is a thread: whatever the host puts here, or a wait if one is coming. */}
        {!conversation && !error ? (empty ?? (
          conversationId ? <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} /> : null
        )) : null}

        {conversation ? (
          <>
            {thread.length === 0 ? (
              <TypingText text={intro} style={styles.empty} />
            ) : null}
            {thread.map(message => {
              // You wrote your own turns, so there is nothing left to reveal about them.
              const mine = message.role === 'user';
              // A finding is not a turn. It is what you saw, so it sits down the middle.
              const aside = message.role === 'system';
              const state = 'pending' in message ? message.pending : null;

              return (
                <Pressable
                  key={message.id}
                  // Only a bubble that failed does anything when tapped; the rest are not buttons.
                  disabled={state !== 'failed'}
                  onPress={() => retry(message as Pending)}
                  style={[
                    styles.bubble,
                    aside ? styles.aside : mine ? styles.mine : styles.hers,
                    state === 'sending' ? styles.sending : null,
                    state === 'failed' ? styles.failed : null,
                  ]}
                >
                  {typing === message.id ? (
                    <TypingText
                      text={message.body}
                      style={styles.hersText}
                      startDelay={120}
                      onDone={() => setTypingId(current => (current === message.id ? null : current))}
                    />
                  ) : (
                    <Text style={aside ? styles.asideText : mine ? styles.mineText : styles.hersText}>
                      {message.body}
                    </Text>
                  )}
                  {state === 'failed' ? <Text style={styles.unsent}>{t('common.retry')}</Text> : null}
                </Pressable>
              );
            })}
          </>
        ) : null}

        <Animated.View style={tail} />
      </ScrollView>

      {/* Everything that belongs at the bottom travels together: the patient's vitals, the
          live call, and the bar you write in. It is here before there is a conversation too —
          the first thing typed is what opens one. */}
      {composer ? (
        <NinaComposer
          value={draft}
          onChangeText={setDraft}
          onSend={send}
          onTalk={talk}
          dictation={calling ? undefined : {
            ...dictation,
            // Snapshotted here rather than inside the hook: the bar is what starts a recording,
            // and this is the last moment at which the box holds only what was typed.
            start: () => { typed.current = draftNow.current.trim(); dictation.start(); },
          }}
          ref={bar}
          onSkills={openSkills}
          skillLabel={conversation?.skill?.name ?? t('ai.title')}
          busy={busy || starting}
          canSpeak={Boolean(conversation?.skill?.supports_voice) && !calling}
          onHeight={setBarHeight}
          above={
            <>
              {patient ? (
                <SimulatorTools patient={patient} onExamine={examine} onInvestigate={investigate} />
              ) : null}
              {conversation && calling ? (
                <NinaCallBar
                  conversationId={conversation.id}
                  onTurn={spoken}
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
        onStart={(skill, modality, setup) => {
          // Noted before the sheet closes, because closing is what decides whether the keyboard
          // comes back — and it must not come back over a call that is about to open.
          spokenSkill.current = modality === 'voice';
          void startSkill(skill.key, modality, setup);
        }}
        starting={starting}
      />

      <NinaHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeId={conversation?.id ?? null}
        onSelect={id => {
          // The line was opened on the thread being left, so switching threads ends the call.
          setCalling(false);
          void reload(id);
        }}
      />
    </View>
  );
});

/**
 * The bar, as a child rather than a hook in the chat itself: a host that already has a header —
 * the Nina tab has one — must not have a second `useScreenHeader` writing over its options, and
 * a hook cannot be skipped while a child can simply not be mounted.
 */
function ChatHeader({ title, onHistory }: { title: string; onHistory: () => void }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

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
    nativeOptions: { headerLargeTitleEnabled: false },
  });

  if (usesNativeHeader) return null;

  return (
    <FallbackTabHeader
      title={title}
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
