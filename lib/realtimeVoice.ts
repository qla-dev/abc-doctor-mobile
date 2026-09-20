import type { MediaStream, RTCPeerConnection as RTCPeerConnectionType } from 'react-native-webrtc';

/**
 * A spoken session with Mark, over WebRTC.
 *
 * The phone never sees the account key. It gets an `ek_…` from our backend that lives about a
 * minute, and trades an SDP offer for an answer with OpenAI directly — audio then flows peer to
 * peer without passing through our server at all.
 *
 * Incoming audio needs no element to play through: react-native-webrtc routes a remote audio
 * track to the device's audio session on its own.
 *
 * Both native modules load LAZILY, inside the call. Importing them at the top of the file breaks
 * any build that does not contain them — `react-native-incall-manager` reads
 * `NativeModules.InCallManager` while it is being imported — and that lands as "cannot read
 * property of undefined" on a screen that has not run a line of its own yet. Required here
 * instead, a missing module becomes a sentence on screen and the rest of the app keeps working.
 */
export type VoiceSession = {
  hangUp: () => void;
  setMuted: (muted: boolean) => void;
  /**
   * iOS routes a `playAndRecord` session to the receiver — the earpiece you hold to your head —
   * unless something overrides the output port, and neither expo-audio nor react-native-webrtc
   * exposes that.
   */
  setSpeaker: (on: boolean) => void;
  /** Where the audio actually ended up, which is not always what was asked for. */
  speakerOn: boolean;
  /** False when the routing module is absent: the call still works, the speaker button does not. */
  canRoute: boolean;
};

/** Thrown when this build simply cannot hold a call, so the UI can say so rather than crash. */
export class VoiceUnavailableError extends Error {
  constructor() {
    super('Glas traži novi build aplikacije.');
    this.name = 'VoiceUnavailableError';
  }
}

type Webrtc = typeof import('react-native-webrtc');
type Router = typeof import('react-native-incall-manager').default;

/** WebRTC is required; without it there is no call at all. */
function loadWebrtc(): Webrtc {
  try {
    const webrtc = require('react-native-webrtc') as Webrtc;
    if (!webrtc?.RTCPeerConnection || !webrtc?.mediaDevices) throw new Error('incomplete');

    return webrtc;
  } catch {
    throw new VoiceUnavailableError();
  }
}

/** Routing is optional: without it the call runs, it just comes out of wherever iOS chose. */
function loadRouter(): Router | null {
  try {
    const router = require('react-native-incall-manager').default as Router;

    return typeof router?.setForceSpeakerphoneOn === 'function' ? router : null;
  } catch {
    return null;
  }
}

/** OpenAI wants one complete offer, so the local candidates have to be in it before it is sent. */
function waitForIce(pc: RTCPeerConnectionType, timeoutMs = 3000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();

  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      // @ts-expect-error the RN types do not declare removeEventListener on the connection
      pc.removeEventListener?.('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => { if (pc.iceGatheringState === 'complete') done(); };
    // Trickle ICE is not on offer here, but a network that never finishes gathering should not
    // hold the call open forever — whatever was collected by then is good enough to connect.
    const timer = setTimeout(done, timeoutMs);
    // @ts-expect-error same
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

export async function startVoiceSession({
  callUrl,
  key,
  speaker = true,
  onStateChange,
  onTranscript,
}: {
  callUrl: string;
  key: string;
  /** A consultation is held at arm's length, so the speaker is the sane default. */
  speaker?: boolean;
  onStateChange?: (state: string) => void;
  /** Fires as each side's turn is transcribed, so the call can be read back afterwards. */
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;
}): Promise<VoiceSession> {
  const { RTCPeerConnection, RTCSessionDescription, mediaDevices } = loadWebrtc();
  const router = loadRouter();

  let speakerOn = false;

  if (router) {
    // Claims the media route for a call: audio focus, the right category, proximity sensor off.
    router.start({ media: 'audio' });

    /**
     * Forcing the loudspeaker overrides headphones, which is the opposite of what someone wearing
     * them wants, so the force only applies when nothing is plugged in.
     *
     * Only WIRED headsets are detectable here. A Bluetooth headset still needs the button.
     */
    const { isWiredHeadsetPluggedIn } = await router
      .getIsWiredHeadsetPluggedIn()
      .catch(() => ({ isWiredHeadsetPluggedIn: false }));

    speakerOn = speaker && !isWiredHeadsetPluggedIn;
    router.setForceSpeakerphoneOn(speakerOn);
  }

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  // @ts-expect-error RN types lag the DOM-style listener the library actually ships
  pc.addEventListener('connectionstatechange', () => onStateChange?.(pc.connectionState));

  /**
   * The realtime API talks over a data channel named `oai-events`, and that is the only place the
   * words exist: the audio itself never reaches our server. Both completed transcripts are lifted
   * out of it here.
   */
  const events = pc.createDataChannel('oai-events');
  events.onmessage = (event: { data: string }) => {
    try {
      const payload = JSON.parse(event.data) as { type?: string; transcript?: string };
      if (!payload.transcript) return;

      if (payload.type === 'conversation.item.input_audio_transcription.completed') {
        onTranscript?.('user', payload.transcript);
      }
      if (payload.type === 'response.output_audio_transcript.done') {
        onTranscript?.('assistant', payload.transcript);
      }
    } catch {
      // A frame that is not JSON is not a transcript; nothing to salvage.
    }
  };

  let stream: MediaStream | null = null;

  try {
    stream = (await mediaDevices.getUserMedia({ audio: true })) as MediaStream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream as MediaStream));

    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    await waitForIce(pc);

    const response = await fetch(callUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/sdp',
      },
      body: pc.localDescription?.sdp ?? offer.sdp,
    });

    const answer = await response.text();

    if (!response.ok) {
      // The body is the useful part: an expired key, a bad model, a malformed offer.
      throw new Error(`OpenAI ${response.status}: ${answer.slice(0, 200)}`);
    }

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    pc.close();
    router?.stop();
    throw error;
  }

  const localStream = stream;

  return {
    hangUp: () => {
      localStream?.getTracks().forEach(track => track.stop());
      pc.close();
      // Hands the route back; without this the phone stays in call mode after the screen closes.
      router?.stop();
    },
    setSpeaker: (on: boolean) => router?.setForceSpeakerphoneOn(on),
    speakerOn,
    canRoute: router !== null,
    // Muting stops sending without tearing the call down, so Mark keeps talking while you listen.
    setMuted: (muted: boolean) => {
      localStream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
    },
  };
}
