# CalTrack

A simple, private calorie & nutrition tracker. No account, no subscription, no ads — your food log, weight, and activity all live on your own device.

## Features

- **Food logging** with full macros (calories, protein, carbs, fat), optional notes and tags, and a per-food or per-entry **photo** stored locally (IndexedDB) — never uploaded anywhere unless you turn on cloud sync yourself.
- **Custom foods** you create once and quick-add forever, plus a small generic starter database to begin with.
- **Activity logging** — walking/running/cycling/gym/etc. with distance, duration, and calories burned (manual or auto-estimated).
- **Gym tracking** — pick a routine (Push/Pull/Legs, Full Body, Upper/Lower, or your own custom split), log sets/reps/weight per exercise, and see your last performance on each exercise for progressive overload.
- **Weight and water tracking**, each with an optional daily goal.
- **Meal reminders** — local by default (fires while the app is open/backgrounded, no setup needed), with an optional **real push notification** upgrade that arrives even when the app is fully closed (see below).
- **Progress stats** — logging streak, 7-day averages, and a weight trend chart in History.
- **History** view of every past day, searchable by food name or tag.
- **Export**:
  - Full Excel backup/restore (food log, activity, weight).
  - **Export for AI** — a plain-text summary of your recent log formatted to paste straight into any AI chat (ChatGPT, Claude, etc.) and ask for feedback on your eating patterns.
- **100% local by default.** Optional cloud sync only turns on if you configure your own Firebase project — see `.env.example`. Nobody's credentials ship in this repo, so forking it never sends your data to someone else's database.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. That's it — no setup, no API keys required.

### Optional: cloud sync

If you want to back up or sync across devices, create a free [Firebase](https://firebase.google.com/) project (enable Firestore + Google Auth), copy `.env.example` to `.env`, and fill in your project's web config. Restart the dev server — a "Cloud Sync" section appears in Settings.

### Optional: real push notifications (100% free)

Local reminders (the default) only fire while the app/tab is open or backgrounded. If you want reminders to arrive even when the app is fully closed, this repo includes a **free** path to real push — standard Web Push (VAPID), sent by a scheduled **GitHub Actions** job. No Firebase Cloud Messaging, no Cloud Functions, no Blaze/paid plan, no credit card anywhere in this pipeline.

1. **Cloud sync must already be set up** (previous section) — push reuses the same Firebase project (free Spark plan) purely as a place to store your push subscription + reminder times, and the same sign-in.
2. **Generate a VAPID key pair** (one-time, free, local):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Put the **public** key in `.env` as `VITE_VAPID_PUBLIC_KEY`. Keep the **private** key — it goes into a GitHub secret in the next step, never into `.env` or the client.
3. **Create a Firebase service account key** so GitHub Actions can read Firestore: Firebase Console → Project Settings → Service Accounts → "Generate new private key" (downloads a JSON file).
4. **Add these as secrets** on your GitHub repo (Settings → Secrets and variables → Actions → New repository secret):
   - `FIREBASE_SERVICE_ACCOUNT` — paste the full contents of the JSON file from step 3
   - `VAPID_PUBLIC_KEY` — same value as `.env`'s `VITE_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY` — the private key from step 2
   - `VAPID_SUBJECT` — `mailto:you@example.com` (any contact URI; required by the Web Push spec)
5. **Turn the workflow on**: Settings → Secrets and variables → Actions → **Variables** tab → New repository variable → `PUSH_NOTIFICATIONS_ENABLED` = `true`. (It's gated behind this so a fresh fork doesn't start failing cron runs with no secrets configured.)
6. Rebuild the app so it picks up `VITE_VAPID_PUBLIC_KEY`, sign in to Google in Settings, and toggle "Real Push Notifications" on. The GitHub Actions workflow (`.github/workflows/send-reminders.yml`) checks every 10 minutes and sends any due reminder — you can also trigger it manually from the Actions tab to test.

Only your push subscription, reminder times, and browser timezone are stored in Firebase for this — your food, gym, and weight data stay wherever cloud sync already puts them (local-only if you never enabled cloud sync). GitHub Actions' free tier (2,000 minutes/month on private repos, unlimited on public ones) comfortably covers a job this small running every 10 minutes.

### Building

```bash
npm run build   # outputs to dist/
npm run preview
```

This is a Vite + React PWA — installable to a home screen from the browser's "Add to Home Screen" menu. Capacitor config is included for native Android/iOS wrapping if you want to go that route.
