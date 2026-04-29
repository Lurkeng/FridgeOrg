import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { authMiddleware } from "@/middleware/auth";
import { getUserHouseholdId } from "@/server/household-context";
import type { RecipeMacros, SavedRecipe } from "@/types";

const recipeInputSchema = z.object({
  title: z.string().min(1).max(160),
  ingredients: z.array(z.string().min(1).max(160)).min(1),
  instructions: z.array(z.string().min(1).max(500)).min(1),
  tags: z.array(z.string().min(1).max(48)).default([]),
  prepTime: z.number().int().min(1).max(24 * 60).default(20),
  servings: z.number().int().min(1).max(24).default(2),
  estimatedMacros: z.object({
    calories: z.number().int().min(0),
    protein:  z.number().min(0),
    carbs:    z.number().min(0),
    fat:      z.number().min(0),
  }).optional(),
  originalRecipeId: z.string().optional(),
});

const saveRecipeSchema = recipeInputSchema.extend({
  source: z.enum(["custom", "ai_favourite"]),
});

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToSavedRecipe(row: typeof schema.savedRecipes.$inferSelect): SavedRecipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: parseJson<string[]>(row.ingredients, []),
    instructions: parseJson<string[]>(row.instructions, []),
    tags: parseJson<string[]>(row.tags, []),
    prepTime: row.prepTime,
    servings: row.servings,
    matchedIngredients: [],
    missingIngredients: [],
    matchPercentage: 0,
    source: row.source as SavedRecipe["source"],
    estimatedMacros: parseJson<RecipeMacros | undefined>(row.estimatedMacros, undefined),
    originalRecipeId: row.originalRecipeId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const getSavedRecipes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.savedRecipes)
      .where(eq(schema.savedRecipes.userId, context.userId));

    return rows.map(rowToSavedRecipe);
  });

export const saveRecipe = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(saveRecipeSchema)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const householdId = await getUserHouseholdId(db, context.userId);
    const now = new Date().toISOString();

    const [inserted] = await db
      .insert(schema.savedRecipes)
      .values({
        userId: context.userId,
        householdId,
        source: data.source,
        title: data.title.trim(),
        ingredients: JSON.stringify(data.ingredients.map((i) => i.trim()).filter(Boolean)),
        instructions: JSON.stringify(data.instructions.map((i) => i.trim()).filter(Boolean)),
        tags: JSON.stringify(data.tags.map((t) => t.trim()).filter(Boolean)),
        prepTime: data.prepTime,
        servings: data.servings,
        estimatedMacros: data.estimatedMacros ? JSON.stringify(data.estimatedMacros) : null,
        originalRecipeId: data.originalRecipeId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return rowToSavedRecipe(inserted);
  });

export const deleteSavedRecipe = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ context, data }) => {
    const db = getDb();
    await db
      .delete(schema.savedRecipes)
      .where(
        and(
          eq(schema.savedRecipes.id, data.id),
          eq(schema.savedRecipes.userId, context.userId),
        ),
      );

    return { success: true };
  });
