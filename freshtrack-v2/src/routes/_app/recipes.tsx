import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useFoodItems } from "@/hooks/useFoodItems";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useAIRecipes } from "@/hooks/useAIRecipes";
import { useRecipePreferences } from "@/hooks/useRecipePreferences";
import { useSavedRecipes } from "@/hooks/useSavedRecipes";
import { useToast } from "@/components/ui/Toast";
import { findMatchingRecipes } from "@/data/recipes";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import GlassCard from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { PageSkeleton } from "@/components/ui/Skeleton";
import {
  BookOpen, ChefHat, Sparkles, RefreshCw, Check, X,
  Clock, Users, ChevronDown, ChevronUp, Settings2, Flame,
  Zap, Leaf, Save, ShoppingCart, CheckCircle, Package,
  Plus, Star, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recipe, AIRecipe, RecipePreferences, MealGoal, CalorieRange, ProteinTarget, DietaryRestriction, SavedRecipe } from "@/types";

export const Route = createFileRoute("/_app/recipes")({
  component: RecipesPage,
});

// ── Recipe filter type ───────────────────────────────────────────────────────

type RecipeFilter = "all" | "zero_waste" | "almost_there";

function applyRecipeFilter(recipes: (Recipe | AIRecipe)[], filter: RecipeFilter) {
  if (filter === "zero_waste") return recipes.filter((r) => r.missingIngredients.length === 0);
  if (filter === "almost_there") return recipes.filter((r) => r.missingIngredients.length <= 2);
  return recipes;
}

// ── Filter pills ─────────────────────────────────────────────────────────────

