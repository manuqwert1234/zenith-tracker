import { useState } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { isSyncEnabled, signInWithGoogle, syncAll, fetchAll, getCurrentUser } from '../services/firebaseSync'

// Split into its own lazily-loaded chunk (see Settings.jsx) so the Firebase
// SDK is only ever downloaded by browsers where cloud sync is configured.
export default function CloudSyncSection({ onToast }) {
    const [syncStatus, setSyncStatus] = useState('idle')
    const user = getCurrentUser()

    async function handleSync() {
        setSyncStatus('syncing')
        const result = await syncAll()
        setSyncStatus(result.success ? 'synced' : 'error')
        onToast?.(result.success ? `✓ ${result.message}` : `❌ ${result.message}`)
        setTimeout(() => setSyncStatus('idle'), 2500)
    }

    async function handleFetch() {
        setSyncStatus('syncing')
        const result = await fetchAll()
        setSyncStatus(result.success ? 'synced' : 'error')
        onToast?.(result.success ? `✓ ${result.message}` : `❌ ${result.message}`)
        if (result.success) setTimeout(() => window.location.reload(), 1200)
        setTimeout(() => setSyncStatus('idle'), 2500)
    }

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400">
                {isSyncEnabled() ? <Cloud className="h-4 w-4 text-emerald-400" /> : <CloudOff className="h-4 w-4 text-slate-500" />}
                CLOUD SYNC (OPTIONAL)
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={handleSync} disabled={syncStatus === 'syncing'} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5 text-sm font-extrabold text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-50">
                    {syncStatus === 'syncing' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />} Sync Up
                </button>
                <button type="button" onClick={handleFetch} disabled={syncStatus === 'syncing'} className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-sm font-extrabold text-slate-200 hover:bg-slate-900 disabled:opacity-50">
                    {syncStatus === 'syncing' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudOff className="h-4 w-4" />} Fetch Down
                </button>
            </div>
            {user && !user.isAnonymous ? (
                <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-3 py-2 text-center text-xs font-semibold text-emerald-400">
                    ✓ Linked to Google ({user.email})
                </div>
            ) : (
                <button type="button" onClick={async () => {
                    const result = await signInWithGoogle()
                    onToast?.(result.success ? `✓ Signed in as ${result.user.displayName || result.user.email}` : `❌ ${result.error}`)
                }} className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100">
                    Sign in to sync across devices
                </button>
            )}
        </div>
    )
}
