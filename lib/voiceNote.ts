import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder,
  useAudioStream,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { ApiError } from '@/lib/api';
import { startLiveTranscribe, type LiveTranscribe } from '@/lib/liveTranscribe';
import { Nina } from '@/services/nina';

/**
 * A recording that becomes a turn: hold the microphone open, watch it hear you, read what you
 * said as you say it, and either send it or keep it in the box to fix a word first.
 *
 * freightbook's microphone in the shape a phone allows. Lena runs two engines at once — the
 * browser's SpeechRecognition typing a guess into the box while Whisper works on the real thing —
 * and ends the turn itself after three seconds of silence, because a driver holding a phone in a
 * moving cab cannot be asked to tap twice. Neither carries over unchanged: a phone has no browser
 * engine, and a recording made at a desk ends when you say it does.
 *
 * So there are two ways this runs, and the difference is only how fast the words appear:
 *
 * - **Live.** The microphone is read as raw PCM. The same frames feed the waveform and a socket
 *   to the transcriber, and the sentence appears as it is spoken.
 * - **Recorded.** No socket, so the microphone goes to a file, which is uploaded when the turn
 *   ends and comes back as text a moment later.
 *
 * One engine either way, chosen before anything starts recording: two things reading the same
 * microphone is how a recording comes back as silence.
 *
 * Deliberately not the call. A call is a session with Nina answering out loud as you speak; this
 * is one message that happens to have been said rather than typed, and it is answered in the
 * thread like any other.
 */

/** Where the microphone is: nothing, listening, or a recording on its way to being words. */
export type VoiceNoteState = 'idle' | 'recording' | 'sending';

/** What the bar needs in order to show a recording and end it. */
export type VoiceNote = {
  state: VoiceNoteState;
  /** 0..1, how loud it is hearing you right now — the bars in the bar ride on this. */
  level: SharedValue<number>;
  start: () => void;
  /** Ends the recording and keeps the words, unsent. */
  stop: () => void;
  /** Ends it and sends what was said, in one press. */
  send: () => void;
  /** Ends it and throws the recording away — nothing is uploaded, nothing is transcribed. */
  cancel: () => void;
};

/** A stuck microphone is a bill rather than a bug, so the turn ends itself eventually. */
const MAX_MS = 60_000;
/** How often the recorder's own level is read, on the path that has no PCM to measure. */
const METER_MS = 90;
/** What the transcriber wants, and what the stream is asked for: mono PCM16 at 24 kHz. */
const SAMPLE_RATE = 24_000;
/** How long the last utterance is given to come back after the microphone closes. */
const COMMIT_MS = 1500;

/**
 * Metering comes back in decibels — about -55 at a quiet desk, near 0 shouting into the mic.
 * The curve lifts the quiet end, or ordinary speech sits as a flat line near the floor.
 */
function fromDecibels(db: number | undefined): number {
  if (db === undefined || !Number.isFinite(db)) return 0;

  return Math.min(1, Math.max(0, (db + 55) / 55)) ** 0.7;
}

/** The same 0..1, worked out from the samples themselves where there are samples to read. */
function fromSamples(samples: Int16Array): number {
  if (!samples.length) return 0;

  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];

  return Math.min(1, Math.sqrt(sum / samples.length) / 32768 * 6) ** 0.7;
}

/**
 * The microphone's samples at the rate the transcriber expects.
 *
 * `useAudioStream` is asked for 24 kHz mono and says plainly that it may not get it: "the actual
 * rate may differ if the hardware cannot deliver it". Phone microphones are 48 kHz parts, and
 * 48 kHz audio announced as 24 kHz is the same words at twice the speed — which the transcriber
 * does not hear as words at all, and which fails silently, because a session that is being fed
 * gibberish looks exactly like one nobody has spoken into yet.
 *
 * Straight decimation with linear interpolation. A proper low-pass would be better for music;
 * for speech about to be transcribed the difference is not audible to the thing listening.
 */
function resample(samples: Int16Array, from: number, to: number): Int16Array {
  if (from === to || from <= 0) return samples;

  const ratio = from / to;
  const length = Math.floor(samples.length / ratio);
  const out = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const at = i * ratio;
    const low = Math.floor(at);
    const high = Math.min(low + 1, samples.length - 1);
    const t = at - low;
    out[i] = samples[low] + (samples[high] - samples[low]) * t;
  }

  return out;
}