function FilterPills({ filter, onChange }: { filter: RecipeFilter; onChange: (f: RecipeFilter) => void }) {
  const filters: { value: RecipeFilter; label: string; indicator?: string; emoji?: string }[] = [
    { value: "all", label: "All" },
    { value: "zero_waste", label: "No Shopping Needed", indicator: "bg-fresh-400", emoji: "\u{1F373}" },
    { value: "almost_there", label: "Almost There (\u22642 missing)", indicator: "bg-warning-400", emoji: "\u{1F6D2}" },
  ];

  return (
    <div className="flex gap-2 mb-5 flex-wrap animate-fade-in">
      {filters.map(({ value, label, indicator, emoji }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
            filter === value
              ? "glass-heavy text-slate-800 shadow-glass border-white/60 ring-1 ring-frost-200/50"
              : "glass text-slate-500 border-white/40 hover:border-frost-200 hover:text-slate-700 hover:-translate-y-0.5"
          )}
        >
          {indicator && <span className={cn("w-2 h-2 rounded-full", indicator, filter === value && "ring-2 ring-offset-1 ring-offset-white/50", filter === value && indicator)} />}
          {emoji && <span>{emoji}</span>}
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Match-% ring ─────────────────────────────────────────────────────────────

function MatchRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#94a3b8";
  const label = pct >= 80 ? "Great match" : pct >= 50 ? "Partial match" : "Few matches";
  return (
    <div className="relative group flex-shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 24 24)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
        <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{pct}%</text>
      </svg>
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 glass-heavy rounded-lg text-[10px] font-medium text-slate-600 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
        {label}
      </div>
    </div>
  );
}

// ── Macro badge strip (AI cards only) ────────────────────────────────────────

function MacroBadges({ macros }: { macros: NonNullable<AIRecipe["estimatedMacros"]> }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mt-2 mb-1">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100/80 text-orange-700 border border-orange-200/50">
        <Flame className="w-3 h-3" /> {macros.calories} kcal
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100/80 text-blue-700 border border-blue-200/50">
        <Zap className="w-3 h-3" /> {macros.protein}g protein
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100/80 text-yellow-700 border border-yellow-200/50">
        {macros.carbs}g carbs
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100/80 text-slate-600 border border-slate-200/50">
        {macros.fat}g fat
      </span>
    </div>
  );
}

// ── Recipe card ───────────────────────────────────────────────────────────────

interface RecipeCardProps {
  recipe: Recipe | AIRecipe;
  index: number;
  ai?: boolean;
  addedToList?: boolean;
  cookedState?: "idle" | "confirm" | "cooking" | "done";
  onAddToShoppingList?: (recipe: Recipe | AIRecipe) => void;
  onCookRecipe?: (recipe: Recipe | AIRecipe) => void;
  onCookConfirm?: (recipe: Recipe | AIRecipe) => void;
  onCookCancel?: () => void;
  isAddingToList?: boolean;
  onSaveFavourite?: (recipe: Recipe | AIRecipe) => void;
  isSaved?: boolean;
  isSavingRecipe?: boolean;
  onDeleteSaved?: (recipe: SavedRecipe) => void;
  isDeletingSaved?: boolean;
}

function RecipeCard({
  recipe, index, ai,
  addedToList, cookedState = "idle",
  onAddToShoppingList, onCookRecipe, onCookConfirm, onCookCancel,
  isAddingToList, onSaveFavourite, isSaved, isSavingRecipe,
  onDeleteSaved, isDeletingSaved,
}: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const aiRecipe = ai ? (recipe as AIRecipe) : null;
  const savedRecipe = "source" in recipe ? (recipe as SavedRecipe) : null;
  const hasMissing = recipe.missingIngredients.length > 0;

  return (
    <GlassCard className={cn("overflow-hidden", ai && "ring-1 ring-frost-200/50")} staggerIndex={index}>
      {ai && <div className="h-1 bg-gradient-to-r from-frost-400 via-purple-400 to-fresh-400" />}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <MatchRing pct={recipe.matchPercentage} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-slate-800">{recipe.title}</h3>
              {ai && <Badge variant="info" size="sm"><Sparkles className="w-3 h-3 inline mr-0.5" />AI</Badge>}
              {savedRecipe?.source === "custom" && <Badge variant="success" size="sm">Yours</Badge>}
              {savedRecipe?.source === "ai_favourite" && <Badge variant="info" size="sm"><Star className="w-3 h-3 inline mr-0.5" />Favourite</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.prepTime}m</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings} servings</span>
            </div>
            {/* Estimated macros (AI only) */}
            {aiRecipe?.estimatedMacros && <MacroBadges macros={aiRecipe.estimatedMacros} />}
            {/* Ingredient pills */}
            <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
              {recipe.matchedIngredients.map((ing) => (
                <span key={ing} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-fresh-100/80 text-fresh-700 border border-fresh-200/50">
                  <Check className="w-2.5 h-2.5" /> {ing}
                </span>
              ))}
              {recipe.missingIngredients.slice(0, 4).map((ing) => (
                <span key={ing} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100/80 text-slate-500 border border-slate-200/50">
                  <X className="w-2.5 h-2.5" /> {ing}
                </span>
              ))}
              {recipe.missingIngredients.length > 4 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100/80 text-slate-400 border border-slate-200/50">
                  +{recipe.missingIngredients.length - 4} more
                </span>
              )}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="ghost" size="sm">{tag}</Badge>)}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {/* Add missing to shopping list */}
          {hasMissing && onAddToShoppingList && (
            <button
              onClick={() => onAddToShoppingList(recipe)}
              disabled={addedToList || isAddingToList}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border",
                addedToList
                  ? "bg-fresh-100 text-fresh-700 border-fresh-200/60 cursor-default"
                  : "bg-gradient-to-r from-frost-500 to-frost-600 text-white border-frost-500 shadow-sm hover:from-frost-600 hover:to-frost-700 disabled:opacity-60"
              )}
            >
              {isAddingToList ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding…
                </>
              ) : addedToList ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Added to list
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add {recipe.missingIngredients.length} missing to list
                </>
              )}
            </button>
          )}

          {ai && onSaveFavourite && (
            <button
              onClick={() => onSaveFavourite(recipe)}
              disabled={isSaved || isSavingRecipe}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border",
                isSaved
                  ? "bg-warning-100 text-warning-700 border-warning-200/60 cursor-default"
                  : "glass text-slate-700 border-white/40 hover:border-warning-200 hover:text-warning-700 disabled:opacity-60",
              )}
            >
              <Star className="w-3.5 h-3.5" />
              {isSaved ? "Saved favourite" : isSavingRecipe ? "Saving…" : "Save favourite"}
            </button>
          )}

          {savedRecipe && onDeleteSaved && (
            <button
              onClick={() => onDeleteSaved(savedRecipe)}
              disabled={isDeletingSaved}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold glass text-danger-600 border border-white/40 hover:border-danger-200 transition-all disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeletingSaved ? "Removing…" : "Remove"}
            </button>
          )}

          {/* I made this / Cook */}
          {onCookRecipe && (
            <>
              {cookedState === "idle" && (
                <button
                  onClick={() => onCookRecipe(recipe)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold glass text-slate-700 border border-white/40 hover:border-fresh-200 hover:text-fresh-700 transition-all"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  I made this!
                </button>
              )}
              {cookedState === "confirm" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium glass border border-warning-200/60 bg-warning-50/60 animate-fade-in">
                  <span className="text-slate-700">Reduce ingredient quantities?</span>
                  <button
                    onClick={() => onCookConfirm?.(recipe)}
                    className="px-2 py-0.5 rounded-lg bg-fresh-500 text-white text-xs font-bold hover:bg-fresh-600 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={onCookCancel}
                    className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
              {cookedState === "cooking" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium glass text-slate-600 border border-white/40 animate-fade-in">
                  <div className="w-3.5 h-3.5 border-2 border-frost-400 border-t-transparent rounded-full animate-spin" />
                  Updating inventory…
                </div>
              )}
              {cookedState === "done" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-fresh-100 text-fresh-700 border border-fresh-200/60 animate-fade-in">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Cooked!
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-between px-4 py-2.5 glass rounded-xl text-sm font-medium text-slate-700 hover:bg-white/70 transition-all"
        >
          <span>{expanded ? "Hide" : "Show"} Instructions</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <ol className="mt-3 space-y-2 animate-fade-in-down">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}>
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-frost-400 to-frost-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        )}
      </div>
    </GlassCard>
  );
}

