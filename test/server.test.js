import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import webpush from 'web-push';

const PORT = 18787;
const base = `http://localhost:${PORT}`;
const TOKEN = 'test-token-123';
let server, dataFile;

before(async () => {
  const keys = webpush.generateVAPIDKeys();
  dataFile = join(await mkdtemp(join(tmpdir(), 'absite-')), 'subs.json');
  server = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env, PORT, NOTIFY_TOKEN: TOKEN, DATA_FILE: dataFile,
      VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey,
    },
  });
  await new Promise((resolve) => server.stdout.once('data', resolve));
});

after(() => server.kill());

const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('serves the subscribe page and service worker', async () => {
  assert.equal((await fetch(base + '/')).status, 200);
  const sw = await fetch(base + '/sw.js');
  assert.match(await sw.text(), /openWindow/);
  assert.equal((await fetch(base + '/../server.js')).status, 404);
});

test('exposes the VAPID public key', async () => {
  const { key } = await (await fetch(base + '/api/vapid-public-key')).json();
  assert.ok(key.length > 40);
});

test('stores subscriptions, deduplicated by endpoint', async () => {
  const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };
  assert.equal((await post('/api/subscribe', sub)).status, 201);
  const res = await post('/api/subscribe', sub);
  assert.deepEqual(await res.json(), { devices: 1 });
  assert.equal(JSON.parse(await readFile(dataFile, 'utf8')).length, 1);
  assert.equal((await post('/api/subscribe', { endpoint: 'nope' })).status, 400);
});

test('notify requires the bearer token', async () => {
  const res = await post('/api/notify', { title: 't', url: 'https://claude.ai/artifact/a' });
  assert.equal(res.status, 401);
});

test('notify rejects non-artifact URLs', async () => {
  const res = await post('/api/notify', { title: 't', url: 'https://evil.example' }, { authorization: `Bearer ${TOKEN}` });
  assert.equal(res.status, 400);
});
