import { useEffect, useMemo, useState } from 'react'
import { Flame, ListChecks, Settings as SettingsIcon, Activity, Dumbbell } from 'lucide-react'
import Today from './components/Today.jsx'
import Gym from './components/Gym.jsx'
import History from './components/History.jsx'
import SettingsPanel from './components/Settings.jsx'
import { isFirebaseConfigured } from './config/firebase.js'
import { DEFAULT_CALORIE_GOAL, DEFAULT_PROTEIN_GOAL, DEFAULT_CARB_GOAL, DEFAULT_FAT_GOAL } from './config/foods.js'
import { todayISO } from './utils/dates.js'

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

function defaultSettings() {
  return {
    calorieGoal: DEFAULT_CALORIE_GOAL,
    proteinGoal: DEFAULT_PROTEIN_GOAL,
    carbGoal: DEFAULT_CARB_GOAL,
    fatGoal: DEFAULT_FAT_GOAL,
    weightGoal: null,
    waterGoal: 2000,
  }
}

function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose?.(), 3200)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null
  return (
    <div className="fixed left-1/2 top-3 z-50 w-[92%] max-w-md -translate-x-1/2">
      <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/90 px-4 py-3 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-emerald-400" />
            <span>{message}</span>
          </div>
          <button type="button" className="rounded-lg px-2 py-1 text-slate-300 hover:bg-slate-900" onClick={onClose} aria-label="Close toast">×</button>
        </div>
      </div>
    </div>
  )
}

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [proteinGoal, setProteinGoal] = useState(100)
  const [weightGoal, setWeightGoal] = useState('')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-emerald-900/50 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Flame className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Welcome to CalTrack</h1>
          <p className="mt-2 text-sm text-slate-400">A simple, private calorie & nutrition log. Everything stays on this device.</p>
        </div>

        {step === 1 && (
          <div>
            <h2 className="mb-4 text-sm font-bold tracking-wide text-emerald-400">STEP 1 OF 2</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Daily Calorie Goal</label>
                <input
                  type="number"
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-4 text-center text-4xl font-black text-white outline-none focus:border-emerald-500"
                  inputMode="numeric"
                />
                <p className="mt-1 text-xs text-slate-500">Not sure? Use the calculator in Settings later — this is just a starting point.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400">Daily Protein Goal (g)</label>
                <input
                  type="number"
                  value={proteinGoal}
                  onChange={(e) => setProteinGoal(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                  inputMode="numeric"
                />
              </div>
            </div>
            <button onClick={() => setStep(2)} className="mt-8 w-full rounded-xl bg-emerald-500 py-4 text-sm font-black tracking-wide text-slate-950 hover:bg-emerald-400 active:scale-[0.98]">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-4 text-sm font-bold tracking-wide text-emerald-400">STEP 2 OF 2</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Weight Goal (kg, optional)</label>
                <input
                  type="number"
                  placeholder="Skip if you're not tracking weight"
                  value={weightGoal}
                  onChange={(e) => setWeightGoal(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 placeholder:text-slate-600"
                  inputMode="decimal"
                />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
                You'll be able to log food with photos, track activity, set meal reminders, and export everything (including an AI-friendly summary) later from Settings and History.
              </div>
            </div>
            <button
              onClick={() => onComplete({
                calorieGoal: Number(calorieGoal) || DEFAULT_CALORIE_GOAL,
                proteinGoal: Number(proteinGoal) || DEFAULT_PROTEIN_GOAL,
                carbGoal: DEFAULT_CARB_GOAL,
                fatGoal: DEFAULT_FAT_GOAL,
                weightGoal: weightGoal ? Number(weightGoal) : null,
              })}
              className="mt-8 w-full rounded-xl bg-emerald-500 py-4 text-sm font-black tracking-wide text-slate-950 hover:bg-emerald-400 active:scale-[0.98]"
            >
              Start Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [tab, setTab] = useLocalStorageState('ct.tab', 'today')
  const [toast, setToast] = useState('')
  const [onboardingComplete, setOnboardingComplete] = useLocalStorageState('ct.onboardingComplete', false)
  const [settings, setSettings] = useLocalStorageState('ct.settings', defaultSettings())

  // Protect existing users (from a pre-onboarding version) from re-seeing onboarding
  useEffect(() => {
    if (!onboardingComplete) {
      const hasFoodLog = JSON.parse(localStorage.getItem('ct.foodLog') || '[]').length > 0
      if (hasFoodLog) setOnboardingComplete(true)
    }
  }, [onboardingComplete, setOnboardingComplete])

  // Cloud sync is entirely inert unless a Firebase project is configured (.env).
  // The Firebase SDK is dynamically imported here so browsers with no cloud
  // sync configured never download it at all.
  useEffect(() => {
    if (!isFirebaseConfigured()) return
    async function setupFirebase() {
      try {
        const { initializeAuth, performInitialSync } = await import('./services/firebaseSync.js')
        await initializeAuth()
        const result = await performInitialSync()
        if (result.success && !result.alreadySynced) {
          setToast(`🔄 Initial sync: ${result.message}`)
        }
      } catch (error) {
        console.error('Firebase setup failed:', error)
      }
    }
    setupFirebase()
  }, [])

  const today = useMemo(() => todayISO(), [])

  if (!onboardingComplete) {
    return (
      <Onboarding
        onComplete={(newSettings) => {
          setSettings(newSettings)
          setOnboardingComplete(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-full bg-slate-900 text-slate-100">
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-emerald-400" />
              <div className="text-sm font-extrabold tracking-tight text-slate-50">CalTrack</div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500">{today}</div>
          </div>
        </header>

        <main className="flex-1 space-y-4 px-4 py-4 pb-24">
          {tab === 'today' && <Today settings={settings} onToast={setToast} />}
          {tab === 'gym' && <Gym onToast={setToast} />}
          {tab === 'history' && <History settings={settings} onToast={setToast} />}
          {tab === 'settings' && <SettingsPanel settings={settings} setSettings={setSettings} onToast={setToast} />}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-800 bg-slate-950/80 px-2 py-2 backdrop-blur">
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setTab('today')}
              className={['flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-extrabold', tab === 'today' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-900/50 text-slate-200 hover:bg-slate-900'].join(' ')}
            >
              <Activity className="h-4 w-4" /> Today
            </button>
            <button
              type="button"
              onClick={() => setTab('gym')}
              className={['flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-extrabold', tab === 'gym' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-900/50 text-slate-200 hover:bg-slate-900'].join(' ')}
            >
              <Dumbbell className="h-4 w-4" /> Gym
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={['flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-extrabold', tab === 'history' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-900/50 text-slate-200 hover:bg-slate-900'].join(' ')}
            >
              <ListChecks className="h-4 w-4" /> History
            </button>
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={['flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-extrabold', tab === 'settings' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-900/50 text-slate-200 hover:bg-slate-900'].join(' ')}
            >
              <SettingsIcon className="h-4 w-4" /> Settings
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}

export default App
