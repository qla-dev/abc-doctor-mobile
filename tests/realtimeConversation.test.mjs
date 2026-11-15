import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreConversation, transcriptBuffer } from '../lib/realtimeConversation.ts';
import { TranscriptQueue } from '../lib/transcriptQueue.ts';

const history = [
  { id: 10, role: 'assistant', body: 'Pain began 90 minutes ago.' },
  { id: 11, role: 'user', body: 'Where does it hurt?' },
];

test('restores both roles in order and waits for all acknowledgements without greeting again', async () => {
  const sent = [];
  const restore = restoreConversation({ history, opensConversation: true, send: event => sent.push(event) });
  let ready = false;
  void restore.ready.then(() => { ready = true; });
  restore.start();
  assert.deepEqual(sent.map(event => event.item.role), ['assistant', 'user']);
  assert.deepEqual(sent.map(event => event.item.content[0].type), ['text', 'input_text']);
  restore.receive({ type: 'conversation.item.added', item: { id: 'unrelated' } });
  restore.receive({ type: 'conversation.item.added', item: { id: 'history_11' } });
  await Promise.resolve();
  assert.equal(ready, false);
  restore.receive({ type: 'conversation.item.added', item: { id: 'history_10' } });
  await restore.ready;
  assert.equal(sent.length, 2);
  restore.start();
  assert.equal(sent.length, 2);
});

test('new voice patients open exactly once', async () => {
  const sent = [];
  const restore = restoreConversation({ history: [], opensConversation: true, send: event => sent.push(event) });
  restore.start();
  restore.start();
  await restore.ready;
  assert.deepEqual(sent, [{ type: 'response.create' }]);
});

test('non-opening skills wait for the caller', async () => {
  const sent = [];
  const restore = restoreConversation({ history: [], opensConversation: false, send: event => sent.push(event) });
  restore.start();
  await restore.ready;
  assert.deepEqual(sent, []);
});

test('failed or timed-out history restoration cannot silently start an empty call', async () => {
  const failed = restoreConversation({ history, opensConversation: false, send() {} });
  failed.start();
  failed.receive({ type: 'error', error: { message: 'history rejected' } });
  await assert.rejects(failed.ready, /history rejected/);
  const timeout = restoreConversation({ history, opensConversation: false, send() {}, timeoutMs: 5 });
  timeout.start();
  await assert.rejects(timeout.ready, /Obnova razgovora/);
});

test('transcripts are emitted in conversational order even if the assistant transcription arrives first', () => {
  const turns = [];
  const buffer = transcriptBuffer((...args) => turns.push(args));
  buffer.receive({ type: 'conversation.item.added', item: { id: 'user_1', role: 'user' } });
  buffer.receive({ type: 'conversation.item.added', item: { id: 'assistant_1', role: 'assistant' } });
  buffer.receive({ type: 'response.output_audio_transcript.done', item_id: 'assistant_1', transcript: '90 minutes.' });
  assert.deepEqual(turns, []);
  buffer.receive({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'user_1', transcript: 'How long?' });
  assert.deepEqual(turns, [['user', 'How long?', 'user_1'], ['assistant', '90 minutes.', 'assistant_1']]);
  buffer.receive({ type: 'response.output_audio_transcript.done', item_id: 'assistant_1', transcript: '90 minutes.' });
  buffer.close();
  assert.equal(turns.length, 2);
});

test('restored messages are not saved as new turns and a failed transcription does not block later turns', () => {
  const turns = [];
  const buffer = transcriptBuffer((...args) => turns.push(args));
  buffer.receive({ type: 'conversation.item.added', item: { id: 'history_10', role: 'assistant' } });
  buffer.receive({ type: 'conversation.item.created', item: { id: 'user_1', role: 'user' } });
  buffer.receive({ type: 'conversation.item.created', item: { id: 'assistant_1', role: 'assistant' } });
  buffer.receive({ type: 'response.output_audio_transcript.done', item_id: 'assistant_1', transcript: '90 minutes.' });
  buffer.receive({ type: 'conversation.item.input_audio_transcription.failed', item_id: 'user_1' });
  assert.deepEqual(turns, [['assistant', '90 minutes.', 'assistant_1']]);
});

test('reconnection waits for unfinished transcript uploads and retries failed saves', async () => {
  const queue = new TranscriptQueue();
  let finish;
  const upload = queue.save(1, 'item_1', () => new Promise(resolve => { finish = resolve; }));
  let flushed = false;
  const flushing = queue.flush(1).then(() => { flushed = true; });
  await Promise.resolve();
  assert.equal(flushed, false);
  finish('saved');
  await upload;
  await flushing;
  assert.equal(flushed, true);
  let attempts = 0;
  await assert.rejects(queue.save(1, 'item_2', async () => {
    if (++attempts === 1) throw new Error('offline');
    return 'saved';
  }), /offline/);
  await queue.flush(1);
  assert.equal(attempts, 2);
});

test('failed transcript retries block a reconnect instead of losing context', async () => {
  const queue = new TranscriptQueue();
  await assert.rejects(queue.save(1, 'item_1', async () => { throw new Error('offline'); }), /offline/);
  await assert.rejects(queue.flush(1), /offline/);
  await queue.flush(2);
});

test('a failed earlier upload is retried before a later answer is stored', async () => {
  const queue = new TranscriptQueue();
  const saved = [];
  let offline = true;
  await assert.rejects(queue.save(1, 'question', async () => {
    if (offline) throw new Error('offline');
    saved.push('question');
    return 'question';
  }), /offline/);
  await assert.rejects(queue.save(1, 'answer', async () => {
    saved.push('answer');
    return 'answer';
  }), /offline/);
  assert.deepEqual(saved, []);
  offline = false;
  await queue.flush(1);
  assert.deepEqual(saved, ['question', 'answer']);
});
