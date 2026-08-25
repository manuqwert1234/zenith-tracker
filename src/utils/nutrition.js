// Nutrition/energy math shared across the app.
// All weights internally are stored in kg; heights in cm. Convert at the UI edge.

export function kgToLb(kg) {
    return kg * 2.20462
}

export function lbToKg(lb) {
    return lb / 2.20462
}

/**
 * Mifflin-St Jeor BMR estimate (kcal/day).
 */
export function estimateBMR({ weightKg, heightCm, age, sex }) {
    const w = Number(weightKg) || 0
    const h = Number(heightCm) || 0
    const a = Number(age) || 0
    if (!w || !h || !a) return null
    const base = 10 * w + 6.25 * h - 5 * a
    return Math.round(sex === 'female' ? base - 161 : base + 5)
}

export const ACTIVITY_MULTIPLIERS = {
    sedentary: { label: 'Sedentary (little/no exercise)', value: 1.2 },
    light: { label: 'Light (1-3 days/week)', value: 1.375 },
    moderate: { label: 'Moderate (3-5 days/week)', value: 1.55 },
    active: { label: 'Active (6-7 days/week)', value: 1.725 },
    veryActive: { label: 'Very active (physical job/2x training)', value: 1.9 },
}

export function estimateTDEE(bmr, activityLevel) {
    if (!bmr) return null
    const mult = ACTIVITY_MULTIPLIERS[activityLevel]?.value || 1.375
    return Math.round(bmr * mult)
}

/**
 * Rough calorie-burn estimate for a walk/run, used only as a starting
 * suggestion the user can override — not a substitute for a real tracker.
 */
export function estimateActivityCalories({ type, durationMin, distanceKm, weightKg = 70 }) {
    const met = {
        walk: 3.5,
        run: 9.8,
        cycle: 7.5,
        swim: 8,
        gym: 5,
        sports: 7,
        other: 4,
    }[type] || 4

    if (durationMin) {
        return Math.round((met * 3.5 * weightKg / 200) * durationMin)
    }
    if (distanceKm) {
        // fall back to a rough pace-based estimate
        const assumedMinPerKm = type === 'run' ? 6 : type === 'cycle' ? 3 : 12
        return Math.round((met * 3.5 * weightKg / 200) * (distanceKm * assumedMinPerKm))
    }
    return 0
}
