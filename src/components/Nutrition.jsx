import { useEffect, useMemo, useState } from 'react'
import { Scale, Beef, Flame, TrendingUp, TrendingDown, Minus, Plus, X, ChevronDown, ChevronUp, Trophy, CalendarDays } from 'lucide-react'

function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function toISODate(d) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

function parseISODate(iso) {
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
}

function useLocalStorageState(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const raw = localStorage.getItem(key)
            if (raw == null) return initialValue
            return JSON.parse(raw)
        } catch {
            return initialValue
        }
    })
    useEffect(() => {
        try { localStorage.setItem(key, JSON.stringify(value)) } catch { }
    }, [key, value])
    return [value, setValue]
}

// ─── Circular Ring Progress ──────────────────────────────────────────────────
function RingProgress({ value, max, color = '#22c55e', size = 72, stroke = 6, label, sublabel }) {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const pct = Math.min(value / Math.max(max, 1), 1)
    const dash = circ * pct
    return (
        <div className="flex flex-col items-center gap-1">
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={pct >= 1 ? '#22c55e' : color}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
                <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" fill="#f1f5f9" fontSize="12" fontWeight="800">
                    {value}
                </text>
            </svg>
            {label && <div className="text-xs font-bold text-slate-300">{label}</div>}
            {sublabel && <div className="text-[10px] text-slate-500">{sublabel}</div>}
        </div>
    )
}

// ─── Mini Sparkline Chart ────────────────────────────────────────────────────
function WeightSparkline({ entries }) {
    if (entries.length < 2) return null
    const values = entries.map(e => e.weight)
    const min = Math.min(...values) - 0.5
    const max = Math.max(...values) + 0.5
    const W = 280, H = 60
    const pts = entries.map((e, i) => {
        const x = (i / (entries.length - 1)) * W
        const y = H - ((e.weight - min) / (max - min)) * H
        return `${x},${y}`
    })
    const last = entries[entries.length - 1]

    return (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
                <polyline points={pts.join(' ')} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {entries.map((e, i) => {
                    const x = (i / (entries.length - 1)) * W
                    const y = H - ((e.weight - min) / (max - min)) * H
                    return <circle key={i} cx={x} cy={y} r="3" fill="#22c55e" />
                })}
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>{entries[0]?.date}</span>
                <span className="text-emerald-400 font-bold">{last?.weight}kg</span>
                <span>{entries[entries.length - 1]?.date}</span>
            </div>
        </div>
    )
}

