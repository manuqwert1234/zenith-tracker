import * as XLSX from 'xlsx'
import { toISODate, startOfToday, daysAgoISO } from './dates'

const LS_KEYS = {
    foodLog: 'ct.foodLog',
    activityLog: 'ct.activityLog',
    weightLog: 'ct.weightLog',
    settings: 'ct.settings',
    gymWorkouts: 'ct.gym.workouts',
}

function readLocal(key, fallback) {
    try {
        const raw = localStorage.getItem(key)
        return raw == null ? fallback : JSON.parse(raw)
    } catch {
        return fallback
    }
}

function foodRows(foodLog) {
    return (foodLog || []).map((e) => ({
        Date: e.date || '',
        Time: e.time || '',
        Food: e.name || '',
        Calories: e.calories || 0,
        'Protein (g)': e.protein || 0,
        'Carbs (g)': e.carbs || 0,
        'Fat (g)': e.fat || 0,
        Quantity: e.quantity || 1,
        Unit: e.unit || '',
        Notes: e.notes || '',
        Tags: (e.tags || []).join(', '),
        Photo: e.photoId ? 'yes' : '',
    }))
}

function activityRows(activityLog) {
    return (activityLog || []).map((e) => ({
        Date: e.date || '',
        Type: e.type || '',
        'Duration (min)': e.durationMin || '',
        'Distance (km)': e.distanceKm || '',
        'Calories Burned': e.caloriesBurned || 0,
        Notes: e.notes || '',
    }))
}

function weightRows(weightLog) {
    return (weightLog || []).map((e) => ({
        Date: e.date || '',
        'Weight (kg)': e.weight || '',
    }))
}

function gymRows(gymWorkouts) {
    const rows = []
    ;(gymWorkouts || []).forEach((w) => {
        w.exercises.forEach((ex) => {
            if (ex.sets.length === 0) {
                rows.push({ Date: w.date || '', Day: w.dayLabel || '', Exercise: ex.name, 'Set #': '', 'Weight (kg)': '', Reps: '' })
                return
            }
            ex.sets.forEach((set, idx) => {
                rows.push({
                    Date: w.date || '',
                    Day: w.dayLabel || '',
                    Exercise: ex.name,
                    'Set #': idx + 1,
                    'Weight (kg)': set.weight || '',
                    Reps: set.reps || '',
                })
            })
        })
    })
    return rows
}

function waterRows(waterLog) {
    return (waterLog || []).map((e) => ({
        Date: e.date || '',
        'Water (ml)': e.ml || 0,
    }))
}

/**
 * Export everything to a single Excel workbook, one sheet per data type.
 */
export function exportAllToExcel() {
    try {
        const foodLog = readLocal(LS_KEYS.foodLog, [])
        const activityLog = readLocal(LS_KEYS.activityLog, [])
        const weightLog = readLocal(LS_KEYS.weightLog, [])
        const gymWorkouts = readLocal(LS_KEYS.gymWorkouts, [])
        const waterLog = readLocal('ct.waterLog', [])

        const workbook = XLSX.utils.book_new()

        const foodData = foodRows(foodLog)
        if (foodData.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(foodData), 'Food Log')
        }
        const activityData = activityRows(activityLog)
        if (activityData.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityData), 'Activity Log')
        }
        const weightData = weightRows(weightLog)
        if (weightData.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(weightData), 'Weight Log')
        }
        const gymData = gymRows(gymWorkouts)
        if (gymData.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(gymData), 'Gym Log')
        }
        const waterData = waterRows(waterLog)
        if (waterData.length > 0) {
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(waterData), 'Water Log')
        }

        if (workbook.SheetNames.length === 0) {
            return { success: false, message: 'No data to export yet' }
        }

        const dateStr = toISODate(startOfToday())
        const filename = `CalTrack_Export_${dateStr}.xlsx`
        XLSX.writeFile(workbook, filename)

        return {
            success: true,
            message: `Exported ${foodData.length} food entries, ${activityData.length} activities, ${weightData.length} weigh-ins, ${gymData.length} gym sets, ${waterData.length} water logs`,
            filename,
        }
    } catch (error) {
        console.error('Export failed:', error)
        return { success: false, message: `Export failed: ${error.message}` }
    }
}

