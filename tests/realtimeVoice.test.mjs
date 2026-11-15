import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as conversation from '../lib/realtimeConversation.ts';

function voiceHarness() {
  const sent = [];
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const channel = { send: data => sent.push(JSON.parse(data)) };
  let pc;
  class Connection {
    iceGatheringState = 'complete';
    connectionState = 'new';
    listeners = {};
    constructor() { pc = this; }
    createDataChannel() { return channel; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    addTrack() {}
    async createOffer() { return { sdp: 'offer' }; }
    async setLocalDescription(offer) { this.localDescription = offer; }
    async setRemoteDescription() {
      this.connectionState = 'connected';
      this.listeners.connectionstatechange();
      channel.onopen();
    }
    close() { this.connectionState = 'closed'; }
  }
  const compiled = ts.transpileModule(fs.readFileSync(new URL('../lib/realtimeVoice.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const context = {
    exports, setTimeout, clearTimeout,
    fetch: async () => ({ ok: true, text: async () => 'answer' }),
    require(name) {
      if (name === './realtimeConversation') return conversation;
      if (name === 'react-native-webrtc') return { RTCPeerConnection: Connection, RTCSessionDescription: class {}, mediaDevices: { getUserMedia: async () => stream } };
      if (name === 'react-native-incall-manager') return { default: null };
      throw new Error(name);
    },
  };
  vm.runInNewContext(compiled, context);
  return { start: exports.startVoiceSession, track, channel, sent, connection: () => pc };
}

test('real voice setup keeps the microphone off until history is acknowledged', async () => {
  const harness = voiceHarness();
  const states = [];
  const pending = harness.start({
    callUrl: 'https://example.test/call', key: 'test',
    history: [{ id: 1, role: 'assistant', body: 'Pain for 90 minutes.' }],
    opensConversation: false, onStateChange: state => states.push(state),
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(harness.track.enabled, false);
  assert.equal(states.includes('connected'), false);
  assert.equal(harness.sent[0].item.content[0].text, 'Pain for 90 minutes.');
  harness.channel.onmessage({ data: JSON.stringify({ type: 'conversation.item.added', item: { id: 'history_1' } }) });
  const session = await pending;
  assert.equal(harness.track.enabled, true);
  assert.equal(states.includes('connected'), true);
  session.hangUp();
  assert.equal(harness.track.stopped, true);
  assert.equal(harness.connection().connectionState, 'closed');
});

test('leaving during restoration closes the old call and never enables its microphone', async () => {
  const harness = voiceHarness();
  const abort = new AbortController();
  const pending = harness.start({
    callUrl: 'https://example.test/call', key: 'test', signal: abort.signal,
    history: [{ id: 1, role: 'assistant', body: 'Pain for 90 minutes.' }], opensConversation: false,
  });
  await new Promise(resolve => setImmediate(resolve));
  abort.abort();
  await assert.rejects(pending, /Poziv je zatvoren/);
  assert.equal(harness.track.enabled, false);
  assert.equal(harness.track.stopped, true);
  assert.equal(harness.connection().connectionState, 'closed');
});

test('voice function calls record actions and return their result to the model', async () => {
  const h = voiceHarness(); const calls=[];
  const session=await h.start({callUrl:'https://example.test/call',key:'test',history:[],opensConversation:false,
    onToolCall:async(name,args,id)=>{calls.push({name,args,id});return {recorded:true};}});
  h.channel.onmessage({data:JSON.stringify({type:'response.function_call_arguments.done',name:'record_practice_event',call_id:'call_1',arguments:JSON.stringify({kind:'action',description:'Ask about allergies'})})});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls[0].args.kind,'action');
  assert.equal(h.sent.at(-2).item.call_id,'call_1');
  assert.equal(JSON.parse(h.sent.at(-2).item.output).recorded,true);
  assert.equal(h.sent.at(-1).type,'response.create');session.hangUp();
});

test('failed action recording is reported to the model instead of pretending success',async()=>{
  const h=voiceHarness();const session=await h.start({callUrl:'https://example.test/call',key:'test',history:[],opensConversation:false,onToolCall:async()=>{throw Error('offline');}});
  h.channel.onmessage({data:JSON.stringify({type:'response.function_call_arguments.done',name:'record_practice_event',call_id:'call_2',arguments:'{}'})});
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(JSON.parse(h.sent.at(-2).item.output).error,/not recorded/);session.hangUp();
});

test('finishing waits for final transcript before closing the voice channel', async()=>{
  const h=voiceHarness();const saved=[];
  const session=await h.start({callUrl:'https://example.test/call',key:'test',history:[],opensConversation:false,onTranscript:(...args)=>saved.push(args)});
  h.channel.onmessage({data:JSON.stringify({type:'conversation.item.added',item:{id:'final_turn',role:'user',type:'message'}})});
  const done=session.finish();
  assert.equal(h.track.enabled,false);
  setTimeout(()=>h.channel.onmessage({data:JSON.stringify({type:'conversation.item.input_audio_transcription.completed',item_id:'final_turn',transcript:'I will arrange urgent review.'})}),50);
  assert.equal(await done,true);assert.equal(saved[0][1],'I will arrange urgent review.');assert.equal(h.track.stopped,true);
});
