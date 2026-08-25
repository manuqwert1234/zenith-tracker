// Generic starter workout templates — no ties to any one gym, coach, or
// program. Pick one as a starting point in the Gym tab, or build your own
// from scratch. Every day's exercise list is just a suggestion; add, remove,
// or rename exercises freely once you're logging a session.

export const gymTemplates = {
    ppl: {
        name: 'Push / Pull / Legs',
        description: '6-day split, classic hypertrophy split',
        days: [
            {
                id: 'push', label: 'Push', exercises: [
                    { name: 'Bench Press', target: '4 sets', reps: '6-10 reps' },
                    { name: 'Overhead Press', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Incline Dumbbell Press', target: '3 sets', reps: '10-12 reps' },
                    { name: 'Lateral Raises', target: '3 sets', reps: '12-15 reps' },
                    { name: 'Triceps Pushdown', target: '3 sets', reps: '10-12 reps' },
                ]
            },
            {
                id: 'pull', label: 'Pull', exercises: [
                    { name: 'Deadlift', target: '3 sets', reps: '5 reps' },
                    { name: 'Pull-ups', target: '4 sets', reps: 'to failure' },
                    { name: 'Barbell Rows', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Face Pulls', target: '3 sets', reps: '15 reps' },
                    { name: 'Bicep Curls', target: '3 sets', reps: '10-12 reps' },
                ]
            },
            {
                id: 'legs', label: 'Legs', exercises: [
                    { name: 'Squats', target: '4 sets', reps: '6-10 reps' },
                    { name: 'Romanian Deadlift', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Leg Press', target: '3 sets', reps: '10-12 reps' },
                    { name: 'Leg Curls', target: '3 sets', reps: '12-15 reps' },
                    { name: 'Calf Raises', target: '4 sets', reps: '15-20 reps' },
                ]
            },
            { id: 'rest', label: 'Rest', exercises: [] },
        ],
    },
    fullbody: {
        name: 'Full Body',
        description: '3-day split, great for beginners or busy weeks',
        days: [
            {
                id: 'day1', label: 'Full Body A', exercises: [
                    { name: 'Squats', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Bench Press', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Barbell Rows', target: '3 sets', reps: '10-12 reps' },
                ]
            },
            {
                id: 'day2', label: 'Full Body B', exercises: [
                    { name: 'Deadlifts', target: '3 sets', reps: '5 reps' },
                    { name: 'Overhead Press', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Pull-ups', target: '3 sets', reps: 'to failure' },
                ]
            },
            {
                id: 'day3', label: 'Full Body C', exercises: [
                    { name: 'Leg Press', target: '3 sets', reps: '12-15 reps' },
                    { name: 'Incline DB Press', target: '3 sets', reps: '10-12 reps' },
                    { name: 'Lat Pulldowns', target: '3 sets', reps: '10-12 reps' },
                ]
            },
            { id: 'rest', label: 'Rest', exercises: [] },
        ],
    },
    upperlower: {
        name: 'Upper / Lower',
        description: '4-day split, balances volume with recovery',
        days: [
            {
                id: 'upper', label: 'Upper', exercises: [
                    { name: 'Bench Press', target: '4 sets', reps: '6-10 reps' },
                    { name: 'Barbell Rows', target: '4 sets', reps: '6-10 reps' },
                    { name: 'Overhead Press', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Pull-ups', target: '3 sets', reps: 'to failure' },
                ]
            },
            {
                id: 'lower', label: 'Lower', exercises: [
                    { name: 'Squats', target: '4 sets', reps: '6-10 reps' },
                    { name: 'Romanian Deadlift', target: '3 sets', reps: '8-10 reps' },
                    { name: 'Leg Press', target: '3 sets', reps: '10-12 reps' },
                    { name: 'Calf Raises', target: '4 sets', reps: '15-20 reps' },
                ]
            },
            { id: 'rest', label: 'Rest', exercises: [] },
        ],
    },
}

export function blankTemplate() {
    return {
        name: 'My Routine',
        description: 'Custom',
        days: [
            { id: 'day1', label: 'Day 1', exercises: [{ name: 'Add an exercise', target: '3 sets', reps: '8-10 reps' }] },
        ],
    }
}