export default function Nutrition() {
    const todayISO = toISODate(startOfToday())

    // ── Weight Log ─────────────────────────────────────────────────────────────
    const [weightLog, setWeightLog] = useLocalStorageState('zt.weight.log', [])
    const [weightInput, setWeightInput] = useState('')

    // ── Protein ────────────────────────────────────────────────────────────────
    const [proteinLog, setProteinLog] = useLocalStorageState('zt.protein.log', [])
    const [proteinGoal, setProteinGoal] = useLocalStorageState('zt.protein.goal', 150)
    const [proteinInput, setProteinInput] = useState('')
    const [mealLabel, setMealLabel] = useState('')

    // ── Calories ───────────────────────────────────────────────────────────────
    const [calorieLog, setCalorieLog] = useLocalStorageState('zt.calories.log', [])
    const [caloriesEaten, setCaloriesEaten] = useState('')
    const [caloriesBurned, setCaloriesBurned] = useState('')

    // ── Gym workouts (for weekly summary) ─────────────────────────────────────
    const [workouts] = useLocalStorageState('zt.gym.workouts', [])

    // ── Derived: today's data ─────────────────────────────────────────────────
    const todayWeight = weightLog.find(e => e.date === todayISO)
    const recent14Weight = useMemo(() => {
        const cutoff = new Date(startOfToday())
        cutoff.setDate(cutoff.getDate() - 13)
        return weightLog
            .filter(e => { const d = parseISODate(e.date); return d && d >= cutoff })
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14)
    }, [weightLog])

    const todayProteinEntry = proteinLog.find(e => e.date === todayISO)
    const todayProteinG = (todayProteinEntry?.meals || []).reduce((s, m) => s + (Number(m.g) || 0), 0)

    const todayCalEntry = calorieLog.find(e => e.date === todayISO)
    const deficit = todayCalEntry
        ? (Number(todayCalEntry.burned) || 0) - (Number(todayCalEntry.eaten) || 0)
        : null

    // ── WEEKLY SUMMARY data ───────────────────────────────────────────────────
    const weekSummary = useMemo(() => {
        const today = startOfToday()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 6)

        const workoutsThisWeek = workouts.filter(w => {
            const d = parseISODate(w.date)
            return d && d >= weekStart && d <= today
        })

        const caloriesBurnedThisWeek = calorieLog
            .filter(e => { const d = parseISODate(e.date); return d && d >= weekStart && d <= today })
            .reduce((s, e) => s + (Number(e.burned) || 0), 0)

        const weightsThisWeek = weightLog
            .filter(e => { const d = parseISODate(e.date); return d && d >= weekStart && d <= today })
        const avgWeight = weightsThisWeek.length > 0
            ? (weightsThisWeek.reduce((s, e) => s + Number(e.weight), 0) / weightsThisWeek.length).toFixed(1)
            : null

        // Volume this week vs last week
        const lastWeekStart = new Date(weekStart)
        lastWeekStart.setDate(lastWeekStart.getDate() - 7)
        const lastWeekEnd = new Date(weekStart)
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

        function weekVolume(start, end) {
            return workouts
                .filter(w => { const d = parseISODate(w.date); return d && d >= start && d <= end })
                .reduce((sum, wo) =>
                    sum + (wo.exercises || []).reduce((s2, ex) =>
                        s2 + (ex.sets || []).reduce((s3, set) =>
                            s3 + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0), 0)
        }

        const volThis = weekVolume(weekStart, today)
        const volLast = weekVolume(lastWeekStart, lastWeekEnd)
        const volChange = volLast > 0 ? Math.round(((volThis - volLast) / volLast) * 100) : null

        return { workoutsThisWeek: workoutsThisWeek.length, caloriesBurnedThisWeek, avgWeight, volChange }
    }, [workouts, calorieLog, weightLog])

    // ── Handlers ───────────────────────────────────────────────────────────────
    function logWeight() {
        const val = parseFloat(weightInput)
        if (!val || val < 20 || val > 300) return
        setWeightLog(prev => {
            const filtered = prev.filter(e => e.date !== todayISO)
            return [...filtered, { date: todayISO, weight: val }]
        })
        setWeightInput('')
    }

    function addProtein() {
        const g = parseFloat(proteinInput)
        if (!g || g <= 0) return
        setProteinLog(prev => {
            const existing = prev.find(e => e.date === todayISO)
            const newMeal = { label: mealLabel.trim() || 'Meal', g }
            if (existing) {
                return prev.map(e => e.date === todayISO ? { ...e, meals: [...(e.meals || []), newMeal] } : e)
            }
            return [...prev, { date: todayISO, meals: [newMeal] }]
        })
        setProteinInput('')
        setMealLabel('')
    }

    function removeProteinMeal(idx) {
        setProteinLog(prev => prev.map(e => {
            if (e.date !== todayISO) return e
            const meals = (e.meals || []).filter((_, i) => i !== idx)
            return { ...e, meals }
        }))
    }

    function saveCalories() {
        const eaten = parseFloat(caloriesEaten)
        const burned = parseFloat(caloriesBurned)
        if (!eaten && !burned) return
        setCalorieLog(prev => {
            const filtered = prev.filter(e => e.date !== todayISO)
            return [...filtered, { date: todayISO, eaten: eaten || 0, burned: burned || 0 }]
        })
    }

    // Pre-fill calorie form from today's entry
    useEffect(() => {
        if (todayCalEntry) {
            setCaloriesEaten(String(todayCalEntry.eaten || ''))
            setCaloriesBurned(String(todayCalEntry.burned || ''))
        }
    }, []) // eslint-disable-line

    const goalWeight = 72
    const currentWeight = todayWeight?.weight || recent14Weight[recent14Weight.length - 1]?.weight || null
    const weightToGoal = currentWeight ? (currentWeight - goalWeight).toFixed(1) : null

    return (
        <div className="space-y-4">

            {/* ── WEEKLY SUMMARY ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-purple-400">
                    <Trophy className="h-4 w-4" />
                    THIS WEEK'S SUMMARY
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="text-xs text-slate-500">Workouts</div>
                        <div className="mt-1 text-2xl font-extrabold text-slate-50">{weekSummary.workoutsThisWeek}</div>
                        <div className="text-xs text-slate-500">sessions this week</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="text-xs text-slate-500">Calories Burned</div>
                        <div className="mt-1 text-2xl font-extrabold text-slate-50">{weekSummary.caloriesBurnedThisWeek || '—'}</div>
                        <div className="text-xs text-slate-500">kcal this week</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="text-xs text-slate-500">Avg Weight</div>
                        <div className="mt-1 text-2xl font-extrabold text-slate-50">{weekSummary.avgWeight ? `${weekSummary.avgWeight}kg` : '—'}</div>
                        <div className="text-xs text-slate-500">this week</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <div className="text-xs text-slate-500">Volume vs Last Wk</div>
                        <div className={`mt-1 text-2xl font-extrabold ${weekSummary.volChange === null ? 'text-slate-400' : weekSummary.volChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {weekSummary.volChange === null ? '—' : `${weekSummary.volChange >= 0 ? '+' : ''}${weekSummary.volChange}%`}
                        </div>
                        <div className="text-xs text-slate-500">lifting volume</div>
                    </div>
                </div>
            </div>

            {/* ── BODY WEIGHT LOG ────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                    <Scale className="h-4 w-4 text-blue-400" />
                    BODY WEIGHT LOG
                </div>

                {/* Goal progress */}
                {currentWeight && (
                    <div className="mt-3">
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-2xl font-extrabold text-slate-50">{currentWeight}kg</div>
                                <div className="text-xs text-slate-400">
                                    {Number(weightToGoal) > 0
                                        ? <span className="text-amber-400">{weightToGoal}kg above goal</span>
                                        : <span className="text-emerald-400">✓ At / below 72kg goal!</span>
                                    }
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500">Goal</div>
                                <div className="text-lg font-extrabold text-emerald-400">{goalWeight}kg</div>
                            </div>
                        </div>
                        {/* Progress bar toward 72kg */}
                        {(() => {
                            const startWeight = 80 // assumed start
                            const totalLoss = startWeight - goalWeight
                            const achieved = startWeight - currentWeight
                            const pct = Math.max(0, Math.min((achieved / totalLoss) * 100, 100))
                            return (
                                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            )
                        })()}
                    </div>
                )}

                {/* Log today's weight */}
                <div className="mt-3 flex gap-2">
                    <input
                        type="number"
                        placeholder="Today's weight (kg)"
                        value={weightInput}
                        onChange={e => setWeightInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && logWeight()}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none"
                        inputMode="decimal"
                    />
                    <button
                        type="button"
                        onClick={logWeight}
                        className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-400"
                    >
                        Log
                    </button>
                </div>

                {/* Sparkline */}
                <WeightSparkline entries={recent14Weight} />

                {weightLog.length === 0 && (
                    <div className="mt-2 text-xs text-slate-600">No weight logged yet. Log your first entry above.</div>
                )}
            </div>

            {/* ── PROTEIN TRACKER ────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <Beef className="h-4 w-4 text-orange-400" />
                        DAILY PROTEIN
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Goal:</span>
                        <input
                            type="number"
                            value={proteinGoal}
                            onChange={e => setProteinGoal(Number(e.target.value) || 150)}
                            className="w-14 rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-0.5 text-xs font-bold text-slate-100 outline-none text-center"
                            inputMode="numeric"
                        />
                        <span className="text-xs text-slate-500">g</span>
                    </div>
                </div>

                {/* Ring + today's meals */}
                <div className="mt-4 flex items-start gap-4">
                    <RingProgress
                        value={todayProteinG}
                        max={proteinGoal}
                        color="#f97316"
                        size={80}
                        stroke={7}
                        label={`${todayProteinG}g`}
                        sublabel={`/ ${proteinGoal}g`}
                    />
                    <div className="flex-1">
                        {(todayProteinEntry?.meals || []).length === 0 ? (
                            <div className="text-xs text-slate-600">No protein logged today</div>
                        ) : (
                            <div className="space-y-1">
                                {(todayProteinEntry?.meals || []).map((m, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-2 py-1.5">
                                        <span className="text-xs text-slate-300">{m.label}</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-orange-400">{m.g}g</span>
                                            <button type="button" onClick={() => removeProteinMeal(i)} className="text-slate-600 hover:text-red-400">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {todayProteinG >= proteinGoal && (
                            <div className="mt-2 text-xs font-bold text-emerald-400">✓ Protein goal hit!</div>
                        )}
                    </div>
                </div>

                {/* Add protein */}
                <div className="mt-3 flex gap-2">
                    <input
                        type="text"
                        placeholder="Meal / food"
                        value={mealLabel}
                        onChange={e => setMealLabel(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                    <input
                        type="number"
                        placeholder="g"
                        value={proteinInput}
                        onChange={e => setProteinInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addProtein()}
                        className="w-16 rounded-xl border border-slate-800 bg-slate-900/50 px-2 py-2 text-sm text-slate-100 outline-none text-center"
                        inputMode="decimal"
                    />
                    <button
                        type="button"
                        onClick={addProtein}
                        className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-orange-400"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── CALORIE DEFICIT MONITOR ────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                    <Flame className="h-4 w-4 text-red-400" />
                    CALORIE DEFICIT MONITOR
                </div>

                {deficit !== null && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                        <div>
                            <div className="text-xs text-slate-500">Today's Deficit</div>
                            <div className={`text-2xl font-extrabold ${deficit > 0 ? 'text-emerald-400' : deficit < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                {deficit > 0 ? `-${deficit}` : deficit < 0 ? `+${Math.abs(deficit)}` : '0'} kcal
                            </div>
                        </div>
                        <div className={`rounded-xl px-3 py-1.5 text-xs font-extrabold ${deficit > 0 ? 'bg-emerald-500/20 text-emerald-400' : deficit < 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                            {deficit > 0 ? (
                                <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Deficit ✓</span>
                            ) : deficit < 0 ? (
                                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Surplus</span>
                            ) : (
                                <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> Balanced</span>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-slate-500">Calories Eaten</label>
                        <input
                            type="number"
                            placeholder="e.g. 1800"
                            value={caloriesEaten}
                            onChange={e => setCaloriesEaten(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none"
                            inputMode="numeric"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500">Calories Burned</label>
                        <input
                            type="number"
                            placeholder="e.g. 350"
                            value={caloriesBurned}
                            onChange={e => setCaloriesBurned(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none"
                            inputMode="numeric"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={saveCalories}
                    className="mt-3 w-full rounded-xl bg-red-500/80 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-500"
                >
                    Save Today's Calories
                </button>
            </div>

        </div>
    )
}
