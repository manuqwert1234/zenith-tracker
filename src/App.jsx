import { useEffect, useMemo, useState } from 'react'
import { Activity, Dumbbell, PiggyBank, Settings, Bell, BellOff, Download } from 'lucide-react'
import Budget from './components/Budget.jsx'
import Gym from './components/Gym.jsx'
import { requestNotificationPermission, notifyCheatMeal, notifyOverspending } from './utils/notifications.js'
import { exportAllToExcel } from './utils/exportUtils.js'

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

function toISODate(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function daysLeftInCurrentMonth() {
  const today = startOfToday()
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const end0 = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const diff = Math.floor((end0.getTime() - today.getTime()) / 86400000)
  return Math.max(0, diff)
}

function monthLabel() {
  const m = startOfToday().toLocaleString('en-US', { month: 'short' })
  return m
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
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-slate-300 hover:bg-slate-900"
            onClick={onClose}
            aria-label="Close toast"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [tab, setTab] = useLocalStorageState('zt.tab', 'budget')
  const [toast, setToast] = useState('')

  function handleExport() {
    const result = exportAllToExcel()
    if (result.success) {
      setToast(`✓ ${result.message}`)
    } else {
      setToast(`✗ ${result.message}`)
    }
  }

  const daysLeft = useMemo(() => daysLeftInCurrentMonth(), [])
  const month = useMemo(() => monthLabel(), [])
  const todayISO = useMemo(() => toISODate(startOfToday()), [])

  return (
    <div className="min-h-full bg-slate-900 text-slate-100">
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold tracking-tight text-slate-50">ZenithTracker</div>
            <div className="text-xs font-semibold text-slate-300">
              Days Left in {month}: <span className="text-emerald-400">{daysLeft}</span> | Goal:{' '}
              <span className="text-emerald-400">72kg</span>
            </div>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">Today: {todayISO}</div>
        </header>

        <main className="flex-1 space-y-4 px-4 py-4 pb-24">
          {tab === 'budget' ? (
            <Budget onCheatToast={(msg) => setToast(msg)} />
          ) : null}

          {tab === 'gym' ? <Gym /> : null}

          {tab === 'settings' ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs font-semibold tracking-wide text-slate-400">SETTINGS</div>
              <div className="mt-2 text-sm text-slate-300">
                This app persists everything to <span className="font-semibold text-slate-100">localStorage</span>.
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Tip: Install it from your browser menu (“Add to Home Screen”) for a cleaner phone experience.
              </div>

              <button
                type="button"
                onClick={handleExport}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-emerald-400 active:scale-[0.99]"
              >
                <Download className="h-4 w-4" />
                Export to Excel
              </button>
            </div>
          ) : null}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-800 bg-slate-950/80 px-2 py-2 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTab('budget')}
              className={[
                'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold',
                tab === 'budget'
                  ? 'bg-emerald-500 text-slate-900'
                  : 'bg-slate-900/50 text-slate-200 hover:bg-slate-900',
              ].join(' ')}
            >
              <PiggyBank className="h-4 w-4" />
              Budget
            </button>
            <button
              type="button"
              onClick={() => setTab('gym')}
              className={[
                'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold',
                tab === 'gym'
                  ? 'bg-emerald-500 text-slate-900'
                  : 'bg-slate-900/50 text-slate-200 hover:bg-slate-900',
              ].join(' ')}
            >
              <Dumbbell className="h-4 w-4" />
              Gym
            </button>
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={[
                'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-extrabold',
                tab === 'settings'
                  ? 'bg-emerald-500 text-slate-900'
                  : 'bg-slate-900/50 text-slate-200 hover:bg-slate-900',
              ].join(' ')}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}

export default App