// ── Preferences panel ─────────────────────────────────────────────────────────

const MEAL_GOALS: { value: MealGoal; label: string; emoji: string }[] = [
  { value: "quick_energy", label: "Quick Energy", emoji: "⚡" },
  { value: "high_protein", label: "High Protein", emoji: "💪" },
  { value: "light",        label: "Light",        emoji: "🥗" },
  { value: "balanced",     label: "Balanced",     emoji: "⚖️" },
  { value: "comfort",      label: "Comfort",      emoji: "🍲" },
];

const CALORIE_RANGES: { value: CalorieRange; label: string; sub: string }[] = [
  { value: "light",    label: "Light",    sub: "<400 kcal" },
  { value: "moderate", label: "Moderate", sub: "400–650" },
  { value: "hearty",   label: "Hearty",   sub: "650+ kcal" },
];

const PROTEIN_TARGETS: { value: ProteinTarget; label: string; sub: string }[] = [
  { value: "low",      label: "Low",      sub: "<15g" },
  { value: "moderate", label: "Moderate", sub: "15–30g" },
  { value: "high",     label: "High",     sub: "30g+" },
];

const DIETARY_RESTRICTIONS: { value: DietaryRestriction; label: string; emoji: string }[] = [
  { value: "vegetarian",  label: "Vegetarian",  emoji: "🌿" },
  { value: "vegan",       label: "Vegan",       emoji: "🌱" },
  { value: "gluten_free", label: "Gluten-free", emoji: "🌾" },
  { value: "dairy_free",  label: "Dairy-free",  emoji: "🥛" },
  { value: "nut_free",    label: "Nut-free",    emoji: "🥜" },
  { value: "low_sodium",  label: "Low sodium",  emoji: "🧂" },
];

