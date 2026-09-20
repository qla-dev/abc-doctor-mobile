/**
 * The words as they are being said, over a socket the phone opens itself.
 *
 * Lena puts a second engine beside the recording — the browser's own SpeechRecognition — and
 * types its guess into the box while Whisper works on the real thing. A phone has no such engine
 * without a native module and a new build, and it has something better on hand: the microphone
 * is already being read as raw PCM, so the same frames that make the waveform can go to the same
 * transcriber that would have produced the final text anyway.
 *
 * A socket rather than the WebRTC the call uses, for one reason: nothing is coming back as audio,
 * and WebRTC would want the microphone for itself while expo-audio is already holding it.
 *
 * The key is minted per session by our backend and lives about a minute. The account key never
 * reaches the device.
 */

/** Long enough for a phone on mobile data, short enough that a dead socket falls back quickly. */
const OPEN_TIMEOUT_MS = 4000;

export type LiveTranscribe = {
  /** One buffer of PCM16, straight off the microphone. */
  push: (pcm: ArrayBuffer) => void;
  /** Ends the utterance in flight, so its last words arrive rather than being cut off. */
  commit: () => void;
  close: () => void;
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Bytes to base64, written out rather than imported: React Native has no `btoa` and no `Buffer`,
 * and a dependency for twelve lines that run on 2 KB at a time is not worth the install.
 */
function encode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const c = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += ALPHABET[a >> 2];
    out += ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : ALPHABET[c & 63];
  }

  return out;
}

export async function startLiveTranscribe({ url, key, onDelta, onDone, onError }: {
  url: string;
  /** The ephemeral `ek_…` from our backend, never the account key. */
  key: string;
  /** A few more characters of the sentence being spoken. */
  onDelta: (text: string) => void;
  /** One finished utterance. Several arrive over a long message, one per pause. */
  onDone: (text: string) => void;
  onError?: (message: string) => void;
}): Promise<LiveTranscribe> {
  /**
   * React Native's WebSocket takes request headers as a third argument; the DOM's does not, and
   * the DOM's declaration is the one TypeScript sees here. Hence the cast — and hence the
   * `Authorization` header at all: a browser client would have to smuggle the key through a
   * subprotocol, which is exactly the workaround native does not need.
   */
  const Native = WebSocket as unknown as new (
    url: string,
    protocols: string | string[] | undefined,
    options: { headers: Record<string, string> },
  ) => WebSocket;

  const socket = new Native(url, undefined, { headers: { Authorization: `Bearer ${key}` } });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Veza za prijepis nije otvorena.')), OPEN_TIMEOUT_MS);
    socket.onopen = () => { clearTimeout(timer); resolve(); };
    socket.onerror = () => { clearTimeout(timer); reject(new Error('Veza za prijepis nije otvorena.')); };
  });

  socket.onmessage = event => {
    try {
      const payload = JSON.parse(String(event.data)) as {
        type?: string;
        delta?: string;
        transcript?: string;
        error?: { message?: string };
      };

      if (payload.type === 'conversation.item.input_audio_transcription.delta' && payload.delta) {
        onDelta(payload.delta);
      }
      if (payload.type === 'conversation.item.input_audio_transcription.completed' && payload.transcript) {
        onDone(payload.transcript);
      }
      if (payload.type === 'error') {
        onError?.(payload.error?.message ?? 'Prijepis je prekinut.');
      }
    } catch {
      // A frame that is not JSON is not a transcript; nothing to salvage.
    }
  };
  // Past the handshake a failed socket is not fatal: the recording is still being made, and the
  // turn ends with the transcript the server produces from the file.
  socket.onerror = () => onError?.('Prijepis je prekinut.');

  const send = (message: object) => {
    if (socket.readyState === 1) socket.send(JSON.stringify(message));
  };

  return {
    push: pcm => send({ type: 'input_audio_buffer.append', audio: encode(new Uint8Array(pcm)) }),
    commit: () => send({ type: 'input_audio_buffer.commit' }),
    close: () => {
      socket.onmessage = null;
      socket.onerror = null;
      try { socket.close(); } catch { /* already closing */ }
    },
  };
}
