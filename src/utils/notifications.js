// Local meal-reminder notifications for CalTrack.
//
// These use the browser Notification API and setTimeout scheduling, so they
// only fire while this tab (or an installed PWA window) is open in the
// background — there's no server, so there's no push. That's a fair
// trade-off for an app that keeps 100% of your data on-device.

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications')
        return false
    }
    if (Notification.permission === 'granted') return true
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    }
    return false
}

export function notificationPermission() {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
}

export function showNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    try {
        new Notification(title, {
            icon: '/vite.svg',
            badge: '/vite.svg',
            ...options,
        })
    } catch (error) {
        console.error('Error showing notification:', error)
    }
}

export function notifyMealReminder(label) {
    showNotification(`🍽️ Time to log ${label}`, {
        body: `Don't forget to log your ${label.toLowerCase()} — a quick photo or tap on a recent food takes a few seconds.`,
        tag: `meal-${label}`,
    })
}

export function notifyGoalHit(kind) {
    showNotification('🎯 Goal hit!', {
        body: kind === 'protein' ? "You've hit your protein goal for today." : "You've hit today's goal.",
        tag: `goal-${kind}`,
    })
}

const DEFAULT_REMINDER_TIMES = [
    { id: 'breakfast', label: 'Breakfast', hour: 8, minute: 30, enabled: true },
    { id: 'lunch', label: 'Lunch', hour: 13, minute: 0, enabled: true },
    { id: 'dinner', label: 'Dinner', hour: 19, minute: 30, enabled: true },
]

export function defaultReminderTimes() {
    return DEFAULT_REMINDER_TIMES.map((r) => ({ ...r }))
}

let scheduledTimers = []

/**
 * Schedule (or reschedule) in-tab reminders for the given list of
 * { id, label, hour, minute, enabled } entries. Clears any previously
 * scheduled timers first. Each reminder reschedules itself ~24h later so it
 * keeps firing daily as long as the tab stays open.
 */
export function scheduleMealReminders(times) {
    clearScheduledReminders()
    if (!Array.isArray(times)) return

    times.filter((t) => t.enabled).forEach((t) => {
        const fire = () => {
            const now = new Date()
            const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.hour, t.minute, 0, 0)
            if (next <= now) next.setDate(next.getDate() + 1)
            const delay = next.getTime() - now.getTime()

            const timer = setTimeout(() => {
                notifyMealReminder(t.label)
                fire() // reschedule for the following day
            }, delay)
            scheduledTimers.push(timer)
        }
        fire()
    })
}

export function clearScheduledReminders() {
    scheduledTimers.forEach((t) => clearTimeout(t))
    scheduledTimers = []
}