/**
 * Import data from a previously exported Excel file. Replaces the matching
 * localStorage key for each sheet found (not a merge).
 */
export function importFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })

                let foodCount = 0
                let activityCount = 0
                let weightCount = 0

                const foodSheetName = workbook.SheetNames.find((n) => /food|nutrition|calorie/i.test(n))
                if (foodSheetName) {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[foodSheetName])
                    const foodLog = rows
                        .filter((r) => r.Date || r.date)
                        .map((r, idx) => ({
                            id: `imported-${Date.now()}-${idx}`,
                            date: r.Date || r.date || '',
                            time: r.Time || r.time || '',
                            name: r.Food || r.food || r.Name || 'Unknown',
                            calories: Number(r.Calories || r.calories || 0),
                            protein: Number(r['Protein (g)'] || r.Protein || r.protein || 0),
                            carbs: Number(r['Carbs (g)'] || r.Carbs || r.carbs || 0),
                            fat: Number(r['Fat (g)'] || r.Fat || r.fat || 0),
                            quantity: Number(r.Quantity || r.quantity || 1),
                            unit: r.Unit || r.unit || '',
                            notes: r.Notes || r.notes || '',
                            tags: (r.Tags || r.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
                        }))
                    localStorage.setItem(LS_KEYS.foodLog, JSON.stringify(foodLog))
                    foodCount = foodLog.length
                }

                const activitySheetName = workbook.SheetNames.find((n) => /activity|exercise|workout/i.test(n))
                if (activitySheetName) {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[activitySheetName])
                    const activityLog = rows
                        .filter((r) => r.Date || r.date)
                        .map((r, idx) => ({
                            id: `imported-${Date.now()}-${idx}`,
                            date: r.Date || r.date || '',
                            type: r.Type || r.type || 'other',
                            durationMin: Number(r['Duration (min)'] || r.durationMin || 0) || undefined,
                            distanceKm: Number(r['Distance (km)'] || r.distanceKm || 0) || undefined,
                            caloriesBurned: Number(r['Calories Burned'] || r.caloriesBurned || 0),
                            notes: r.Notes || r.notes || '',
                        }))
                    localStorage.setItem(LS_KEYS.activityLog, JSON.stringify(activityLog))
                    activityCount = activityLog.length
                }

                const weightSheetName = workbook.SheetNames.find((n) => /weight/i.test(n))
                if (weightSheetName) {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[weightSheetName])
                    const weightLog = rows
                        .filter((r) => r.Date || r.date)
                        .map((r) => ({
                            date: r.Date || r.date || '',
                            weight: Number(r['Weight (kg)'] || r.Weight || r.weight || 0),
                        }))
                    localStorage.setItem(LS_KEYS.weightLog, JSON.stringify(weightLog))
                    weightCount = weightLog.length
                }

                if (foodCount === 0 && activityCount === 0 && weightCount === 0) {
                    resolve({
                        success: false,
                        message: `No compatible sheets found. Sheets: ${workbook.SheetNames.join(', ')}`,
                    })
                    return
                }

                resolve({
                    success: true,
                    message: `Imported ${foodCount} food entries, ${activityCount} activities, ${weightCount} weigh-ins`,
                })
            } catch (error) {
                reject({ success: false, message: `Import failed: ${error.message}` })
            }
        }

        reader.onerror = () => reject({ success: false, message: 'Failed to read file' })
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Build a plain-text summary of the last N days, formatted to paste directly
 * into an AI chat (ChatGPT, Claude, etc.) and ask for feedback on your diet.
 */