function PreferencesPanel({
  preferences,
  isSaving,
  onSave,
  onClose,
}: {
  preferences: RecipePreferences;
  isSaving: boolean;
  onSave: (p: RecipePreferences) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<RecipePreferences>({ ...preferences });

  const toggleRestriction = (r: DietaryRestriction) => {
    setDraft((d) => ({
      ...d,
      dietaryRestrictions: d.dietaryRestrictions.includes(r)
        ? d.dietaryRestrictions.filter((x) => x !== r)
        : [...d.dietaryRestrictions, r],
    }));
  };

  return (
    <GlassCard className="mb-6 overflow-hidden animate-fade-in-down" hover={false}>
      <div className="h-1 bg-gradient-to-r from-frost-400 via-purple-400 to-fresh-400" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-frost-500" /> AI Recipe Preferences
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meal goal */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Meal Goal</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_GOALS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setDraft((d) => ({ ...d, mealGoal: d.mealGoal === value ? null : value }))}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                  draft.mealGoal === value
                    ? "bg-frost-500 text-white border-frost-500 shadow-sm"
                    : "glass text-slate-600 border-white/40 hover:border-frost-200"
                )}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {/* Calorie range */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              <Flame className="w-3 h-3 inline mr-1 text-orange-400" />Calories / Serving
            </p>
            <div className="flex gap-2">
              {CALORIE_RANGES.map(({ value, label, sub }) => (
                <button
                  key={value}
                  onClick={() => setDraft((d) => ({ ...d, calorieRange: d.calorieRange === value ? null : value }))}
                  className={cn(
                    "flex-1 flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all border",
                    draft.calorieRange === value
                      ? "bg-orange-400 text-white border-orange-400 shadow-sm"
                      : "glass text-slate-600 border-white/40 hover:border-orange-200"
                  )}
                >
                  <span className="font-semibold">{label}</span>
                  <span className={cn("text-[10px] mt-0.5", draft.calorieRange === value ? "text-orange-100" : "text-slate-400")}>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Protein target */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              <Zap className="w-3 h-3 inline mr-1 text-blue-400" />Protein / Serving
            </p>
            <div className="flex gap-2">
              {PROTEIN_TARGETS.map(({ value, label, sub }) => (
                <button
                  key={value}
                  onClick={() => setDraft((d) => ({ ...d, proteinTarget: d.proteinTarget === value ? null : value }))}
                  className={cn(
                    "flex-1 flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all border",
                    draft.proteinTarget === value
                      ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                      : "glass text-slate-600 border-white/40 hover:border-blue-200"
                  )}
                >
                  <span className="font-semibold">{label}</span>
                  <span className={cn("text-[10px] mt-0.5", draft.proteinTarget === value ? "text-blue-100" : "text-slate-400")}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dietary restrictions */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            <Leaf className="w-3 h-3 inline mr-1 text-fresh-500" />Dietary Restrictions
          </p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => toggleRestriction(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                  draft.dietaryRestrictions.includes(value)
                    ? "bg-fresh-500 text-white border-fresh-500 shadow-sm"
                    : "glass text-slate-600 border-white/40 hover:border-fresh-200"
                )}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Servings */}
        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
            <Users className="w-3 h-3 inline mr-1" />Servings
          </p>
          <div className="flex gap-2">
            {([1, 2, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => setDraft((d) => ({ ...d, servings: n }))}
                className={cn(
                  "w-12 h-10 rounded-xl text-sm font-bold transition-all border",
                  draft.servings === n
                    ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                    : "glass text-slate-600 border-white/40 hover:border-slate-300"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100/60">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-frost-500 to-frost-600 text-white shadow-sm hover:from-frost-600 hover:to-frost-700 transition-all disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving…" : "Save & Apply"}
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Active preferences summary pill row ───────────────────────────────────────

function PreferencesSummary({ preferences, onEdit }: { preferences: RecipePreferences; onEdit: () => void }) {
  const active: string[] = [];

  if (preferences.mealGoal && preferences.mealGoal !== "balanced") {
    const g = MEAL_GOALS.find((g) => g.value === preferences.mealGoal);
    if (g) active.push(`${g.emoji} ${g.label}`);
  }
  if (preferences.calorieRange) {
    const c = CALORIE_RANGES.find((c) => c.value === preferences.calorieRange);
    if (c) active.push(`🔥 ${c.sub}`);
  }
  if (preferences.proteinTarget) {
    const p = PROTEIN_TARGETS.find((p) => p.value === preferences.proteinTarget);
    if (p) active.push(`⚡ ${p.sub} protein`);
  }
  preferences.dietaryRestrictions.forEach((r) => {
    const d = DIETARY_RESTRICTIONS.find((d) => d.value === r);
    if (d) active.push(`${d.emoji} ${d.label}`);
  });
  if (preferences.servings !== 2) {
    active.push(`👤 ${preferences.servings} servings`);
  }

  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4 animate-fade-in">
      {active.map((label) => (
        <span key={label} className="px-2.5 py-1 rounded-full text-xs font-medium glass text-slate-600 border border-white/40">
          {label}
        </span>
      ))}
      <button onClick={onEdit} className="text-xs text-frost-600 hover:text-frost-800 font-medium underline underline-offset-2 transition-colors">
        Edit
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

// ── Fuzzy name match helper ──────────────────────────────────────────────────

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(fresh|frozen|canned|diced|sliced|chopped|minced|whole|organic|large|small|medium)\b/g, "")
    .trim();
}

function hydrateSavedRecipe(recipe: SavedRecipe, itemNames: string[]): SavedRecipe {
  const normalizedInventory = itemNames.map(normalizeForMatch);
  const matchedIngredients = recipe.ingredients.filter((ingredient) => {
    const normalized = normalizeForMatch(ingredient);
    return normalizedInventory.some((item) => item.includes(normalized) || normalized.includes(item));
  });
  const missingIngredients = recipe.ingredients.filter((ingredient) => !matchedIngredients.includes(ingredient));

  return {
    ...recipe,
    matchedIngredients,
    missingIngredients,
    matchPercentage: recipe.ingredients.length > 0
      ? Math.round((matchedIngredients.length / recipe.ingredients.length) * 100)
      : 0,
  };
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function RecipeForm({
  onSubmit,
  isSaving,
}: {
  onSubmit: (recipe: {
    title: string;
    ingredients: string[];
    instructions: string[];
    tags: string[];
    prepTime: number;
    servings: number;
  }) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tags, setTags] = useState("");
  const [prepTime, setPrepTime] = useState(20);
  const [servings, setServings] = useState(2);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedIngredients = splitLines(ingredients);
        const parsedInstructions = splitLines(instructions);
        if (!title.trim() || parsedIngredients.length === 0 || parsedInstructions.length === 0) return;
        onSubmit({
          title: title.trim(),
          ingredients: parsedIngredients,
          instructions: parsedInstructions,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          prepTime,
          servings,
        });
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="recipe-title" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Recipe name</label>
        <input
          id="recipe-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          placeholder="Tuesday tomato pasta"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="recipe-prep-time" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Prep time</label>
          <input
            id="recipe-prep-time"
            type="number"
            min={1}
            value={prepTime}
            onChange={(event) => setPrepTime(Number(event.target.value))}
            className="w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="recipe-servings" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Servings</label>
          <input
            id="recipe-servings"
            type="number"
            min={1}
            value={servings}
            onChange={(event) => setServings(Number(event.target.value))}
            className="w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="recipe-ingredients" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ingredients, one per line</label>
        <textarea
          id="recipe-ingredients"
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
          className="w-full min-h-32 glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          placeholder={"tomato\npasta\ngarlic\nolive oil"}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="recipe-instructions" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Instructions, one step per line</label>
        <textarea
          id="recipe-instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          className="w-full min-h-32 glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          placeholder={"Boil pasta.\nWarm garlic and tomatoes.\nToss together."}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="recipe-tags" className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tags</label>
        <input
          id="recipe-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          placeholder="quick, dinner, leftover-friendly"
        />
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-bold shadow-glow-frost transition-all disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save recipe"}
      </button>
    </form>
  );
}

function RecipesPage() {
  const { items, isLoading, updateItem, markConsumed } = useFoodItems();
  const { addItem: addShoppingItem } = useShoppingList();
  const {
    savedRecipes,
    isLoading: savedRecipesLoading,
    saveRecipe,
    deleteSavedRecipe,
    isSaving: isSavingRecipe,
    deletingId,
  } = useSavedRecipes();
  const { toast } = useToast();
  const [activeTab, setActiveTab]       = useState<"saved" | "classic" | "ai">("saved");
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showPrefs, setShowPrefs]       = useState(false);
  const [filter, setFilter]             = useState<RecipeFilter>("all");
  const [addedToListIds, setAddedToListIds] = useState<Set<string>>(new Set());
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [cookingState, setCookingState] = useState<Record<string, "idle" | "confirm" | "cooking" | "done">>({});
  const ai = useAIRecipes();
  const { preferences, savePreferences, isSaving } = useRecipePreferences();

  const itemNames       = items.map((i) => i.name);
  const classicRecipes  = findMatchingRecipes(itemNames).slice(0, 12);
  const matchedSavedRecipes = savedRecipes.map((recipe) => hydrateSavedRecipe(recipe, itemNames));
  const savedOriginalIds = new Set(savedRecipes.flatMap((recipe) => [recipe.originalRecipeId, recipe.id]).filter(Boolean));

  const runAISuggest = (prefs: RecipePreferences = preferences) => {
    if (items.length > 0) {
      ai.reset();
      ai.suggest(items, prefs);
    }
  };

  const handleAITab = () => {
    setActiveTab("ai");
    if (ai.status === "idle" && items.length > 0) {
      ai.suggest(items, preferences);
    }
  };

  const handleSavePrefs = (prefs: RecipePreferences) => {
    savePreferences(prefs);
    if (activeTab === "ai") runAISuggest(prefs);
  };

  const handleCreateRecipe = async (recipe: {
    title: string;
    ingredients: string[];
    instructions: string[];
    tags: string[];
    prepTime: number;
    servings: number;
  }) => {
    try {
      await saveRecipe({ ...recipe, source: "custom" });
      setShowAddRecipeModal(false);
      setActiveTab("saved");
      toast(`${recipe.title} saved`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save recipe", "error");
    }
  };

  const handleSaveFavourite = async (recipe: Recipe | AIRecipe) => {
    try {
      await saveRecipe({
        source: "ai_favourite",
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tags: recipe.tags,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        estimatedMacros: "estimatedMacros" in recipe ? recipe.estimatedMacros : undefined,
        originalRecipeId: recipe.id,
      });
      toast(`${recipe.title} saved to favourites`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save favourite", "error");
    }
  };

  const handleDeleteSavedRecipe = async (recipe: SavedRecipe) => {
    try {
      await deleteSavedRecipe(recipe.id);
      toast(`${recipe.title} removed`, "info");
    } catch {
      toast("Failed to remove recipe", "error");
    }
  };

  // ── Add missing ingredients to shopping list ────────────────────────────

  const handleAddToShoppingList = useCallback(async (recipe: Recipe | AIRecipe) => {
    setAddingRecipeId(recipe.id);
    try {
      for (const ingredient of recipe.missingIngredients) {
        await addShoppingItem({
          name: ingredient,
          category: "other",
          quantity: 1,
          unit: "stk",
        });
      }
      setAddedToListIds((prev) => new Set(prev).add(recipe.id));
      toast(`${recipe.missingIngredients.length} ingredient${recipe.missingIngredients.length > 1 ? "s" : ""} added to shopping list`, "success");
    } catch {
      toast("Failed to add ingredients to list", "error");
    } finally {
      setAddingRecipeId(null);
    }
  }, [addShoppingItem, toast]);

  // ── Cook recipe — deduct ingredients ────────────────────────────────────

  const handleCookRecipe = useCallback((recipe: Recipe | AIRecipe) => {
    setCookingState((prev) => ({ ...prev, [recipe.id]: "confirm" }));
  }, []);

  const handleCookCancel = useCallback((recipeId: string) => {
    setCookingState((prev) => ({ ...prev, [recipeId]: "idle" }));
  }, []);

  const handleCookConfirm = useCallback(async (recipe: Recipe | AIRecipe) => {
    setCookingState((prev) => ({ ...prev, [recipe.id]: "cooking" }));
    try {
      for (const ingredientName of recipe.matchedIngredients) {
        const normalized = normalizeForMatch(ingredientName);
        const match = items.find((item) => {
          const itemNorm = normalizeForMatch(item.name);
          return itemNorm.includes(normalized) || normalized.includes(itemNorm);
        });
        if (match) {
          if (match.quantity <= 1) {
            await markConsumed(match.id);
          } else {
            await updateItem(match.id, { quantity: match.quantity - 1 });
          }
        }
      }
      setCookingState((prev) => ({ ...prev, [recipe.id]: "done" }));
      toast(`Cooked "${recipe.title}" — inventory updated!`, "success");
      // Reset done state after a brief display
      setTimeout(() => {
        setCookingState((prev) => ({ ...prev, [recipe.id]: "idle" }));
      }, 3000);
    } catch {
      toast("Failed to update inventory", "error");
      setCookingState((prev) => ({ ...prev, [recipe.id]: "idle" }));
    }
  }, [items, updateItem, markConsumed, toast]);

  // ── Filtered lists ──────────────────────────────────────────────────────

  const filteredSaved   = applyRecipeFilter(matchedSavedRecipes, filter);
  const filteredClassic = applyRecipeFilter(classicRecipes, filter);
  const filteredAI      = applyRecipeFilter(ai.recipes, filter);

  if (isLoading || savedRecipesLoading) {
    return <PageSkeleton cards={3} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Recipes"
        subtitle="What can you cook with what you have?"
        icon={<BookOpen className="w-5 h-5 text-warning-600" />}
        actions={
          <button
            onClick={() => setShowAddRecipeModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Add Recipe
          </button>
        }
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-3 mb-5 animate-fade-in-up stagger-1">
        <div className="flex gap-1 glass rounded-2xl p-1.5" role="tablist" aria-label="Recipe source">
          <button
            onClick={() => setActiveTab("saved")}
            role="tab"
            aria-selected={activeTab === "saved"}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === "saved"
                ? "glass-heavy text-slate-800 shadow-glass"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
            )}
          >
            <Star className={cn("w-4 h-4", activeTab === "saved" && "text-warning-500")} /> Saved
          </button>
          <button
            onClick={() => setActiveTab("classic")}
            role="tab"
            aria-selected={activeTab === "classic"}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === "classic"
                ? "glass-heavy text-slate-800 shadow-glass"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
            )}
          >
            <ChefHat className={cn("w-4 h-4", activeTab === "classic" && "text-warning-500")} /> Classic
          </button>
          <button
            onClick={handleAITab}
            role="tab"
            aria-selected={activeTab === "ai"}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === "ai"
                ? "glass-heavy text-slate-800 shadow-glass"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
            )}
          >
            <Sparkles className={cn("w-4 h-4", activeTab === "ai" && "text-frost-500")} /> AI
          </button>
        </div>

        {/* Preferences toggle (AI tab only) */}
        {activeTab === "ai" && (
          <button
            onClick={() => setShowPrefs((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border",
              showPrefs
                ? "bg-frost-500 text-white border-frost-500 shadow-sm"
                : "glass text-slate-600 border-white/40 hover:border-frost-200"
            )}
          >
            <Settings2 className="w-4 h-4" />
            Preferences
          </button>
        )}
      </div>

      {/* Filter pills — shown for both tabs */}
      <FilterPills filter={filter} onChange={setFilter} />

      {/* Saved Recipes */}
      {activeTab === "saved" && (
        <>
          {matchedSavedRecipes.length > 0 ? (
            filteredSaved.length > 0 ? (
              <div className="grid gap-4">
                {filteredSaved.map((r, i) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    index={i}
                    addedToList={addedToListIds.has(r.id)}
                    isAddingToList={addingRecipeId === r.id}
                    cookedState={cookingState[r.id] ?? "idle"}
                    onAddToShoppingList={handleAddToShoppingList}
                    onCookRecipe={handleCookRecipe}
                    onCookConfirm={handleCookConfirm}
                    onCookCancel={() => handleCookCancel(r.id)}
                    onDeleteSaved={handleDeleteSavedRecipe}
                    isDeletingSaved={deletingId === r.id}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12 px-8" hover={false}>
                <div className="text-4xl mb-3 inline-block">🔍</div>
                <h3 className="font-bold text-slate-800 mb-1.5">No saved recipes match this filter</h3>
                <p className="text-sm text-slate-500">Try a different filter or save a new recipe.</p>
              </GlassCard>
            )
          ) : (
            <GlassCard className="text-center py-16 px-8" hover={false}>
              <div className="text-6xl mb-5 animate-float inline-block">⭐</div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">No saved recipes yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
                Add your own household recipes or save favourites from the AI tab.
              </p>
              <button
                onClick={() => setShowAddRecipeModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost transition-all active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" /> Add Recipe
              </button>
            </GlassCard>
          )}
        </>
      )}

      {/* Classic Recipes */}
      {activeTab === "classic" && (
        <>
          {classicRecipes.length > 0 ? (
            filteredClassic.length > 0 ? (
              <div className="grid gap-4">
                {filteredClassic.map((r, i) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    index={i}
                    addedToList={addedToListIds.has(r.id)}
                    isAddingToList={addingRecipeId === r.id}
                    cookedState={cookingState[r.id] ?? "idle"}
                    onAddToShoppingList={handleAddToShoppingList}
                    onCookRecipe={handleCookRecipe}
                    onCookConfirm={handleCookConfirm}
                    onCookCancel={() => handleCookCancel(r.id)}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12 px-8" hover={false}>
                <div className="text-4xl mb-3 inline-block">🔍</div>
                <h3 className="font-bold text-slate-800 mb-1.5">No recipes match this filter</h3>
                <p className="text-sm text-slate-500">Try a different filter or add more items to your inventory.</p>
              </GlassCard>
            )
          ) : (
            <GlassCard className="text-center py-16 px-8" hover={false}>
              <div className="text-6xl mb-5 animate-float inline-block">&#x1F468;&#x200D;&#x1F373;</div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">No recipe matches yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
                Add more items to your inventory and we'll match you with recipes you can cook right now.
              </p>
              <Link to="/items" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97]">
                <Package className="w-4 h-4" /> Add Items
              </Link>
            </GlassCard>
          )}
        </>
      )}

      {/* AI Recipes */}
      {activeTab === "ai" && (
        <>
          {/* Preferences panel */}
          {showPrefs && (
            <PreferencesPanel
              preferences={preferences}
              isSaving={isSaving}
              onSave={handleSavePrefs}
              onClose={() => setShowPrefs(false)}
            />
          )}

          {/* Active preferences summary */}
          {!showPrefs && (
            <PreferencesSummary preferences={preferences} onEdit={() => setShowPrefs(true)} />
          )}

          {ai.status === "loading" && (
            <GlassCard variant="frost" className="p-8 text-center" hover={false}>
              <div className="flex items-center justify-center gap-2 mb-3">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-frost-400 animate-bounce-subtle" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-frost-800 font-medium">Claude is crafting personalised recipes for your inventory…</p>
            </GlassCard>
          )}

          {ai.status === "no-key" && (
            <GlassCard variant="warning" className="p-6" hover={false}>
              <h3 className="font-bold text-warning-800 mb-2">API Key Required</h3>
              <p className="text-sm text-warning-700 mb-3">
                For local dev, add <code className="bg-warning-100 px-1 rounded">ANTHROPIC_API_KEY</code> to{" "}
                <code className="bg-warning-100 px-1 rounded">.dev.vars</code> (same names as production). For deployed Workers, use{" "}
                <code className="bg-warning-100 px-1 rounded">wrangler secret put ANTHROPIC_API_KEY</code>.
              </p>
            </GlassCard>
          )}

          {ai.status === "error" && (
            <GlassCard variant="danger" className="p-6" hover={false}>
              <p className="text-sm text-danger-700 mb-3">{ai.error}</p>
              <button
                onClick={() => ai.suggest(items, preferences)}
                className="px-4 py-2 glass text-danger-700 rounded-xl text-sm font-semibold hover:bg-danger-50 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </GlassCard>
          )}

          {ai.status === "success" && (
            <>
              <div className="flex items-center justify-between mb-4 animate-fade-in">
                <p className="text-xs text-slate-500">
                  {ai.cachedAt ? "Cached · " : ""}AI-generated · macros are estimates per serving
                </p>
                <button
                  onClick={() => runAISuggest()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-frost-600 hover:text-frost-800 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {filteredAI.length > 0 ? (
                <div className="grid gap-4">
                  {filteredAI.map((r, i) => (
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                      index={i}
                      ai
                      addedToList={addedToListIds.has(r.id)}
                      isAddingToList={addingRecipeId === r.id}
                      cookedState={cookingState[r.id] ?? "idle"}
                      onAddToShoppingList={handleAddToShoppingList}
                      onCookRecipe={handleCookRecipe}
                      onCookConfirm={handleCookConfirm}
                      onCookCancel={() => handleCookCancel(r.id)}
                      onSaveFavourite={handleSaveFavourite}
                      isSaved={savedOriginalIds.has(r.id)}
                      isSavingRecipe={isSavingRecipe}
                    />
                  ))}
                </div>
              ) : (
                <GlassCard className="text-center py-12 px-8" hover={false}>
                  <div className="text-4xl mb-3 inline-block">🔍</div>
                  <h3 className="font-bold text-slate-800 mb-1.5">No recipes match this filter</h3>
                  <p className="text-sm text-slate-500">Try a different filter or refresh AI suggestions.</p>
                </GlassCard>
              )}
            </>
          )}

          {ai.status === "idle" && items.length === 0 && (
            <GlassCard className="text-center py-16 px-8" hover={false}>
              <div className="text-5xl mb-4 animate-float inline-block">🛒</div>
              <h3 className="font-bold text-slate-800 mb-1.5">Your inventory is empty</h3>
              <p className="text-sm text-slate-500">Add some food items first and Claude will suggest recipes tailored to what you have.</p>
            </GlassCard>
          )}
        </>
      )}

      <Modal
        isOpen={showAddRecipeModal}
        onClose={() => setShowAddRecipeModal(false)}
        title="Add your recipe"
        size="lg"
      >
        <RecipeForm onSubmit={handleCreateRecipe} isSaving={isSavingRecipe} />
      </Modal>
    </div>
  );
}
