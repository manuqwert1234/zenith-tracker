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
