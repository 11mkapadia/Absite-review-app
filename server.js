import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import webpush from 'web-push';
import { buildPayload } from './lib/artifact-url.js';
import { SubscriptionStore } from './lib/store.js';

const {
  PORT = 8787,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:admin@example.com',
  NOTIFY_TOKEN,
  DATA_FILE = 'data/subscriptions.json',
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !NOTIFY_TOKEN) {
  console.error('Missing VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY or NOTIFY_TOKEN. Run `npm run vapid` first.');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const store = new SubscriptionStore(DATA_FILE);
const PUBLIC_DIR = join(import.meta.dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/manifest+json',
  '.svg': 'image/svg+xml',
};

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error('body too large');
  }
  return JSON.parse(raw || '{}');
}

function authorized(req) {
  const given = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
  const expected = Buffer.from(NOTIFY_TOKEN);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function notify(payload) {
  const subs = await store.all();
  const gone = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 86_400, urgency: 'high' });
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) gone.push(sub.endpoint);
        else console.error('push failed', err.statusCode, err.body);
      }
    }),
  );
  if (gone.length) await store.remove(gone);
  return { sent, pruned: gone.length, total: subs.length };
}

async function serveStatic(req, res) {
  const path = new URL(req.url, 'http://x').pathname;
  const rel = normalize(path === '/' ? 'index.html' : path.slice(1));
  if (rel.startsWith('..')) return send(res, 404, { error: 'not found' });
  try {
    const file = await readFile(join(PUBLIC_DIR, rel));
    res.writeHead(200, { 'content-type': TYPES[extname(rel)] || 'application/octet-stream' });
    res.end(file);
  } catch {
    send(res, 404, { error: 'not found' });
  }
}

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if (req.method === 'GET' && pathname === '/api/vapid-public-key') {
      return send(res, 200, { key: VAPID_PUBLIC_KEY });
    }
    if (req.method === 'POST' && pathname === '/api/subscribe') {
      const sub = await readJson(req);
      if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
        return send(res, 400, { error: 'invalid subscription' });
      }
      return send(res, 201, { devices: await store.add(sub) });
    }
    if (req.method === 'POST' && pathname === '/api/notify') {
      if (!authorized(req)) return send(res, 401, { error: 'unauthorized' });
      const built = buildPayload(await readJson(req));
      if (!built.ok) return send(res, 400, { error: built.error });
      return send(res, 200, await notify(built.payload));
    }
    if (req.method === 'GET') return serveStatic(req, res);
    send(res, 405, { error: 'method not allowed' });
  } catch (err) {
    send(res, 400, { error: err.message });
  }
}).listen(PORT, () => console.log(`ABSITE notifier on http://localhost:${PORT}`));
