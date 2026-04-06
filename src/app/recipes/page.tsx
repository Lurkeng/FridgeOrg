'use client';

import { useMemo, useState } from 'react';
import { useFoodItems } from '@/hooks/useFoodItems';
import { useAIRecipes } from '@/hooks/useAIRecipes';
import { findMatchingRecipes } from '@/data/recipes';
import { AIRecipe } from '@/app/api/recipes/suggest/route';
import { Badge } from '@/components/ui/Badge';
import GlassCard from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  BookOpen, Clock, Users, ChevronDown, ChevronUp,
  Check, X, Sparkles, AlertCircle, RefreshCw, KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Shared types ─────────────────────────────────────────────────────────────
interface DisplayRecipe {
  id: string;
  title: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  prepTime: number;
  servings: number;
  instructions: string[];
  tags: string[];
  aiGenerated?: boolean;
}

// ─── Match ring ───────────────────────────────────────────────────────────────
function MatchRing({ percentage }: { percentage: number }) {
  const color = percentage >= 75 ? '#22c55e' : percentage >= 50 ? '#f59e0b' : '#ef4444';
  const r = 16, circ = 2 * Math.PI * r;
  const dash = (percentage / 100) * circ;
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-slate-800">{percentage}%</span>
      </div>
    </div>
  );
}