/**
 * Whatever the native side handed over, as signed 16-bit samples. It is typed as an ArrayBuffer
 * and is one in practice, but a view over one would silently become a list of byte VALUES rather
 * than the samples those bytes spell — loud audio read as near-silence.
 */
function samplesOf(data: ArrayBuffer | ArrayBufferView): Int16Array {
  return ArrayBuffer.isView(data)
    ? new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2))
    : new Int16Array(data);
}

export function useVoiceNote({ onPartial, onText, onError, conversationId }: {
  /** Called as the words arrive, before the turn is over. Only on the live path. */
  onPartial: (text: string) => void;
  /**
   * What was said, once it is words. `send` is true when the press that ended the recording was
   * the send button rather than stop. Empty recordings never reach this.
   */
  onText: (text: string, send: boolean) => void;
  onError: (message: string) => void;
  /** Lends the thread's case to the transcriber's prompt, when there is a thread. */
  conversationId?: number;
}): VoiceNote {
  // Metering is off by default, and on the recorded path the bars have nothing else to stand on.
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [state, setState] = useState<VoiceNoteState>('idle');
  const level = useSharedValue(0);

  const cap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meter = useRef<ReturnType<typeof setInterval> | null>(null);
  /** The socket, while there is one. Its absence is what makes a turn the recorded kind. */
  const live = useRef<LiveTranscribe | null>(null);
  /** Utterances already finished, and the one still being said. */
  const heard = useRef({ done: '', saying: '' });
  /**
   * How many buffers went out. Only ever printed, and only for one question: a session that hears
   * nothing and a microphone that delivers nothing look identical from the outside.
   */
  const pushed = useRef(0);

  // Held in refs so a timer, a buffer callback or the cleanup always reaches the current ones
  // rather than whichever render armed them.
  const handlers = useRef({ onPartial, onText, onError });
  useEffect(() => { handlers.current = { onPartial, onText, onError }; });

  const said = () => (heard.current.done + heard.current.saying).replace(/\s+/g, ' ').trim();

  /**
   * Every buffer the microphone produces, on the live path: one copy makes the waveform move,
   * the other goes to the transcriber. Nothing is kept — the socket is the only record.
   */
  const stream = useAudioStream({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: buffer => {
      const samples = samplesOf(buffer.data);
      level.value = fromSamples(samples);
      if (!live.current) return;
      pushed.current++;
      // The rate the hardware actually gave, not the rate that was asked for.
      const at24k = resample(samples, buffer.sampleRate || SAMPLE_RATE, SAMPLE_RATE);
      live.current.push(at24k.buffer.slice(
        at24k.byteOffset, at24k.byteOffset + at24k.byteLength,
      ) as ArrayBuffer);
    },
  });

  const clearTimers = useCallback(() => {
    if (cap.current) clearTimeout(cap.current);
    if (meter.current) clearInterval(meter.current);
    cap.current = null;
    meter.current = null;
    level.value = 0;
  }, [level]);

  /**
   * Hands the microphone back. Without this iOS stays in `playAndRecord` after the recording is
   * over, which quietly halves playback volume for everything the app does afterwards.
   */
  const release = useCallback(async () => {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      // Nothing to do about it and nothing to tell anyone: the recording itself is unaffected.
    }
  }, []);

  /** Closes whichever engine was open and gives the microphone back, without judging the turn. */
  const shutDown = useCallback(async () => {
    clearTimers();
    const socket = live.current;
    live.current = null;
    if (socket) {
      stream.stream.stop();
      console.log('[voice] pushed', pushed.current, 'buffers, heard', JSON.stringify(said()));
      // The last sentence is usually still in flight: commit it, then give it a moment to land
      // before the socket goes. Cutting here is how a voice message loses its final clause.
      socket.commit();
      await new Promise(resolve => setTimeout(resolve, COMMIT_MS));
      socket.close();
    } else {
      try {
        await recorder.stop();
      } catch {
        // Already stopped, or never started.
      }
    }
    await release();
  }, [clearTimers, recorder, release, stream]);

  const finish = useCallback(async (send: boolean) => {
    const wasLive = live.current !== null;
    setState('sending');
    try {
      await shutDown();

      // The live path has already said everything it is going to say.
      if (wasLive) {
        const text = said();
        setState('idle');
        if (text) handlers.current.onText(text, send);

        return;
      }

      const uri = recorder.uri;
      if (!uri) { setState('idle'); return; }
      // The preset records m4a on both platforms, but the format is read off the file rather
      // than assumed: a build that changes the preset should not silently mislabel the upload.
      const format = (uri.split('.').pop() ?? 'm4a').toLowerCase();
      const audio = await new File(uri).base64();
      const { text } = await Nina.transcribe(audio, format);
      setState('idle');
      const spoken = text.trim();
      if (spoken) handlers.current.onText(spoken, send);
    } catch (e) {
      setState('idle');
      void release();
      handlers.current.onError(e instanceof ApiError ? e.message : 'Snimak nije prepoznat.');
    }
  }, [recorder, release, shutDown]);

  const start = useCallback(async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        handlers.current.onError('Mikrofon nije dozvoljen.');

        return;
      }

      heard.current = { done: '', saying: '' };
      pushed.current = 0;

      /**
       * The socket is opened BEFORE anything starts listening, because which engine gets the
       * microphone depends on whether there is one. A turn that begins recording and then
       * switches is a turn with two things reading the same microphone.
       */
      let socket: LiveTranscribe | null = null;
      try {
        const session = await Nina.realtimeTranscription(conversationId);
        socket = await startLiveTranscribe({
          url: session.url,
          key: session.value,
          onDelta: delta => {
            heard.current.saying += delta;
            handlers.current.onPartial(said());
          },
          onDone: transcript => {
            heard.current.done += transcript + ' ';
            heard.current.saying = '';
            handlers.current.onPartial(said());
          },
          // A socket that drops mid-sentence is not worth a message of its own: what was heard
          // before it went is still in the box, and the turn can be sent or thrown away as it is.
          onError: message => console.warn('[voice] live transcript dropped:', message),
        });
        console.log('[voice] live transcript open');
      } catch (e) {
        /**
         * No live transcript this turn. The file path is slower to show the words, not worse at
         * hearing them — it is the same transcriber, reached over HTTP when it ends.
         *
         * Said out loud rather than swallowed. A preview that quietly does not happen is
         * indistinguishable from one that is broken, and the difference between the two is the
         * reason printed here.
         */
        const reason = e instanceof Error ? e.message : String(e);
        console.warn('[voice] no live transcript:', reason);
        handlers.current.onError(`Live prijepis nije dostupan: ${reason}`);
        socket = null;
      }

      // Recording and playback at once, and out loud: the same mode the call runs in, so a
      // recording made right after one does not come back silent.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      if (socket) {
        live.current = socket;
        await stream.stream.start();
        // What the hardware actually gave, which is what decides whether anything is resampled.
        console.log('[voice] stream at', stream.stream.sampleRate, 'Hz,',
          stream.stream.channels, 'ch');
      } else {
        await recorder.prepareToRecordAsync();
        recorder.record();
        // No PCM to measure on this path, so the level comes from the recorder's own metering.
        meter.current = setInterval(() => {
          try {
            level.value = fromDecibels(recorder.getStatus().metering);
          } catch {
            level.value = 0;
          }
        }, METER_MS);
      }

      setState('recording');
      // The cap ends the turn but does not send it: a microphone left open for a minute is a
      // mistake, and finishing somebody's mistake by sending it is a worse one.
      cap.current = setTimeout(() => { void finish(false); }, MAX_MS);
    } catch (e) {
      setState('idle');
      clearTimers();
      live.current?.close();
      live.current = null;
      void release();
      handlers.current.onError(e instanceof Error ? e.message : 'Snimanje nije uspjelo.');
    }
  }, [clearTimers, conversationId, finish, level, recorder, release, stream]);

  const cancel = useCallback(async () => {
    clearTimers();
    setState('idle');
    const socket = live.current;
    live.current = null;
    if (socket) {
      stream.stream.stop();
      socket.close();
    } else {
      try {
        if (recorder.isRecording) await recorder.stop();
      } catch {
        // Already stopped, or never started. Either way there is nothing to throw away.
      }
    }
    await release();
  }, [clearTimers, recorder, release, stream]);

  useEffect(() => () => {
    // Leaving the screen mid-recording: end it and give the microphone back, but say nothing —
    // whoever navigated away is not waiting for a transcript.
    clearTimers();
    live.current?.close();
    live.current = null;
    if (recorder.isRecording) void recorder.stop().catch(() => {});
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }, [clearTimers, recorder]);

  return {
    state,
    level,
    start: () => { if (state === 'idle') void start(); },
    stop: () => { if (state === 'recording') void finish(false); },
    send: () => { if (state === 'recording') void finish(true); },
    cancel: () => { if (state === 'recording') void cancel(); },
  };
}