export function buildAIExportText(days = 14) {
    const foodLog = readLocal(LS_KEYS.foodLog, [])
    const activityLog = readLocal(LS_KEYS.activityLog, [])
    const weightLog = readLocal(LS_KEYS.weightLog, [])
    const gymWorkouts = readLocal(LS_KEYS.gymWorkouts, [])
    const waterLog = readLocal('ct.waterLog', [])
    const settings = readLocal(LS_KEYS.settings, {})

    const cutoff = daysAgoISO(days - 1)
    const inRange = (d) => d >= cutoff

    const foodByDate = new Map()
    foodLog.filter((e) => inRange(e.date)).forEach((e) => {
        if (!foodByDate.has(e.date)) foodByDate.set(e.date, [])
        foodByDate.get(e.date).push(e)
    })

    const activityByDate = new Map()
    activityLog.filter((e) => inRange(e.date)).forEach((e) => {
        if (!activityByDate.has(e.date)) activityByDate.set(e.date, [])
        activityByDate.get(e.date).push(e)
    })

    const weightByDate = new Map()
    weightLog.filter((e) => inRange(e.date)).forEach((e) => weightByDate.set(e.date, e.weight))

    const waterByDate = new Map()
    waterLog.filter((e) => inRange(e.date)).forEach((e) => waterByDate.set(e.date, e.ml))

    const gymByDate = new Map()
    gymWorkouts.filter((w) => inRange(w.date) && w.exercises.some((ex) => ex.sets.length > 0)).forEach((w) => gymByDate.set(w.date, w))

    const allDates = Array.from(new Set([...foodByDate.keys(), ...activityByDate.keys(), ...weightByDate.keys(), ...gymByDate.keys(), ...waterByDate.keys()]))
        .sort((a, b) => b.localeCompare(a))

    const lines = []
    lines.push(`Nutrition log export — last ${days} days`)
    if (settings.calorieGoal) {
        lines.push(
            `Daily goals: ${settings.calorieGoal} kcal` +
            (settings.proteinGoal ? `, ${settings.proteinGoal}g protein` : '') +
            (settings.carbGoal ? `, ${settings.carbGoal}g carbs` : '') +
            (settings.fatGoal ? `, ${settings.fatGoal}g fat` : '')
        )
    }
    lines.push('')

    if (allDates.length === 0) {
        lines.push('(No entries logged in this period yet.)')
    }

    for (const date of allDates) {
        const entries = (foodByDate.get(date) || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        const totals = entries.reduce(
            (acc, e) => ({
                calories: acc.calories + (Number(e.calories) || 0),
                protein: acc.protein + (Number(e.protein) || 0),
                carbs: acc.carbs + (Number(e.carbs) || 0),
                fat: acc.fat + (Number(e.fat) || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        )

        lines.push(`${date} — ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat`)

        entries.forEach((e) => {
            const qty = e.quantity && e.quantity !== 1 ? ` x${e.quantity}` : ''
            const macro = `${Math.round(e.calories || 0)} kcal, ${Math.round(e.protein || 0)}g protein`
            const note = e.notes ? `  [${e.notes}]` : ''
            const tags = e.tags?.length ? `  #${e.tags.join(' #')}` : ''
            lines.push(`  ${e.time || ''}  ${e.name}${qty} — ${macro}${note}${tags}`)
        })

        const activities = activityByDate.get(date) || []
        activities.forEach((a) => {
            const dist = a.distanceKm ? `${a.distanceKm}km` : ''
            const dur = a.durationMin ? `${a.durationMin}min` : ''
            const detail = [dist, dur].filter(Boolean).join(', ')
            lines.push(`  Activity: ${a.type}${detail ? ` (${detail})` : ''} — ~${Math.round(a.caloriesBurned || 0)} kcal burned`)
        })

        if (weightByDate.has(date)) {
            lines.push(`  Weight: ${weightByDate.get(date)}kg`)
        }

        if (waterByDate.has(date)) {
            lines.push(`  Water: ${waterByDate.get(date)}ml`)
        }

        const gymWorkout = gymByDate.get(date)
        if (gymWorkout) {
            lines.push(`  Gym (${gymWorkout.dayLabel}):`)
            gymWorkout.exercises.filter((ex) => ex.sets.length > 0).forEach((ex) => {
                const setsStr = ex.sets.map((s) => `${s.weight || '—'}kg×${s.reps || '—'}`).join(', ')
                lines.push(`    ${ex.name} — ${setsStr}`)
            })
        }

        lines.push('')
    }

    lines.push('---')
    lines.push('Feel free to analyze this log: point out patterns, nutrient gaps, or suggestions for hitting my goals.')

    return lines.join('\n')
}

export async function copyAIExportToClipboard(days = 14) {
    const text = buildAIExportText(days)
    try {
        await navigator.clipboard.writeText(text)
        return { success: true, text }
    } catch (error) {
        return { success: false, message: error.message, text }
    }
}

export function downloadAIExport(days = 14) {
    const text = buildAIExportText(days)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CalTrack_AI_Export_${toISODate(startOfToday())}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}