// ─── Recipe card ──────────────────────────────────────────────────────────────
function RecipeCard({
  recipe,
  index,
  expanded,
  onToggle,
}: {
  recipe: DisplayRecipe;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <GlassCard className="overflow-hidden" staggerIndex={index} hover>
      {recipe.aiGenerated && (
        <div className="h-0.5 bg-gradient-to-r from-frost-400 via-purple-400 to-fresh-400" />
      )}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <MatchRing percentage={recipe.matchPercentage} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h3 className="font-bold text-slate-900 text-lg leading-tight">{recipe.title}</h3>
              {recipe.aiGenerated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-frost-100 to-purple-100 text-purple-700 border border-purple-200/50">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {recipe.prepTime} min
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {recipe.servings} servings
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recipe.matchedIngredients.map((ing) => (
                <span key={ing} className="inline-flex items-center gap-1 px-2 py-0.5 bg-fresh-100/80 text-fresh-700 rounded-full text-xs font-medium border border-fresh-200/50">
                  <Check className="w-2.5 h-2.5" /> {ing}
                </span>
              ))}
              {recipe.missingIngredients.map((ing) => (
                <span key={ing} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100/80 text-slate-500 rounded-full text-xs border border-slate-200/50">
                  <X className="w-2.5 h-2.5" /> {ing}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {recipe.tags.map((tag) => (
                <Badge key={tag} variant="info" size="sm" className="capitalize">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="mt-4 flex items-center gap-1.5 text-sm text-frost-600 hover:text-frost-800 font-semibold transition-colors"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Hide instructions</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Show instructions</>}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/30 bg-white/30 p-5 animate-fade-in-down">
          <h4 className="font-bold text-slate-800 mb-3">Instructions</h4>
          <ol className="space-y-3">
            {recipe.instructions.map((step, idx) => (
              <li key={idx}
                className="flex gap-3 text-sm text-slate-700 animate-fade-in-up"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}>
                <span className="flex-shrink-0 w-6 h-6 glass bg-frost-50/80 text-frost-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const { items, isLoaded }                           = useFoodItems();
  const { recipes: aiRecipes, status: aiStatus,
          errorMsg, suggest, reset }                  = useAIRecipes();
  const [expandedRecipe, setExpandedRecipe]           = useState<string | null>(null);
  const [filterTag, setFilterTag]                     = useState<string | null>(null);
  const [activeTab, setActiveTab]                     = useState<'classic' | 'ai'>('classic');

  // Classic (static) recipes
  const classicRecipes = useMemo<DisplayRecipe[]>(() => {
    const itemNames = items.map((i) => i.name);
    return findMatchingRecipes(itemNames).map((r) => ({ ...r, aiGenerated: false }));
  }, [items]);

  const displayRecipes: DisplayRecipe[] =
    activeTab === 'ai'
      ? aiRecipes
      : classicRecipes;

  const filteredRecipes = filterTag
    ? displayRecipes.filter((r) => r.tags.includes(filterTag))
    : displayRecipes;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    displayRecipes.forEach((r) => r.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [displayRecipes]);

  const toggleExpand = (id: string) =>
    setExpandedRecipe((prev) => (prev === id ? null : id));

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass rounded-2xl px-8 py-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-frost-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Finding recipes…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Recipe Suggestions"
        subtitle={
          items.length > 0
            ? `Based on ${items.length} items — prioritising expiring ingredients`
            : 'Add items to your inventory to get recipe suggestions'
        }
        icon={<BookOpen className="w-5 h-5 text-warning-600" />}
      />

      {items.length === 0 ? (
        <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
          <div className="text-6xl mb-4 animate-float inline-block">👨‍🍳</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No items to match</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            Add food items to your inventory first, and we&apos;ll suggest recipes based on what you have.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 glass rounded-2xl p-1 mb-6 animate-fade-in-up stagger-1 w-fit">
            <button
              onClick={() => { setActiveTab('classic'); setFilterTag(null); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeTab === 'classic'
                  ? 'glass-heavy text-slate-800 shadow-glass'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <BookOpen className="w-3.5 h-3.5" /> Classic ({classicRecipes.length})
            </button>
            <button
              onClick={() => { setActiveTab('ai'); setFilterTag(null); if (aiStatus === 'idle') suggest(items); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeTab === 'ai'
                  ? 'glass-heavy text-slate-800 shadow-glass'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              AI Suggestions
              {aiStatus === 'success' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{aiRecipes.length}</span>
              )}
            </button>
          </div>

          {/* ── AI states ── */}
          {activeTab === 'ai' && aiStatus === 'loading' && (
            <GlassCard className="p-8 text-center animate-scale-in" hover={false}>
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-frost-400 to-purple-500 flex items-center justify-center shadow-glow-frost animate-pulse-soft">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 mb-1">Asking Claude Haiku…</p>
                  <p className="text-sm text-slate-500">Analysing your inventory and crafting recipe ideas</p>
                </div>
                <div className="flex gap-1.5">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-frost-400 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'ai' && aiStatus === 'no-key' && (
            <GlassCard variant="warning" className="p-6 animate-scale-in" hover={false}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-warning-100 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-warning-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-warning-800 mb-1">API key not configured</h3>
                  <p className="text-sm text-warning-700 mb-3">
                    Add your Anthropic API key to enable AI recipe suggestions. It only takes a minute.
                  </p>
                  <ol className="text-sm text-warning-700 space-y-1">
                    <li>1. Get a free key at <span className="font-mono font-bold">console.anthropic.com</span></li>
                    <li>2. Copy <span className="font-mono bg-warning-100 px-1 rounded">.env.local.example</span> to <span className="font-mono bg-warning-100 px-1 rounded">.env.local</span></li>
                    <li>3. Add <span className="font-mono bg-warning-100 px-1 rounded">ANTHROPIC_API_KEY=sk-ant-...</span></li>
                    <li>4. Restart the dev server</li>
                  </ol>
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'ai' && aiStatus === 'error' && (
            <GlassCard variant="danger" className="p-5 animate-scale-in flex items-start gap-3" hover={false}>
              <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-danger-800 mb-0.5">Something went wrong</p>
                <p className="text-sm text-danger-700">{errorMsg}</p>
              </div>
              <button
                onClick={() => { reset(); suggest(items); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-danger-600 hover:text-danger-800 transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </GlassCard>
          )}

          {/* Refresh AI button when showing results */}
          {activeTab === 'ai' && aiStatus === 'success' && (
            <div className="flex items-center justify-between mb-4 animate-fade-in">
              <p className="text-xs text-slate-400 font-medium">
                ✨ Generated by Claude Haiku · cached 30 min
              </p>
              <button
                onClick={() => { reset(); suggest(items); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-frost-600 hover:text-frost-800 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          )}

          {/* Tag filters (shown for both tabs when recipes exist) */}
          {filteredRecipes.length > 0 && allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up stagger-2">
              <button
                onClick={() => setFilterTag(null)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  !filterTag
                    ? 'bg-gradient-to-r from-frost-600 to-frost-500 text-white shadow-glow-frost'
                    : 'glass text-slate-600 hover:text-slate-800',
                )}
              >
                All ({displayRecipes.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all',
                    filterTag === tag
                      ? 'bg-gradient-to-r from-frost-600 to-frost-500 text-white shadow-glow-frost'
                      : 'glass text-slate-600 hover:text-slate-800',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Classic empty state */}
          {activeTab === 'classic' && classicRecipes.length === 0 && (
            <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
              <div className="text-6xl mb-4 animate-float inline-block">🤔</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No classic recipes match</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-5">
                Our built-in recipes don&apos;t quite fit your current inventory. Try the AI tab for custom suggestions!
              </p>
              <button
                onClick={() => { setActiveTab('ai'); if (aiStatus === 'idle') suggest(items); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-purple-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all"
              >
                <Sparkles className="w-4 h-4" /> Try AI Suggestions
              </button>
            </GlassCard>
          )}

          {/* Recipe list */}
          {(activeTab === 'classic' ? classicRecipes.length > 0 : aiStatus === 'success') && (
            <div className="grid gap-4">
              {filteredRecipes.map((recipe, i) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  index={i}
                  expanded={expandedRecipe === recipe.id}
                  onToggle={() => toggleExpand(recipe.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
