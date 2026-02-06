import { useEffect, useMemo, useRef, useState } from 'react'
import { MinusCircle, PlusCircle, UtensilsCrossed, History, Trash2, Plus, X, Calendar, Beef, AlertTriangle, Target } from 'lucide-react'
import { foodDatabase, PROTEIN_GOAL, CALORIE_GOAL, quickAddItems } from '../config/foods'

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

  // Protein tracking state
  const [proteinLog, setProteinLog] = useLocalStorageState('zt.proteinLog', [])
  const [showProteinModal, setShowProteinModal] = useState(false)
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('all')

  const [cheatAmount, setCheatAmount] = useState('')
  const [cheatNote, setCheatNote] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showAddButton, setShowAddButton] = useState(false)
  const [newButtonLabel, setNewButtonLabel] = useState('')
  const [newButtonAmount, setNewButtonAmount] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayISO) // For logging on past dates
  const cheatAmountRef = useRef(null)

  const daysLeft = useMemo(() => daysRemainingInclusive(monthEndDate), [monthEndDate])
  const dailyLimit = useMemo(() => (daysLeft > 0 ? balance / daysLeft : balance), [balance, daysLeft])

  // Protein tracking computed values
  const todaysProtein = useMemo(() => {
    return (proteinLog || [])
      .filter((p) => p?.date === todayISO)
      .reduce((sum, p) => sum + (Number(p?.protein) || 0), 0)
  }, [proteinLog, todayISO])

  const todaysCalories = useMemo(() => {
    return (proteinLog || [])
      .filter((p) => p?.date === todayISO)
      .reduce((sum, p) => sum + (Number(p?.calories) || 0), 0)
  }, [proteinLog, todayISO])

  const proteinProgress = Math.min((todaysProtein / PROTEIN_GOAL) * 100, 100)

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

    // Only deduct from balance if entry is for today
    if (selectedDate === todayISO) {
      setBalance((b) => Math.max(0, Number(b || 0) - amt))
    }

    setTransactions((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      {
        id: crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date: selectedDate, // Use selected date instead of always today
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

  // Protein tracking functions
  function logFood(foodKey, quantity = 1) {
    const food = foodDatabase[foodKey]
    if (!food) return

    const entry = {
      id: `food-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: todayISO,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      foodKey,
      name: food.name,
      protein: food.protein * quantity,
      calories: food.calories * quantity,
      quantity,
      unit: food.unit,
      emoji: food.emoji,
    }

    setProteinLog((prev) => [...prev, entry])
    setShowProteinModal(false)
  }

  function deleteProteinEntry(entryId) {
    setProteinLog((prev) => prev.filter((p) => p.id !== entryId))
  }

  const todaysProteinLog = (proteinLog || []).filter((p) => p?.date === todayISO).reverse()

  // Get unique categories from food database
  const foodCategories = [...new Set(Object.values(foodDatabase).map(f => f.category))]

  const selectedDateTransactions = transactions.filter((t) => t?.date === selectedDate).reverse()
  const isViewingToday = selectedDate === todayISO

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
          {showHistory ? 'Hide' : 'Show'} {isViewingToday ? "Today's" : selectedDate} History ({selectedDateTransactions.length})
        </button>
      </div>

      {/* PROTOCOL 90 PROTEIN TRACKER */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-400">
              <Beef className="h-4 w-4" />
              PROTEIN TRACKER • PROTOCOL 90
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-50">{Math.round(todaysProtein)}g</span>
              <span className="text-sm text-slate-400">/ {PROTEIN_GOAL}g goal</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Calories</div>
            <div className={`text-lg font-bold ${todaysCalories > CALORIE_GOAL ? 'text-rose-400' : 'text-slate-300'}`}>
              {Math.round(todaysCalories)} kcal
            </div>
            <div className="text-[10px] text-slate-500">/ {CALORIE_GOAL} limit</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-300 ${todaysProtein >= PROTEIN_GOAL
                  ? 'bg-emerald-500'
                  : todaysProtein >= PROTEIN_GOAL * 0.7
                    ? 'bg-amber-500'
                    : 'bg-amber-700'
                }`}
              style={{ width: `${proteinProgress}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>{Math.round(proteinProgress)}% of daily goal</span>
            <span>{Math.round(PROTEIN_GOAL - todaysProtein)}g remaining</span>
          </div>
        </div>

        {/* Quick add buttons */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-400 mb-2">QUICK ADD</div>
          <div className="grid grid-cols-3 gap-2">
            {quickAddItems.map((foodKey) => {
              const food = foodDatabase[foodKey]
              if (!food) return null
              return (
                <button
                  key={foodKey}
                  type="button"
                  onClick={() => logFood(foodKey)}
                  className="rounded-xl border border-slate-700 bg-slate-900/50 px-2 py-2.5 text-left hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{food.emoji}</span>
                    <span className="text-xs font-semibold text-slate-200 truncate">{food.name}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-emerald-400 font-bold">{food.protein}g protein</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* View all foods button */}
        <button
          type="button"
          onClick={() => setShowProteinModal(true)}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          <Plus className="inline h-4 w-4 mr-1" /> Add All Foods
        </button>

        {/* Today's food log */}
        {todaysProteinLog.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-400 mb-2">TODAY'S LOG ({todaysProteinLog.length})</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todaysProteinLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span>{entry.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{entry.name}</div>
                      <div className="text-[10px] text-slate-500">{entry.time} • {entry.quantity} {entry.unit}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">{entry.protein}g</div>
                      <div className="text-[10px] text-slate-500">{entry.calories} kcal</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteProteinEntry(entry.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Food Selection Modal */}
      {showProteinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <div className="text-lg font-bold text-slate-100">Add Food</div>
              <button type="button" onClick={() => setShowProteinModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedFoodCategory('all')}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${selectedFoodCategory === 'all' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'
                  }`}
              >
                All
              </button>
              {foodCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedFoodCategory(cat)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${selectedFoodCategory === cat ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'
                    }`}
                >
                  {cat === 'danger' ? '⚠️ Danger' : cat}
                </button>
              ))}
            </div>

            {/* Food list */}
            <div className="max-h-[55vh] overflow-y-auto p-4 space-y-2">
              {Object.entries(foodDatabase)
                .filter(([, food]) => selectedFoodCategory === 'all' || food.category === selectedFoodCategory)
                .map(([key, food]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => logFood(key)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all hover:scale-[0.99] active:scale-[0.97] ${food.category === 'danger'
                        ? 'border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/30'
                        : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{food.emoji}</span>
                        <div>
                          <div className="font-semibold text-slate-100">{food.name}</div>
                          <div className="text-xs text-slate-400">{food.unit}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400">{food.protein}g</div>
                        <div className="text-xs text-slate-500">{food.calories} kcal</div>
                      </div>
                    </div>
                    {food.warning && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-rose-400">
                        <AlertTriangle className="h-3 w-3" />
                        {food.warning}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Date Picker for logging past entries */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-400">LOG DATE</div>
            <div className="mt-1 text-sm text-slate-300">Select a date to add or view entries</div>
          </div>
          {selectedDate !== todayISO && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayISO)}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-emerald-400"
            >
              Back to Today
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-emerald-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={todayISO}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-semibold text-slate-100 outline-none"
          />
        </div>
        {selectedDate !== todayISO && (
          <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
            📅 Logging for: {selectedDate} (entries won't affect today's balance)
          </div>
        )}
      </div>

      {showHistory && selectedDateTransactions.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-xs font-semibold tracking-wide text-slate-400">{isViewingToday ? "TODAY'S" : selectedDate} TRANSACTIONS</div>
          <div className="mt-3 space-y-2">
            {selectedDateTransactions.map((txn) => (
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
    </div >
  )
}



