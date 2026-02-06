import { useEffect, useMemo, useState, useRef } from 'react'
import { ArrowLeftRight, CalendarClock, Dumbbell, Camera, TrendingUp, Plus, X, ChevronRight, Image as ImageIcon, History, Trash2 } from 'lucide-react'

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

// Workout Templates
const workoutTemplates = {
  ppl: {
    name: 'Push/Pull/Legs',
    description: '6-day aesthetic split',
    split: [
      { key: 'push', title: 'Push Day', focus: 'Width and upper-body thickness' },
      { key: 'pull', title: 'Pull Day', focus: 'The "V" width and arm peak' },
      { key: 'legs', title: 'Leg Day', focus: 'Power and core stability' },
    ],
    exercises: {
      push: [
        { name: 'Shoulder Press (Dumbbell/Machine)', target: '12.5kg+', reps: '3-4 sets', note: '🔥 The V-Taper King' },
        { name: 'Incline Chest Press', target: '7.5kg - 12.5kg', reps: '3-4 sets', note: 'Builds the "upper shelf"' },
        { name: 'Chest Press (Flat/Machine)', target: 'Progressive', reps: '3 sets' },
        { name: 'Lateral Raises', target: '22lb - 33lb', reps: '3-4 sets', note: '🔥 Makes you "wide"' },
        { name: 'Tricep Dips (Machine)', target: '93lb - 104lb', reps: '3 sets' },
        { name: 'Tricep Pushdowns (Cables)', target: 'Progressive', reps: '3 sets' },
        { name: 'Cardio', target: '128 Calories', reps: '12% Incline', note: '🔥 Don\'t skip cardio!' },
      ],
      pull: [
        { name: 'Lat Pulldowns', target: 'Progressive', reps: '3-4 sets', note: '🔥 Widens the back, makes waist look smaller' },
        { name: 'Seated Cable Rows', target: 'Progressive', reps: '3 sets', note: 'Adds thickness to middle back' },
        { name: 'Face Pulls', target: 'Light-Medium', reps: '3 sets', note: 'Rear delts for 3D shoulder look' },
        { name: 'Bicep Curls (Dumbbell/Ez-Bar)', target: 'Progressive', reps: '3 sets' },
        { name: 'Hammer Curls', target: 'Progressive', reps: '3 sets', note: 'For forearm and bicep thickness' },
        { name: 'Cardio', target: '128 Calories', reps: '12% Incline', note: '🔥 Don\'t skip cardio!' },
      ],
      legs: [
        { name: 'Leg Press', target: '54kg+', reps: '3-4 sets', note: '🔥 Build powerful legs!' },
        { name: 'Leg Extensions', target: 'Progressive', reps: '3 sets' },
        { name: 'Leg Curls', target: 'Progressive', reps: '3 sets' },
        { name: 'Plank', target: 'Bodyweight', reps: '3 sets × 60s+', note: '🔥 Keeps the stomach tight' },
        { name: 'Cardio', target: '128 Calories', reps: '12% Incline', note: '🔥 Don\'t skip cardio!' },
      ],
    },
  },
  protocol90: {
    name: 'Protocol 90',
    description: '4-day upper/lower (90g protein)',
    split: [
      { key: 'upper1', title: 'Upper 1 (Chest/Back/Shoulders)', focus: 'Compound movements, 3×8-10' },
      { key: 'lower1', title: 'Lower 1 (Legs & Abs)', focus: 'Power and stability, 3×8-12' },
      { key: 'cardio', title: 'Cardio Day', focus: '20min incline walk only' },
      { key: 'upper2', title: 'Upper 2 (Arms & Delts)', focus: 'Isolation work, 3×10-15' },
      { key: 'lower2', title: 'Lower 2 (Volume)', focus: 'Accessory leg work, 3×10-15' },
      { key: 'rest1', title: 'Active Rest', focus: 'Cardio only - recovery day' },
      { key: 'rest2', title: 'Active Rest', focus: 'Cardio only - recovery day' },
    ],
    exercises: {
      upper1: [
        { name: 'Flat Bench Press', target: 'Heavy', reps: '3×8-10', note: '🔥 Core compound - rest 90s' },
        { name: 'Lat Pulldowns', target: 'Squeeze at bottom', reps: '3×10-12', note: 'Full range of motion' },
        { name: 'Overhead Shoulder Press', target: 'Seated', reps: '3×8-10', note: 'Keep core tight' },
        { name: 'Cable Rows (Seated)', target: 'Progressive', reps: '3×12' },
        { name: 'Tricep Pushdowns', target: 'Controlled', reps: '3×15', note: 'Squeeze at bottom' },
      ],
      lower1: [
        { name: 'Squats', target: 'Weighted', reps: '3×8-10', note: '🔥 Warm up with bodyweight first' },
        { name: 'Leg Press', target: 'Progressive', reps: '3×10-12' },
        { name: 'Leg Curls (Hamstrings)', target: 'Focus on eccentric', reps: '3×12' },
        { name: 'Calf Raises', target: 'Full stretch', reps: '3×15' },
        { name: 'Plank', target: 'Bodyweight', reps: '3×60s', note: '🔥 Holds, no movement' },
      ],
      cardio: [
        { name: 'Incline Walk', target: '130-140 cal', reps: '20 minutes', note: '🔥 12% incline, 4.5-5.0 km/h, NO handrails' },
      ],
      upper2: [
        { name: 'Incline Dumbbell Press', target: 'Moderate', reps: '3×10', note: 'Focus on upper chest' },
        { name: 'Side Lateral Raises', target: 'Strict form', reps: '3×15', note: '🔥 Makes you wide' },
        { name: 'Bicep Curls (Dumbbell)', target: 'Progressive', reps: '3×10-12', note: 'Full contraction' },
        { name: 'Face Pulls / Rear Delt Fly', target: 'Light-Medium', reps: '3×15', note: 'Rear delts for 3D look' },
        { name: 'Pushups', target: 'Bodyweight', reps: '2×AMRAP', note: 'Until failure' },
      ],
      lower2: [
        { name: 'Lunges (Walking/Static)', target: 'Bodyweight or light', reps: '3×10 each leg', note: 'Balance and stability' },
        { name: 'Leg Extensions', target: 'Burnout set', reps: '3×15', note: 'Quad isolation' },
        { name: 'Crunches / Leg Raises', target: 'Bodyweight', reps: '3×15', note: 'Abs focus' },
      ],
      rest1: [
        { name: 'Incline Walk', target: '130-140 cal', reps: '20 minutes', note: '🧘 Recovery day - NO weights, just cardio' },
      ],
      rest2: [
        { name: 'Incline Walk', target: '130-140 cal', reps: '20 minutes', note: '🧘 Recovery day - NO weights, just cardio' },
      ],
    },
  },
}

