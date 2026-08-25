// Real push notifications — 100% free. Uses the browser's standard Push API
// (not Firebase Cloud Messaging), so there's no Cloud Functions / Blaze
// billing involved anywhere. The pieces:
//   1. This file subscribes the browser to push and saves the subscription
//      to Firestore (free Spark plan — just data storage, same project you
//      already use for optional cloud sync).
//   2. public/push-sw.js is the tiny static service worker that shows the
//      notification when a push arrives.
//   3. notifier/ + .github/workflows/send-reminders.yml is a free scheduled
//      GitHub Actions job that reads due reminders from Firestore and sends
//      the actual push via the `web-push` library.
// See README "Push notifications" for the one-time setup.

import { getApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { isPushConfigured } from '../config/firebase.js'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

export { isPushConfigured }

export function isPushSupportedInBrowser() {
    return isPushConfigured() && 'serviceWorker' in navigator && 'PushManager' in window
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

/**
 * Subscribes this browser to push and saves the subscription + reminder
 * schedule + timezone to Firestore so the GitHub Actions job can find it.
 */
export async function enablePushReminders(userId, reminders) {
    if (!isPushSupportedInBrowser()) return { success: false, message: 'Push notifications are not supported/configured here.' }
    if (!userId) return { success: false, message: 'Not signed in yet.' }

    try {
        const registration = await navigator.serviceWorker.register('/push-sw.js')
        await navigator.serviceWorker.ready

        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            })
        }

        const db = getFirestore(getApp())
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        await setDoc(doc(db, 'users', userId, 'push', 'config'), {
            subscription: subscription.toJSON(),
            reminders,
            timezone,
            updatedAt: new Date().toISOString(),
        }, { merge: true })

        return { success: true, message: 'Push reminders enabled on this device.' }
    } catch (error) {
        console.error('Enable push reminders failed:', error)
        return { success: false, message: error.message }
    }
}

export async function disablePushReminders(userId) {
    if (!isPushConfigured() || !userId) return { success: false }
    try {
        const registration = await navigator.serviceWorker.getRegistration('/push-sw.js')
        const subscription = await registration?.pushManager.getSubscription()
        await subscription?.unsubscribe()

        const db = getFirestore(getApp())
        await setDoc(doc(db, 'users', userId, 'push', 'config'), { subscription: null, reminders: [] }, { merge: true })
        return { success: true }
    } catch (error) {
        return { success: false, message: error.message }
    }
}
