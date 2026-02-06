import * as XLSX from 'xlsx'

/**
 * Export budget transactions to Excel
 */
export function exportBudgetToExcel(transactions) {
    if (!transactions || transactions.length === 0) {
        return null
    }

    // Format transactions for Excel
    const formattedData = transactions.map((txn) => ({
        Date: txn.date || '',
        Label: txn.label || '',
        Amount: txn.amount || 0,
        Type: txn.type || 'other',
    }))

    return formattedData
}

/**
 * Export gym workouts to Excel
 */
export function exportGymToExcel(workouts) {
    if (!workouts || workouts.length === 0) {
        return null
    }

    // Flatten workouts into individual exercise rows
    const formattedData = []

    workouts.forEach((workout) => {
        const exercises = workout.exercises || []
        exercises.forEach((exercise) => {
            const sets = exercise.sets || []

            if (sets.length === 0) {
                // If no sets, still show the exercise
                formattedData.push({
                    Date: workout.date || '',
                    'Day Type': workout.dayType || '',
                    Exercise: exercise.name || '',
                    Sets: 0,
                    Reps: '',
                    Weight: '',
                    Notes: exercise.notes || '',
                })
            } else {
                // One row per set
                sets.forEach((set, idx) => {
                    formattedData.push({
                        Date: workout.date || '',
                        'Day Type': workout.dayType || '',
                        Exercise: exercise.name || '',
                        'Set #': idx + 1,
                        Reps: set.reps || '',
                        'Weight (kg)': set.weight || '',
                        Notes: idx === 0 ? (exercise.notes || '') : '', // Only show notes on first set
                    })
                })
            }
        })
    })

    return formattedData
}

/**
 * Export all data (budget and gym) to a single Excel file
 */
export function exportAllToExcel() {
    try {
        // Get data from localStorage
        const budgetTransactions = JSON.parse(localStorage.getItem('zt.transactions') || '[]')
        const gymWorkouts = JSON.parse(localStorage.getItem('zt.gym.workouts') || '[]')

        // Create workbook
        const workbook = XLSX.utils.book_new()

        // Add Budget sheet
        const budgetData = exportBudgetToExcel(budgetTransactions)
        if (budgetData && budgetData.length > 0) {
            const budgetSheet = XLSX.utils.json_to_sheet(budgetData)
            XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget Transactions')
        }

        // Add Gym sheet
        const gymData = exportGymToExcel(gymWorkouts)
        if (gymData && gymData.length > 0) {
            const gymSheet = XLSX.utils.json_to_sheet(gymData)
            XLSX.utils.book_append_sheet(workbook, gymSheet, 'Gym Workouts')
        }

        // Check if we have any data
        if (workbook.SheetNames.length === 0) {
            return { success: false, message: 'No data to export' }
        }

        // Generate filename with current date
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0]
        const filename = `ZenithTracker_Export_${dateStr}.xlsx`

        // Write and download file
        XLSX.writeFile(workbook, filename)

        return {
            success: true,
            message: `Exported ${budgetData?.length || 0} transactions and ${gymData?.length || 0} workout entries`,
            filename
        }
    } catch (error) {
        console.error('Export failed:', error)
        return { success: false, message: `Export failed: ${error.message}` }
    }
}

/**
 * Import data from Excel file
 * Expected sheets: "Budget Transactions" and "Gym Workouts"
 */
export function importFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })

                let budgetCount = 0
                let gymCount = 0

                // Import Budget Transactions
                if (workbook.SheetNames.includes('Budget Transactions')) {
                    const sheet = workbook.Sheets['Budget Transactions']
                    const jsonData = XLSX.utils.sheet_to_json(sheet)

                    const transactions = jsonData.map((row, idx) => ({
                        id: `imported-${Date.now()}-${idx}`,
                        date: row.Date || new Date().toISOString().split('T')[0],
                        label: row.Label || 'Imported Item',
                        amount: Number(row.Amount) || 0,
                        type: row.Type || 'other',
                    }))

                    // Merge with existing data
                    const existing = JSON.parse(localStorage.getItem('zt.transactions') || '[]')
                    const merged = [...existing, ...transactions]
                    localStorage.setItem('zt.transactions', JSON.stringify(merged))
                    budgetCount = transactions.length
                }

                // Import Gym Workouts
                if (workbook.SheetNames.includes('Gym Workouts')) {
                    const sheet = workbook.Sheets['Gym Workouts']
                    const jsonData = XLSX.utils.sheet_to_json(sheet)

                    // Group by date and exercise to rebuild workout structure
                    const workoutMap = new Map()

                    jsonData.forEach((row) => {
                        const dateKey = row.Date || new Date().toISOString().split('T')[0]
                        const exerciseName = row.Exercise || 'Unknown Exercise'
                        const key = `${dateKey}-${exerciseName}`

                        if (!workoutMap.has(key)) {
                            workoutMap.set(key, {
                                id: `imported-${Date.now()}-${workoutMap.size}`,
                                date: dateKey,
                                dayType: row['Day Type'] || 'custom',
                                exercises: [{
                                    name: exerciseName,
                                    sets: [],
                                    notes: row.Notes || undefined,
                                }]
                            })
                        }

                        const workout = workoutMap.get(key)
                        const exercise = workout.exercises[0]

                        // Add set if weight and reps exist
                        const weight = Number(row['Weight (kg)']) || Number(row.Weight) || 0
                        const reps = Number(row.Reps) || 0

                        if (weight > 0 || reps > 0) {
                            exercise.sets.push({ weight, reps })
                        }
                    })

                    const workouts = Array.from(workoutMap.values())

                    // Merge with existing data
                    const existing = JSON.parse(localStorage.getItem('zt.gym.workouts') || '[]')
                    const merged = [...existing, ...workouts]
                    localStorage.setItem('zt.gym.workouts', JSON.stringify(merged))
                    gymCount = workouts.length
                }

                resolve({
                    success: true,
                    message: `Imported ${budgetCount} budget entries and ${gymCount} workouts`,
                    budgetCount,
                    gymCount
                })
            } catch (error) {
                console.error('Import failed:', error)
                reject({ success: false, message: `Import failed: ${error.message}` })
            }
        }

        reader.onerror = () => {
            reject({ success: false, message: 'Failed to read file' })
        }

        reader.readAsArrayBuffer(file)
    })
}
