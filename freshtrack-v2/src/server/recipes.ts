import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth";
import type { AIRecipe, RecipePreferences } from "@/types";

const suggestSchema = z.object({
  items: z.array(z.object({
    name:        z.string(),
    category:    z.string(),
    expiry_date: z.string(),
  })),
  preferences: z.object({
    mealGoal:            z.enum(["quick_energy","high_protein","light","balanced","comfort"]).nullable(),
    calorieRange:        z.enum(["light","moderate","hearty"]).nullable(),
    proteinTarget:       z.enum(["low","moderate","high"]).nullable(),
    servings:            z.union([z.literal(1), z.literal(2), z.literal(4)]),
    dietaryRestrictions: z.array(z.enum(["vegetarian","vegan","gluten_free","dairy_free","nut_free","low_sodium"])),
  }).optional(),
});

// Human-readable labels used in the prompt
const MEAL_GOAL_LABELS: Record<NonNullable<RecipePreferences["mealGoal"]>, string> = {
  quick_energy: "quick energy (fast carbs, ready in <20 min)",
  high_protein: "high protein (aim for 30g+ protein per serving)",
  light:        "light and low-calorie (under 400 kcal per serving)",
  balanced:     "balanced nutrition (no strong bias)",
  comfort:      "hearty and comforting",
};

const CALORIE_LABELS: Record<NonNullable<RecipePreferences["calorieRange"]>, string> = {
  light:    "light (<400 kcal/serving)",
  moderate: "moderate (400–650 kcal/serving)",
  hearty:   "hearty (650+ kcal/serving)",
};

const PROTEIN_LABELS: Record<NonNullable<RecipePreferences["proteinTarget"]>, string> = {
  low:      "low protein (<15g/serving)",
  moderate: "moderate protein (15–30g/serving)",
  high:     "high protein (30g+/serving)",
};

const RESTRICTION_LABELS: Record<NonNullable<RecipePreferences["dietaryRestrictions"]>[number], string> = {
  vegetarian: "vegetarian (no meat/poultry/seafood)",
  vegan:      "vegan (no animal products)",
  gluten_free:"gluten-free",
  dairy_free: "dairy-free",
  nut_free:   "nut-free",
  low_sodium: "low sodium",
};

function buildPreferencesBlock(prefs?: RecipePreferences): string {
  if (!prefs) return "";

  const lines: string[] = [];

  if (prefs.mealGoal && prefs.mealGoal !== "balanced") {
    lines.push(`- Goal: ${MEAL_GOAL_LABELS[prefs.mealGoal]}`);
  }
  if (prefs.calorieRange) {
    lines.push(`- Calorie target: ${CALORIE_LABELS[prefs.calorieRange]}`);
  }
  if (prefs.proteinTarget) {
    lines.push(`- Protein target: ${PROTEIN_LABELS[prefs.proteinTarget]}`);
  }
  if (prefs.dietaryRestrictions.length > 0) {
    const labels = prefs.dietaryRestrictions.map((r) => RESTRICTION_LABELS[r]).join(", ");
    lines.push(`- Dietary restrictions: ${labels}`);
  }
  if (prefs.servings !== 2) {
    lines.push(`- Servings: ${prefs.servings} (scale ingredients accordingly)`);
  }

  if (lines.length === 0) return "";

  return `\nUser preferences (follow these strictly):\n${lines.join("\n")}\n`;
}

/**
 * AI recipe suggestions via Anthropic API (claude-haiku-4-5-20251001).
 * Prioritises items expiring soonest. Accepts optional RecipePreferences to
 * tailor the prompt and request estimated macros per serving.
 */
export const suggestAIRecipes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(suggestSchema)
  .handler(async ({ context, data }) => {
    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Sort by soonest expiry
    const sorted = [...data.items].sort(
      (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    );

    const ingredientList = sorted
      .slice(0, 20)
      .map((item) => {
        const daysLeft = Math.ceil(
          (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const urgency = daysLeft <= 1 ? " (expires TODAY)" : daysLeft <= 3 ? ` (expires in ${daysLeft}d)` : "";
        return `- ${item.name}${urgency}`;
      })
      .join("\n");

    const servings = data.preferences?.servings ?? 2;
    const preferencesBlock = buildPreferencesBlock(data.preferences as RecipePreferences | undefined);

    const prompt = `You are a helpful chef. Given these ingredients (prioritise items expiring soonest), suggest 3 practical recipes for ${servings} serving(s).
${preferencesBlock}
Ingredients:
${ingredientList}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "recipes": [
    {
      "title": "string",
      "prepTime": number,
      "servings": number,
      "ingredients": ["string"],
      "instructions": ["string"],
      "tags": ["string"],
      "estimatedMacros": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number
      }
    }
  ]
}

estimatedMacros must be per-serving estimates (integers, no nulls). Be realistic — base them on the actual ingredients.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":        apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":     "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const apiResponse = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const rawText = apiResponse.content[0]?.text ?? "";
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    let parsed: {
      recipes: Array<Omit<AIRecipe, "id" | "matchedIngredients" | "missingIngredients" | "matchPercentage" | "aiGenerated">>;
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned malformed JSON");
    }

    const inventoryNames = data.items.map((i) => i.name.toLowerCase());
    const recipes: AIRecipe[] = parsed.recipes.map((r, idx) => ({
      ...r,
      id:                 `ai-${Date.now()}-${idx}`,
      aiGenerated:        true as const,
      matchedIngredients: r.ingredients.filter((ing) =>
        inventoryNames.some((n) => n.includes(ing.toLowerCase()) || ing.toLowerCase().includes(n))
      ),
      missingIngredients: r.ingredients.filter((ing) =>
        !inventoryNames.some((n) => n.includes(ing.toLowerCase()) || ing.toLowerCase().includes(n))
      ),
      matchPercentage: 0,
    }));

    recipes.forEach((r) => {
      r.matchPercentage = Math.round((r.matchedIngredients.length / r.ingredients.length) * 100);
    });

    return { recipes };
  });
