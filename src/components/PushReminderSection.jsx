import { useEffect, useState } from 'react'
import { BellRing, RefreshCw } from 'lucide-react'
import { getCurrentUser } from '../services/firebaseSync'
import { enablePushReminders, disablePushReminders, isPushSupportedInBrowser } from '../services/pushNotifications'

function useLocalStorageState(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const raw = localStorage.getItem(key)
            return raw == null ? initialValue : JSON.parse(raw)
        } catch {
            return initialValue
        }
    })
    useEffect(() => {
        try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
    }, [key, value])
    return [value, setValue]
}

// Lazily loaded alongside CloudSyncSection — separate component so
// firebase/firestore is only ever touched by browsers that opt into push.
export default function PushReminderSection({ reminders, onToast }) {
    const [pushEnabled, setPushEnabled] = useLocalStorageState('ct.pushEnabled', false)
    const [busy, setBusy] = useState(false)
    const user = getCurrentUser()
    const supported = isPushSupportedInBrowser()

    // Keep the notifier's copy of the reminder schedule current whenever the
    // user edits times while push is already on.
    useEffect(() => {
        if (!pushEnabled || !user) return
        enablePushReminders(user.uid, reminders.times.filter((t) => t.enabled))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reminders.times])

    async function toggle() {
        if (!user) {
            onToast?.('❌ Sign in to Google above first, so push reminders follow your account.')
            return
        }
        setBusy(true)
        if (pushEnabled) {
            await disablePushReminders(user.uid)
            setPushEnabled(false)
            onToast?.('✓ Push reminders turned off')
        } else {
            const result = await enablePushReminders(user.uid, reminders.times.filter((t) => t.enabled))
            if (result.success) {
                setPushEnabled(true)
                onToast?.(`✓ ${result.message}`)
            } else {
                onToast?.(`❌ ${result.message}`)
            }
        }
        setBusy(false)
    }

    if (!supported) {
        return (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-xs text-slate-500">
                Push notifications aren't supported in this browser (or VITE_VAPID_PUBLIC_KEY isn't set — see .env.example).
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                    <BellRing className="h-4 w-4 text-emerald-400" /> REAL PUSH NOTIFICATIONS
                </div>
                <button
                    type="button"
                    onClick={toggle}
                    disabled={busy}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50 ${pushEnabled ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                >
                    {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                    {pushEnabled ? 'On' : 'Off'}
                </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
                Sends real notifications to this device for your enabled meal reminder times, even when the app is fully closed — free, via a scheduled GitHub Actions job checking every few minutes (see README).
            </p>
            {pushEnabled && (
                <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-950/10 px-3 py-2 text-[11px] text-emerald-400">
                    Active for: {reminders.times.filter((t) => t.enabled).map((t) => t.label).join(', ') || 'no reminders enabled yet'}
                </div>
            )}
        </div>
    )
}
