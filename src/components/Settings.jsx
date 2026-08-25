import { Suspense, lazy, useEffect, useState } from 'react'
import { Target, Bell, BellOff, Database, Trash2, CloudOff, Calculator } from 'lucide-react'
import { estimateBMR, estimateTDEE, ACTIVITY_MULTIPLIERS } from '../utils/nutrition'
import { requestNotificationPermission, notificationPermission, scheduleMealReminders, clearScheduledReminders, defaultReminderTimes } from '../utils/notifications'
import { isFirebaseConfigured, isPushConfigured } from '../config/firebase'
import { clearAllPhotos } from '../utils/photoStore'

// Lazily loaded so the Firebase SDK is only fetched by browsers that
// actually have cloud sync configured (see .env.example).
const CloudSyncSection = lazy(() => import('./CloudSyncSection.jsx'))
const PushReminderSection = lazy(() => import('./PushReminderSection.jsx'))

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

export default function Settings({ settings, setSettings, onToast }) {
    const [reminders, setReminders] = useLocalStorageState('ct.reminders', { enabled: false, times: defaultReminderTimes() })
    const [permission, setPermission] = useState(notificationPermission())
    const [calcOpen, setCalcOpen] = useState(false)
    const [calcForm, setCalcForm] = useState({ weightKg: '', heightCm: '', age: '', sex: 'male', activity: 'light' })

    useEffect(() => {
        if (reminders.enabled) scheduleMealReminders(reminders.times)
        else clearScheduledReminders()
        return () => clearScheduledReminders()
    }, [reminders])

    function update(field, value) {
        setSettings((prev) => ({ ...prev, [field]: value }))
    }

    async function toggleReminders() {
        if (!reminders.enabled) {
            const granted = await requestNotificationPermission()
            setPermission(notificationPermission())
            if (!granted) {
                onToast?.('❌ Notifications were blocked — enable them in your browser settings to use reminders.')
                return
            }
        }
        setReminders((prev) => ({ ...prev, enabled: !prev.enabled }))
    }

    function updateReminderTime(id, field, value) {
        setReminders((prev) => ({
            ...prev,
            times: prev.times.map((t) => t.id === id ? { ...t, [field]: value } : t),
        }))
    }

    function applyCalculator() {
        const bmr = estimateBMR({ weightKg: calcForm.weightKg, heightCm: calcForm.heightCm, age: calcForm.age, sex: calcForm.sex })
        const tdee = estimateTDEE(bmr, calcForm.activity)
        if (tdee) {
            update('calorieGoal', tdee)
            update('proteinGoal', Math.round(Number(calcForm.weightKg) * 1.8) || settings.proteinGoal)
            onToast?.(`✓ Set daily goal to ${tdee} kcal based on your stats`)
            setCalcOpen(false)
        } else {
            onToast?.('❌ Fill in weight, height, and age first')
        }
    }

    async function handleClearAll() {
        if (!window.confirm('Delete ALL local data — food log, activity, weight, photos, custom foods? This cannot be undone.')) return
        const keys = ['ct.foodLog', 'ct.activityLog', 'ct.weightLog', 'ct.customFoods', 'ct.pinnedFoods', 'ct.settings', 'ct.reminders']
        keys.forEach((k) => localStorage.removeItem(k))
        await clearAllPhotos()
        window.location.reload()
    }

    return (
        <div className="space-y-4">
            {/* ── GOALS ─────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <Target className="h-4 w-4 text-emerald-400" /> DAILY GOALS
                    </div>
                    <button type="button" onClick={() => setCalcOpen((s) => !s)} className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                        <Calculator className="h-3.5 w-3.5" /> Calculate for me
                    </button>
                </div>

                {calcOpen && (
                    <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="grid grid-cols-3 gap-2">
                            <input type="number" placeholder="Weight kg" value={calcForm.weightKg} onChange={(e) => setCalcForm({ ...calcForm, weightKg: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 outline-none" />
                            <input type="number" placeholder="Height cm" value={calcForm.heightCm} onChange={(e) => setCalcForm({ ...calcForm, heightCm: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 outline-none" />
                            <input type="number" placeholder="Age" value={calcForm.age} onChange={(e) => setCalcForm({ ...calcForm, age: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 outline-none" />
                        </div>
                        <div className="flex gap-2">
                            <select value={calcForm.sex} onChange={(e) => setCalcForm({ ...calcForm, sex: e.target.value })} className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 outline-none">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                            <select value={calcForm.activity} onChange={(e) => setCalcForm({ ...calcForm, activity: e.target.value })} className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-100 outline-none">
                                {Object.entries(ACTIVITY_MULTIPLIERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <button type="button" onClick={applyCalculator} className="w-full rounded-lg bg-emerald-500 py-2 text-xs font-bold text-slate-900 hover:bg-emerald-400">
                            Use This Estimate
                        </button>
                        <div className="text-[10px] text-slate-500">Rough estimate (Mifflin-St Jeor). Adjust based on how your weight trends over a few weeks.</div>
                    </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <div className="text-xs text-slate-500">Calories</div>
                        <input type="number" value={settings.calorieGoal} onChange={(e) => update('calorieGoal', Number(e.target.value) || 0)} className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none" />
                    </label>
                    <label className="space-y-1">
                        <div className="text-xs text-slate-500">Protein (g)</div>
                        <input type="number" value={settings.proteinGoal} onChange={(e) => update('proteinGoal', Number(e.target.value) || 0)} className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none" />
                    </label>
                    <label className="space-y-1">
                        <div className="text-xs text-slate-500">Carbs (g)</div>
                        <input type="number" value={settings.carbGoal} onChange={(e) => update('carbGoal', Number(e.target.value) || 0)} className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none" />
                    </label>
                    <label className="space-y-1">
                        <div className="text-xs text-slate-500">Fat (g)</div>
                        <input type="number" value={settings.fatGoal} onChange={(e) => update('fatGoal', Number(e.target.value) || 0)} className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none" />
                    </label>
                    <label className="space-y-1">
                        <div className="text-xs text-slate-500">Weight Goal (kg, optional)</div>
                        <input type="number" value={settings.weightGoal || ''} onChange={(e) => update('weightGoal', Number(e.target.value) || null)} className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none" placeholder="No goal set" />
                    </label>
                    <label className="space-y-1">
                        <div className="text-xs text-slate-500">Water Goal (ml)</div>
                        <input type="number" value={settings.waterGoal ?? 2000} onChange={(e) => update('waterGoal', Number(e.target.value) || 0)} className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none" />
                    </label>
                </div>
            </div>

            {/* ── REMINDERS ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        {reminders.enabled ? <Bell className="h-4 w-4 text-emerald-400" /> : <BellOff className="h-4 w-4 text-slate-500" />}
                        MEAL REMINDERS
                    </div>
                    <button
                        type="button"
                        onClick={toggleReminders}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${reminders.enabled ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                    >
                        {reminders.enabled ? 'On' : 'Off'}
                    </button>
                </div>
                {permission === 'denied' && (
                    <div className="mt-2 text-xs text-amber-400">Notifications are blocked in your browser. Allow them in site settings to use reminders.</div>
                )}
                <div className="mt-3 text-[11px] text-slate-500">
                    Reminders fire while this tab/app is open in the background — there's no server, so they can't wake a fully closed browser.
                </div>
                {reminders.enabled && (
                    <div className="mt-3 space-y-2">
                        {reminders.times.map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                                <label className="flex items-center gap-2 text-sm text-slate-200">
                                    <input type="checkbox" checked={t.enabled} onChange={(e) => updateReminderTime(t.id, 'enabled', e.target.checked)} />
                                    {t.label}
                                </label>
                                <input
                                    type="time"
                                    value={`${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`}
                                    onChange={(e) => {
                                        const [h, m] = e.target.value.split(':').map(Number)
                                        updateReminderTime(t.id, 'hour', h)
                                        updateReminderTime(t.id, 'minute', m)
                                    }}
                                    className="rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1 text-xs text-slate-100 outline-none"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── DATA ──────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                    <Database className="h-4 w-4" /> DATA
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    Everything — including photos — lives in this browser's local storage. Nothing is uploaded unless you turn on cloud sync below. Use the History tab to export a backup.
                </p>
                <button type="button" onClick={handleClearAll} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2.5 text-sm font-extrabold text-rose-400 hover:bg-rose-950/40">
                    <Trash2 className="h-4 w-4" /> Clear All Data
                </button>
            </div>

            {/* ── CLOUD SYNC (OPTIONAL) ────────────────────────────────────── */}
            {isFirebaseConfigured() ? (
                <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-500">Loading cloud sync…</div>}>
                    <CloudSyncSection onToast={onToast} />
                    {isPushConfigured() && (
                        <div className="mt-4">
                            <PushReminderSection reminders={reminders} onToast={onToast} />
                        </div>
                    )}
                </Suspense>
            ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2 font-semibold text-slate-400">
                        <CloudOff className="h-4 w-4" /> Cloud sync not configured
                    </div>
                    <p className="mt-1">This deployment has no Firebase project set up, so everything stays fully local — which is the default. See .env.example if you want to add your own optional cloud backup.</p>
                </div>
            )}
        </div>
    )
}
