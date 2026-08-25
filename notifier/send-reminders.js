#!/usr/bin/env node
// Free meal-reminder push sender — run on a schedule by GitHub Actions
// (see .github/workflows/send-reminders.yml). Reads due reminders from
// Firestore and sends real Web Push notifications directly via the
// `web-push` library — no Firebase Cloud Messaging, no Cloud Functions, no
// billing plan required anywhere in this pipeline.
//
// Required env vars (set as GitHub Actions secrets, never committed):
//   FIREBASE_SERVICE_ACCOUNT   - full JSON of a Firebase service account key
//   VAPID_PUBLIC_KEY           - same value as the app's VITE_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY          - keep this one secret, never in the client
//   VAPID_SUBJECT              - e.g. "mailto:you@example.com"

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import webpush from 'web-push'

function requireEnv(name) {
    const value = process.env[name]
    if (!value) {
        console.error(`Missing required env var: ${name}`)
        process.exit(1)
    }
    return value
}

const serviceAccount = JSON.parse(requireEnv('FIREBASE_SERVICE_ACCOUNT'))
const vapidPublicKey = requireEnv('VAPID_PUBLIC_KEY')
const vapidPrivateKey = requireEnv('VAPID_PRIVATE_KEY')
const vapidSubject = requireEnv('VAPID_SUBJECT')

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

function localDateAndTime(timezone) {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    }).formatToParts(now)
    const get = (type) => parts.find((p) => p.type === type)?.value
    return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        hour: Number(get('hour')),
        minute: Number(get('minute')),
    }
}

async function main() {
    // Every user's push config lives at users/{uid}/push/config.
    const snapshot = await db.collectionGroup('push').get()
    let sent = 0
    let cleared = 0

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        if (!data?.subscription || !Array.isArray(data.reminders)) continue

        const { date, hour, minute } = localDateAndTime(data.timezone)
        const sentToday = data.sentToday || {}
        const updates = {}

        for (const reminder of data.reminders) {
            if (!reminder.enabled) continue
            const scheduledMinutes = reminder.hour * 60 + reminder.minute
            const nowMinutes = hour * 60 + minute
            // 10-minute window covers gaps if a run is occasionally delayed.
            const withinWindow = nowMinutes >= scheduledMinutes && nowMinutes < scheduledMinutes + 10
            if (!withinWindow || sentToday[reminder.id] === date) continue

            try {
                await webpush.sendNotification(
                    data.subscription,
                    JSON.stringify({
                        title: `🍽️ Time to log ${reminder.label}`,
                        body: `Don't forget to log your ${reminder.label.toLowerCase()} in CalTrack.`,
                        tag: `meal-${reminder.id}`,
                    })
                )
                updates[`sentToday.${reminder.id}`] = date
                sent += 1
            } catch (error) {
                console.warn(`Push failed for ${docSnap.ref.path}:`, error.statusCode || error.message)
                if (error.statusCode === 404 || error.statusCode === 410) {
                    updates.subscription = null // subscription expired/revoked, stop retrying
                    cleared += 1
                }
            }
        }

        if (Object.keys(updates).length > 0) {
            await docSnap.ref.set(updates, { merge: true })
        }
    }

    console.log(`Meal reminder sweep done: ${sent} sent, ${cleared} stale subscriptions cleared, ${snapshot.docs.length} configs checked.`)
}

main().catch((error) => {
    console.error('Notifier run failed:', error)
    process.exit(1)
})
