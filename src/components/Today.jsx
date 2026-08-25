import { useEffect, useMemo, useState } from 'react'
import { Flame, Beef, Wheat, Droplet, Plus, Trash2, Scale, Footprints, X, Star, GlassWater, Pencil } from 'lucide-react'
import { todayISO } from '../utils/dates'
import { estimateActivityCalories } from '../utils/nutrition'
import { deletePhoto } from '../utils/photoStore'
import { generateId } from '../utils/id'
import { foodDatabase as builtInFoods, quickAddItems } from '../config/foods'
import FoodEntryModal from './FoodEntryModal'
import EditEntryModal from './EditEntryModal'
import PhotoThumb from './PhotoThumb'

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

function Ring({ value, max, color, size = 96, stroke = 9, children }) {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const pct = Math.max(0, Math.min(value / Math.max(max, 1), 1))
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={color} strokeWidth={stroke}
                    strokeDasharray={`${circ * pct} ${circ}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dasharray 0.4s ease' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
        </div>
    )
}

function MacroBar({ label, value, goal, color, icon }) {
    const Icon = icon
    const pct = Math.min((value / Math.max(goal, 1)) * 100, 100)
    return (
        <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <Icon className="h-3 w-3" style={{ color }} /> {label}
                </span>
                <span className="text-slate-500">{Math.round(value)}/{Math.round(goal)}g</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    )
}

const ACTIVITY_TYPES = [
    { key: 'walk', label: 'Walk', emoji: '🚶' },
    { key: 'run', label: 'Run', emoji: '🏃' },
    { key: 'cycle', label: 'Cycle', emoji: '🚴' },
    { key: 'gym', label: 'Gym / Lifting', emoji: '🏋️' },
    { key: 'sports', label: 'Sports', emoji: '⚽' },
    { key: 'other', label: 'Other', emoji: '✨' },
]

export default function Today({ settings, onToast }) {
    const today = todayISO()

    const [foodLog, setFoodLog] = useLocalStorageState('ct.foodLog', [])
    const [activityLog, setActivityLog] = useLocalStorageState('ct.activityLog', [])
    const [weightLog, setWeightLog] = useLocalStorageState('ct.weightLog', [])
    const [waterLog, setWaterLog] = useLocalStorageState('ct.waterLog', [])
    const [customFoods, setCustomFoods] = useLocalStorageState('ct.customFoods', {})
    const [pinnedFoods, setPinnedFoods] = useLocalStorageState('ct.pinnedFoods', quickAddItems)

    const [showFoodModal, setShowFoodModal] = useState(false)
    const [showActivityForm, setShowActivityForm] = useState(false)
    const [weightInput, setWeightInput] = useState('')
    const [editingEntry, setEditingEntry] = useState(null)
    const [waterInput, setWaterInput] = useState('')

    const [activityType, setActivityType] = useState('walk')
    const [activityDistance, setActivityDistance] = useState('')
    const [activityDuration, setActivityDuration] = useState('')
    const [activityCalories, setActivityCalories] = useState('')

    const allFoods = useMemo(() => ({ ...builtInFoods, ...customFoods }), [customFoods])

    const todayFood = useMemo(() => foodLog.filter((e) => e.date === today), [foodLog, today])
    const todayActivity = useMemo(() => activityLog.filter((e) => e.date === today), [activityLog, today])

    const totals = useMemo(() => todayFood.reduce((acc, e) => ({
        calories: acc.calories + (Number(e.calories) || 0),
        protein: acc.protein + (Number(e.protein) || 0),
        carbs: acc.carbs + (Number(e.carbs) || 0),
        fat: acc.fat + (Number(e.fat) || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [todayFood])

    const burnedToday = useMemo(() => todayActivity.reduce((s, a) => s + (Number(a.caloriesBurned) || 0), 0), [todayActivity])

    const calorieGoal = settings.calorieGoal || 2000
    const remaining = calorieGoal - totals.calories + burnedToday

    const recentNames = useMemo(() => {
        const freq = new Map()
        foodLog.slice(-200).forEach((e) => {
            if (!e.foodKey) return
            freq.set(e.foodKey, (freq.get(e.foodKey) || 0) + 1)
        })
        return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key).slice(0, 8)
    }, [foodLog])

    const quickAddKeys = useMemo(() => {
        const combined = [...new Set([...pinnedFoods, ...recentNames])]
        return combined.filter((k) => allFoods[k]).slice(0, 8)
    }, [pinnedFoods, recentNames, allFoods])

    const currentWeight = weightLog.length ? weightLog.slice().sort((a, b) => b.date.localeCompare(a.date))[0] : null
    const weightGoal = settings.weightGoal

    const todayWaterMl = useMemo(() => waterLog.filter((e) => e.date === today).reduce((s, e) => s + (Number(e.ml) || 0), 0), [waterLog, today])
    const waterGoal = settings.waterGoal || 2000

    function quickLog(key) {
        const food = allFoods[key]
        if (!food) return
        const id = generateId('food')
        setFoodLog((prev) => [...prev, {
            id, date: today, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            name: food.name, calories: food.calories, protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0,
            quantity: 1, unit: food.unit, foodKey: key, emoji: food.emoji || '🍽️',
            photoId: food.photoId, sharedPhoto: Boolean(food.photoId),
        }])
    }

    function logFoodEntry(entry) {
        setFoodLog((prev) => [...prev, { ...entry, date: today, time: entry.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    }

    async function deleteFoodEntry(entry) {
        setFoodLog((prev) => prev.filter((e) => e.id !== entry.id))
        if (entry.photoId && !entry.sharedPhoto) {
            await deletePhoto(entry.photoId)
        }
    }

    function saveEditedEntry(updated) {
        setFoodLog((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    }

    function addWater(ml) {
        setWaterLog((prev) => {
            const idx = prev.findIndex((e) => e.date === today)
            if (idx === -1) return [...prev, { date: today, ml }]
            const next = [...prev]
            next[idx] = { ...next[idx], ml: Math.max(0, (Number(next[idx].ml) || 0) + ml) }
            return next
        })
    }

    function logWaterManual() {
        const val = parseFloat(waterInput)
        if (!val) return
        addWater(val)
        setWaterInput('')
    }

    function saveCustomFood(key, food) {
        setCustomFoods((prev) => ({ ...prev, [key]: food }))
    }

    function deleteCustomFood(key) {
        setCustomFoods((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
        })
    }

    function togglePinned(key) {
        setPinnedFoods((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
    }

    function logWeight() {
        const val = parseFloat(weightInput)
        if (!val || val <= 0) return
        setWeightLog((prev) => [...prev.filter((e) => e.date !== today), { date: today, weight: val }])
        setWeightInput('')
    }

    function estimateAndFillCalories() {
        const est = estimateActivityCalories({
            type: activityType,
            durationMin: Number(activityDuration) || undefined,
            distanceKm: Number(activityDistance) || undefined,
            weightKg: currentWeight?.weight,
        })
        setActivityCalories(String(est || ''))
    }

    function logActivity() {
        const cal = Number(activityCalories) || 0
        if (!cal && !activityDuration && !activityDistance) return
        setActivityLog((prev) => [...prev, {
            id: generateId('act'),
            date: today,
            type: activityType,
            durationMin: Number(activityDuration) || undefined,
            distanceKm: Number(activityDistance) || undefined,
            caloriesBurned: cal || estimateActivityCalories({ type: activityType, durationMin: Number(activityDuration), distanceKm: Number(activityDistance), weightKg: currentWeight?.weight }),
        }])
        onToast?.(`✓ Logged ${activityType}`)
        setActivityDistance('')
        setActivityDuration('')
        setActivityCalories('')
        setShowActivityForm(false)
    }

    // One-tap logging for the common case: pick a type, tap a duration,
    // done — no typing required. Falls back to the detailed form below for
    // anything with a specific distance or exact calorie count.
    function quickLogActivity(type, durationMin) {
        const cal = estimateActivityCalories({ type, durationMin, weightKg: currentWeight?.weight })
        setActivityLog((prev) => [...prev, {
            id: generateId('act'),
            date: today,
            type,
            durationMin,
            caloriesBurned: cal,
        }])
        const meta = ACTIVITY_TYPES.find((t) => t.key === type)
        onToast?.(`✓ Logged ${durationMin} min ${meta?.label.toLowerCase() || type} — ~${cal} kcal`)
    }

    function deleteActivity(id) {
        setActivityLog((prev) => prev.filter((a) => a.id !== id))
    }

    const sortedTodayEntries = useMemo(
        () => todayFood.slice().sort((a, b) => (b.time || '').localeCompare(a.time || '')),
        [todayFood]
    )

    return (
        <div className="space-y-4">
            {/* ── CALORIE + MACRO OVERVIEW ─────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-4">
                    <Ring value={totals.calories} max={calorieGoal} color={remaining < 0 ? '#f87171' : '#22c55e'} size={100} stroke={10}>
                        <div className="text-xl font-black text-slate-50">{Math.max(0, Math.round(remaining))}</div>
                        <div className="text-[10px] text-slate-500">{remaining < 0 ? 'over' : 'left'}</div>
                    </Ring>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-baseline justify-between">
                            <span className="flex items-center gap-1 text-sm font-bold text-slate-200">
                                <Flame className="h-4 w-4 text-emerald-400" /> {Math.round(totals.calories)} eaten
                            </span>
                            <span className="text-xs text-slate-500">Goal {calorieGoal}</span>
                        </div>
                        {burnedToday > 0 && (
                            <div className="text-xs text-orange-400">+{Math.round(burnedToday)} kcal from activity</div>
                        )}
                        <div className="space-y-2 pt-1">
                            <MacroBar label="Protein" value={totals.protein} goal={settings.proteinGoal || 100} color="#fb923c" icon={Beef} />
                            <MacroBar label="Carbs" value={totals.carbs} goal={settings.carbGoal || 225} color="#60a5fa" icon={Wheat} />
                            <MacroBar label="Fat" value={totals.fat} goal={settings.fatGoal || 65} color="#facc15" icon={Droplet} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── QUICK ADD ─────────────────────────────────────────────────── */}
            <div>
                <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <Star className="h-3.5 w-3.5 text-amber-400" /> QUICK ADD
                    </div>
                    <button type="button" onClick={() => setShowFoodModal(true)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                        Browse all →
                    </button>
                </div>
                {quickAddKeys.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => setShowFoodModal(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 py-6 text-sm text-slate-500 hover:border-emerald-500 hover:text-emerald-400"
                    >
                        <Plus className="h-4 w-4" /> Add your first food
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {quickAddKeys.map((key) => {
                            const food = allFoods[key]
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => quickLog(key)}
                                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2.5 text-left hover:bg-slate-800 active:scale-[0.98]"
                                >
                                    {food.photoId ? (
                                        <PhotoThumb photoId={food.photoId} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                                    ) : (
                                        <span className="text-lg shrink-0">{food.emoji}</span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-bold text-slate-100">{food.name}</div>
                                        <div className="text-[10px] text-slate-500">{food.calories} kcal</div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setShowFoodModal(true)}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black tracking-wide text-slate-950 hover:bg-emerald-400 active:scale-[0.98]"
                >
                    <Plus className="h-4 w-4" /> Add Food
                </button>
            </div>

            {/* ── TODAY'S LOG ───────────────────────────────────────────────── */}
            {sortedTodayEntries.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="mb-2 text-xs font-semibold tracking-wide text-slate-400">TODAY'S LOG</div>
                    <div className="space-y-2">
                        {sortedTodayEntries.map((e) => (
                            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                                {e.photoId ? (
                                    <PhotoThumb photoId={e.photoId} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                                ) : (
                                    <span className="text-xl shrink-0">{e.emoji || '🍽️'}</span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-slate-100">{e.name}{e.quantity !== 1 ? ` ×${e.quantity}` : ''}</div>
                                    <div className="text-xs text-slate-500">{e.time} · {Math.round(e.calories)} kcal · {Math.round(e.protein)}g protein</div>
                                    {e.notes && <div className="text-[11px] text-slate-500 italic">{e.notes}</div>}
                                </div>
                                <button type="button" onClick={() => setEditingEntry(e)} className="shrink-0 text-slate-600 hover:text-emerald-400">
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => deleteFoodEntry(e)} className="shrink-0 text-slate-600 hover:text-red-400">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── ACTIVITY ──────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <Footprints className="h-4 w-4 text-orange-400" /> ACTIVITY
                    </div>
                    <button type="button" onClick={() => setShowActivityForm((s) => !s)} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                        {showActivityForm ? 'Cancel' : '+ Log activity'}
                    </button>
                </div>

                {todayActivity.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {todayActivity.map((a) => {
                            const meta = ACTIVITY_TYPES.find((t) => t.key === a.type)
                            return (
                                <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                                    <div className="flex items-center gap-2 text-sm text-slate-200">
                                        <span>{meta?.emoji || '✨'}</span>
                                        <span className="font-semibold">{meta?.label || a.type}</span>
                                        {a.distanceKm ? <span className="text-slate-500">· {a.distanceKm}km</span> : null}
                                        {a.durationMin ? <span className="text-slate-500">· {a.durationMin}min</span> : null}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-orange-400">{Math.round(a.caloriesBurned || 0)} kcal</span>
                                        <button onClick={() => deleteActivity(a.id)} className="text-slate-600 hover:text-red-400">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {showActivityForm && (
                    <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                        <div className="flex gap-2 overflow-x-auto">
                            {ACTIVITY_TYPES.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setActivityType(t.key)}
                                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activityType === t.key ? 'bg-orange-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                                >
                                    {t.emoji} {t.label}
                                </button>
                            ))}
                        </div>
                        {['walk', 'run', 'cycle'].includes(activityType) && (
                            <div>
                                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Quick log — one tap, no typing</div>
                                <div className="flex gap-2">
                                    {[15, 30, 45, 60].map((min) => (
                                        <button
                                            key={min}
                                            type="button"
                                            onClick={() => quickLogActivity(activityType, min)}
                                            className="flex-1 rounded-xl border border-orange-500/30 bg-orange-950/20 py-2.5 text-sm font-extrabold text-orange-300 hover:bg-orange-950/40 active:scale-[0.97]"
                                        >
                                            {min}m
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <div className="h-px flex-1 bg-slate-800" /> or enter details <div className="h-px flex-1 bg-slate-800" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Distance (km)" value={activityDistance} onChange={(e) => setActivityDistance(e.target.value)} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none" inputMode="decimal" />
                            <input type="number" placeholder="Duration (min)" value={activityDuration} onChange={(e) => setActivityDuration(e.target.value)} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none" inputMode="numeric" />
                        </div>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Calories burned" value={activityCalories} onChange={(e) => setActivityCalories(e.target.value)} className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none" inputMode="numeric" />
                            <button type="button" onClick={estimateAndFillCalories} className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800">
                                Estimate
                            </button>
                        </div>
                        <button type="button" onClick={logActivity} className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-extrabold text-white hover:bg-orange-400">
                            Log Activity
                        </button>
                    </div>
                )}
            </div>

            {/* ── WEIGHT ────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <Scale className="h-4 w-4 text-blue-400" /> WEIGHT
                    </div>
                    {currentWeight && (
                        <div className="text-sm font-bold text-slate-100">
                            {currentWeight.weight}kg
                            {weightGoal ? <span className="ml-1 text-xs font-normal text-slate-500">/ goal {weightGoal}kg</span> : null}
                        </div>
                    )}
                </div>
                <div className="mt-3 flex gap-2">
                    <input
                        type="number"
                        placeholder="Today's weight (kg)"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && logWeight()}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none"
                        inputMode="decimal"
                    />
                    <button type="button" onClick={logWeight} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-400">
                        Log
                    </button>
                </div>
            </div>

            {/* ── WATER ─────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <GlassWater className="h-4 w-4 text-cyan-400" /> WATER
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                        {todayWaterMl}<span className="text-xs font-normal text-slate-500">/{waterGoal}ml</span>
                    </div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min((todayWaterMl / Math.max(waterGoal, 1)) * 100, 100)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => addWater(250)} className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-xs font-extrabold text-cyan-300 hover:bg-cyan-950/40">+250ml</button>
                    <button type="button" onClick={() => addWater(500)} className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-xs font-extrabold text-cyan-300 hover:bg-cyan-950/40">+500ml</button>
                    <button type="button" onClick={() => addWater(1000)} className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-xs font-extrabold text-cyan-300 hover:bg-cyan-950/40">+1L</button>
                    <div className="flex flex-1 min-w-[120px] gap-2">
                        <input
                            type="number"
                            placeholder="Custom ml"
                            value={waterInput}
                            onChange={(e) => setWaterInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && logWaterManual()}
                            className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none"
                            inputMode="numeric"
                        />
                        <button type="button" onClick={logWaterManual} className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-extrabold text-slate-900 hover:bg-cyan-400">
                            Add
                        </button>
                    </div>
                </div>
            </div>

            <FoodEntryModal
                open={showFoodModal}
                onClose={() => setShowFoodModal(false)}
                customFoods={customFoods}
                onSaveCustomFood={saveCustomFood}
                onDeleteCustomFood={deleteCustomFood}
                pinnedFoods={pinnedFoods}
                onTogglePinned={togglePinned}
                recentNames={recentNames}
                onLog={logFoodEntry}
            />

            {editingEntry && (
                <EditEntryModal
                    entry={editingEntry}
                    customFoods={customFoods}
                    onClose={() => setEditingEntry(null)}
                    onSave={saveEditedEntry}
                    onDelete={deleteFoodEntry}
                />
            )}
        </div>
    )
}
