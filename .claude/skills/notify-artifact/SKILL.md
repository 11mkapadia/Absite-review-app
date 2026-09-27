---
name: notify-artifact
description: Send a push notification to the user's phone that opens a Claude artifact on tap. Use after the ABSITE agent publishes or updates a review artifact (quiz, study sheet, SCORE log, score report) the user should look at, or when the user asks to be notified about an artifact.
---

# Notify with an artifact link

1. Publish (or update) the artifact first with the Artifact tool and copy the
   `https://claude.ai/artifact/<id>` or `https://claude.ai/code/artifact/<id>`
   URL from the result. Only these links are accepted.
2. Send the notification:

   ```bash
   node scripts/notify.js \
     --title "ABSITE: 20-question GI quiz ready" \
     --body "Weak area from last week: hepatobiliary. ~15 min." \
     --url "https://claude.ai/artifact/<id>" \
     --tag daily-quiz
   ```

   `NOTIFY_TOKEN` and `ABSITE_NOTIFY_URL` must be set (environment secrets in
   a cloud environment). `--tag` replaces an earlier notification with the
   same tag instead of stacking a new one.
3. Read the JSON result: `sent` is how many devices got it. `sent: 0` with
   `total: 0` means no device has subscribed yet. Tell the user to open the
   notifier page and tap **Enable notifications**.

Keep titles under ~60 characters and lead with what the artifact is. Send one
notification per artifact, not one per progress step.
