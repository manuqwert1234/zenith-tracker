import { useEffect, useMemo, useRef, useState } from 'react'
import { MinusCircle, PlusCircle, UtensilsCrossed, History, Trash2, Plus, X, Calendar, Beef, AlertTriangle, Target, Pencil, Save } from 'lucide-react'
import { foodDatabase as initialFoodDatabase, PROTEIN_GOAL, CALORIE_GOAL, quickAddItems } from '../config/foods'

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


  // Protein tracking state
  const [proteinLog, setProteinLog] = useLocalStorageState('zt.proteinLog', [])
  const [showProteinModal, setShowProteinModal] = useState(false)
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('all')

  const [cheatAmount, setCheatAmount] = useState('')
  const [cheatNote, setCheatNote] = useState('')
  const [showHistory, setShowHistory] = useState(false)


  // Custom Foods Logic
  const [customFoods, setCustomFoods] = useLocalStorageState('zt.customFoods', {})
  const foodDatabase = useMemo(() => {
    return { ...initialFoodDatabase, ...customFoods }
  }, [customFoods])

  const [isCreatingFood, setIsCreatingFood] = useState(false)
  const [editingFoodKey, setEditingFoodKey] = useState(null)
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '',
    protein: '',
    calories: '',
    price: '',
    unit: '1 serving',
    emoji: '🍽️',
    category: 'custom'
  })

  function startEditFood(key, food) {
    setEditingFoodKey(key)
    setCustomFoodForm({
      name: food.name,
      protein: food.protein,
      calories: food.calories,
      price: food.price || '',
      unit: food.unit,
      emoji: food.emoji,
      category: food.category || 'custom'
    })
    setIsCreatingFood(true)
  }

  function saveCustomFood() {
    if (!customFoodForm.name || !customFoodForm.protein) return

    const key = editingFoodKey || `custom_${Date.now()}`
    const newFood = {
      ...customFoodForm,
      protein: Number(customFoodForm.protein),
      calories: Number(customFoodForm.calories || 0),
      price: Number(customFoodForm.price || 0),
      category: customFoodForm.category || 'custom'
    }

    setCustomFoods(prev => ({ ...prev, [key]: newFood }))

    // Reset
    setIsCreatingFood(false)
    setEditingFoodKey(null)
    setCustomFoodForm({
      name: '',
      protein: '',
      calories: '',
      price: '',
      unit: '1 serving',
      emoji: '🍽️',
      category: 'custom'
    })
  }

  function deleteCustomFood(key) {
    if (!window.confirm('Delete this food?')) return
    setCustomFoods(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    // If we just deleted what we were editing
    if (editingFoodKey === key) {
      setIsCreatingFood(false)
      setEditingFoodKey(null)
    }
  }

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





  // Protein tracking functions
  function logFood(foodKey, quantity = 1) {
    const food = foodDatabase[foodKey]
    if (!food) return

    const entry = {
      id: `food-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: selectedDate, // Use selected date
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

    // Auto-deduct from budget
    const cost = (food.price || 0) * quantity
    if (cost > 0) {
      const newTransaction = {
        id: Date.now(),
        amount: -cost,
        type: 'expense',
        category: 'Food',
        label: `${food.emoji} ${food.name} (${quantity > 1 ? quantity + 'x' : ''})`,
        date: selectedDate,
      }
      setTransactions((prev) => [newTransaction, ...prev])
      setBalance((prev) => Math.max(0, (prev || 0) - cost))
    }
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

        {showHistory && selectedDateTransactions.length > 0 && (
          <div className="mt-4 border-t border-slate-800 pt-3">
            <div className="text-xs font-semibold tracking-wide text-slate-500 mb-2">{isViewingToday ? "TODAY'S" : selectedDate} TRANSACTIONS</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedDateTransactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-100">{txn.label || txn.description}</div>
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
      </div>



      {/* Food Selection Modal */}
      {showProteinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3 shrink-0">
              <div className="text-lg font-bold text-slate-100">
                {isCreatingFood ? (editingFoodKey ? 'Edit Food' : 'Create Custom Food') : 'Add Food'}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isCreatingFood) {
                    setIsCreatingFood(false)
                    setEditingFoodKey(null)
                  } else {
                    setShowProteinModal(false)
                  }
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isCreatingFood ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Emoji</label>
                      <input
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-center text-xl outline-none"
                        value={customFoodForm.emoji}
                        onChange={e => setCustomFoodForm({ ...customFoodForm, emoji: e.target.value })}
                        maxLength={2}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Food Name *</label>
                      <input
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                        placeholder="e.g. Protein Bar"
                        value={customFoodForm.name}
                        onChange={e => setCustomFoodForm({ ...customFoodForm, name: e.target.value })}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Protein (g) *</label>
                      <input
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none"
                        type="number"
                        placeholder="0"
                        value={customFoodForm.protein}
                        onChange={e => setCustomFoodForm({ ...customFoodForm, protein: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Calories</label>
                      <input
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none"
                        type="number"
                        placeholder="0"
                        value={customFoodForm.calories}
                        onChange={e => setCustomFoodForm({ ...customFoodForm, calories: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Price (₹)</label>
                      <input
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none"
                        type="number"
                        placeholder="0"
                        value={customFoodForm.price}
                        onChange={e => setCustomFoodForm({ ...customFoodForm, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Unit</label>
                      <input
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none"
                        placeholder="1 serving"
                        value={customFoodForm.unit}
                        onChange={e => setCustomFoodForm({ ...customFoodForm, unit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={saveCustomFood}
                    disabled={!customFoodForm.name || !customFoodForm.protein}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" /> Save Food
                  </button>
                  {editingFoodKey && (
                    <button
                      onClick={() => deleteCustomFood(editingFoodKey)}
                      className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 pt-3 pb-0">
                  <button
                    onClick={() => {
                      setEditingFoodKey(null)
                      setCustomFoodForm({
                        name: '',
                        protein: '',
                        calories: '',
                        price: '',
                        unit: '1 serving',
                        emoji: '🍽️',
                        category: 'custom'
                      })
                      setIsCreatingFood(true)
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Create Custom Food
                  </button>
                </div>

                {/* Category filter */}
                <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-slate-800 shrink-0">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {Object.entries(foodDatabase)
                    .filter(([, food]) => selectedFoodCategory === 'all' || (food.category || 'custom') === selectedFoodCategory)
                    .map(([key, food]) => (
                      <div
                        key={key}
                        className={`group relative w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${food.category === 'danger'
                          ? 'border-rose-500/30 bg-rose-950/20'
                          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                          }`}
                      >
                        <button
                          className="absolute inset-0 w-full h-full"
                          onClick={() => logFood(key)}
                          aria-label={`Log ${food.name}`}
                        />
                        <div className="relative pointer-events-none flex items-center gap-3">
                          <span className="text-xl">{food.emoji}</span>
                          <div>
                            <div className="font-semibold text-slate-100">{food.name}</div>
                            <div className="text-xs text-slate-400">{food.unit}</div>
                          </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-3">
                          <div className="text-right pointer-events-none">
                            <div className="text-sm font-bold text-emerald-400">{food.protein}g</div>
                            <div className="text-[10px] text-slate-500">{food.calories} kcal • ₹{food.price || 0}</div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditFood(key, food)
                            }}
                            className="rounded-lg p-2 text-slate-500 hover:text-amber-400 hover:bg-slate-700/50 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
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
        <div className="space-y-4 pb-2">
          {/* Header & Stats */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-400">
                <UtensilsCrossed className="h-4 w-4" />
                QUICK LOG & TRACKER
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-50">{Math.round(todaysProtein)}g</span>
                <span className="text-sm font-semibold text-slate-400">/ {PROTEIN_GOAL}g protein</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500 mb-1">Calories</div>
              <div className={`text-lg font-bold ${todaysCalories > CALORIE_GOAL ? 'text-rose-400' : 'text-slate-300'}`}>
                {Math.round(todaysCalories)} kcal
              </div>
              <div className="text-[10px] text-slate-500 font-medium">/ {CALORIE_GOAL} limit</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-500 ${todaysProtein >= PROTEIN_GOAL
                  ? 'bg-emerald-500'
                  : todaysProtein >= PROTEIN_GOAL * 0.7
                    ? 'bg-amber-500'
                    : 'bg-amber-700'
                  }`}
                style={{ width: `${Math.min((todaysProtein / PROTEIN_GOAL) * 100, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-500">
              <span>{Math.round((todaysProtein / PROTEIN_GOAL) * 100)}% done</span>
              <span>{Math.max(0, Math.round(PROTEIN_GOAL - todaysProtein))}g left</span>
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          {quickAddItems.map((foodKey) => {
            const food = foodDatabase[foodKey]
            if (!food) return null
            return (
              <button
                key={foodKey}
                type="button"
                onClick={() => logFood(foodKey)}
                className="rounded-xl border border-slate-700 bg-slate-900/40 px-2 py-3 text-left hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg shrink-0">{food.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-100 leading-tight">{food.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {food.price > 0 && <span className="text-xs font-semibold text-emerald-400">₹{food.price}</span>}
                      <span className="text-[10px] text-slate-500">{food.protein}g pro</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowProteinModal(true)}
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
        >
          <Plus className="inline h-4 w-4 mr-1" /> Add All Foods / Custom
        </button>

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



