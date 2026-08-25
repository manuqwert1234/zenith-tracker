import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search, Download, Upload, Copy, FileText, Sparkles, TrendingDown, Dumbbell } from 'lucide-react'
import { formatDateLabel } from '../utils/dates'
import { exportAllToExcel, importFromExcel, copyAIExportToClipboard, downloadAIExport } from '../utils/exportUtils'
import PhotoThumb from './PhotoThumb'
import ProgressStats from './ProgressStats'

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

export default function History({ settings, onToast }) {
    const [foodLog] = useLocalStorageState('ct.foodLog', [])
    const [activityLog] = useLocalStorageState('ct.activityLog', [])
    const [weightLog] = useLocalStorageState('ct.weightLog', [])
    const [waterLog] = useLocalStorageState('ct.waterLog', [])
    const [gymWorkouts] = useLocalStorageState('ct.gym.workouts', [])

    const [query, setQuery] = useState('')
    const [expanded, setExpanded] = useState(new Set())
    const [aiDays, setAiDays] = useState(14)

    const days = useMemo(() => {
        const byDate = new Map()
        const blank = () => ({ food: [], activity: [], weight: null, gym: null, water: 0 })
        foodLog.forEach((e) => {
            if (!byDate.has(e.date)) byDate.set(e.date, blank())
            byDate.get(e.date).food.push(e)
        })
        activityLog.forEach((a) => {
            if (!byDate.has(a.date)) byDate.set(a.date, blank())
            byDate.get(a.date).activity.push(a)
        })
        weightLog.forEach((w) => {
            if (!byDate.has(w.date)) byDate.set(w.date, blank())
            byDate.get(w.date).weight = w.weight
        })
        gymWorkouts.forEach((w) => {
            if (!w.exercises.some((ex) => ex.sets.length > 0)) return
            if (!byDate.has(w.date)) byDate.set(w.date, blank())
            byDate.get(w.date).gym = w
        })
        waterLog.forEach((w) => {
            if (!byDate.has(w.date)) byDate.set(w.date, blank())
            byDate.get(w.date).water = Number(w.ml) || 0
        })

        const q = query.trim().toLowerCase()
        return [...byDate.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, data]) => {
                const totals = data.food.reduce((acc, e) => ({
                    calories: acc.calories + (Number(e.calories) || 0),
                    protein: acc.protein + (Number(e.protein) || 0),
                }), { calories: 0, protein: 0 })
                const burned = data.activity.reduce((s, a) => s + (Number(a.caloriesBurned) || 0), 0)
                return { date, ...data, totals, burned }
            })
            .filter((d) => {
                if (!q) return true
                const foodMatch = d.food.some((e) => e.name.toLowerCase().includes(q) || (e.tags || []).some((t) => t.toLowerCase().includes(q)))
                const gymMatch = d.gym?.exercises.some((ex) => ex.name.toLowerCase().includes(q))
                return foodMatch || gymMatch
            })
    }, [foodLog, activityLog, weightLog, gymWorkouts, waterLog, query])

    function toggle(date) {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(date)) next.delete(date)
            else next.add(date)
            return next
        })
    }

    function handleExport() {
        const result = exportAllToExcel()
        onToast?.(result.success ? `✓ ${result.message}` : `✗ ${result.message}`)
    }

    async function handleImport(e) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const result = await importFromExcel(file)
            onToast?.(result.success ? `✓ ${result.message}` : `✗ ${result.message}`)
            if (result.success) setTimeout(() => window.location.reload(), 1200)
        } catch (err) {
            onToast?.(`✗ Import failed: ${err.message}`)
        }
        e.target.value = ''
    }

    async function handleCopyAI() {
        const result = await copyAIExportToClipboard(aiDays)
        onToast?.(result.success ? '✓ Copied — paste it into your AI chat of choice' : '✗ Could not copy, use Download instead')
    }

    return (
        <div className="space-y-4">
            <ProgressStats foodLog={foodLog} weightLog={weightLog} waterLog={waterLog} />

            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search past food or tags..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
            </div>

            {/* ── EXPORT ────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-purple-400">
                    <Sparkles className="h-4 w-4" /> EXPORT FOR AI FEEDBACK
                </div>
                <p className="mt-2 text-xs text-slate-400">
                    Turn your log into a plain-text summary you can paste into any AI chat and ask it to spot patterns, nutrient gaps, or suggestions.
                </p>
                <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Last</span>
                    <select
                        value={aiDays}
                        onChange={(e) => setAiDays(Number(e.target.value))}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs font-semibold text-slate-100 outline-none"
                    >
                        {[7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
                    </select>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={handleCopyAI} className="flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-purple-400">
                        <Copy className="h-4 w-4" /> Copy Text
                    </button>
                    <button type="button" onClick={() => downloadAIExport(aiDays)} className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/20 px-4 py-2.5 text-sm font-extrabold text-purple-300 hover:bg-purple-950/40">
                        <FileText className="h-4 w-4" /> Download .txt
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs font-semibold tracking-wide text-slate-400">BACKUP & RESTORE</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={handleExport} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-emerald-400">
                        <Download className="h-4 w-4" /> Export Excel
                    </button>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm font-extrabold text-emerald-300 hover:bg-emerald-950/40">
                        <Upload className="h-4 w-4" /> Import Excel
                        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
                    </label>
                </div>
            </div>

            {/* ── DAY LIST ──────────────────────────────────────────────────── */}
            <div className="space-y-2">
                {days.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">
                        {query.trim()
                            ? `No entries match "${query.trim()}".`
                            : 'Nothing logged yet — entries you add on the Today tab will show up here.'}
                    </div>
                )}
                {days.map((d) => {
                    const isOpen = expanded.has(d.date)
                    const overGoal = settings.calorieGoal && d.totals.calories > settings.calorieGoal
                    return (
                        <div key={d.date} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                            <button type="button" onClick={() => toggle(d.date)} className="flex w-full items-center justify-between">
                                <div className="text-left">
                                    <div className="text-sm font-bold text-slate-100">{formatDateLabel(d.date)}</div>
                                    <div className="text-xs text-slate-500">{d.date}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className={`text-sm font-extrabold ${overGoal ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {Math.round(d.totals.calories)} kcal
                                        </div>
                                        <div className="text-[10px] text-slate-500">{Math.round(d.totals.protein)}g protein{d.weight ? ` · ${d.weight}kg` : ''}</div>
                                    </div>
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                </div>
                            </button>

                            {isOpen && (
                                <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                                    {d.food.map((e) => (
                                        <div key={e.id} className="flex items-center gap-3 rounded-xl bg-slate-900/40 px-3 py-2">
                                            {e.photoId ? (
                                                <PhotoThumb photoId={e.photoId} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                                            ) : (
                                                <span className="text-lg shrink-0">{e.emoji || '🍽️'}</span>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm text-slate-200">{e.name}</div>
                                                <div className="text-[11px] text-slate-500">{e.time} · {Math.round(e.calories)} kcal</div>
                                            </div>
                                        </div>
                                    ))}
                                    {d.activity.map((a) => (
                                        <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-900/40 px-3 py-2 text-sm">
                                            <span className="text-slate-300">🏃 {a.type}</span>
                                            <span className="flex items-center gap-1 font-semibold text-orange-400">
                                                <TrendingDown className="h-3 w-3" /> {Math.round(a.caloriesBurned || 0)} kcal
                                            </span>
                                        </div>
                                    ))}
                                    {d.gym && (
                                        <div className="rounded-xl bg-slate-900/40 px-3 py-2">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-purple-400">
                                                <Dumbbell className="h-3.5 w-3.5" /> {d.gym.dayLabel}
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                {d.gym.exercises.filter((ex) => ex.sets.length > 0).map((ex) => (
                                                    <div key={ex.name} className="text-xs text-slate-400">
                                                        {ex.name} — {ex.sets.map((s) => `${s.weight || '—'}×${s.reps || '—'}`).join(', ')}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {d.water > 0 && (
                                        <div className="flex items-center justify-between rounded-xl bg-slate-900/40 px-3 py-2 text-sm">
                                            <span className="text-slate-300">💧 Water</span>
                                            <span className="font-semibold text-cyan-400">{d.water}ml</span>
                                        </div>
                                    )}
                                    {d.food.length === 0 && d.activity.length === 0 && !d.gym && !d.water && (
                                        <div className="text-xs text-slate-500">Weight only, no food logged this day.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
