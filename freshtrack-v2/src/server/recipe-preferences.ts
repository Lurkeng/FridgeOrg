import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth";
import type { RecipePreferences } from "@/types";

const DEFAULT_PREFS: RecipePreferences = {
  mealGoal:            "balanced",
  calorieRange:        null,
  proteinTarget:       null,
  servings:            2,
  dietaryRestrictions: [],
};

// ── GET ────────────────────────────────────────────────────────────────────

export const getRecipePreferences = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RecipePreferences> => {
    const db = getDb();

    const [row] = await db
      .select()
      .from(schema.recipePreferences)
      .where(eq(schema.recipePreferences.userId, context.userId))
      .limit(1);

    if (!row) return DEFAULT_PREFS;

    return {
      mealGoal:            (row.mealGoal as RecipePreferences["mealGoal"]) ?? "balanced",
      calorieRange:        (row.calorieRange as RecipePreferences["calorieRange"]) ?? null,
      proteinTarget:       (row.proteinTarget as RecipePreferences["proteinTarget"]) ?? null,
      servings:            (row.servings as 1 | 2 | 4) ?? 2,
      dietaryRestrictions: JSON.parse(row.dietaryRestrictions || "[]"),
    };
  });

// ── SAVE ───────────────────────────────────────────────────────────────────

const prefsSchema = z.object({
  mealGoal:            z.enum(["quick_energy","high_protein","light","balanced","comfort"]).nullable(),
  calorieRange:        z.enum(["light","moderate","hearty"]).nullable(),
  proteinTarget:       z.enum(["low","moderate","high"]).nullable(),
  servings:            z.union([z.literal(1), z.literal(2), z.literal(4)]),
  dietaryRestrictions: z.array(z.enum(["vegetarian","vegan","gluten_free","dairy_free","nut_free","low_sodium"])),
});

export const saveRecipePreferences = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(prefsSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();

    const values = {
      userId:               context.userId,
      mealGoal:             data.mealGoal,
      calorieRange:         data.calorieRange,
      proteinTarget:        data.proteinTarget,
      servings:             data.servings,
      dietaryRestrictions:  JSON.stringify(data.dietaryRestrictions),
      updatedAt:            new Date().toISOString(),
    };

    // Upsert — insert or replace on conflict
    await db
      .insert(schema.recipePreferences)
      .values(values)
      .onConflictDoUpdate({
        target: schema.recipePreferences.userId,
        set: {
          mealGoal:            values.mealGoal,
          calorieRange:        values.calorieRange,
          proteinTarget:       values.proteinTarget,
          servings:            values.servings,
          dietaryRestrictions: values.dietaryRestrictions,
          updatedAt:           values.updatedAt,
        },
      });

    return data as RecipePreferences;
  });
