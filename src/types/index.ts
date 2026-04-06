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
  | "dairy"
  | "meat"
  | "poultry"
  | "seafood"
  | "produce"
  | "grains"
  | "beverages"
  | "condiments"
  | "leftovers"
  | "frozen_meals"
  | "snacks"
  | "other";

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
