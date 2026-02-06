import { useEffect, useMemo, useState } from 'react'
import { Activity, Dumbbell, PiggyBank, Settings, Bell, BellOff, Download, Upload, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import Budget from './components/Budget.jsx'
import Gym from './components/Gym.jsx'
import { requestNotificationPermission, notifyCheatMeal, notifyOverspending } from './utils/notifications.js'
import { exportAllToExcel, importFromExcel } from './utils/exportUtils.js'
import { initializeAuth, performInitialSync, syncAll, fetchAll, isSyncEnabled, signInWithGoogle } from './services/firebaseSync.js'
import { getAuth } from 'firebase/auth'

function getAuthUser() {
  return getAuth().currentUser
}

function GoogleSignInButton({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false)
  const user = getAuthUser()

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result.success) {
        onSuccess?.(result.user, result.method)
      } else {
        onError?.(result.error)
      }
    } catch (err) {
      onError?.(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (user && !user.isAnonymous) {
    return (
      <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-4 py-3 text-center text-sm font-semibold text-emerald-400">
        ✓ Linked to Google ({user.email})
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 active:scale-[0.99] disabled:opacity-70"
    >
      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      Sign in to Save Cloud Data
    </button>
  )
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
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, synced, error
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Initialize Firebase on mount
  useEffect(() => {
    async function setupFirebase() {
      try {
        await initializeAuth()
        // Perform initial sync if needed
        const result = await performInitialSync()
        if (result.success && !result.alreadySynced) {
          setToast(`🔄 Initial sync: ${result.message}`)
        }
      } catch (error) {
        console.error('Firebase setup failed:', error)
        // App still works offline with localStorage
      }
    }
    setupFirebase()
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setToast('🟢 Back online')
    }
    function handleOffline() {
      setIsOnline(false)
      setToast('🔴 Offline - changes saved locally')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  function handleExport() {
    const result = exportAllToExcel()
    if (result.success) {
      setToast(`✓ ${result.message}`)
    } else {
      setToast(`✗ ${result.message}`)
    }
  }

  async function handleSyncToCloud() {
    if (!isSyncEnabled()) {
      setToast('❌ Cannot sync: offline or Firebase not configured')
      return
    }

    setSyncStatus('syncing')
    setToast('🔄 Syncing to cloud...')

    const result = await syncAll()

    if (result.success) {
      setSyncStatus('synced')
      setToast(`✓ ${result.message}`)
      setTimeout(() => setSyncStatus('idle'), 3000)
    } else {
      setSyncStatus('error')
      setToast(`❌ Sync failed: ${result.message}`)
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  async function handleFetchFromCloud() {
    if (!isSyncEnabled()) {
      setToast('❌ Cannot fetch: offline or Firebase not configured')
      return
    }

    setSyncStatus('syncing')
    setToast('🔄 Fetching from cloud...')

    const result = await fetchAll()

    if (result.success) {
      setSyncStatus('synced')
      setToast(`✓ ${result.message}`)
      setTimeout(() => setSyncStatus('idle'), 3000)
      // Reload page to show fetched data
      window.location.reload()
    } else {
      setSyncStatus('error')
      setToast(`❌ Fetch failed: ${result.message}`)
      setTimeout(() => setSyncStatus('idle'), 3000)
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
            <div className="flex items-center gap-2">
              <div className="text-sm font-extrabold tracking-tight text-slate-50">ZenithTracker</div>
              {isOnline && isSyncEnabled() ? (
                <Cloud className="h-3 w-3 text-emerald-400" title="Connected to cloud" />
              ) : (
                <CloudOff className="h-3 w-3 text-slate-500" title="Offline mode" />
              )}
            </div>
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

              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-emerald-400 active:scale-[0.99]"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm font-extrabold text-emerald-300 hover:bg-emerald-950/40 active:scale-[0.99] cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Import
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          const result = await importFromExcel(file)
                          if (result.success) {
                            setToast(`✓ ${result.message}`)
                            window.location.reload()
                          } else {
                            setToast(`❌ ${result.message}`)
                          }
                        } catch (err) {
                          setToast(`❌ Import failed: ${err.message}`)
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSyncToCloud}
                    disabled={syncStatus === 'syncing' || !isOnline}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm font-extrabold text-emerald-300 hover:bg-emerald-950/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncStatus === 'syncing' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    Sync to Cloud
                  </button>

                  <button
                    type="button"
                    onClick={handleFetchFromCloud}
                    disabled={syncStatus === 'syncing' || !isOnline}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm font-extrabold text-slate-200 hover:bg-slate-900 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncStatus === 'syncing' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Fetch from Cloud
                  </button>
                </div>

                <GoogleSignInButton
                  onSuccess={(user, method) => {
                    setToast(`✓ ${method === 'linked' ? 'Linked to' : 'Signed in as'} ${user.displayName || user.email}`)
                    // Auto-sync after login
                    handleSyncToCloud()
                  }}
                  onError={(msg) => setToast(`❌ ${msg}`)}
                />

                <div className="text-xs text-slate-500">
                  {isOnline && isSyncEnabled() ? (
                    <span className="text-emerald-400">● Connected to Firebase</span>
                  ) : (
                    <span>○ Offline - Data saved locally</span>
                  )}
                  {/* Debug Info for User */}
                  <div className="mt-1 text-[10px] text-slate-600 font-mono">
                    UID: {getAuthUser()?.uid?.slice(0, 8)}...
                  </div>
                </div>
              </div>
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
