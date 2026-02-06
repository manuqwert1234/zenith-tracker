import { useEffect, useMemo, useRef, useState } from 'react'
import { MinusCircle, PlusCircle, UtensilsCrossed, History, Trash2, Plus, X } from 'lucide-react'

function toISODate(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseISODate(iso) {
  // Interpret as local date (not UTC) to avoid timezone shifts.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function daysRemainingInclusive(endDateISO) {
  const end = parseISODate(endDateISO)
  if (!end) return 1
  const today = startOfToday()
  const endStart = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const diffMs = endStart.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  return Math.max(1, diffDays + 1)
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

const defaultQuickButtons = [
  { key: 'chicken', label: 'Chicken Tikka', amount: 105 },
  { key: 'eggs', label: 'Boiled Eggs (2)', amount: 24 },
  { key: 'idly', label: 'Idly', amount: 20 },
  { key: 'yogurt', label: 'Greek Yogurt', amount: 60 },
]

export default function Budget({ onCheatToast }) {
  const todayISO = toISODate(startOfToday())
  const defaultMonthEnd = useMemo(() => {
    const now = new Date()
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return toISODate(last)
  }, [])

  const [balance, setBalance] = useLocalStorageState('zt.balance', 6787)
  const [monthEndDate, setMonthEndDate] = useLocalStorageState('zt.monthEndDate', defaultMonthEnd)
  const [transactions, setTransactions] = useLocalStorageState('zt.transactions', [])
  const [customButtons, setCustomButtons] = useLocalStorageState('zt.customButtons', [])

  const [cheatAmount, setCheatAmount] = useState('')
  const [cheatNote, setCheatNote] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showAddButton, setShowAddButton] = useState(false)
  const [newButtonLabel, setNewButtonLabel] = useState('')
  const [newButtonAmount, setNewButtonAmount] = useState('')
  const cheatAmountRef = useRef(null)

  const daysLeft = useMemo(() => daysRemainingInclusive(monthEndDate), [monthEndDate])
  const dailyLimit = useMemo(() => (daysLeft > 0 ? balance / daysLeft : balance), [balance, daysLeft])

  const todaysSpend = useMemo(() => {
    return (transactions || [])
      .filter((t) => t?.date === todayISO)
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0)
  }, [transactions, todayISO])

  const overLimit = todaysSpend > dailyLimit + 0.0001

  const allQuickButtons = [...defaultQuickButtons, ...customButtons]

  function addTxn(label, amount, meta = {}) {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) return

    setBalance((b) => Math.max(0, Number(b || 0) - amt))
    setTransactions((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      {
        id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date: todayISO,
        label,
        amount: amt,
        ...meta,
      },
    ])
  }

  function deleteTransaction(txnId) {
    const txn = transactions.find((t) => t.id === txnId)
    if (!txn) return

    // Add the amount back to balance
    setBalance((b) => Number(b || 0) + Number(txn.amount))
    // Remove from transactions
    setTransactions((prev) => prev.filter((t) => t.id !== txnId))
  }

  function onQuickClick(item) {
    addTxn(item.label, item.amount, { type: 'food', priceTag: item.key })
  }

  function onLogCheat() {
    const amt = Number(cheatAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      cheatAmountRef.current?.focus?.()
      return
    }
    const before = dailyLimit
    addTxn(cheatNote?.trim() ? `Cheat Meal — ${cheatNote.trim()}` : 'Cheat Meal', amt, { type: 'cheat' })

    // Toast message uses per-day impact for the remaining days.
    const perDayDrop = Math.round(amt / Math.max(1, daysLeft))
    const msg = `Daily limit dropped by ₹${perDayDrop} for the rest of the month.`
    onCheatToast?.(msg, { beforeDailyLimit: before, amount: amt, daysLeft })

    setCheatAmount('')
    setCheatNote('')
  }

  function addCustomButton() {
    const amt = Number(newButtonAmount)
    if (!newButtonLabel.trim() || !Number.isFinite(amt) || amt <= 0) return

    const newButton = {
      key: `custom-${Date.now()}`,
      label: newButtonLabel.trim(),
      amount: amt,
    }

    setCustomButtons((prev) => [...prev, newButton])
    setNewButtonLabel('')
    setNewButtonAmount('')
    setShowAddButton(false)
  }

  function deleteCustomButton(key) {
    setCustomButtons((prev) => prev.filter((b) => b.key !== key))
  }

  const todayTransactions = transactions.filter((t) => t?.date === todayISO).reverse()

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-400">ZENITH DAILY LIMIT</div>
            <div className="mt-1 text-3xl font-extrabold text-emerald-400">
              ₹{Math.floor(dailyLimit).toLocaleString('en-IN')}
              <span className="text-base font-semibold text-slate-400"> / day</span>
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Balance ₹{Number(balance || 0).toLocaleString('en-IN')} • {daysLeft} day{daysLeft === 1 ? '' : 's'} left
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-sm">
            <UtensilsCrossed className="h-4 w-4 text-emerald-400" />
            <div className="text-slate-300">
              Today: <span className={overLimit ? 'font-bold text-rose-400' : 'font-semibold text-slate-100'}>
                ₹{Math.round(todaysSpend).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {overLimit ? (
          <div className="mt-3 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
            You're over today's limit by ₹{Math.ceil(todaysSpend - dailyLimit).toLocaleString('en-IN')}.
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-400">
            Stay under ₹{Math.floor(dailyLimit).toLocaleString('en-IN')} today to keep the month on track.
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"
        >
          <History className="h-3 w-3" />
          {showHistory ? 'Hide' : 'Show'} Today's History ({todayTransactions.length})
        </button>
      </div>

      {showHistory && todayTransactions.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-xs font-semibold tracking-wide text-slate-400">TODAY'S TRANSACTIONS</div>
          <div className="mt-3 space-y-2">
            {todayTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-100">{txn.label}</div>
                  <div className="text-xs text-slate-500">₹{txn.amount}</div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTransaction(txn.id)}
                  className="rounded-lg p-1.5 text-rose-400 hover:bg-slate-800"
                  aria-label="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-400">WALLET & MONTH END</div>
            <div className="mt-1 text-sm text-slate-300">Adjust anytime; everything persists on refresh.</div>
          </div>
          <button
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            onClick={() => {
              setBalance(6787)
              setMonthEndDate(defaultMonthEnd)
              setTransactions([])
            }}
            type="button"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-xs font-semibold text-slate-400">Current Wallet Balance (₹)</div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
              <button
                type="button"
                className="rounded-lg p-1 text-slate-300 hover:bg-slate-800"
                onClick={() => setBalance((b) => Math.max(0, Number(b || 0) - 50))}
                aria-label="Decrease balance"
              >
                <MinusCircle className="h-5 w-5" />
              </button>
              <input
                className="w-full bg-transparent text-right text-sm font-semibold text-slate-100 outline-none"
                inputMode="numeric"
                value={String(balance ?? '')}
                onChange={(e) => setBalance(Number(e.target.value || 0))}
              />
              <button
                type="button"
                className="rounded-lg p-1 text-slate-300 hover:bg-slate-800"
                onClick={() => setBalance((b) => Number(b || 0) + 50)}
                aria-label="Increase balance"
              >
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>
          </label>

          <label className="space-y-1">
            <div className="text-xs font-semibold text-slate-400">Month End Date</div>
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none"
              type="date"
              value={monthEndDate}
              onChange={(e) => setMonthEndDate(e.target.value)}
              min={todayISO}
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold tracking-wide text-slate-400">QUICK LOG</div>
          <button
            type="button"
            onClick={() => setShowAddButton(!showAddButton)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-xs font-extrabold text-slate-900 hover:bg-emerald-400"
          >
            <Plus className="h-3 w-3" />
            Add Food
          </button>
        </div>

        {showAddButton && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
            <div className="text-xs font-semibold text-slate-300">Create Custom Button</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                placeholder="Name"
                value={newButtonLabel}
                onChange={(e) => setNewButtonLabel(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none"
              />
              <input
                placeholder="₹"
                inputMode="numeric"
                value={newButtonAmount}
                onChange={(e) => setNewButtonAmount(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowAddButton(false)}
                className="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addCustomButton}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-emerald-400"
              >
                Save Button
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          {allQuickButtons.map((item) => (
            <div key={item.key} className="relative">
              <button
                type="button"
                onClick={() => onQuickClick(item)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-4 text-left hover:bg-slate-900/70 active:scale-[0.99]"
              >
                <div className="text-sm font-bold text-slate-100">{item.label}</div>
                <div className="mt-1 text-xs font-semibold text-emerald-400">₹{item.amount}</div>
              </button>
              {item.key.startsWith('custom-') && (
                <button
                  type="button"
                  onClick={() => deleteCustomButton(item.key)}
                  className="absolute -right-1 -top-1 rounded-full bg-slate-900 p-1 text-rose-400 hover:bg-slate-800"
                  aria-label="Delete button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
          <div className="text-xs font-semibold tracking-wide text-slate-400">CHEAT MEAL (CUSTOM)</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input
              ref={cheatAmountRef}
              className="col-span-1 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-100 outline-none"
              placeholder="₹400"
              inputMode="numeric"
              value={cheatAmount}
              onChange={(e) => setCheatAmount(e.target.value)}
            />
            <input
              className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none"
              placeholder="Optional note (e.g., Domino's)"
              value={cheatNote}
              onChange={(e) => setCheatNote(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={onLogCheat}
            className="mt-2 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-emerald-400 active:scale-[0.99]"
          >
            Log Cheat Meal
          </button>
        </div>
      </div>
    </div>
  )
}



