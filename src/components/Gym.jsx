import { useEffect, useMemo, useState, useRef } from 'react'
import { ArrowLeftRight, CalendarClock, Dumbbell, Camera, TrendingUp, Plus, X, ChevronRight, Image as ImageIcon } from 'lucide-react'

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

function dayDiff(aISO, bISO) {
  const a = parseISODate(aISO)
  const b = parseISODate(bISO)
  if (!a || !b) return 0
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.floor((b0 - a0) / 86400000)
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
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])

  return [value, setValue]
}

const split = [
  { key: 'push', title: 'Push Day', focus: 'Chest + Shoulders + Triceps' },
  { key: 'pull', title: 'Pull Day', focus: 'Lat Width (V-taper)' },
  { key: 'legs', title: 'Legs Day', focus: 'Quads + Hamstrings + Calves' },
  { key: 'rest', title: 'Rest Day', focus: 'Walk + Mobility + Sleep' },
]

const exercises = {
  push: [
    { name: 'Chest Press', target: '12.5kg → 15kg', reps: '10-12' },
    { name: 'Lateral Raises', target: '3-5kg', reps: '12-15' },
    { name: 'Incline Press', target: '12.5kg', reps: '10-12' },
  ],
  pull: [
    { name: 'Lat Pulldowns', target: 'Progressive', reps: '10-12', note: '🔥 Most important for V-taper' },
    { name: 'Seated Cable Rows', target: 'Progressive', reps: '10-12' },
    { name: 'Bicep Curls', target: 'Light weight', reps: '12-15' },
  ],
  legs: [
    { name: 'Leg Press/Squats', target: 'Deep ROM', reps: '10-12' },
    { name: 'Planks', target: 'Bodyweight', reps: '60s holds', note: 'Tight core for V-taper' },
    { name: 'Hanging Leg Raises', target: 'Bodyweight', reps: '10-15' },
  ],
  rest: [],
}

