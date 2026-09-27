// Only claude.ai artifact links may be pushed, so a leaked notify token
// can't be used to send phishing links to your phone.
const ARTIFACT_PATH = /^\/(code\/)?artifact\/[A-Za-z0-9_-]+\/?$/;

export function validateArtifactUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'url is not a valid URL' };
  }
  if (url.protocol !== 'https:' || url.hostname !== 'claude.ai') {
    return { ok: false, error: 'url must be an https://claude.ai artifact link' };
  }
  if (!ARTIFACT_PATH.test(url.pathname)) {
    return { ok: false, error: 'url must look like https://claude.ai/artifact/<id> or /code/artifact/<id>' };
  }
  return { ok: true, url: url.toString() };
}

export function buildPayload({ title, body, url, tag }) {
  if (typeof title !== 'string' || !title.trim()) {
    return { ok: false, error: 'title is required' };
  }
  const checked = validateArtifactUrl(url);
  if (!checked.ok) return checked;
  return {
    ok: true,
    payload: {
      title: title.trim().slice(0, 120),
      body: typeof body === 'string' ? body.slice(0, 240) : '',
      url: checked.url,
      tag: typeof tag === 'string' && tag ? tag.slice(0, 64) : undefined,
    },
  };
}
