// Starter food database — generic, everyday foods with no ties to any one
// person's diet, currency, or cuisine. Users add/edit/remove freely from
// Settings > Foods, and everything they add lives in localStorage under
// ct.customFoods, layered on top of this list.
//
// All values are per the listed unit. Macros in grams, calories in kcal.

export const foodDatabase = {
    egg_whole: { name: 'Egg (whole, boiled)', calories: 70, protein: 6, carbs: 0.5, fat: 5, unit: '1 egg', emoji: '🥚', category: 'protein' },
    egg_white: { name: 'Egg White', calories: 17, protein: 3.5, carbs: 0, fat: 0, unit: '1 egg', emoji: '🥚', category: 'protein' },
    chicken_breast: { name: 'Chicken Breast (grilled)', calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: '100g', emoji: '🍗', category: 'protein' },
    salmon: { name: 'Salmon (baked)', calories: 208, protein: 22, carbs: 0, fat: 13, unit: '100g', emoji: '🐟', category: 'protein' },
    tofu: { name: 'Tofu (firm)', calories: 144, protein: 15, carbs: 3, fat: 8, unit: '100g', emoji: '🧊', category: 'protein' },
    greek_yogurt: { name: 'Greek Yogurt (plain)', calories: 90, protein: 10, carbs: 4, fat: 2.5, unit: '150g', emoji: '🥛', category: 'dairy' },
    milk: { name: 'Milk (whole)', calories: 150, protein: 8, carbs: 12, fat: 8, unit: '1 cup', emoji: '🥛', category: 'dairy' },
    cheese: { name: 'Cheddar Cheese', calories: 113, protein: 7, carbs: 0.4, fat: 9, unit: '1 slice', emoji: '🧀', category: 'dairy' },
    rice_white: { name: 'White Rice (cooked)', calories: 205, protein: 4, carbs: 45, fat: 0.4, unit: '1 cup', emoji: '🍚', category: 'carbs' },
    rice_brown: { name: 'Brown Rice (cooked)', calories: 216, protein: 5, carbs: 45, fat: 1.8, unit: '1 cup', emoji: '🍚', category: 'carbs' },
    oats: { name: 'Oats (dry)', calories: 150, protein: 5, carbs: 27, fat: 3, unit: '40g', emoji: '🥣', category: 'carbs' },
    bread: { name: 'Bread (whole wheat)', calories: 80, protein: 4, carbs: 14, fat: 1, unit: '1 slice', emoji: '🍞', category: 'carbs' },
    pasta: { name: 'Pasta (cooked)', calories: 220, protein: 8, carbs: 43, fat: 1.3, unit: '1 cup', emoji: '🍝', category: 'carbs' },
    potato: { name: 'Potato (baked)', calories: 160, protein: 4, carbs: 37, fat: 0.2, unit: '1 medium', emoji: '🥔', category: 'carbs' },
    banana: { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, unit: '1 medium', emoji: '🍌', category: 'fruit' },
    apple: { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: '1 medium', emoji: '🍎', category: 'fruit' },
    berries: { name: 'Mixed Berries', calories: 60, protein: 1, carbs: 14, fat: 0.4, unit: '1 cup', emoji: '🫐', category: 'fruit' },
    orange: { name: 'Orange', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, unit: '1 medium', emoji: '🍊', category: 'fruit' },
    broccoli: { name: 'Broccoli (steamed)', calories: 55, protein: 4, carbs: 11, fat: 0.6, unit: '1 cup', emoji: '🥦', category: 'vegetables' },
    salad: { name: 'Mixed Green Salad', calories: 25, protein: 2, carbs: 5, fat: 0.3, unit: '1 bowl', emoji: '🥗', category: 'vegetables' },
    avocado: { name: 'Avocado', calories: 240, protein: 3, carbs: 12, fat: 22, unit: '1 whole', emoji: '🥑', category: 'vegetables' },
    almonds: { name: 'Almonds', calories: 164, protein: 6, carbs: 6, fat: 14, unit: '28g (~23 nuts)', emoji: '🌰', category: 'snacks' },
    peanut_butter: { name: 'Peanut Butter', calories: 190, protein: 8, carbs: 6, fat: 16, unit: '2 tbsp', emoji: '🥜', category: 'snacks' },
    protein_shake: { name: 'Protein Shake', calories: 120, protein: 24, carbs: 3, fat: 1, unit: '1 scoop + water', emoji: '🥤', category: 'snacks' },
    beans_black: { name: 'Black Beans (cooked)', calories: 227, protein: 15, carbs: 41, fat: 0.9, unit: '1 cup', emoji: '🫘', category: 'protein' },
    lentils: { name: 'Lentils (cooked)', calories: 230, protein: 18, carbs: 40, fat: 0.8, unit: '1 cup', emoji: '🍲', category: 'protein' },
    pizza_slice: { name: 'Pizza (cheese)', calories: 285, protein: 12, carbs: 36, fat: 10, unit: '1 slice', emoji: '🍕', category: 'treats' },
    chocolate: { name: 'Dark Chocolate', calories: 170, protein: 2, carbs: 13, fat: 12, unit: '1 oz (28g)', emoji: '🍫', category: 'treats' },
    ice_cream: { name: 'Ice Cream', calories: 137, protein: 2.3, carbs: 16, fat: 7, unit: '1/2 cup', emoji: '🍨', category: 'treats' },
    soda: { name: 'Soda', calories: 140, protein: 0, carbs: 39, fat: 0, unit: '1 can', emoji: '🥤', category: 'treats' },
}

// A generic starting point — every user should tune these in Settings during
// onboarding rather than inherit someone else's targets.
export const DEFAULT_CALORIE_GOAL = 2000
export const DEFAULT_PROTEIN_GOAL = 100
export const DEFAULT_CARB_GOAL = 225
export const DEFAULT_FAT_GOAL = 65

// A small, cuisine-neutral starter set for the Quick Add row before the user
// has built up their own history.
export const quickAddItems = [
    'egg_whole',
    'chicken_breast',
    'greek_yogurt',
    'banana',
    'oats',
    'rice_white',
    'salad',
    'protein_shake',
]
