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
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EditorialEmpty from "@/components/ui/EditorialEmpty";
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
    { value: "zero_waste", label: "No shopping needed", indicator: "bg-[var(--ft-pickle)]", emoji: "\u{1F373}" },
    { value: "almost_there", label: "Almost there (\u22642 missing)", indicator: "bg-[#d97706]", emoji: "\u{1F6D2}" },
  ];

  return (
    <div className="flex gap-2 mb-5 flex-wrap animate-fade-in">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(21,19,15,0.55)] self-center mr-1">
        Filter \u00b7
      </span>
      {filters.map(({ value, label, indicator, emoji }) => {
        const active = filter === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-150",
              active
                ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)]"
                : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)] hover:-translate-y-0.5",
            )}
          >
            {indicator && <span className={cn("h-2 w-2", indicator)} />}
            {emoji && <span className="text-sm">{emoji}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Match-% ring ─────────────────────────────────────────────────────────────

function MatchRing({ pct }: { pct: number }) {
  const r = 18, c = 2 * Math.PI * r;
  // Editorial palette: pickle (great), amber (partial), ink-faded (few)
  const color = pct >= 80 ? "var(--ft-pickle)" : pct >= 50 ? "#b46c00" : "rgba(21,19,15,0.4)";
  const label = pct >= 80 ? "Great match" : pct >= 50 ? "Partial match" : "Few matches";
  return (
    <div className="relative group flex-shrink-0">
      <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-1 shadow-[2px_2px_0_var(--ft-ink)]">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(21,19,15,0.15)" strokeWidth="2.5" />
          <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="2.5"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
            strokeLinecap="butt" transform="rotate(-90 24 24)"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
          <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ft-ink)" fontFamily="Lora, serif">{pct}</text>
        </svg>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 border border-[var(--ft-ink)] bg-[var(--ft-ink)] font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ft-bone)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-10 shadow-[2px_2px_0_var(--ft-pickle)]">
        {label}
      </div>
    </div>
  );
}

// ── Macro badge strip (AI cards only) ────────────────────────────────────────

