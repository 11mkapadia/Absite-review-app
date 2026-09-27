# Absite-review-app

Push notifications for the Claude ABSITE review agent. When the agent publishes
an artifact (a quiz, study sheet, SCORE question log or score report), it sends
a push to your phone. **Tap the notification and the artifact opens**, or the
tab gets focus if the artifact is already open.

```
Claude ABSITE agent ──publish──▶ claude.ai/artifact/<id>
        │
        └─ node scripts/notify.js --url <artifact> ──▶ POST /api/notify
                                                          │ Web Push (VAPID)
                                                          ▼
                              phone / desktop ─ tap ─▶ opens the artifact
```

## Setup

```bash
npm install
npm run vapid > .env   # save the keys
set -a; . ./.env; set +a
VAPID_SUBJECT=mailto:you@example.com npm start
```

Push needs HTTPS, so deploy the server on any HTTPS host (Render, Fly.io,
Railway, a VPS behind Caddy, and so on), or use `localhost` for desktop testing.
Keep the `data/` directory on persistent storage, because it holds the device
subscriptions.

### Subscribe a device

Open the server's URL on the device and tap **Enable notifications on this
device**.

- **Android (Chrome):** works directly. If the Claude app is installed and
  handles claude.ai links, the artifact may open in the app.
- **iPhone (iOS 16.4+):** first choose Share → **Add to Home Screen**, then open
  the page from the Home Screen icon. iOS only allows push for installed web apps.

## Sending from the Claude agent

The repo ships a Claude skill at `.claude/skills/notify-artifact/SKILL.md`, so a
Claude session working in this repo knows to publish the artifact first and
then run:

```bash
NOTIFY_TOKEN=... ABSITE_NOTIFY_URL=https://your-host \
  node scripts/notify.js --title "ABSITE: GI quiz ready" \
  --body "20 Qs on hepatobiliary" --url https://claude.ai/artifact/<id> --tag daily-quiz
```

For a scheduled agent (a Claude Routine), add `NOTIFY_TOKEN` and
`ABSITE_NOTIFY_URL` as environment secrets. The Routine's prompt can end with
"publish the result as an artifact and notify me with it."

Raw HTTP equivalent:

```bash
curl -X POST "$ABSITE_NOTIFY_URL/api/notify" \
  -H "authorization: Bearer $NOTIFY_TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Quiz ready","body":"20 Qs","url":"https://claude.ai/artifact/<id>","tag":"daily-quiz"}'
```

The response is `{"sent": n, "pruned": n, "total": n}`. Expired devices are
removed automatically.

## Safety

- `/api/notify` requires the bearer `NOTIFY_TOKEN`.
- Only `https://claude.ai/artifact/<id>` and `https://claude.ai/code/artifact/<id>`
  links are accepted, so a leaked token can't push arbitrary links to your phone.
- Artifacts are private by default. Tapping the notification opens claude.ai
  signed in as you. Nobody else can see the artifact unless you share it.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/vapid-public-key` | Public key for `pushManager.subscribe` |
| POST | `/api/subscribe` | Save a browser `PushSubscription` |
| POST | `/api/notify` | Send `{title, body?, url, tag?}` to all devices (auth) |

`npm test` runs the test suite.
