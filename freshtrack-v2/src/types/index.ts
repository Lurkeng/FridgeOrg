export type StorageLocation = "fridge" | "freezer" | "pantry";

/** Nutritional values per 100 g (or per serving when servingSize is set) */
export interface NutritionInfo {
  calories: number;       // kcal per 100 g
  protein: number;        // g per 100 g
  carbs: number;          // g per 100 g
  fat: number;            // g per 100 g
  fiber?: number;         // g per 100 g
  sugar?: number;         // g per 100 g
  sodium?: number;        // mg per 100 g
  servingSize?: string;   // e.g. "30 g", "1 cup"
}

export type FoodCategory =
  | "dairy" | "meat" | "poultry" | "seafood" | "produce"
  | "grains" | "beverages" | "condiments" | "leftovers"
  | "frozen_meals" | "snacks" | "other";

export type ExpiryStatus = "fresh" | "use_soon" | "expiring" | "expired";

export interface FoodItem {
  id: string;
  household_id: string;
  name: string;
  category: FoodCategory;
  location: StorageLocation;
  quantity: number;
  unit: string;
  added_date: string;
  expiry_date: string;
  opened: boolean;
  opened_date?: string | null;
  notes?: string | null;
  barcode?: string | null;
  shelf?: string | null;
  nutrition?: NutritionInfo | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WasteLog {
  id: string;
  household_id: string;
  item_name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  reason: "expired" | "spoiled" | "leftover" | "other";
  estimated_cost: number;
  wasted_date: string;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  matchedIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  prepTime: number;
  servings: number;
  instructions: string[];
  tags: string[];
  aiGenerated?: boolean;
}

export interface WasteStats {
  totalWasted: number;
  totalCost: number;
  byCategory: Record<FoodCategory, number>;
  byReason: Record<string, number>;
  weeklyTrend: { week: string; count: number; cost: number }[];
  topWastedItems: { name: string; count: number }[];
}

export interface ExpiryDefaults {
  category: FoodCategory;
  location: StorageLocation;
  daysUntilExpiry: number;
  openedDaysUntilExpiry: number;
}

export interface NotificationSetting {
  daysBeforeExpiry: number;
  enabled: boolean;
}

export interface RecipeMacros {
  calories: number;
  protein:  number; // grams
  carbs:    number; // grams
  fat:      number; // grams
}

export interface AIRecipe extends Recipe {
  aiGenerated: true;
  estimatedMacros?: RecipeMacros;
}

export type SavedRecipeSource = "custom" | "ai_favourite";

export interface SavedRecipe extends Recipe {
  source: SavedRecipeSource;
  estimatedMacros?: RecipeMacros;
  originalRecipeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Recipe Preferences ──────────────────────────────────────────────────────

export type MealGoal =
  | "quick_energy"   // Fast carbs, ready in <20 min
  | "high_protein"   // 30g+ protein per serving
  | "light"          // Low-cal, under 400 kcal
  | "balanced"       // Default — no strong bias
  | "comfort";       // Hearty, satisfying

export type CalorieRange =
  | "light"     // <400 kcal/serving
  | "moderate"  // 400–650 kcal/serving
  | "hearty";   // 650+ kcal/serving

export type ProteinTarget =
  | "low"      // <15g
  | "moderate" // 15–30g
  | "high";    // 30g+

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "low_sodium";

export interface RecipePreferences {
  mealGoal:             MealGoal | null;
  calorieRange:         CalorieRange | null;
  proteinTarget:        ProteinTarget | null;
  servings:             1 | 2 | 4;
  dietaryRestrictions:  DietaryRestriction[];
}

// ── Shopping List ───────────────────────────────────────────────────────────

export interface ShoppingListItem {
  id: string;
  household_id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  checked: boolean;
  notes?: string | null;
  barcode?: string | null;
  /** Populated by Kassalapp — cheapest price found across Norwegian chains */
  kassalapp_product_id?: number | null;
  cheapest_store?: string | null;
  cheapest_price?: number | null;       // NOK
  comparison_prices?: StorePriceEntry[] | null;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface StorePriceEntry {
  store: string;
  price: number;  // NOK
}

// ── Achievements / Gamification ────────────────────────────────────────────

// ── Restock Predictions ──────────────────────────────────────────────────────

export interface RestockPrediction {
  name: string;
  category: string;
  averageIntervalDays: number;
  daysSinceLastPurchase: number;
  daysUntilNeeded: number;
  purchaseCount: number;
}

// ── Achievements / Gamification ────────────────────────────────────────────

export type AchievementKey =
  | "first_item" | "first_scan" | "week_without_waste" | "month_without_waste"
  | "inventory_master" | "price_hunter" | "chef_mode";

export interface Achievement {
  id: string;
  userId: string;
  achievementKey: string;
  unlockedAt: string;
}

export interface AchievementStats {
  achievements: Achievement[];
  wasteStreak: number;
  monthlyWasteScore: "A" | "B" | "C" | "D" | "F";
  totalItemsTracked: number;
  totalRecipesCooked: number;
}

// ── Kassalapp API response shapes ──────────────────────────────────────────

export interface KassalappProduct {
  id: number;
  name: string;
  brand: string | null;
  vendor: string | null;
  ean: string | null;
  description: string | null;
  image: string | null;
  current_price: number | null;
  current_unit_price: number | null;
  store: { name: string; code: string; logo: string | null } | null;
  category: string[];
  allergens: string[];
  nutrition: Record<string, string | number>[] | null;
  created_at: string;
  updated_at: string;
}

export interface KassalappPhysicalStore {
  id: number;
  group: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  logo: string | null;
  position: { lat: number; lng: number } | null;
  openingHours: Record<string, string> | null;
}
