import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateArtifactUrl, buildPayload } from '../lib/artifact-url.js';

test('accepts claude.ai artifact links', () => {
  assert.ok(validateArtifactUrl('https://claude.ai/artifact/abc123').ok);
  assert.ok(validateArtifactUrl('https://claude.ai/code/artifact/0f3a-9b_x').ok);
});

test('rejects non-artifact or non-claude links', () => {
  for (const url of [
    'http://claude.ai/artifact/abc',
    'https://evil.example/artifact/abc',
    'https://claude.ai.evil.example/artifact/abc',
    'https://claude.ai/settings',
    'https://claude.ai/artifact/abc/../../logout',
    'javascript:alert(1)',
    'not a url',
  ]) {
    assert.equal(validateArtifactUrl(url).ok, false, url);
  }
});

test('buildPayload requires a title and trims fields', () => {
  assert.equal(buildPayload({ url: 'https://claude.ai/artifact/a' }).ok, false);
  const { payload } = buildPayload({
    title: '  Quiz ready ',
    body: 'x'.repeat(500),
    url: 'https://claude.ai/artifact/a',
  });
  assert.equal(payload.title, 'Quiz ready');
  assert.equal(payload.body.length, 240);
  assert.equal(payload.tag, undefined);
});
