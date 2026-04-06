/**
 * useAIRecipes — calls the suggestAIRecipes server function with a
 * 30-minute sessionStorage cache keyed by an inventory + preferences hash.
 */
import { useState, useCallback } from "react";
import { suggestAIRecipes } from "@/server/recipes";
import type { AIRecipe, FoodItem, RecipePreferences } from "@/types";

type Status = "idle" | "loading" | "success" | "error" | "no-key";

interface AIRecipesState {
  status: Status;
  recipes: AIRecipe[];
  error: string | null;
  cachedAt: number | null;
}

function hashInventory(items: FoodItem[]): string {
  return [...items]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => `${i.name}:${i.expiry_date}`)
    .join("|");
}

function hashPreferences(prefs: RecipePreferences): string {
  return [
    prefs.mealGoal ?? "",
    prefs.calorieRange ?? "",
    prefs.proteinTarget ?? "",
    prefs.servings,
    [...prefs.dietaryRestrictions].sort().join(","),
  ].join(";");
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const CACHE_KEY = "freshtrack:ai-recipes-cache";

interface CacheEntry {
  hash: string;
  recipes: AIRecipe[];
  timestamp: number;
}

function readCache(hash: string): AIRecipe[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.hash !== hash) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.recipes;
  } catch {
    return null;
  }
}

function writeCache(hash: string, recipes: AIRecipe[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ hash, recipes, timestamp: Date.now() }));
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function useAIRecipes() {
  const [state, setState] = useState<AIRecipesState>({
    status:   "idle",
    recipes:  [],
    error:    null,
    cachedAt: null,
  });

  const suggest = useCallback(async (items: FoodItem[], preferences: RecipePreferences) => {
    if (items.length === 0) return;

    const hash   = `${hashInventory(items)}||${hashPreferences(preferences)}`;
    const cached = readCache(hash);

    if (cached) {
      setState({ status: "success", recipes: cached, error: null, cachedAt: Date.now() });
      return;
    }

    setState((s) => ({ ...s, status: "loading", error: null }));

    try {
      const result = await suggestAIRecipes({
        data: {
          items: items.map((i) => ({
            name:        i.name,
            category:    i.category,
            expiry_date: i.expiry_date,
          })),
          preferences,
        },
      });

      writeCache(hash, result.recipes);
      setState({ status: "success", recipes: result.recipes, error: null, cachedAt: Date.now() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNoKey = msg.includes("ANTHROPIC_API_KEY");
      setState({
        status:   isNoKey ? "no-key" : "error",
        recipes:  [],
        error:    msg,
        cachedAt: null,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", recipes: [], error: null, cachedAt: null });
  }, []);

  return { ...state, suggest, reset };
}