export default function Gym() {
  const todayISO = toISODate(startOfToday())
  const [anchorDate, setAnchorDate] = useLocalStorageState('zt.gym.anchorDate', todayISO)
  const [anchorIndex, setAnchorIndex] = useLocalStorageState('zt.gym.anchorIndex', 0)
  const [workouts, setWorkouts] = useLocalStorageState('zt.gym.workouts', [])
  const [photos, setPhotos] = useLocalStorageState('zt.gym.photos', [])

  const [swapOpen, setSwapOpen] = useState(false)
  const [didKey, setDidKey] = useState(split[0].key)
  const [logExercise, setLogExercise] = useState(null)
  const [sets, setSets] = useState([{ weight: '', reps: '' }])
  const [notes, setNotes] = useState('')
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false)
  const [customWorkoutOpen, setCustomWorkoutOpen] = useState(false)
  const [customExerciseName, setCustomExerciseName] = useState('')
  const fileInputRef = useRef(null)

  const todayIndex = useMemo(() => {
    const diff = dayDiff(anchorDate, todayISO)
    const idx = (((Number(anchorIndex) || 0) + diff) % split.length + split.length) % split.length
    return idx
  }, [anchorDate, anchorIndex, todayISO])

  const todayWorkout = split[todayIndex]
  const todayExercises = exercises[todayWorkout.key] || []

  useEffect(() => {
    setDidKey(todayWorkout.key)
  }, [todayWorkout.key])

  const goalDate = useMemo(() => new Date(2026, 4, 23, 0, 0, 0), [])
  const countdown = useMemo(() => {
    const now = new Date()
    const diff = Math.max(0, goalDate.getTime() - now.getTime())
    const totalSeconds = Math.floor(diff / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    return { days, hours, mins }
  }, [goalDate])

  function applySwap() {
    const desiredIndex = split.findIndex((s) => s.key === didKey)
    if (desiredIndex < 0) return
    const diff = dayDiff(anchorDate, todayISO)
    const newAnchorIndex = desiredIndex - diff
    setAnchorIndex(((newAnchorIndex % split.length) + split.length) % split.length)
    setAnchorDate(todayISO)
    setSwapOpen(false)
  }

  function openLogExercise(exercise) {
    const lastWorkout = workouts
      .filter((w) => w.exercises?.some((e) => e.name === exercise.name))
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]

    const lastExercise = lastWorkout?.exercises?.find((e) => e.name === exercise.name)

    if (lastExercise?.sets?.length > 0) {
      setSets(lastExercise.sets.map((s) => ({ ...s })))
    } else {
      setSets([{ weight: '', reps: '' }])
    }

    setNotes('')
    setLogExercise(exercise)
  }

  function saveWorkout() {
    if (!logExercise) return

    const validSets = sets.filter((s) => s.weight && s.reps)
    if (validSets.length === 0) return

    const newWorkout = {
      id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: todayISO,
      dayType: todayWorkout.key,
      exercises: [
        {
          name: logExercise.name,
          sets: validSets.map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
          notes: notes.trim() || undefined,
        },
      ],
    }

    setWorkouts((prev) => [...prev, newWorkout])
    setLogExercise(null)
    setSets([{ weight: '', reps: '' }])
    setNotes('')
  }

  function openCustomWorkout() {
    setCustomExerciseName('')
    setSets([{ weight: '', reps: '' }])
    setNotes('')
    setCustomWorkoutOpen(true)
  }

  function saveCustomWorkout() {
    if (!customExerciseName.trim()) return

    const validSets = sets.filter((s) => s.weight && s.reps)
    if (validSets.length === 0) return

    const newWorkout = {
      id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: todayISO,
      dayType: 'custom',
      exercises: [
        {
          name: customExerciseName.trim(),
          sets: validSets.map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
          notes: notes.trim() || undefined,
        },
      ],
    }

    setWorkouts((prev) => [...prev, newWorkout])
    setCustomWorkoutOpen(false)
    setCustomExerciseName('')
    setSets([{ weight: '', reps: '' }])
    setNotes('')
  }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result
      if (typeof dataUrl === 'string') {
        const newPhoto = {
          id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          date: todayISO,
          dataUrl,
        }
        setPhotos((prev) => [...prev, newPhoto])
      }
    }
    reader.readAsDataURL(file)
  }

  function getLastPerformance(exerciseName) {
    const lastWorkout = workouts
      .filter((w) => w.exercises?.some((e) => e.name === exerciseName))
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]

    const exercise = lastWorkout?.exercises?.find((e) => e.name === exerciseName)
    if (!exercise?.sets?.length) return null

    const best = exercise.sets[0]
    return { weight: best.weight, reps: best.reps, date: lastWorkout.date }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-400">V-TAPER GYM LOG</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-50">Today is {todayWorkout.title}</div>
            <div className="mt-1 text-sm text-slate-300">Focus: <span className="font-semibold text-emerald-400">{todayWorkout.focus}</span></div>
          </div>
          <div className="rounded-xl bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300">
            Split: Push → Pull → Legs → Rest
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <CalendarClock className="h-4 w-4 text-emerald-400" />
              Goal Countdown
            </div>
            <div className="mt-2 text-lg font-extrabold text-slate-50">
              {countdown.days}d {countdown.hours}h {countdown.mins}m
            </div>
            <div className="text-sm text-slate-400">Goal date: May 23, 2026 • Target: 72kg</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Dumbbell className="h-4 w-4 text-emerald-400" />
              Quick Tip
            </div>
            <div className="mt-2 text-sm text-slate-300">
              On Pull days, keep elbows driving down and pause 1 sec at the bottom for lat engagement.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSwapOpen((v) => !v)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-slate-900 active:scale-[0.99]"
        >
          <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
          I did the wrong workout
        </button>

        {swapOpen ? (
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="text-sm font-semibold text-slate-200">What did you actually do today?</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {split.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setDidKey(s.key)}
                  className={[
                    'rounded-xl border px-3 py-2 text-left text-sm font-bold',
                    didKey === s.key
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/60',
                  ].join(' ')}
                >
                  {s.title}
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              This will "swap" the rolling schedule so today matches what you did, and future days stay consistent.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSwapOpen(false)}
                className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applySwap}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-emerald-400"
              >
                Apply Swap
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {todayExercises.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-xs font-semibold tracking-wide text-slate-400">EXERCISES FOR TODAY</div>
          <div className="mt-3 space-y-2">
            {todayExercises.map((ex) => {
              const last = getLastPerformance(ex.name)
              return (
                <div key={ex.name} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-100">{ex.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Target: {ex.target} • {ex.reps} reps
                      </div>
                      {ex.note && <div className="mt-1 text-xs text-emerald-400">{ex.note}</div>}
                      {last && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <TrendingUp className="h-3 w-3" />
                          Last: {last.weight}kg × {last.reps} reps
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openLogExercise(ex)}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-emerald-400"
                    >
                      Log
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={openCustomWorkout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm font-extrabold text-emerald-300 hover:bg-emerald-950/40 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Add Custom Workout
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold tracking-wide text-slate-400">PROGRESS PHOTOS</div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-emerald-400"
          >
            <Camera className="h-3 w-3" />
            Add Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {photos.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.slice(-6).reverse().map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPhotoGalleryOpen(true)}
                className="aspect-square overflow-hidden rounded-xl border border-slate-800"
              >
                <img src={photo.dataUrl} alt={`Progress ${photo.date}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 py-8 text-center">
            <ImageIcon className="h-8 w-8 text-slate-600" />
            <div className="mt-2 text-xs text-slate-500">No photos yet. Tap "Add Photo" to start tracking!</div>
          </div>
        )}
      </div>

      {logExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-100">{logExercise.name}</div>
                <div className="text-xs text-slate-400">Log your sets</div>
              </div>
              <button
                type="button"
                onClick={() => setLogExercise(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {sets.map((set, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                    {idx + 1}
                  </div>
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={set.weight}
                    onChange={(e) => {
                      const newSets = [...sets]
                      newSets[idx].weight = e.target.value
                      setSets(newSets)
                    }}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                    inputMode="decimal"
                  />
                  <input
                    type="number"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => {
                      const newSets = [...sets]
                      newSets[idx].reps = e.target.value
                      setSets(newSets)
                    }}
                    className="w-20 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                    inputMode="numeric"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSets([...sets, { weight: '', reps: '' }])}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <Plus className="h-3 w-3" />
              Add Set
            </button>

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
              rows={2}
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLogExercise(null)}
                className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveWorkout}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-emerald-400"
              >
                Save Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {customWorkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-100">Custom Workout</div>
                <div className="text-xs text-slate-400">Log any exercise</div>
              </div>
              <button
                type="button"
                onClick={() => setCustomWorkoutOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-400">Exercise Name</label>
              <input
                type="text"
                placeholder="e.g., Bicep Curls, Plank, etc."
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400">Sets</div>
              {sets.map((set, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300">
                    {idx + 1}
                  </div>
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={set.weight}
                    onChange={(e) => {
                      const newSets = [...sets]
                      newSets[idx].weight = e.target.value
                      setSets(newSets)
                    }}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                    inputMode="decimal"
                  />
                  <input
                    type="number"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => {
                      const newSets = [...sets]
                      newSets[idx].reps = e.target.value
                      setSets(newSets)
                    }}
                    className="w-20 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                    inputMode="numeric"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSets([...sets, { weight: '', reps: '' }])}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <Plus className="h-3 w-3" />
              Add Set
            </button>

            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
              rows={2}
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomWorkoutOpen(false)}
                className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCustomWorkout}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-emerald-400"
              >
                Save Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {photoGalleryOpen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4">
          <div className="relative w-full max-w-lg">
            <button
              type="button"
              onClick={() => setPhotoGalleryOpen(false)}
              className="absolute right-0 top-0 rounded-lg bg-slate-900 p-2 text-slate-400 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mt-12 space-y-4">
              {photos.slice().reverse().map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-2xl border border-slate-800">
                  <img src={photo.dataUrl} alt={`Progress ${photo.date}`} className="w-full" />
                  <div className="bg-slate-900/80 px-4 py-2 text-xs text-slate-400">
                    {new Date(photo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


