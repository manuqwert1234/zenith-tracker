// Food database for Protocol 90 protein tracking
// Easy to update - just add/edit/delete items here!

export const foodDatabase = {
    // ===== EGGS =====
    egg_whole: {
        name: 'Boiled Egg (Whole)',
        protein: 6,
        calories: 70,
        unit: '1 egg',
        emoji: '🥚',
        category: 'eggs'
    },
    egg_white: {
        name: 'Egg White Only',
        protein: 3.5,
        calories: 17,
        unit: '1 egg',
        emoji: '🥚',
        category: 'eggs'
    },

    // ===== CHICKEN =====
    chicken_tikka: {
        name: 'Chicken Tikka',
        protein: 25,
        calories: 300,
        unit: '4 pieces',
        emoji: '🍗',
        category: 'chicken'
    },
    grilled_chicken_qtr: {
        name: 'Grilled Chicken (Quarter)',
        protein: 28,
        calories: 260,
        unit: '1 quarter leg',
        emoji: '🍗',
        category: 'chicken'
    },
    mandi_meat_only: {
        name: 'Mandi Chicken (Meat Only)',
        protein: 28,
        calories: 280,
        unit: '1 piece',
        emoji: '🍖',
        category: 'chicken'
    },

    // ===== DANGER FOODS ⚠️ (High Calorie) =====
    mandi_full_plate: {
        name: 'Mandi (Full Plate)',
        protein: 30,
        calories: 900,
        unit: '1 plate',
        emoji: '⚠️',
        category: 'danger',
        warning: 'High calorie! Eat meat, skip 50% rice'
    },
    biryani_chicken: {
        name: 'Chicken Biryani',
        protein: 25,
        calories: 800,
        unit: '1 portion',
        emoji: '⚠️',
        category: 'danger',
        warning: 'Treat meal only!'
    },
    dragon_chicken: {
        name: 'Dragon Chicken',
        protein: 18,
        calories: 450,
        unit: '1 dry portion',
        emoji: '⚠️',
        category: 'danger',
        warning: 'Fried + sugar sauces'
    },
    mayonnaise: {
        name: 'Mayonnaise',
        protein: 0,
        calories: 100,
        unit: '1 tbsp',
        emoji: '⚠️',
        category: 'danger',
        warning: 'Pure fat - avoid!'
    },

    // ===== DAIRY =====
    greek_yogurt: {
        name: 'Greek Yogurt',
        protein: 7,
        calories: 90,
        unit: '100g cup',
        emoji: '🥛',
        category: 'dairy'
    },

    // ===== CARBS =====
    chapati: {
        name: 'Chapati/Roti',
        protein: 3,
        calories: 100,
        unit: '1 piece',
        emoji: '🫓',
        category: 'carbs'
    },
    idly: {
        name: 'Idly',
        protein: 2,
        calories: 40,
        unit: '1 piece',
        emoji: '⚪',
        category: 'carbs'
    },

    // ===== FRUITS =====
    banana: {
        name: 'Banana',
        protein: 1,
        calories: 105,
        unit: '1 medium',
        emoji: '🍌',
        category: 'fruits'
    },
}

// Daily protein goal for Protocol 90
export const PROTEIN_GOAL = 90

// Calorie goal for cutting
export const CALORIE_GOAL = 1800

// Quick add buttons (most used items)
export const quickAddItems = [
    'egg_whole',
    'chicken_tikka',
    'grilled_chicken_qtr',
    'egg_white',
    'banana',
    'greek_yogurt',
]
