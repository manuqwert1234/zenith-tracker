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
 * Export protein log to Excel
 */
export function exportProteinToExcel(proteinLog) {
    if (!proteinLog || proteinLog.length === 0) {
        return null
    }

    // Format protein log for Excel
    const formattedData = proteinLog.map((entry) => ({
        Date: entry.date || '',
        Time: entry.time || '',
        Food: entry.name || '',
        Protein: entry.protein || 0,
        Calories: entry.calories || 0,
        Quantity: entry.quantity || 1,
        Unit: entry.unit || '',
        FoodKey: entry.foodKey || '',
    }))

    return formattedData
}

/**
 * Export all data (budget, gym, and protein) to a single Excel file
 */
export function exportAllToExcel() {
    try {
        // Get data from localStorage
        const budgetTransactions = JSON.parse(localStorage.getItem('zt.transactions') || '[]')
        const gymWorkouts = JSON.parse(localStorage.getItem('zt.gym.workouts') || '[]')
        const proteinLog = JSON.parse(localStorage.getItem('zt.proteinLog') || '[]')

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

        // Add Protein sheet
        const proteinData = exportProteinToExcel(proteinLog)
        if (proteinData && proteinData.length > 0) {
            const proteinSheet = XLSX.utils.json_to_sheet(proteinData)
            XLSX.utils.book_append_sheet(workbook, proteinSheet, 'Protein Log')
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
            message: `Exported ${budgetData?.length || 0} transactions, ${gymData?.length || 0} workouts, and ${proteinData?.length || 0} protein entries`,
            filename
        }
    } catch (error) {
        console.error('Export failed:', error)
        return { success: false, message: `Export failed: ${error.message}` }
    }
}

/**
 * Import data from Excel file
 * Flexible: tries to detect Budget and Gym sheets by name patterns
 */
