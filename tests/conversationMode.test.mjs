import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMode, conversationModes } from '../lib/conversationMode.ts';
import { createDurableOutbox } from '../lib/durableOutbox.ts';

test('five modes route inputs and replies independently of old conversation modality', () => {
  assert.deepEqual(conversationModes.map(mode => resolveMode(mode)), [
    { input: 'voice', output: 'voice', realtime: true, compatible: true },
    { input: 'voice', output: 'voice', realtime: false, compatible: true },
    { input: 'voice', output: 'text', realtime: false, compatible: true },
    { input: 'text', output: 'voice', realtime: false, compatible: true },
    { input: 'text', output: 'text', realtime: false, compatible: true },
  ]);
});
test('quiet suggestions support both speech engines and dictaphone rejects typed input', () => {
  const quiet = { supports_voice: true, supports_text: true, reply_modality: 'text' };
  for (const mode of conversationModes) assert.equal(resolveMode(mode, quiet).output, 'text');
  const dictaphone = { supports_voice: true, supports_text: false };
  assert.equal(resolveMode('high_quality_voice', dictaphone).compatible, true);
  assert.equal(resolveMode('low_quality_voice', dictaphone).compatible, true);
  assert.equal(resolveMode('text_text', dictaphone).compatible, false);
});
const entry = key => ({ key, conversation_id: 1, path: '/messages', payload: { body: key } });
function storage() {
  const data = new Map();
  return { read: scope => JSON.parse(data.get(scope) ?? '[]'), write: (scope, entries) => data.set(scope, JSON.stringify(entries)) };
}
test('failed turns survive process restart and replay in order', async () => {
  const disk = storage();
  let fail = true;
  const sent = [];
  const send = async item => { if (fail) throw new Error('offline'); sent.push(item.key); return item.key; };
  const first = createDurableOutbox(disk, send, () => 'user-1');
  first.enqueue(entry('user')); first.enqueue(entry('assistant'));
  await assert.rejects(first.submit(entry('assistant')));
  assert.equal(first.read().length, 2);
  fail = false;
  const restarted = createDurableOutbox(disk, send, () => 'user-1');
  await restarted.flush(1);
  assert.deepEqual(sent, ['user', 'assistant']);
  assert.deepEqual(restarted.read(), []);
});
test('concurrent delivery shares the same in-flight request', async () => {
  let release; let count = 0;
  const queue = createDurableOutbox(storage(), () => { count++; return new Promise(resolve => { release = resolve; }); }, () => 'user-1');
  queue.enqueue(entry('one'));
  const a = queue.submit(entry('one')); const b = queue.submit(entry('one'));
  assert.equal(count, 1); release('saved');
  assert.deepEqual(await Promise.all([a, b]), ['saved', 'saved']);
});
test('switching accounts cannot flush another user’s remaining entries', async () => {
  let scope = 'first'; let release;
  const queue = createDurableOutbox(storage(), () => new Promise(resolve => { release = resolve; }), () => scope);
  queue.enqueue(entry('one')); queue.enqueue(entry('two'));
  const flush = queue.flush(1);
  scope = 'second'; release('saved');
  await assert.rejects(flush, /Account changed/);
  assert.deepEqual(queue.read(), []);
  scope = 'first'; assert.deepEqual(queue.read().map(e => e.key), ['two']);
});
