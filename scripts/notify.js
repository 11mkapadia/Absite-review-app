#!/usr/bin/env node
// Usage: node scripts/notify.js --title "..." --url https://claude.ai/artifact/<id> [--body "..."] [--tag quiz]
// Reads ABSITE_NOTIFY_URL (default http://localhost:8787) and NOTIFY_TOKEN from the environment.
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    title: { type: 'string' },
    body: { type: 'string', default: '' },
    url: { type: 'string' },
    tag: { type: 'string' },
  },
});

const base = process.env.ABSITE_NOTIFY_URL || 'http://localhost:8787';
const token = process.env.NOTIFY_TOKEN;
if (!token || !values.title || !values.url) {
  console.error('Need NOTIFY_TOKEN env var plus --title and --url.');
  process.exit(2);
}

const res = await fetch(new URL('/api/notify', base), {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  body: JSON.stringify(values),
});
const out = await res.json();
console.log(JSON.stringify(out));
process.exit(res.ok ? 0 : 1);
