import { useMemo, useRef, useState } from 'react'
import { X, Search, Plus, Camera, Save, Star, Trash2, Minus, ChevronLeft } from 'lucide-react'
import { foodDatabase as builtInFoods } from '../config/foods'
import { savePhoto } from '../utils/photoStore'
import { generateId } from '../utils/id'

const CATEGORIES_ORDER = ['protein', 'dairy', 'carbs', 'fruit', 'vegetables', 'snacks', 'treats', 'custom']

function emptyCustomForm() {
    return { name: '', calories: '', protein: '', carbs: '', fat: '', unit: '1 serving', emoji: '🍽️', category: 'custom' }
}

/**
 * A single modal that covers the three ways someone logs food:
 *  - tap an existing food (built-in or their own custom foods)
 *  - create a new reusable custom food (optionally with a photo)
 *  - a bare-bones "just log calories" quick entry for something one-off
 *
 * onLog(entry) is called with a finished food-log entry to save.
 * onSaveCustomFood(id, food) persists a reusable food definition.
 */
export default function FoodEntryModal({
    open,
    onClose,
    customFoods,
    onSaveCustomFood,
    onDeleteCustomFood,
    pinnedFoods,
    onTogglePinned,
    recentNames,
    onLog,
    initialMode = 'browse',
}) {
    const [mode, setMode] = useState(initialMode) // 'browse' | 'create' | 'quantify'
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState('all')
    const [form, setForm] = useState(emptyCustomForm())
    const [editingKey, setEditingKey] = useState(null)
    const [photoFile, setPhotoFile] = useState(null)
    const [photoPreview, setPhotoPreview] = useState(null)
    const fileInputRef = useRef(null)

    // Quantify step: chosen food + quantity + notes + optional per-instance photo
    const [selectedFood, setSelectedFood] = useState(null) // { key, food }
    const [quantity, setQuantity] = useState(1)
    const [notes, setNotes] = useState('')
    const [tags, setTags] = useState('')
    const [instancePhotoFile, setInstancePhotoFile] = useState(null)
    const [instancePhotoPreview, setInstancePhotoPreview] = useState(null)

    const allFoods = useMemo(() => ({ ...builtInFoods, ...customFoods }), [customFoods])

    const categories = useMemo(() => {
        const set = new Set(Object.values(allFoods).map((f) => f.category || 'custom'))
        return CATEGORIES_ORDER.filter((c) => set.has(c)).concat([...set].filter((c) => !CATEGORIES_ORDER.includes(c)))
    }, [allFoods])

    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        return Object.entries(allFoods).filter(([, food]) => {
            if (category !== 'all' && (food.category || 'custom') !== category) return false
            if (!q) return true
            return food.name.toLowerCase().includes(q)
        })
    }, [allFoods, query, category])

    if (!open) return null

    function resetAndClose() {
        setMode('browse')
        setQuery('')
        setForm(emptyCustomForm())
        setEditingKey(null)
        setPhotoFile(null)
        setPhotoPreview(null)
        setSelectedFood(null)
        setQuantity(1)
        setNotes('')
        setTags('')
        setInstancePhotoFile(null)
        setInstancePhotoPreview(null)
        onClose?.()
    }

    function pickFood(key, food) {
        setSelectedFood({ key, food })
        setQuantity(1)
        setNotes('')
        setTags('')
        setInstancePhotoFile(null)
        setInstancePhotoPreview(null)
        setMode('quantify')
    }

    function startEdit(key, food) {
        setEditingKey(key)
        setForm({
            name: food.name,
            calories: food.calories,
            protein: food.protein || '',
            carbs: food.carbs || '',
            fat: food.fat || '',
            unit: food.unit,
            emoji: food.emoji,
            category: food.category || 'custom',
        })
        setPhotoPreview(null)
        setPhotoFile(null)
        setMode('create')
    }

    async function saveCustomFood() {
        if (!form.name || !form.calories) return
        const key = editingKey || generateId('custom')
        const food = {
            name: form.name,
            calories: Number(form.calories) || 0,
            protein: Number(form.protein) || 0,
            carbs: Number(form.carbs) || 0,
            fat: Number(form.fat) || 0,
            unit: form.unit || '1 serving',
            emoji: form.emoji || '🍽️',
            category: form.category || 'custom',
        }
        if (photoFile) {
            try {
                await savePhoto(`food-${key}`, photoFile)
                food.photoId = `food-${key}`
            } catch {
                // photo storage failed silently — food still saves without it
            }
        }
        onSaveCustomFood(key, food)
        setMode('browse')
        setForm(emptyCustomForm())
        setEditingKey(null)
        setPhotoFile(null)
        setPhotoPreview(null)
        // jump straight into logging what was just created
        pickFood(key, food)
    }

    async function confirmLog() {
        if (!selectedFood) return
        const { key, food } = selectedFood
        const id = generateId('food')
        const entry = {
            id,
            name: food.name,
            calories: Math.round((food.calories || 0) * quantity),
            protein: Math.round((food.protein || 0) * quantity * 10) / 10,
            carbs: Math.round((food.carbs || 0) * quantity * 10) / 10,
            fat: Math.round((food.fat || 0) * quantity * 10) / 10,
            quantity,
            unit: food.unit || '',
            foodKey: key,
            emoji: food.emoji || '🍽️',
            notes: notes.trim(),
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }
        if (instancePhotoFile) {
            try {
                await savePhoto(id, instancePhotoFile)
                entry.photoId = id
            } catch {
                // ignore
            }
        } else if (food.photoId) {
            entry.photoId = food.photoId
            entry.sharedPhoto = true
        }
        onLog(entry)
        resetAndClose()
    }

    function handlePhotoChange(e, isInstance) {
        const file = e.target.files?.[0]
        if (!file) return
        const url = URL.createObjectURL(file)
        if (isInstance) {
            setInstancePhotoFile(file)
            setInstancePhotoPreview(url)
        } else {
            setPhotoFile(file)
            setPhotoPreview(url)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-4 py-3">
                    <div className="flex items-center gap-2">
                        {mode !== 'browse' && (
                            <button type="button" onClick={() => setMode('browse')} className="text-slate-400 hover:text-slate-200">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        )}
                        <div className="text-lg font-bold text-slate-100">
                            {mode === 'browse' ? 'Add Food' : mode === 'create' ? (editingKey ? 'Edit Food' : 'Create Food') : selectedFood?.food.name}
                        </div>
                    </div>
                    <button type="button" onClick={resetAndClose} className="text-slate-400 hover:text-slate-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {mode === 'browse' && (
                    <>
                        <div className="shrink-0 space-y-3 border-b border-slate-800 p-4">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    autoFocus
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search foods..."
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto">
                                <button
                                    type="button"
                                    onClick={() => setCategory('all')}
                                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${category === 'all' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                                >
                                    All
                                </button>
                                {categories.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setCategory(c)}
                                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${category === c ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => { setEditingKey(null); setForm(emptyCustomForm()); setMode('create') }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-emerald-400"
                            >
                                <Plus className="h-4 w-4" /> Create Custom Food
                            </button>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto p-4">
                            {recentNames?.length > 0 && !query && category === 'all' && (
                                <div className="mb-2">
                                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Recent</div>
                                </div>
                            )}
                            {results.length === 0 && (
                                <div className="py-8 text-center text-sm text-slate-500">No foods found. Try creating one.</div>
                            )}
                            {results.map(([key, food]) => (
                                <div
                                    key={key}
                                    className="group relative flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 hover:bg-slate-800"
                                >
                                    <button className="absolute inset-0" onClick={() => pickFood(key, food)} aria-label={`Log ${food.name}`} />
                                    <div className="relative flex items-center gap-3 pointer-events-none">
                                        <span className="text-xl">{food.emoji}</span>
                                        <div>
                                            <div className="font-semibold text-slate-100">{food.name}</div>
                                            <div className="text-xs text-slate-400">{food.unit}</div>
                                        </div>
                                    </div>
                                    <div className="relative z-10 flex items-center gap-2">
                                        <div className="pointer-events-none text-right">
                                            <div className="text-sm font-bold text-emerald-400">{food.calories} kcal</div>
                                            <div className="text-[10px] text-slate-500">{food.protein || 0}g protein</div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onTogglePinned(key) }}
                                            className={`rounded-lg p-2 ${pinnedFoods?.includes(key) ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                                            title={pinnedFoods?.includes(key) ? 'Unpin' : 'Pin to Quick Add'}
                                        >
                                            <Star className="h-4 w-4" fill={pinnedFoods?.includes(key) ? 'currentColor' : 'none'} />
                                        </button>
                                        {customFoods?.[key] && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startEdit(key, food) }}
                                                className="rounded-lg p-2 text-slate-500 hover:text-emerald-400"
                                            >
                                                <Save className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {mode === 'create' && (
                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-600 bg-slate-800/50 text-slate-400 hover:border-emerald-500 hover:text-emerald-400"
                            >
                                {photoPreview ? <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoChange(e, false)} />
                            <div className="text-xs text-slate-500">Optional photo, stored only on this device — shown whenever you log this food again.</div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-1">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Emoji</label>
                                <input
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-center text-xl outline-none"
                                    value={form.emoji}
                                    onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                                    maxLength={2}
                                />
                            </div>
                            <div className="col-span-3">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Food Name *</label>
                                <input
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                                    placeholder="e.g. Mom's Lasagna"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-400">Calories *</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none"
                                placeholder="0"
                                value={form.calories}
                                onChange={(e) => setForm({ ...form, calories: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Protein (g)</label>
                                <input type="number" className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none" placeholder="0" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Carbs (g)</label>
                                <input type="number" className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none" placeholder="0" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Fat (g)</label>
                                <input type="number" className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none" placeholder="0" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-400">Serving Unit</label>
                            <input className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none" placeholder="1 serving" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={saveCustomFood}
                                disabled={!form.name || !form.calories}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" /> Save & Log It
                            </button>
                            {editingKey && (
                                <button
                                    onClick={() => { onDeleteCustomFood(editingKey); setMode('browse') }}
                                    className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 text-rose-400 hover:bg-rose-950/40"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {mode === 'quantify' && selectedFood && (
                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                        <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                            <button type="button" onClick={() => setQuantity((q) => Math.max(0.25, q - 0.25))} className="rounded-full bg-slate-700 p-2 text-slate-200 hover:bg-slate-600">
                                <Minus className="h-4 w-4" />
                            </button>
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-50">{quantity}x</div>
                                <div className="text-xs text-slate-500">{selectedFood.food.unit}</div>
                            </div>
                            <button type="button" onClick={() => setQuantity((q) => q + 0.25)} className="rounded-full bg-slate-700 p-2 text-slate-200 hover:bg-slate-600">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-2">
                                <div className="text-lg font-bold text-emerald-400">{Math.round((selectedFood.food.calories || 0) * quantity)}</div>
                                <div className="text-[10px] text-slate-500">kcal</div>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-2">
                                <div className="text-lg font-bold text-orange-400">{Math.round((selectedFood.food.protein || 0) * quantity * 10) / 10}g</div>
                                <div className="text-[10px] text-slate-500">protein</div>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-2">
                                <div className="text-lg font-bold text-blue-400">{Math.round((selectedFood.food.carbs || 0) * quantity * 10) / 10}g</div>
                                <div className="text-[10px] text-slate-500">carbs</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-600 bg-slate-800/50 text-slate-400 hover:border-emerald-500 hover:text-emerald-400"
                            >
                                {instancePhotoPreview ? <img src={instancePhotoPreview} alt="" className="h-full w-full object-cover" /> : <Camera className="h-5 w-5" />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoChange(e, true)} />
                            <div className="text-xs text-slate-500">Snap a photo of what you're actually eating right now (optional).</div>
                        </div>

                        <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Note (optional) — e.g. 'ate out', 'pre-workout'"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                        />
                        <input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="Tags, comma separated (optional) — e.g. cheat, homemade"
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                        />

                        <button
                            onClick={confirmLog}
                            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black tracking-wide text-slate-950 hover:bg-emerald-400 active:scale-[0.98]"
                        >
                            Log It
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