// Legacy references for backward compatibility
const split = workoutTemplates.ppl.split
const exercises = workoutTemplates.ppl.exercises


export default function Gym() {
  const todayISO = toISODate(startOfToday())
  const [selectedTemplate, setSelectedTemplate] = useLocalStorageState('zt.gym.template', 'ppl')
  const [anchorDate, setAnchorDate] = useLocalStorageState('zt.gym.anchorDate', todayISO)
  const [anchorIndex, setAnchorIndex] = useLocalStorageState('zt.gym.anchorIndex', 0)
  const [workouts, setWorkouts] = useLocalStorageState('zt.gym.workouts', [])
  const [photos, setPhotos] = useLocalStorageState('zt.gym.photos', [])

  const [swapOpen, setSwapOpen] = useState(false)
  const [didKey, setDidKey] = useState(null)
  const [logExercise, setLogExercise] = useState(null)
  const [sets, setSets] = useState([{ weight: '', reps: '' }])
  const [notes, setNotes] = useState('')
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false)
  const [customWorkoutOpen, setCustomWorkoutOpen] = useState(false)
  const [customExerciseName, setCustomExerciseName] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const fileInputRef = useRef(null)

  // Get current template data
  const currentTemplate = workoutTemplates[selectedTemplate] || workoutTemplates.ppl
  const currentSplit = currentTemplate.split
  const currentExercises = currentTemplate.exercises

  const todayIndex = useMemo(() => {
    const diff = dayDiff(anchorDate, todayISO)
    const idx = (((Number(anchorIndex) || 0) + diff) % currentSplit.length + currentSplit.length) % currentSplit.length
    return idx
  }, [anchorDate, anchorIndex, todayISO, currentSplit.length])

  const todayWorkout = currentSplit[todayIndex]
  const todayExercises = currentExercises[todayWorkout.key] || []

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
    const desiredIndex = currentSplit.findIndex((s) => s.key === didKey)
    if (desiredIndex < 0) return
    const diff = dayDiff(anchorDate, todayISO)
    const newAnchorIndex = desiredIndex - diff
    setAnchorIndex(((newAnchorIndex % currentSplit.length) + currentSplit.length) % currentSplit.length)
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
          <button
            type="button"
            onClick={() => setSelectedTemplate(selectedTemplate === 'ppl' ? 'protocol90' : 'ppl')}
            className="rounded-xl bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-1.5">
              <ArrowLeftRight className="h-3 w-3" />
              <span>{currentTemplate.name}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{currentTemplate.description}</div>
          </button>
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
              {selectedTemplate === 'protocol90' ? 'Weeks Left' : 'Quick Tip'}
            </div>
            {selectedTemplate === 'protocol90' ? (
              <div className="mt-2">
                <div className="text-lg font-extrabold text-slate-50">{Math.floor(countdown.days / 7)} weeks</div>
                <div className="text-sm text-slate-400">{Math.floor(countdown.days / 7)} full cycles of Protocol 90</div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-300">
                On Pull days, keep elbows driving down and pause 1 sec at the bottom for lat engagement.
              </div>
            )}
          </div>
        </div>

        {/* Protocol 90 Weekly Schedule */}
        {selectedTemplate === 'protocol90' && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4">
            <div className="text-xs font-semibold tracking-wide text-amber-400">PROTOCOL 90 • 7-DAY CYCLE</div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((day, i) => {
                const dayData = currentSplit[i]
                const isToday = i === todayIndex
                const isRest = dayData?.key?.startsWith('rest')
                const isCardio = dayData?.key === 'cardio'
                return (
                  <div
                    key={day}
                    className={[
                      'rounded-lg p-2 text-center text-[10px] font-bold',
                      isToday
                        ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300'
                        : isRest
                          ? 'border border-slate-700 bg-slate-900/50 text-slate-500'
                          : isCardio
                            ? 'border border-blue-500/30 bg-blue-950/20 text-blue-300'
                            : 'border border-slate-700 bg-slate-900/30 text-slate-300',
                    ].join(' ')}
                  >
                    <div className="text-[9px] opacity-60">{day}</div>
                    <div className="mt-0.5 truncate">
                      {dayData?.key === 'upper1' ? 'UPR1' :
                        dayData?.key === 'upper2' ? 'UPR2' :
                          dayData?.key === 'lower1' ? 'LWR1' :
                            dayData?.key === 'lower2' ? 'LWR2' :
                              dayData?.key === 'cardio' ? '🚶' :
                                '😴'}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-500">
              <span>🔥 Weights: 4 days</span>
              <span>🚶 Cardio: Every day</span>
              <span>😴 Rest: 2 days</span>
            </div>
          </div>
        )}

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
              {currentSplit.map((s) => (
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

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold tracking-wide text-slate-400">WORKOUT HISTORY</div>
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs font-extrabold text-slate-200 hover:bg-slate-900"
          >
            <History className="h-3 w-3" />
            {historyOpen ? 'Hide' : 'Show All'}
          </button>
        </div>

        {workouts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {(historyOpen ? workouts : workouts.slice(-3))
              .slice()
              .reverse()
              .map((workout) => (
                <div key={workout.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-slate-400">
                          {new Date(workout.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        {workout.dayType !== 'custom' && (
                          <div className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">
                            {split.find((s) => s.key === workout.dayType)?.title || workout.dayType}
                          </div>
                        )}
                        {workout.dayType === 'custom' && (
                          <div className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                            Custom
                          </div>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {workout.exercises?.map((exercise, exIdx) => (
                          <div key={exIdx} className="text-sm">
                            <div className="font-bold text-slate-100">{exercise.name}</div>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {exercise.sets?.map((set, setIdx) => (
                                <div
                                  key={setIdx}
                                  className="rounded-md bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300"
                                >
                                  {set.weight}kg × {set.reps}
                                </div>
                              ))}
                            </div>
                            {exercise.notes && (
                              <div className="mt-1 text-xs italic text-slate-500">{exercise.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this workout?')) {
                          setWorkouts((prev) => prev.filter((w) => w.id !== workout.id))
                        }
                      }}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 py-8 text-center">
            <History className="h-8 w-8 text-slate-600" />
            <div className="mt-2 text-xs text-slate-500">No workouts logged yet. Start logging exercises!</div>
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



