import {
  sqliteTable, text, integer, real, uniqueIndex, index,
} from "drizzle-orm/sqlite-core";

// ── Auth tables (managed by better-auth) ──────────────────────────────────
export const users = sqliteTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  image:         text("image"),
  // Extra field managed by better-auth additionalFields — column already exists in the DB
  householdId:   text("household_id"),
  createdAt:     integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt:     integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("session", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token:     text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const accounts = sqliteTable("account", {
  id:                     text("id").primaryKey(),
  userId:                 text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId:              text("account_id").notNull(),
  providerId:             text("provider_id").notNull(),
  accessToken:            text("access_token"),
  refreshToken:           text("refresh_token"),
  accessTokenExpiresAt:   integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt:  integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope:                  text("scope"),
  password:               text("password"),
  createdAt:              integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt:              integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verifications = sqliteTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt:  integer("created_at", { mode: "timestamp" }),
  updatedAt:  integer("updated_at", { mode: "timestamp" }),
});

// ── App tables ──────────────────────────────────────────────────────────────

export const households = sqliteTable("households", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:       text("name").notNull(),
  createdBy:  text("created_by").references(() => users.id, { onDelete: "set null" }),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt:  text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const householdMembers = sqliteTable("household_members", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:        text("role", { enum: ["owner", "member"] }).notNull().default("member"),
  joinedAt:    text("joined_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  uniqueMember: uniqueIndex("unique_household_user").on(table.householdId, table.userId),
  userIdx:      index("idx_hm_user").on(table.userId),
}));

const FOOD_CATEGORIES = ["dairy","meat","poultry","seafood","produce","grains","beverages","condiments","leftovers","frozen_meals","snacks","other"] as const;

export const foodItems = sqliteTable("food_items", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  category:    text("category", { enum: FOOD_CATEGORIES }).notNull().default("other"),
  location:    text("location", { enum: ["fridge","freezer","pantry"] }).notNull().default("fridge"),
  quantity:    real("quantity").notNull().default(1),
  unit:        text("unit").notNull().default("item"),
  addedDate:   text("added_date").notNull(),
  expiryDate:  text("expiry_date").notNull(),
  opened:      integer("opened", { mode: "boolean" }).default(false),
  openedDate:  text("opened_date"),
  notes:       text("notes"),
  barcode:     text("barcode"),
  shelf:       text("shelf"),
  // Nutrition per 100 g — populated when item is added via barcode scan
  nutritionCalories: real("nutrition_calories"),
  nutritionProtein:  real("nutrition_protein"),
  nutritionCarbs:    real("nutrition_carbs"),
  nutritionFat:      real("nutrition_fat"),
  nutritionFiber:    real("nutrition_fiber"),
  nutritionSugar:    real("nutrition_sugar"),
  nutritionSodium:   real("nutrition_sodium"),    // mg per 100 g
  nutritionServingSize: text("nutrition_serving_size"),
  createdBy:   text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt:   text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  householdIdx: index("idx_fi_household").on(table.householdId),
  expiryIdx:    index("idx_fi_expiry").on(table.expiryDate),
  locationIdx:  index("idx_fi_location").on(table.location),
  barcodeIdx:   index("idx_fi_barcode").on(table.barcode),
}));

export const wasteLogs = sqliteTable("waste_logs", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId:   text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  itemName:      text("item_name").notNull(),
  category:      text("category", { enum: FOOD_CATEGORIES }).notNull(),
  quantity:      real("quantity").notNull().default(1),
  unit:          text("unit").notNull().default("item"),
  reason:        text("reason", { enum: ["expired","spoiled","leftover","other"] }).notNull(),
  estimatedCost: real("estimated_cost").notNull().default(0),
  wastedDate:    text("wasted_date").notNull(),
  createdAt:     text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  householdIdx: index("idx_wl_household").on(table.householdId),
  dateIdx:      index("idx_wl_date").on(table.wastedDate),
}));

export const notificationPreferences = sqliteTable("notification_preferences", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  daysBefore: integer("days_before").notNull().default(2),
  enabled:    integer("enabled", { mode: "boolean" }).default(true),
  createdAt:  text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const recipePreferences = sqliteTable("recipe_preferences", {
  id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:               text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  // Goal-oriented presets
  mealGoal:             text("meal_goal"),         // 'quick_energy'|'high_protein'|'light'|'balanced'|'comfort'
  calorieRange:         text("calorie_range"),     // 'light'|'moderate'|'hearty'
  proteinTarget:        text("protein_target"),    // 'low'|'moderate'|'high'
  servings:             integer("servings").notNull().default(2),
  // JSON-encoded string array of DietaryRestriction values
  dietaryRestrictions:  text("dietary_restrictions").notNull().default("[]"),
  updatedAt:            text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ── Shopping list ──────────────────────────────────────────────────────────

export const shoppingListItems = sqliteTable("shopping_list_items", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  category:    text("category", { enum: FOOD_CATEGORIES }).notNull().default("other"),
  quantity:    real("quantity").notNull().default(1),
  unit:        text("unit").notNull().default("item"),
  checked:     integer("checked", { mode: "boolean" }).notNull().default(false),
  notes:       text("notes"),
  barcode:     text("barcode"),
  // Kassalapp price data (populated by the price-comparison server function)
  kassalappProductId: integer("kassalapp_product_id"),
  cheapestStore:      text("cheapest_store"),
  cheapestPrice:      real("cheapest_price"),
  comparisonPrices:   text("comparison_prices"),   // JSON array of {store,price}
  addedBy:     text("added_by").references(() => users.id, { onDelete: "set null" }),
  createdAt:   text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt:   text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  householdIdx: index("idx_sli_household").on(table.householdId),
  checkedIdx:   index("idx_sli_checked").on(table.checked),
}));

// ── Achievements / Gamification ───────────────────────────────────────────

export const achievements = sqliteTable("achievements", {
  id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:         text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementKey: text("achievement_key").notNull(),
  unlockedAt:     text("unlocked_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  uniqueUserAchievement: uniqueIndex("unique_user_achievement").on(table.userId, table.achievementKey),
}));

// Type exports
export type User                  = typeof users.$inferSelect;
export type RecipePrefRow         = typeof recipePreferences.$inferSelect;
export type Household             = typeof households.$inferSelect;
export type HouseholdMember       = typeof householdMembers.$inferSelect;
export type FoodItemRow           = typeof foodItems.$inferSelect;
export type WasteLogRow           = typeof wasteLogs.$inferSelect;
export type NotificationPref      = typeof notificationPreferences.$inferSelect;
export type NewFoodItem           = typeof foodItems.$inferInsert;
export type NewWasteLog           = typeof wasteLogs.$inferInsert;
export type ShoppingListItemRow   = typeof shoppingListItems.$inferSelect;
export type NewShoppingListItem   = typeof shoppingListItems.$inferInsert;
export type AchievementRow        = typeof achievements.$inferSelect;
export type NewAchievement        = typeof achievements.$inferInsert;
