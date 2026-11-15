import type { MediaStream, RTCPeerConnection as RTCPeerConnectionType } from 'react-native-webrtc';
import { restoreConversation, transcriptBuffer, type RealtimeHistory, type RealtimeEvent } from './realtimeConversation';

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
  finish: () => Promise<boolean>;
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
  if (typeof window !== 'undefined' && globalThis.RTCPeerConnection && navigator.mediaDevices) {
    return { RTCPeerConnection: globalThis.RTCPeerConnection, RTCSessionDescription: globalThis.RTCSessionDescription, mediaDevices: navigator.mediaDevices } as unknown as Webrtc;
  }
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
  if (typeof window !== 'undefined' && globalThis.RTCPeerConnection) return null;
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
  history,
  opensConversation,
  signal,
  speaker = true,
  onStateChange,
  onTranscript,
  onToolCall,
}: {
  callUrl: string;
  key: string;
  history: RealtimeHistory[];
  opensConversation: boolean;
  signal?: AbortSignal;
  /** A consultation is held at arm's length, so the speaker is the sane default. */
  speaker?: boolean;
  onStateChange?: (state: string) => void;
  /** Fires as each side's turn is transcribed, so the call can be read back afterwards. */
  onToolCall?: (name: string, args: Record<string, unknown>, callId: string) => Promise<unknown>;
  onTranscript?: (role: 'user' | 'assistant', text: string, itemId?: string) => void;
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

  /**
   * The realtime API talks over a data channel named `oai-events`, and that is the only place the
   * words exist: the audio itself never reaches our server. Both completed transcripts are lifted
   * out of it here.
   */
  const remoteAudio = typeof document !== 'undefined' ? document.createElement('audio') : null;
  if (remoteAudio) {
    remoteAudio.autoplay = true;
    // @ts-expect-error RN's event types do not include the browser track event.
    pc.addEventListener('track', (event: RTCTrackEvent) => {
      remoteAudio.srcObject = event.streams[0] ?? new globalThis.MediaStream([event.track]);
      void remoteAudio.play().catch(() => onStateChange?.('playback-blocked'));
    });
  }
  const events = pc.createDataChannel('oai-events');
  const restoration = restoreConversation({ history, opensConversation, send: event => events.send(JSON.stringify(event)) });
  const transcripts = transcriptBuffer((role, text, id) => onTranscript?.(role, text, id));
  let ready = false;
  // @ts-expect-error RN types lag the DOM-style listener the library actually ships
  pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      restoration.fail(new Error('Veza je prekinuta.'));
      close();
    }
    if (pc.connectionState !== 'connected' || ready) onStateChange?.(pc.connectionState);
  });
  events.onopen = () => restoration.start();
  events.onclose = () => {
    restoration.fail(new Error('Veza je prekinuta.'));
    close();
    onStateChange?.('closed');
  };
  events.onmessage = (event: { data: string }) => {
    try {
      const payload = JSON.parse(event.data) as RealtimeEvent;
      restoration.receive(payload);
      transcripts.receive(payload);
      const tool = payload as RealtimeEvent & {name?:string;arguments?:string;call_id?:string};
      if (tool.type === 'response.function_call_arguments.done' && tool.call_id && tool.name && onToolCall) {
        const callId=tool.call_id;
        let args: Record<string, unknown>;
        try { args=JSON.parse(tool.arguments ?? '{}'); } catch { args={}; }
        void onToolCall(tool.name,args,callId).then(result=>{
          if(closed)return;
          events.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:callId,output:JSON.stringify(result)}}));
          events.send(JSON.stringify({type:'response.create'}));
        }).catch(()=>{if(!closed){events.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:callId,output:JSON.stringify({error:'Action was not recorded. Retry or clarify.'})}}));events.send(JSON.stringify({type:'response.create'}));}});
      }
    } catch {
      // A frame that is not JSON is not a transcript; nothing to salvage.
    }
  };

  let stream: MediaStream | null = null;
  let closed = false;
  let completeAtClose = true;
  const close = () => {
    if (closed) return;
    closed = true;
    events.onmessage = null;
    events.onopen = null;
    events.onclose = null;
    restoration.fail(new Error('Poziv je zatvoren.'));
    completeAtClose = transcripts.isComplete();
    transcripts.close();
    stream?.getTracks().forEach(track => track.stop());
    pc.close();
    router?.stop();
    if (remoteAudio) { remoteAudio.pause(); remoteAudio.srcObject = null; }
    signal?.removeEventListener('abort', close);
  };
  signal?.addEventListener('abort', close);

  try {
    if (signal?.aborted) throw new Error('Poziv je zatvoren.');
    stream = (await mediaDevices.getUserMedia({ audio: true })) as MediaStream;
    if (closed || signal?.aborted) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error('Poziv je zatvoren.');
    }
    stream.getTracks().forEach(track => {
      track.enabled = false;
      pc.addTrack(track, stream as MediaStream);
    });

    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);
    await waitForIce(pc);

    const response = await fetch(callUrl, {
      signal,
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
    const connectionTimer = setTimeout(() => restoration.fail(new Error('Veza nije spremna. Pokušajte ponovo.')), 20000);
    try { await restoration.ready; } finally { clearTimeout(connectionTimer); }
    if (closed) throw new Error('Poziv je zatvoren.');
    ready = true;
    stream.getAudioTracks().forEach(track => { track.enabled = true; });
    onStateChange?.('connected');
  } catch (error) {
    close();
    throw error;
  }

  const localStream = stream;

  return {
    hangUp: close,
    finish: async () => {
      if (closed) return completeAtClose;
      localStream?.getAudioTracks().forEach(track => { track.enabled = false; });
      // Let final transcription events arrive before closing the data channel.
      await new Promise(resolve => setTimeout(resolve, 750));
      const deadline = Date.now() + 4000;
      while (!closed && !transcripts.isComplete() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      close();
      return completeAtClose;
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