function MacroBadges({ macros }: { macros: NonNullable<AIRecipe["estimatedMacros"]> }) {
  // Editorial nutrition strip: ink-bordered ledger of macros
  const items = [
    { icon: <Flame className="w-3 h-3" />,   value: macros.calories, unit: "kcal",     accent: "var(--ft-signal)" },
    { icon: <Zap className="w-3 h-3" />,     value: macros.protein,  unit: "g protein", accent: "var(--ft-ink)" },
    { icon: null,                            value: macros.carbs,    unit: "g carbs",   accent: "var(--ft-pickle)" },
    { icon: null,                            value: macros.fat,      unit: "g fat",     accent: "rgba(21,19,15,0.45)" },
  ];
  return (
    <div className="grid grid-cols-4 border border-[var(--ft-ink)] bg-[var(--ft-paper)] mt-2 mb-1 divide-x divide-[var(--ft-ink)]">
      {items.map((it, i) => (
        <div key={i} className="flex flex-col items-center justify-center py-1.5 px-1">
          <div className="flex items-center gap-1">
            {it.icon && <span style={{ color: it.accent }}>{it.icon}</span>}
            <span className="font-display text-base text-[var(--ft-ink)] leading-none">{it.value}</span>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.55)] mt-0.5">{it.unit}</span>
        </div>
      ))}
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
    <GlassCard className="overflow-hidden" staggerIndex={index} accentBar={ai ? "fresh" : undefined}>
      <div className="p-5">
        {/* Recipe number kicker */}
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">
            {ai ? "AI · plate" : savedRecipe ? "Saved · plate" : "Recipe · plate"} · {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)]">
            {recipe.matchPercentage}% match
          </span>
        </div>
        <div className="flex items-start gap-4">
          <MatchRing pct={recipe.matchPercentage} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-display text-2xl text-[var(--ft-ink)] leading-tight">{recipe.title}</h3>
              {ai && <Badge variant="info" size="sm"><Sparkles className="w-3 h-3 inline mr-0.5" />AI</Badge>}
              {savedRecipe?.source === "custom" && <Badge variant="success" size="sm">Yours</Badge>}
              {savedRecipe?.source === "ai_favourite" && <Badge variant="info" size="sm"><Star className="w-3 h-3 inline mr-0.5" />Favourite</Badge>}
            </div>
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(21,19,15,0.55)] mb-3">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.prepTime} min</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings} servings</span>
            </div>
            {/* Estimated macros (AI only) */}
            {aiRecipe?.estimatedMacros && <MacroBadges macros={aiRecipe.estimatedMacros} />}
            {/* Ingredient ledger */}
            <div className="mt-3 mb-3 border border-[var(--ft-ink)] bg-[var(--ft-bone)]">
              <div className="flex items-baseline justify-between border-b border-[var(--ft-ink)] px-2.5 py-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[rgba(21,19,15,0.55)]">Pantry check</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ft-pickle)]">
                  {recipe.matchedIngredients.length} have · {recipe.missingIngredients.length} need
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5">
                {recipe.matchedIngredients.map((ing) => (
                  <span key={ing} className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.18)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ft-ink)]">
                    <Check className="w-2.5 h-2.5" /> {ing}
                  </span>
                ))}
                {recipe.missingIngredients.slice(0, 4).map((ing) => (
                  <span key={ing} className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-[rgba(21,19,15,0.35)] bg-[var(--ft-paper)] font-mono text-[10px] uppercase tracking-[0.12em] text-[rgba(21,19,15,0.55)]">
                    <X className="w-2.5 h-2.5" /> {ing}
                  </span>
                ))}
                {recipe.missingIngredients.length > 4 && (
                  <span className="px-2 py-0.5 border border-dashed border-[rgba(21,19,15,0.3)] font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.5)]">
                    +{recipe.missingIngredients.length - 4} more
                  </span>
                )}
              </div>
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="ghost" size="sm">{tag}</Badge>)}
            </div>
          </div>
        </div>

        {/* Action buttons row — brutalist editorial */}
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          {/* Add missing to shopping list */}
          {hasMissing && onAddToShoppingList && (
            <button
              onClick={() => onAddToShoppingList(recipe)}
              disabled={addedToList || isAddingToList}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 border font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-150",
                addedToList
                  ? "border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.18)] text-[var(--ft-ink)] cursor-default"
                  : "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-60"
              )}
            >
              {isAddingToList ? (
                <>
                  <div className="h-3 w-3 border-2 border-[var(--ft-bone)] border-t-transparent rounded-full animate-spin" />
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
                  Add {recipe.missingIngredients.length} to list
                </>
              )}
            </button>
          )}

          {ai && onSaveFavourite && (
            <button
              onClick={() => onSaveFavourite(recipe)}
              disabled={isSaved || isSavingRecipe}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 border font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-150",
                isSaved
                  ? "border-[#b46c00] bg-[rgba(245,158,11,0.12)] text-[#b46c00] cursor-default"
                  : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(245,158,11,0.12)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] disabled:opacity-60",
              )}
            >
              <Star className="w-3.5 h-3.5" />
              {isSaved ? "Saved" : isSavingRecipe ? "Saving…" : "Save favourite"}
            </button>
          )}

          {savedRecipe && onDeleteSaved && (
            <button
              onClick={() => onDeleteSaved(savedRecipe)}
              disabled={isDeletingSaved}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-[var(--ft-signal)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ft-signal)] hover:bg-[var(--ft-signal)] hover:text-[var(--ft-bone)] transition-colors duration-150 disabled:opacity-60"
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
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ft-ink)] hover:bg-[var(--ft-pickle)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] transition-all duration-150"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  I made this
                </button>
              )}
              {cookedState === "confirm" && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 border border-[#b46c00] bg-[rgba(245,158,11,0.1)] animate-fade-in">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ft-ink)]">Reduce quantities?</span>
                  <button
                    onClick={() => onCookConfirm?.(recipe)}
                    className="px-2 py-0.5 border border-[var(--ft-ink)] bg-[var(--ft-pickle)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ft-ink)] hover:bg-[var(--ft-ink)] hover:text-[var(--ft-bone)] transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={onCookCancel}
                    className="px-2 py-0.5 border border-[var(--ft-ink)] bg-[var(--ft-bone)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ft-ink)] hover:bg-[var(--ft-ink)] hover:text-[var(--ft-bone)] transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
              {cookedState === "cooking" && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ft-ink)] animate-fade-in">
                  <div className="h-3.5 w-3.5 border-2 border-[var(--ft-ink)] border-t-transparent rounded-full animate-spin" />
                  Filing changes…
                </div>
              )}
              {cookedState === "done" && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 border border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.18)] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ft-ink)] animate-fade-in">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Cooked
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 w-full flex items-center justify-between px-4 py-2.5 border border-[var(--ft-ink)] bg-[var(--ft-bone)] font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ft-ink)] hover:bg-[var(--ft-pickle)] transition-colors duration-150"
        >
          <span>{expanded ? "Hide" : "Read"} the method</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <ol className="mt-4 space-y-3 animate-fade-in-down border-l-2 border-[var(--ft-pickle)] pl-4">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm font-sans text-[rgba(21,19,15,0.78)] leading-relaxed"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}>
                <span className="h-6 w-6 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 tracking-[0.08em] text-[var(--ft-ink)] shadow-[1px_1px_0_var(--ft-pickle)]">{String(i + 1).padStart(2, "0")}</span>
                <span className="pt-0.5">{step}</span>
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

  // Editorial pill / segmented helpers (local — only used here)
  const pill = (active: boolean) => cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-150",
    active
      ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)]"
      : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)] hover:-translate-y-0.5"
  );
  const segment = (active: boolean) => cn(
    "flex-1 flex flex-col items-center py-2 px-1 border transition-all duration-150",
    active
      ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-signal)]"
      : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)]"
  );
  const sectionLabel = "font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(21,19,15,0.6)] mb-2 flex items-center gap-1.5";

  return (
    <GlassCard className="mb-6 overflow-hidden animate-fade-in-down" hover={false} accentBar="fresh">
      <div className="p-6">
        <div className="flex items-baseline justify-between mb-5 border-b border-[var(--ft-ink)] pb-3">
          <div className="flex items-baseline gap-3">
            <Settings2 className="w-4 h-4 text-[var(--ft-pickle)] self-center" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">Editorial briefing</span>
            <h3 className="font-display text-2xl text-[var(--ft-ink)] leading-none">Recipe preferences</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="border border-[var(--ft-ink)] bg-[var(--ft-bone)] p-1 text-[var(--ft-ink)] hover:bg-[var(--ft-ink)] hover:text-[var(--ft-bone)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meal goal */}
        <div className="mb-6">
          <p className={sectionLabel}>Sub · 01 · meal goal</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_GOALS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setDraft((d) => ({ ...d, mealGoal: d.mealGoal === value ? null : value }))}
                className={pill(draft.mealGoal === value)}
              >
                <span className="text-sm">{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Calorie range */}
          <div>
            <p className={sectionLabel}>
              <Flame className="w-3 h-3 text-[var(--ft-signal)]" />Sub · 02 · calories / serving
            </p>
            <div className="flex">
              {CALORIE_RANGES.map(({ value, label, sub }, i) => (
                <button
                  key={value}
                  onClick={() => setDraft((d) => ({ ...d, calorieRange: d.calorieRange === value ? null : value }))}
                  className={cn(segment(draft.calorieRange === value), i > 0 && "-ml-px")}
                >
                  <span className="font-display text-base leading-none">{label}</span>
                  <span className={cn("font-mono text-[9px] uppercase tracking-[0.18em] mt-1", draft.calorieRange === value ? "text-[var(--ft-pickle)]" : "text-[rgba(21,19,15,0.55)]")}>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Protein target */}
          <div>
            <p className={sectionLabel}>
              <Zap className="w-3 h-3 text-[var(--ft-ink)]" />Sub · 03 · protein / serving
            </p>
            <div className="flex">
              {PROTEIN_TARGETS.map(({ value, label, sub }, i) => (
                <button
                  key={value}
                  onClick={() => setDraft((d) => ({ ...d, proteinTarget: d.proteinTarget === value ? null : value }))}
                  className={cn(segment(draft.proteinTarget === value), i > 0 && "-ml-px")}
                >
                  <span className="font-display text-base leading-none">{label}</span>
                  <span className={cn("font-mono text-[9px] uppercase tracking-[0.18em] mt-1", draft.proteinTarget === value ? "text-[var(--ft-pickle)]" : "text-[rgba(21,19,15,0.55)]")}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dietary restrictions */}
        <div className="mb-6">
          <p className={sectionLabel}>
            <Leaf className="w-3 h-3 text-[var(--ft-pickle)]" />Sub · 04 · dietary restrictions
          </p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => toggleRestriction(value)}
                className={pill(draft.dietaryRestrictions.includes(value))}
              >
                <span className="text-sm">{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Servings */}
        <div className="mb-6">
          <p className={sectionLabel}>
            <Users className="w-3 h-3" />Sub · 05 · servings
          </p>
          <div className="flex">
            {([1, 2, 4] as const).map((n, i) => (
              <button
                key={n}
                onClick={() => setDraft((d) => ({ ...d, servings: n }))}
                className={cn(
                  "w-14 h-12 border font-display text-2xl transition-all duration-150",
                  i > 0 && "-ml-px",
                  draft.servings === n
                    ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)] z-10 relative"
                    : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)]"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-dashed border-[rgba(21,19,15,0.3)]">
          <button onClick={onClose} className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.6)] hover:text-[var(--ft-signal)] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 border border-[var(--ft-ink)] bg-[var(--ft-ink)] font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150 disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Filing…" : "Save & apply"}
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
    <div className="flex items-center gap-2 flex-wrap mb-5 animate-fade-in">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)] mr-1">Briefing ·</span>
      {active.map((label) => (
        <span key={label} className="inline-flex items-center px-2.5 py-1 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ft-ink)]">
          {label}
        </span>
      ))}
      <button onClick={onEdit} className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] underline underline-offset-4 decoration-[var(--ft-pickle)] hover:text-[var(--ft-signal)] transition-colors">
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
      {/* Editorial form fields — sharp ink-bordered parchment inputs */}
      <FormField id="recipe-title" label="01 · Recipe name">
        <input
          id="recipe-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={editorialInput}
          placeholder="Tuesday tomato pasta"
          required
        />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="recipe-prep-time" label="02 · Prep time (min)">
          <input
            id="recipe-prep-time"
            type="number"
            min={1}
            value={prepTime}
            onChange={(event) => setPrepTime(Number(event.target.value))}
            className={editorialInput}
          />
        </FormField>
        <FormField id="recipe-servings" label="03 · Servings">
          <input
            id="recipe-servings"
            type="number"
            min={1}
            value={servings}
            onChange={(event) => setServings(Number(event.target.value))}
            className={editorialInput}
          />
        </FormField>
      </div>
      <FormField id="recipe-ingredients" label="04 · Ingredients · one per line" hint="Pantry items, raw">
        <textarea
          id="recipe-ingredients"
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
          className={cn(editorialInput, "min-h-32 font-mono text-[12px] leading-relaxed")}
          placeholder={"tomato\npasta\ngarlic\nolive oil"}
          required
        />
      </FormField>
      <FormField id="recipe-instructions" label="05 · Method · one step per line" hint="Numbered when displayed">
        <textarea
          id="recipe-instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          className={cn(editorialInput, "min-h-32 leading-relaxed")}
          placeholder={"Boil pasta.\nWarm garlic and tomatoes.\nToss together."}
          required
        />
      </FormField>
      <FormField id="recipe-tags" label="06 · Tags · comma-separated">
        <input
          id="recipe-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className={editorialInput}
          placeholder="quick, dinner, leftover-friendly"
        />
      </FormField>
      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3 border border-[var(--ft-ink)] bg-[var(--ft-ink)] font-mono text-[12px] uppercase tracking-[0.28em] text-[var(--ft-bone)] shadow-[4px_4px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-pickle)] transition-all duration-150 disabled:opacity-60"
      >
        {isSaving ? "Filing the recipe…" : "File this recipe"}
      </button>
    </form>
  );
}

