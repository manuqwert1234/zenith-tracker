// Notification utility for ZenithTracker PWA

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications')
        return false
    }

    if (Notification.permission === 'granted') {
        return true
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    }

    return false
}

export function showNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
        return
    }

    const defaultOptions = {
        icon: '/vite.svg',
        badge: '/vite.svg',
        vibrate: [200, 100, 200],
        ...options,
    }

    try {
        new Notification(title, defaultOptions)
    } catch (error) {
        console.error('Error showing notification:', error)
    }
}

// Budget-specific notifications
export function notifyOverspending(amount, limit) {
    showNotification('🚨 Over Budget!', {
        body: `You've spent ₹${amount}, which is ₹${Math.ceil(amount - limit)} over your daily limit.`,
        tag: 'overspending',
        requireInteraction: true,
    })
}

export function notifyDailyLimit(limit) {
    showNotification('💰 Daily Limit Reminder', {
        body: `Your daily limit today is ₹${Math.floor(limit)}. Stay on track!`,
        tag: 'daily-limit',
    })
}

export function notifyCheatMeal(perDayDrop) {
    showNotification('🍕 Cheat Meal Logged', {
        body: `Daily limit will drop by ₹${perDayDrop} for the rest of the month.`,
        tag: 'cheat-meal',
    })
}

// Gym-specific notifications
export function notifyWorkoutDay(dayType) {
    const dayEmoji = {
        push: '💪',
        pull: '🔥',
        legs: '🦵',
        rest: '😴',
    }

    const dayName = dayType.charAt(0).toUpperCase() + dayType.slice(1)

    showNotification(`${dayEmoji[dayType]} ${dayName} Day!`, {
        body: dayType === 'rest'
            ? 'Recovery day! Light activity and stretching recommended.'
            : `Time to hit the gym! Today is ${dayName} day.`,
        tag: 'workout-reminder',
    })
}

export function notifyProgressPhoto() {
    showNotification('📸 Progress Photo Time!', {
        body: 'Take a weekly progress photo to track your V-Taper transformation!',
        tag: 'progress-photo',
    })
}

export function notifyWorkoutComplete(exerciseCount) {
    showNotification('✅ Workout Complete!', {
        body: `Great job! You logged ${exerciseCount} exercise${exerciseCount > 1 ? 's' : ''} today.`,
        tag: 'workout-complete',
    })
}

// Schedule daily reminders
export function scheduleDailyReminders() {
    const now = new Date()
    const morningReminder = new Date()
    morningReminder.setHours(8, 0, 0, 0) // 8 AM

    if (morningReminder < now) {
        // If it's past 8 AM, schedule for tomorrow
        morningReminder.setDate(morningReminder.getDate() + 1)
    }

    const timeUntilMorning = morningReminder - now

    // Schedule morning reminder
    setTimeout(() => {
        const dailyLimit = localStorage.getItem('zt.dailyLimit')
        if (dailyLimit) {
            notifyDailyLimit(Number(dailyLimit))
        }

        // Reschedule for next day
        scheduleDailyReminders()
    }, timeUntilMorning)
}
