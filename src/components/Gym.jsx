import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { ArrowLeftRight, CalendarClock, Dumbbell, Camera, TrendingUp, Plus, X, Image as ImageIcon, History, Trash2, Timer, Flame, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

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

// ─── Rest Timer Component ───────────────────────────────────────────────────
function RestTimer({ onDismiss }) {
  const [duration, setDuration] = useState(null) // null = not started
  const [remaining, setRemaining] = useState(0)
  const intervalRef = useRef(null)

  function startTimer(secs) {
    clearInterval(intervalRef.current)
    setDuration(secs)
    setRemaining(secs)
  }

  useEffect(() => {
    if (remaining <= 0 || duration === null) return
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          // Vibrate on finish
          if (navigator.vibrate) navigator.vibrate([300, 100, 300])
          // Beep via Web Audio
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.6)
          } catch (_) { }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [remaining, duration])

  const progress = duration ? (remaining / duration) : 0
  const circumference = 2 * Math.PI * 20
  const strokeDash = circumference * progress

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4">
      <div className="rounded-2xl border border-amber-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Timer className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Rest Timer</span>
          </div>
          <button type="button" onClick={onDismiss} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {duration === null ? (
          <div className="mt-3 flex gap-2">
            {[60, 90, 120].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => startTimer(s)}
                className="flex-1 rounded-xl border border-amber-500/30 bg-amber-950/20 py-2.5 text-sm font-extrabold text-amber-300 hover:bg-amber-950/40"
              >
                {s}s
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-4">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="#1e293b" strokeWidth="4" />
              <circle
                cx="26" cy="26" r="20" fill="none"
                stroke={remaining === 0 ? '#22c55e' : '#f59e0b'}
                strokeWidth="4"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(-90 26 26)"
                style={{ transition: 'stroke-dasharray 0.9s linear' }}
              />
            </svg>
            <div className="flex-1">
              <div className={`text-2xl font-extrabold ${remaining === 0 ? 'text-emerald-400' : 'text-slate-50'}`}>
                {remaining === 0 ? '✓ Done!' : `${mins}:${String(secs).padStart(2, '0')}`}
              </div>
              <div className="text-xs text-slate-500">{duration}s rest</div>
            </div>
            <div className="flex gap-2">
              {[60, 90, 120].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => startTimer(s)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${duration === s && remaining > 0 ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Volume Chart Component ─────────────────────────────────────────────────
function VolumeChart({ workouts }) {
  const weeks = useMemo(() => {
    const today = startOfToday()
    const result = []
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() - w * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const volume = workouts
        .filter(wo => {
          const d = parseISODate(wo.date)
          return d && d >= weekStart && d <= weekEnd
        })
        .reduce((sum, wo) => {
          return sum + (wo.exercises || []).reduce((s2, ex) => {
            return s2 + (ex.sets || []).reduce((s3, set) => s3 + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0)
          }, 0)
        }, 0)
      result.push({ label, volume })
    }
    return result
  }, [workouts])

  const maxVol = Math.max(...weeks.map(w => w.volume), 1)
  const totalThisWeek = weeks[3]?.volume || 0
  const totalLastWeek = weeks[2]?.volume || 0
  const change = totalLastWeek > 0 ? Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100) : null

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-400">4-WEEK VOLUME TREND</div>
        {change !== null && (
          <div className={`text-xs font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last week
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2 h-24">
        {weeks.map((w, i) => {
          const heightPct = maxVol > 0 ? Math.max((w.volume / maxVol) * 100, w.volume > 0 ? 8 : 2) : 2
          const isThisWeek = i === 3
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="text-[9px] font-bold text-slate-500">
                {w.volume > 0 ? `${(w.volume / 1000).toFixed(1)}k` : '—'}
              </div>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-lg transition-all ${isThisWeek ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 text-center leading-tight">{w.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Workout Templates ──────────────────────────────────────────────────────
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
    description: '5-day high intensity (72kg goal)',
    split: [
      { key: 'upper1', title: 'Upper 1 (Heavy Freeweight)', focus: 'Heavy pressing & pulling' },
      { key: 'lower1', title: 'Lower 1 (Heavy Power)', focus: 'Heavy compound leg strength' },
      { key: 'aesthetics', title: 'Aesthetics & The Truth Burn', focus: 'Light day – Shoulders, Arms & Cardio' },
      { key: 'upper2', title: 'Upper 2 (Machine & Volume)', focus: 'Hypertrophy & Pump' },
      { key: 'lower2', title: 'Lower 2 (Volume Legs)', focus: 'Leg volume & Core' },
      { key: 'rest1', title: 'Active Rest', focus: 'Cardio only - recovery day' },
      { key: 'rest2', title: 'Active Rest', focus: 'Cardio only - recovery day' },
    ],
    exercises: {
      upper1: [
        { name: 'Incline Dumbbell Press', target: '17.5kg', reps: '3 sets', note: '🔥 Then 3 back-off sets at 15kg' },
        { name: 'Lat Pulldowns', target: 'Heavy', reps: '3 sets' },
        { name: 'Seated Cable Rows', target: 'Heavy', reps: '3 sets' },
        { name: 'Seated DB Shoulder Press', target: 'Progressive', reps: '3 sets' },
        { name: 'DB Lateral Raises', target: '10-12 reps', reps: '3 sets', note: '🔥 Strict form, no swing' },
        { name: 'Tricep Pushdowns', target: 'Progressive', reps: '3 sets', note: 'Moved to end so arms are fresh for presses' },
        { name: 'Cardio', target: '15% Incline Walk', reps: '~150 cal', note: '🔥 Don\'t skip cardio!' },
      ],
      lower1: [
        { name: 'Leg Press', target: '120kg', reps: '3 sets', note: '🔥 Heavy compound power' },
        { name: 'Leg Extensions', target: 'Progressive', reps: '3 sets' },
        { name: 'Seated Hamstring Curls', target: 'Progressive', reps: '3 sets' },
        { name: 'Calf Raises', target: 'Full range', reps: '3 sets' },
        { name: 'Weighted Cable Crunches', target: '10-15 reps', reps: '3 sets', note: '🔥 Squeeze hard – build the 4-pack bricks' },
        { name: 'Hanging or Lying Leg Raises', target: 'Failure', reps: '3 sets', note: 'Go to failure every set' },
        { name: 'Cardio', target: '15% Incline Walk', reps: '~150 cal', note: '🔥 Don\'t skip cardio!' },
      ],
      aesthetics: [
        { name: 'DB Lateral Raises', target: 'Progressive', reps: '3 sets', note: '🔥 Light day – strict form' },
        { name: 'Lat Pulldowns', target: 'Progressive', reps: '3 sets' },
        { name: 'Hammer Curls', target: 'Progressive', reps: '3 sets' },
        { name: 'Face Pulls', target: 'Rear Delts', reps: '3 sets', note: 'Fixes posture & makes chest look wider' },
        { name: 'Skull Crushers', target: 'Progressive', reps: '3 sets' },
        { name: 'The "Truth" Run', target: '240+ cal', reps: 'Empty the tank', note: '🔥 MAX EFFORT. Don\'t stop.' },
      ],
      upper2: [
        { name: 'Incline Machine Press', target: 'Heavy', reps: '3 sets', note: '🔥 Drop set on the LAST set only' },
        { name: 'Machine Rows', target: '50kg', reps: '3 sets' },
        { name: 'Pec Fly Machine', target: 'Squeeze', reps: '3 sets', note: 'Focus on the squeeze' },
        { name: 'Rear Delt Machine', target: 'Rear Delts', reps: '3 sets' },
        { name: 'Triceps', target: 'Progressive', reps: '3 sets' },
        { name: 'Machine Preacher Curls', target: 'Biceps', reps: '3 sets' },
        { name: 'DB Lateral Raises', target: 'Progressive', reps: '3 sets' },
        { name: 'Cardio', target: '15% Incline Walk', reps: '~150 cal', note: '🔥 Don\'t skip cardio!' },
      ],
      lower2: [
        { name: 'Leg Extensions', target: 'Progressive', reps: '3 sets' },
        { name: 'Leg Press', target: '100kg+', reps: '3 sets', note: '🔥 Push over 100kg to force growth hormone release' },
        { name: 'Calf Raises', target: 'Full range', reps: '3 sets' },
        { name: 'Weighted Cable Crunches', target: 'Progressive', reps: '3 sets' },
        { name: 'Hanging or Lying Leg Raises', target: 'Failure', reps: '3 sets' },
        { name: 'Cardio', target: '15% Incline Walk', reps: '~150 cal', note: '🔥 Don\'t skip cardio!' },
      ],
      rest1: [
        { name: 'Active Recovery Walk', target: 'Light Cardio', reps: '30 Mins', note: '🧘 Get moving, but recover.' },
      ],
      rest2: [
        { name: 'Active Recovery Walk', target: 'Light Cardio', reps: '30 Mins', note: '🧘 Get moving, but recover.' },
      ],
    },
  },
}

// Legacy references for backward compatibility
const split = workoutTemplates.ppl.split
const exercises = workoutTemplates.ppl.exercises

// ─── Progressive Overload Helper ────────────────────────────────────────────
function getOverloadSuggestion(exerciseName, workouts) {
  // Get the last N sessions where this exercise was logged
  const sessions = workouts
    .filter(w => w.exercises?.some(e => e.name === exerciseName))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 2)

  if (sessions.length < 2) return null

  // Check if both sessions hit >= 8 reps on at least 2 sets
  const allHitTarget = sessions.every(session => {
    const ex = session.exercises.find(e => e.name === exerciseName)
    if (!ex?.sets?.length) return false
    const goodSets = ex.sets.filter(s => Number(s.reps) >= 8)
    return goodSets.length >= 2
  })

  if (!allHitTarget) return null

  // Get current weight from latest session
  const latestEx = sessions[0].exercises.find(e => e.name === exerciseName)
  const currentWeight = Math.max(...latestEx.sets.map(s => Number(s.weight) || 0))
  if (currentWeight <= 0) return null

  return { currentWeight, suggestedWeight: currentWeight + 2.5 }
}

export default function Gym() {
  const todayISO = toISODate(startOfToday())
  const [selectedTemplate, setSelectedTemplate] = useLocalStorageState('zt.gym.template', 'ppl')
  const [anchorDate, setAnchorDate] = useLocalStorageState('zt.gym.anchorDate', todayISO)
  const [anchorIndex, setAnchorIndex] = useLocalStorageState('zt.gym.anchorIndex', 0)
  const [workouts, setWorkouts] = useLocalStorageState('zt.gym.workouts', [])
  const [photos, setPhotos] = useLocalStorageState('zt.gym.photos', [])
  const [streak, setStreak] = useLocalStorageState('zt.gym.streak', { lastDate: null, count: 0 })

  const [swapOpen, setSwapOpen] = useState(false)
  const [didKey, setDidKey] = useState(null)
  const [logExercise, setLogExercise] = useState(null)
  const [sets, setSets] = useState([{ weight: '', reps: '' }])
  const [notes, setNotes] = useState('')
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false)
  const [customWorkoutOpen, setCustomWorkoutOpen] = useState(false)
  const [customExerciseName, setCustomExerciseName] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [showVolumeChart, setShowVolumeChart] = useState(false)
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

  // ── Update streak ──────────────────────────────────────────────────────────
  function updateStreak() {
    const yesterday = toISODate(new Date(startOfToday().getTime() - 86400000))
    setStreak(prev => {
      if (prev.lastDate === todayISO) return prev // already counted today
      if (prev.lastDate === yesterday) return { lastDate: todayISO, count: (prev.count || 0) + 1 }
      return { lastDate: todayISO, count: 1 }
    })
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
    updateStreak()
    setLogExercise(null)
    setSets([{ weight: '', reps: '' }])
    setNotes('')
    setShowRestTimer(true) // Show rest timer after saving
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
    updateStreak()
    setCustomWorkoutOpen(false)
    setCustomExerciseName('')
    setSets([{ weight: '', reps: '' }])
    setNotes('')
    setShowRestTimer(true)
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

  // Streak display helpers
  const streakCount = streak?.count || 0
  const streakFlame = streakCount >= 7 ? '🔥🔥' : streakCount >= 3 ? '🔥' : '💪'

  return (
    <div className="space-y-4">
      {/* Rest Timer overlay */}
      {showRestTimer && <RestTimer onDismiss={() => setShowRestTimer(false)} />}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold tracking-wide text-slate-400">V-TAPER GYM LOG <span className="ml-1 text-emerald-500">v2.0 (Daily Cardio)</span></div>
              {/* Streak Badge */}
              {streakCount > 0 && (
                <div className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-950/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                  {streakFlame} {streakCount}d streak
                </div>
              )}
            </div>
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
          Adjust Schedule / Wrong Day?
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
              const overload = getOverloadSuggestion(ex.name, workouts)
              return (
                <div key={ex.name} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-100">{ex.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        Target: {ex.target} • {ex.reps} reps
                      </div>
                      {ex.note && <div className="mt-1 text-xs text-emerald-400">{ex.note}</div>}
                      {/* Progressive Overload suggestion */}
                      {overload && (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <TrendingUp className="h-3 w-3" />
                          Ready to level up! Try {overload.suggestedWeight}kg (+2.5kg)
                        </div>
                      )}
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

      {/* Volume Chart Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <button
          type="button"
          onClick={() => setShowVolumeChart(v => !v)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
            <BarChart2 className="h-4 w-4 text-emerald-400" />
            WEEKLY VOLUME CHART
          </div>
          {showVolumeChart ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        {showVolumeChart && <VolumeChart workouts={workouts} />}
        {!showVolumeChart && (
          <div className="mt-1 text-xs text-slate-600">Tap to see your weekly lifting volume trend</div>
        )}
      </div>

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

            {/* Progressive Overload suggestion in modal */}
            {(() => {
              const overload = getOverloadSuggestion(logExercise.name, workouts)
              if (!overload) return null
              return (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2">
                  <div>
                    <div className="text-xs font-bold text-emerald-400">🔥 Progressive Overload Ready!</div>
                    <div className="text-xs text-slate-400">You've hit target reps 2 sessions in a row</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSets(sets.map(s => ({ ...s, weight: String(overload.suggestedWeight) })))}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-emerald-400 whitespace-nowrap"
                  >
                    Use {overload.suggestedWeight}kg
                  </button>
                </div>
              )
            })()}

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
    </div>
  )
}