// ── Editorial form helpers ──────────────────────────────────────────────────
const editorialInput =
  "w-full border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-3.5 py-2.5 text-sm text-[var(--ft-ink)] placeholder:text-[rgba(21,19,15,0.4)] " +
  "outline-none transition-all duration-150 font-sans " +
  "focus:shadow-[3px_3px_0_var(--ft-pickle)] focus:-translate-y-px";

function FormField({
  id, label, hint, children,
}: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-ink)]">{label}</span>
        {hint && <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)]">{hint}</span>}
      </label>
      {children}
    </div>
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
        eyebrow="Section · Kitchen Desk"
        title="Recipes"
        subtitle="A daily column of what you can cook with what's already in the larder."
        icon={<BookOpen className="w-5 h-5 text-[var(--ft-pickle)]" />}
        actions={
          <Button
            onClick={() => setShowAddRecipeModal(true)}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
          >
            File a recipe
          </Button>
        }
      />

      {/* Editorial tab strip — 3-up segmented with kicker numerals */}
      <div className="flex items-stretch gap-3 mb-6 animate-fade-in-up stagger-1">
        <div className="relative flex-1 border border-[var(--ft-ink)] bg-[var(--ft-paper)]" role="tablist" aria-label="Recipe source">
          <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
          <div className="grid grid-cols-3 divide-x divide-[var(--ft-ink)]">
            {([
              { key: "saved",   label: "Saved",   ord: "01", icon: Star,     onClick: () => setActiveTab("saved") },
              { key: "classic", label: "Classic", ord: "02", icon: ChefHat,  onClick: () => setActiveTab("classic") },
              { key: "ai",      label: "AI",      ord: "03", icon: Sparkles, onClick: handleAITab },
            ] as const).map((tab) => {
              const active = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={tab.onClick}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-3 transition-colors duration-150",
                    active ? "bg-[var(--ft-ink)] text-[var(--ft-bone)]" : "text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)]",
                  )}
                >
                  <span className={cn(
                    "font-mono text-[9px] tracking-[0.32em]",
                    active ? "text-[var(--ft-pickle)]" : "text-[rgba(21,19,15,0.45)]",
                  )}>
                    {tab.ord}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em]">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferences toggle (AI tab only) — brutalist editorial */}
        {activeTab === "ai" && (
          <button
            onClick={() => setShowPrefs((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 px-4 border font-mono text-[11px] uppercase tracking-[0.2em] transition-all duration-150",
              showPrefs
                ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)]"
                : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)]"
            )}
          >
            <Settings2 className="w-4 h-4" />
            Briefing
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
              <EditorialEmpty icon="🔍" kicker="Filter notice" title="No saved recipes match this filter." body="Try a different filter or save a new recipe." />
            )
          ) : (
            <EditorialEmpty icon="⭐" kicker="Recipe ledger · empty" title="No saved recipes yet." body="Add your own household recipes or save favourites from the AI tab.">
              <Button
                onClick={() => setShowAddRecipeModal(true)}
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
              >
                File a recipe
              </Button>
            </EditorialEmpty>
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
              <EditorialEmpty icon="🔍" kicker="Filter notice" title="No recipes match this filter." body="Try a different filter or add more items to your inventory." />
            )
          ) : (
            <EditorialEmpty icon="&#x1F468;&#x200D;&#x1F373;" kicker="Pantry · sparse" title="No recipe matches yet." body="Add more items to your inventory and we'll match you with recipes you can cook right now.">
              <Link to="/items" className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--ft-ink)] bg-[var(--ft-ink)] font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150">
                <Package className="w-4 h-4" /> Add items
              </Link>
            </EditorialEmpty>
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
            <GlassCard variant="frost" className="p-10 text-center" hover={false} accentBar="fresh">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)] mb-3">On the wire</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-2.5 h-2.5 bg-[var(--ft-ink)] animate-bounce-subtle" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="font-display text-xl text-[var(--ft-ink)] leading-tight">Claude is composing recipes for your larder.</p>
            </GlassCard>
          )}

          {ai.status === "no-key" && (
            <GlassCard variant="warning" className="p-6" hover={false} accentBar="warning">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b46c00] mb-2">Configuration · stop press</p>
              <h3 className="font-display text-2xl text-[var(--ft-ink)] mb-3 leading-tight">API key required</h3>
              <p className="font-sans text-sm text-[rgba(21,19,15,0.75)]">
                For local dev, add <code className="border border-[#b46c00] bg-[rgba(245,158,11,0.12)] px-1.5 py-0.5 font-mono text-[11px]">ANTHROPIC_API_KEY</code> to{" "}
                <code className="border border-[#b46c00] bg-[rgba(245,158,11,0.12)] px-1.5 py-0.5 font-mono text-[11px]">.dev.vars</code>. For deployed Workers, use{" "}
                <code className="border border-[#b46c00] bg-[rgba(245,158,11,0.12)] px-1.5 py-0.5 font-mono text-[11px]">wrangler secret put ANTHROPIC_API_KEY</code>.
              </p>
            </GlassCard>
          )}

          {ai.status === "error" && (
            <GlassCard variant="danger" className="p-6" hover={false} accentBar="danger">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-signal)] mb-2">Stop press</p>
              <p className="font-sans text-sm text-[rgba(21,19,15,0.78)] mb-4">{ai.error}</p>
              <button
                onClick={() => ai.suggest(items, preferences)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--ft-signal)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ft-signal)] hover:bg-[var(--ft-signal)] hover:text-[var(--ft-bone)] transition-colors duration-150"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </GlassCard>
          )}

          {ai.status === "success" && (
            <>
              <div className="flex items-baseline justify-between mb-5 border-b border-[var(--ft-ink)] pb-2 animate-fade-in">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(21,19,15,0.55)]">
                  {ai.cachedAt ? "Cached · " : ""}AI · macros estimated per serving
                </p>
                <button
                  onClick={() => runAISuggest()}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] underline underline-offset-4 decoration-[var(--ft-pickle)] hover:text-[var(--ft-signal)] transition-colors"
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
                <EditorialEmpty icon="🔍" kicker="Filter notice" title="No recipes match this filter." body="Try a different filter or refresh the AI." />
              )}
            </>
          )}

          {ai.status === "idle" && items.length === 0 && (
            <EditorialEmpty icon="🛒" kicker="Larder · empty" title="Your inventory is empty." body="Add some food items first and Claude will suggest recipes tailored to what you have." />
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
