import { useEffect, useMemo, useState } from 'react'
import { Dumbbell, Plus, Trash2, X, Calendar, Pencil, Flame, History as HistoryIcon } from 'lucide-react'
import { gymTemplates, blankTemplate } from '../config/gymTemplates'
import { todayISO, formatDateLabel } from '../utils/dates'
import { estimateActivityCalories } from '../utils/nutrition'
import { generateId } from '../utils/id'

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

export default function Gym({ onToast }) {
    const today = todayISO()

    const [templateChoice, setTemplateChoice] = useLocalStorageState('ct.gym.templateChoice', 'ppl')
    const [customTemplate, setCustomTemplate] = useLocalStorageState('ct.gym.customTemplate', blankTemplate())
    const [workouts, setWorkouts] = useLocalStorageState('ct.gym.workouts', [])
    const [, setActivityLog] = useLocalStorageState('ct.activityLog', [])

    const [selectedDate, setSelectedDate] = useState(today)
    const [editingTemplate, setEditingTemplate] = useState(false)
    const [newExerciseName, setNewExerciseName] = useState('')
    const [burnedInput, setBurnedInput] = useState('')

    const activeTemplate = templateChoice === 'custom' ? customTemplate : gymTemplates[templateChoice]

    const session = useMemo(() => workouts.find((w) => w.date === selectedDate), [workouts, selectedDate])

    function upsertSession(updater) {
        setWorkouts((prev) => {
            const idx = prev.findIndex((w) => w.date === selectedDate)
            if (idx === -1) {
                const fresh = updater({ id: generateId('workout'), date: selectedDate, dayId: null, dayLabel: null, exercises: [] })
                return [...prev, fresh]
            }
            const next = [...prev]
            next[idx] = updater(next[idx])
            return next
        })
    }

    function pickDay(day) {
        upsertSession((s) => {
            if (s.exercises.length > 0 && s.dayId === day.id) return s // already on this day, no-op
            const hasData = s.exercises.length > 0
            return {
                ...s,
                dayId: day.id,
                dayLabel: day.label,
                // Seed from the template only if nothing has been logged yet for this date.
                exercises: hasData ? s.exercises : day.exercises.map((ex) => ({ name: ex.name, target: ex.target, reps: ex.reps, sets: [], notes: '' })),
            }
        })
    }

    function addSet(exerciseName) {
        upsertSession((s) => ({
            ...s,
            exercises: s.exercises.map((ex) => ex.name === exerciseName
                ? { ...ex, sets: [...ex.sets, { weight: '', reps: '' }] }
                : ex),
        }))
    }

    function updateSet(exerciseName, idx, field, value) {
        upsertSession((s) => ({
            ...s,
            exercises: s.exercises.map((ex) => ex.name === exerciseName
                ? { ...ex, sets: ex.sets.map((set, i) => i === idx ? { ...set, [field]: value } : set) }
                : ex),
        }))
    }

    function removeSet(exerciseName, idx) {
        upsertSession((s) => ({
            ...s,
            exercises: s.exercises.map((ex) => ex.name === exerciseName
                ? { ...ex, sets: ex.sets.filter((_, i) => i !== idx) }
                : ex),
        }))
    }

    function removeExercise(exerciseName) {
        upsertSession((s) => ({ ...s, exercises: s.exercises.filter((ex) => ex.name !== exerciseName) }))
    }

    function addCustomExercise() {
        const name = newExerciseName.trim()
        if (!name) return
        upsertSession((s) => ({
            ...s,
            exercises: [...s.exercises, { name, target: '', reps: '', sets: [], notes: '' }],
        }))
        setNewExerciseName('')
    }

    function lastPerformance(exerciseName) {
        const past = workouts
            .filter((w) => w.date !== selectedDate)
            .sort((a, b) => b.date.localeCompare(a.date))
        for (const w of past) {
            const ex = w.exercises.find((e) => e.name === exerciseName && e.sets.length > 0)
            if (ex) {
                const last = ex.sets[ex.sets.length - 1]
                return { date: w.date, weight: last.weight, reps: last.reps }
            }
        }
        return null
    }

    function logCaloriesBurned() {
        const cal = Number(burnedInput) || estimateActivityCalories({ type: 'gym', durationMin: 60 })
        setActivityLog((prev) => [...prev, {
            id: generateId('act'),
            date: selectedDate,
            type: 'gym',
            caloriesBurned: cal,
        }])
        setBurnedInput('')
        onToast?.(`✓ Logged ${cal} kcal burned for this workout`)
    }

    function addTemplateDay() {
        setCustomTemplate((t) => ({
            ...t,
            days: [...t.days, { id: generateId('day'), label: `Day ${t.days.length + 1}`, exercises: [] }],
        }))
    }

    function removeTemplateDay(dayId) {
        setCustomTemplate((t) => ({ ...t, days: t.days.filter((d) => d.id !== dayId) }))
    }

    function updateTemplateDayLabel(dayId, label) {
        setCustomTemplate((t) => ({ ...t, days: t.days.map((d) => d.id === dayId ? { ...d, label } : d) }))
    }

    function addTemplateExercise(dayId) {
        setCustomTemplate((t) => ({
            ...t,
            days: t.days.map((d) => d.id === dayId
                ? { ...d, exercises: [...d.exercises, { name: 'New Exercise', target: '3 sets', reps: '8-10 reps' }] }
                : d),
        }))
    }

    function updateTemplateExercise(dayId, idx, field, value) {
        setCustomTemplate((t) => ({
            ...t,
            days: t.days.map((d) => d.id === dayId
                ? { ...d, exercises: d.exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex) }
                : d),
        }))
    }

    function removeTemplateExercise(dayId, idx) {
        setCustomTemplate((t) => ({
            ...t,
            days: t.days.map((d) => d.id === dayId ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) } : d),
        }))
    }

    const recentWorkouts = useMemo(
        () => workouts.filter((w) => w.exercises.some((ex) => ex.sets.length > 0)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
        [workouts]
    )

    const totalSetsToday = session?.exercises.reduce((s, ex) => s + ex.sets.filter((set) => set.weight || set.reps).length, 0) || 0

    return (
        <div className="space-y-4">
            {/* ── TEMPLATE PICKER ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <Dumbbell className="h-4 w-4 text-purple-400" /> ROUTINE
                    </div>
                    {templateChoice === 'custom' && (
                        <button type="button" onClick={() => setEditingTemplate((s) => !s)} className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300">
                            <Pencil className="h-3.5 w-3.5" /> {editingTemplate ? 'Done' : 'Edit'}
                        </button>
                    )}
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto">
                    {Object.entries(gymTemplates).map(([key, t]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTemplateChoice(key)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${templateChoice === key ? 'bg-purple-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                        >
                            {t.name}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setTemplateChoice('custom')}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${templateChoice === 'custom' ? 'bg-purple-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                    >
                        {customTemplate.name || 'Custom'}
                    </button>
                </div>

                {templateChoice === 'custom' && editingTemplate && (
                    <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                        <input
                            value={customTemplate.name}
                            onChange={(e) => setCustomTemplate((t) => ({ ...t, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-bold text-slate-100 outline-none"
                            placeholder="Routine name"
                        />
                        {customTemplate.days.map((d) => (
                            <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        value={d.label}
                                        onChange={(e) => updateTemplateDayLabel(d.id, e.target.value)}
                                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1 text-sm font-semibold text-slate-100 outline-none"
                                    />
                                    <button onClick={() => removeTemplateDay(d.id)} className="text-slate-600 hover:text-red-400">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1.5">
                                    {d.exercises.map((ex, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <input
                                                value={ex.name}
                                                onChange={(e) => updateTemplateExercise(d.id, i, 'name', e.target.value)}
                                                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/30 px-2 py-1 text-xs text-slate-200 outline-none"
                                            />
                                            <input
                                                value={ex.reps || ''}
                                                onChange={(e) => updateTemplateExercise(d.id, i, 'reps', e.target.value)}
                                                placeholder="reps"
                                                className="w-20 rounded-lg border border-slate-700 bg-slate-800/30 px-2 py-1 text-xs text-slate-200 outline-none"
                                            />
                                            <button onClick={() => removeTemplateExercise(d.id, i)} className="text-slate-600 hover:text-red-400">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => addTemplateExercise(d.id)} className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300">
                                    <Plus className="inline h-3 w-3" /> Add exercise
                                </button>
                            </div>
                        ))}
                        <button onClick={addTemplateDay} className="w-full rounded-xl border border-dashed border-slate-700 py-2 text-xs font-semibold text-slate-400 hover:text-purple-400">
                            <Plus className="inline h-3.5 w-3.5" /> Add day
                        </button>
                    </div>
                )}
            </div>

            {/* ── DATE ──────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <Calendar className="h-4 w-4 text-purple-400" /> DATE
                    </div>
                    {selectedDate !== today && (
                        <button type="button" onClick={() => setSelectedDate(today)} className="rounded-lg bg-purple-500 px-2.5 py-1 text-xs font-bold text-slate-900 hover:bg-purple-400">
                            Back to Today
                        </button>
                    )}
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={today}
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none"
                />
            </div>

            {/* ── DAY PICKER ────────────────────────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto">
                {activeTemplate.days.map((d) => (
                    <button
                        key={d.id}
                        type="button"
                        onClick={() => pickDay(d)}
                        className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold ${session?.dayId === d.id ? 'bg-purple-500 text-slate-900' : 'bg-slate-900/50 text-slate-300 border border-slate-800'}`}
                    >
                        {d.label}
                    </button>
                ))}
            </div>

            {/* ── SESSION ───────────────────────────────────────────────────── */}
            {!session || !session.dayId ? (
                <div className="rounded-2xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">
                    Pick a day above to start logging {selectedDate === today ? "today's" : 'this'} workout.
                </div>
            ) : (
                <div className="space-y-3">
                    {session.exercises.map((ex) => {
                        const last = lastPerformance(ex.name)
                        return (
                            <div key={ex.name} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-bold text-slate-100">{ex.name}</div>
                                        {(ex.target || ex.reps) && (
                                            <div className="text-xs text-slate-500">{[ex.target, ex.reps].filter(Boolean).join(' · ')}</div>
                                        )}
                                        {last && (
                                            <div className="mt-0.5 text-[11px] text-purple-400">
                                                Last time ({formatDateLabel(last.date)}): {last.weight || '—'}kg × {last.reps || '—'}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => removeExercise(ex.name)} className="text-slate-600 hover:text-red-400">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="mt-3 space-y-1.5">
                                    {ex.sets.map((set, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-5 text-xs text-slate-500">{i + 1}</span>
                                            <input
                                                type="number"
                                                placeholder="kg"
                                                value={set.weight}
                                                onChange={(e) => updateSet(ex.name, i, 'weight', e.target.value)}
                                                className="w-20 rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-sm text-slate-100 outline-none text-center"
                                                inputMode="decimal"
                                            />
                                            <span className="text-slate-600">×</span>
                                            <input
                                                type="number"
                                                placeholder="reps"
                                                value={set.reps}
                                                onChange={(e) => updateSet(ex.name, i, 'reps', e.target.value)}
                                                className="w-20 rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-sm text-slate-100 outline-none text-center"
                                                inputMode="numeric"
                                            />
                                            <button onClick={() => removeSet(ex.name, i)} className="ml-auto text-slate-600 hover:text-red-400">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addSet(ex.name)}
                                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add set
                                </button>
                            </div>
                        )
                    })}

                    <div className="flex gap-2">
                        <input
                            value={newExerciseName}
                            onChange={(e) => setNewExerciseName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomExercise()}
                            placeholder="Add an extra exercise..."
                            className="flex-1 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600"
                        />
                        <button type="button" onClick={addCustomExercise} className="rounded-xl bg-slate-800 px-3 text-slate-300 hover:bg-slate-700">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>

                    {totalSetsToday > 0 && (
                        <div className="rounded-2xl border border-orange-500/20 bg-orange-950/10 p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-orange-400">
                                <Flame className="h-4 w-4" /> LOG CALORIES BURNED (OPTIONAL)
                            </div>
                            <div className="mt-2 flex gap-2">
                                <input
                                    type="number"
                                    placeholder="e.g. 300"
                                    value={burnedInput}
                                    onChange={(e) => setBurnedInput(e.target.value)}
                                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none"
                                    inputMode="numeric"
                                />
                                <button type="button" onClick={logCaloriesBurned} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-400">
                                    Log
                                </button>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">Adds to today's calorie balance on the Today tab. Leave blank to use a rough 60-min estimate.</div>
                        </div>
                    )}
                </div>
            )}

            {/* ── RECENT WORKOUTS ───────────────────────────────────────────── */}
            {recentWorkouts.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                        <HistoryIcon className="h-4 w-4" /> RECENT WORKOUTS
                    </div>
                    <div className="mt-2 space-y-1.5">
                        {recentWorkouts.map((w) => {
                            const sets = w.exercises.reduce((s, ex) => s + ex.sets.filter((set) => set.weight || set.reps).length, 0)
                            return (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setSelectedDate(w.date)}
                                    className="flex w-full items-center justify-between rounded-xl bg-slate-900/40 px-3 py-2 text-left hover:bg-slate-900"
                                >
                                    <span className="text-sm text-slate-200">{formatDateLabel(w.date)} · {w.dayLabel}</span>
                                    <span className="text-xs text-slate-500">{w.exercises.length} exercises · {sets} sets</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
