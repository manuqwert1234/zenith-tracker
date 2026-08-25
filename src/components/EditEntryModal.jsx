import { useMemo, useRef, useState } from 'react'
import { X, Camera, Trash2, Save, Minus, Plus } from 'lucide-react'
import { foodDatabase as builtInFoods } from '../config/foods'
import { savePhoto, deletePhoto } from '../utils/photoStore'

/**
 * Edit an already-logged food entry: quantity (rescales macros from the
 * base food when one is still known), notes, tags, and photo. Falls back to
 * direct calorie/macro editing if the original food was since deleted.
 */
export default function EditEntryModal({ entry, customFoods, onClose, onSave, onDelete }) {
    const allFoods = useMemo(() => ({ ...builtInFoods, ...customFoods }), [customFoods])
    const baseFood = entry?.foodKey ? allFoods[entry.foodKey] : null

    const [quantity, setQuantity] = useState(entry?.quantity || 1)
    const [calories, setCalories] = useState(entry?.calories ?? 0)
    const [protein, setProtein] = useState(entry?.protein ?? 0)
    const [carbs, setCarbs] = useState(entry?.carbs ?? 0)
    const [fat, setFat] = useState(entry?.fat ?? 0)
    const [notes, setNotes] = useState(entry?.notes || '')
    const [tags, setTags] = useState((entry?.tags || []).join(', '))
    const [photoFile, setPhotoFile] = useState(null)
    const [photoPreview, setPhotoPreview] = useState(null)
    const fileInputRef = useRef(null)

    if (!entry) return null

    function changeQuantity(delta) {
        const next = Math.max(0.25, Math.round((quantity + delta) * 4) / 4)
        setQuantity(next)
        if (baseFood) {
            setCalories(Math.round((baseFood.calories || 0) * next))
            setProtein(Math.round((baseFood.protein || 0) * next * 10) / 10)
            setCarbs(Math.round((baseFood.carbs || 0) * next * 10) / 10)
            setFat(Math.round((baseFood.fat || 0) * next * 10) / 10)
        }
    }

    function handlePhotoChange(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    async function handleSave() {
        const updated = {
            ...entry,
            quantity,
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fat: Number(fat) || 0,
            notes: notes.trim(),
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }
        if (photoFile) {
            const id = entry.id
            await savePhoto(id, photoFile)
            updated.photoId = id
            updated.sharedPhoto = false
        }
        onSave(updated)
        onClose?.()
    }

    async function handleDelete() {
        if (entry.photoId && !entry.sharedPhoto) {
            await deletePhoto(entry.photoId)
        }
        onDelete(entry)
        onClose?.()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-4 py-3">
                    <div className="text-lg font-bold text-slate-100">Edit {entry.name}</div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {baseFood ? (
                        <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                            <button type="button" onClick={() => changeQuantity(-0.25)} className="rounded-full bg-slate-700 p-2 text-slate-200 hover:bg-slate-600">
                                <Minus className="h-4 w-4" />
                            </button>
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-50">{quantity}x</div>
                                <div className="text-xs text-slate-500">{baseFood.unit}</div>
                            </div>
                            <button type="button" onClick={() => changeQuantity(0.25)} className="rounded-full bg-slate-700 p-2 text-slate-200 hover:bg-slate-600">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-xs text-amber-400">Original food was deleted — edit calories/macros directly below.</div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                        <div>
                            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Cal</label>
                            <input type="number" value={calories} disabled={Boolean(baseFood)} onChange={(e) => setCalories(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-sm text-slate-100 outline-none disabled:opacity-60" />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Protein</label>
                            <input type="number" value={protein} disabled={Boolean(baseFood)} onChange={(e) => setProtein(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-sm text-slate-100 outline-none disabled:opacity-60" />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Carbs</label>
                            <input type="number" value={carbs} disabled={Boolean(baseFood)} onChange={(e) => setCarbs(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-sm text-slate-100 outline-none disabled:opacity-60" />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-semibold text-slate-500">Fat</label>
                            <input type="number" value={fat} disabled={Boolean(baseFood)} onChange={(e) => setFat(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-sm text-slate-100 outline-none disabled:opacity-60" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-600 bg-slate-800/50 text-slate-400 hover:border-emerald-500 hover:text-emerald-400"
                        >
                            {photoPreview ? <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : <Camera className="h-5 w-5" />}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                        <div className="text-xs text-slate-500">Replace photo (optional).</div>
                    </div>

                    <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Note (optional)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                    />
                    <input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Tags, comma separated (optional)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                    />

                    <div className="flex gap-3">
                        <button onClick={handleSave} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-900 hover:bg-emerald-400">
                            <Save className="h-4 w-4" /> Save Changes
                        </button>
                        <button onClick={handleDelete} className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 text-rose-400 hover:bg-rose-950/40">
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