export function importFromExcel(file) {
    return new Promise((resolve, reject) => {
        console.log('📥 Import started for file:', file.name)
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                console.log('📄 File loaded, parsing...')
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })

                console.log('📊 Found sheets:', workbook.SheetNames)

                let budgetCount = 0
                let gymCount = 0

                // Find budget sheet (flexible matching)
                const budgetSheetName = workbook.SheetNames.find(name =>
                    name.toLowerCase().includes('budget') ||
                    name.toLowerCase().includes('transaction') ||
                    name.toLowerCase().includes('expense') ||
                    name.toLowerCase().includes('money')
                ) || (workbook.SheetNames.length >= 1 ? workbook.SheetNames[0] : null)

                // Find gym sheet (flexible matching)
                const gymSheetName = workbook.SheetNames.find(name =>
                    name.toLowerCase().includes('gym') ||
                    name.toLowerCase().includes('workout') ||
                    name.toLowerCase().includes('exercise') ||
                    name.toLowerCase().includes('training')
                ) || (workbook.SheetNames.length >= 2 ? workbook.SheetNames[1] : null)

                console.log('🎯 Budget sheet:', budgetSheetName, '| Gym sheet:', gymSheetName)

                // Import Budget/First sheet
                if (budgetSheetName) {
                    const sheet = workbook.Sheets[budgetSheetName]
                    const jsonData = XLSX.utils.sheet_to_json(sheet)
                    console.log('💰 Budget data rows:', jsonData.length)

                    // Detect if this is budget data (has Amount/Label columns)
                    const hasBudgetColumns = jsonData.length > 0 && (
                        'Amount' in jsonData[0] ||
                        'amount' in jsonData[0] ||
                        'Label' in jsonData[0] ||
                        'label' in jsonData[0]
                    )

                    if (hasBudgetColumns || budgetSheetName.toLowerCase().includes('budget')) {
                        const transactions = jsonData.map((row, idx) => ({
                            id: `imported-${Date.now()}-${idx}`,
                            date: row.Date || row.date || new Date().toISOString().split('T')[0],
                            label: row.Label || row.label || row.Description || row.description || 'Imported',
                            amount: Number(row.Amount || row.amount || 0),
                            type: row.Type || row.type || row.Category || row.category || 'other',
                        }))

                        // Replace existing data (not merge)
                        localStorage.setItem('zt.transactions', JSON.stringify(transactions))
                        budgetCount = transactions.length
                        console.log('✅ Imported budget:', budgetCount)
                    }
                }

                // Import Gym sheet
                if (gymSheetName && gymSheetName !== budgetSheetName) {
                    const sheet = workbook.Sheets[gymSheetName]
                    const jsonData = XLSX.utils.sheet_to_json(sheet)
                    console.log('🏋️ Gym data rows:', jsonData.length)

                    // Detect if this is gym data (has Exercise/Reps columns)
                    const hasGymColumns = jsonData.length > 0 && (
                        'Exercise' in jsonData[0] ||
                        'exercise' in jsonData[0] ||
                        'Reps' in jsonData[0] ||
                        'reps' in jsonData[0] ||
                        'Weight' in jsonData[0] ||
                        'weight' in jsonData[0]
                    )

                    if (hasGymColumns || gymSheetName.toLowerCase().includes('gym') || gymSheetName.toLowerCase().includes('workout')) {
                        // Group by date to rebuild workout structure
                        const workoutsByDate = new Map()

                        jsonData.forEach((row) => {
                            const dateKey = row.Date || row.date || new Date().toISOString().split('T')[0]
                            const exerciseName = row.Exercise || row.exercise || row.Name || row.name || 'Unknown'
                            const dayType = row['Day Type'] || row.dayType || row.Type || row.type || 'custom'

                            if (!workoutsByDate.has(dateKey)) {
                                workoutsByDate.set(dateKey, {
                                    id: `imported-${Date.now()}-${workoutsByDate.size}`,
                                    date: dateKey,
                                    dayType: dayType,
                                    exercises: []
                                })
                            }

                            const workout = workoutsByDate.get(dateKey)

                            // Find or create exercise
                            let exercise = workout.exercises.find(ex => ex.name === exerciseName)
                            if (!exercise) {
                                exercise = { name: exerciseName, sets: [], notes: row.Notes || row.notes || '' }
                                workout.exercises.push(exercise)
                            }

                            // Add set
                            const weight = Number(row['Weight (kg)'] || row.Weight || row.weight || 0)
                            const reps = Number(row.Reps || row.reps || 0)
                            if (weight > 0 || reps > 0) {
                                exercise.sets.push({ weight, reps })
                            }
                        })

                        const workouts = Array.from(workoutsByDate.values())

                        // Replace existing data
                        localStorage.setItem('zt.gym.workouts', JSON.stringify(workouts))
                        gymCount = workouts.length
                        console.log('✅ Imported workouts:', gymCount)
                    }
                }

                // Import Protein sheet (if exists)
                let proteinCount = 0
                const proteinSheetName = workbook.SheetNames.find(name =>
                    name.toLowerCase().includes('protein') ||
                    name.toLowerCase().includes('food') ||
                    name.toLowerCase().includes('nutrition')
                )

                if (proteinSheetName) {
                    const sheet = workbook.Sheets[proteinSheetName]
                    const jsonData = XLSX.utils.sheet_to_json(sheet)
                    console.log('🍗 Protein data rows:', jsonData.length)

                    // Detect if this is protein data (has Protein/Food columns)
                    const hasProteinColumns = jsonData.length > 0 && (
                        'Protein' in jsonData[0] ||
                        'protein' in jsonData[0] ||
                        'Food' in jsonData[0] ||
                        'food' in jsonData[0]
                    )

                    if (hasProteinColumns) {
                        const proteinLog = jsonData
                            .filter(row => row.Date || row.date)
                            .map(row => ({
                                id: `food-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                date: row.Date || row.date || '',
                                time: row.Time || row.time || '',
                                name: row.Food || row.food || row.Name || row.name || 'Unknown',
                                protein: Number(row.Protein || row.protein || 0),
                                calories: Number(row.Calories || row.calories || 0),
                                quantity: Number(row.Quantity || row.quantity || 1),
                                unit: row.Unit || row.unit || '',
                                foodKey: row.FoodKey || row.foodKey || 'custom',
                                emoji: '🍽️',
                            }))

                        // Replace existing data
                        localStorage.setItem('zt.proteinLog', JSON.stringify(proteinLog))
                        proteinCount = proteinLog.length
                        console.log('✅ Imported protein entries:', proteinCount)
                    }
                } else {
                    console.log('ℹ️ No protein sheet found - existing protein log preserved')
                }

                // Check if we imported anything
                if (budgetCount === 0 && gymCount === 0 && proteinCount === 0) {
                    console.warn('⚠️ No data imported. Sheets found:', workbook.SheetNames)
                    resolve({
                        success: false,
                        message: `No compatible data found. Sheets: ${workbook.SheetNames.join(', ')}. Need Budget, Gym or Protein data.`
                    })
                    return
                }

                console.log('🎉 Import complete:', { budgetCount, gymCount, proteinCount })
                resolve({
                    success: true,
                    message: `Imported ${budgetCount} budget, ${gymCount} workouts, ${proteinCount} protein entries`,
                    budgetCount,
                    gymCount
                })
            } catch (error) {
                console.error('❌ Import parsing failed:', error)
                reject({ success: false, message: `Import failed: ${error.message}` })
            }
        }

        reader.onerror = () => {
            console.error('❌ File read failed')
            reject({ success: false, message: 'Failed to read file' })
        }

        reader.readAsArrayBuffer(file)
    })
}
