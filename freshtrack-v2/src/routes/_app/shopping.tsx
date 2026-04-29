import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRestockSuggestions } from "@/hooks/useRestockSuggestions";
import { useRestockPredictions } from "@/hooks/useRestockPredictions";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import GlassCard from "@/components/ui/GlassCard";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn, getCategoryEmoji, formatRelativeDate } from "@/lib/utils";
import type { FoodCategory, ShoppingListItem, StorePriceEntry } from "@/types";
import {
  ShoppingCart, Plus, Trash2, Check, ChevronDown,
  Tag, RefreshCw, X, Store, RotateCcw, AlertTriangle,
  Calendar, Gift, TrendingUp, Clock, ArrowDownUp,
} from "lucide-react";
import {
  getInSeasonNow,
  getUpcomingHolidays,
  NORWEGIAN_HOLIDAYS,
} from "@/lib/norwegian-seasons";
import type { HolidayList } from "@/lib/norwegian-seasons";

// ── Quick-add text parsing ──────────────────────────────────────────────

/** Maps common Norwegian / English item names to a food category */
const ITEM_CATEGORY_MAP: Record<string, FoodCategory> = {
  // Dairy
  melk: "dairy", milk: "dairy", ost: "dairy", cheese: "dairy",
  smor: "dairy", "smør": "dairy", butter: "dairy", yoghurt: "dairy",
  yogurt: "dairy", fløte: "dairy", flote: "dairy", cream: "dairy",
  rømme: "dairy", romme: "dairy", egg: "dairy", eggs: "dairy",
  // Meat
  kjottdeig: "meat", "kjøttdeig": "meat", "ground beef": "meat",
  biff: "meat", steak: "meat", svinekjott: "meat", bacon: "meat",
  polse: "meat", "pølse": "meat", sausage: "meat",
  // Poultry
  kylling: "poultry", chicken: "poultry", kyllingfilet: "poultry",
  "chicken breast": "poultry", kalkun: "poultry", turkey: "poultry",
  // Seafood
  laks: "seafood", salmon: "seafood", torsk: "seafood", cod: "seafood",
  reker: "seafood", shrimp: "seafood", fisk: "seafood", fish: "seafood",
  tuna: "seafood", tunfisk: "seafood",
  // Produce
  epler: "produce", apples: "produce", apple: "produce", eple: "produce",
  bananer: "produce", bananas: "produce", banan: "produce", banana: "produce",
  agurk: "produce", cucumber: "produce", tomat: "produce", tomato: "produce",
  tomater: "produce", tomatoes: "produce",
  løk: "produce", lok: "produce", onion: "produce",
  gulrot: "produce", carrot: "produce", paprika: "produce", pepper: "produce",
  salat: "produce", lettuce: "produce", avokado: "produce", avocado: "produce",
  poteter: "produce", potatoes: "produce", potet: "produce", potato: "produce",
  brokkoli: "produce", broccoli: "produce", spinat: "produce", spinach: "produce",
  // Grains
  brod: "grains", "brød": "grains", bread: "grains",
  ris: "grains", rice: "grains", pasta: "grains", nudler: "grains",
  noodles: "grains", havregryn: "grains", oats: "grains",
  // Beverages
  juice: "beverages", vann: "beverages", water: "beverages",
  brus: "beverages", soda: "beverages", kaffe: "beverages", coffee: "beverages",
  te: "beverages", tea: "beverages", ol: "beverages", "øl": "beverages",
  // Condiments
  ketchup: "condiments", sennep: "condiments", mustard: "condiments",
  majones: "condiments", mayo: "condiments", soyasaus: "condiments",
  salt: "condiments", "black pepper": "condiments", "svart pepper": "condiments", olje: "condiments", oil: "condiments",
  // Snacks
  chips: "snacks", sjokolade: "snacks", chocolate: "snacks",
  notter: "snacks", "nøtter": "snacks", nuts: "snacks", godteri: "snacks",
  candy: "snacks",
};

function detectCategory(name: string): FoodCategory {
  const lower = name.toLowerCase().trim();
  // Try exact match first
  if (ITEM_CATEGORY_MAP[lower]) return ITEM_CATEGORY_MAP[lower];
  // Try matching individual words
  for (const word of lower.split(/\s+/)) {
    if (ITEM_CATEGORY_MAP[word]) return ITEM_CATEGORY_MAP[word];
  }
  // Try partial / fuzzy match (item name contains a known key)
  for (const [key, cat] of Object.entries(ITEM_CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return "other";
}

/** Parse "2 melk" → { quantity: 2, name: "melk" }, or "melk" → { quantity: 1, name: "melk" } */
function parseQuickAddText(text: string): { name: string; quantity: number } {
  const trimmed = text.trim();
  // Match leading number (int or decimal), optional "x" separator, then the rest
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*[xX]?\s+(.+)$/);
  if (match) {
    const qty = parseFloat(match[1].replace(",", "."));
    return { quantity: qty > 0 ? qty : 1, name: match[2].trim() };
  }
  return { quantity: 1, name: trimmed };
}

export const Route = createFileRoute("/_app/shopping")({
  component: ShoppingPage,
});

// ── Sort modes ───────────────────────────────────────────────────────────

type SortMode = "category" | "store";

/** Default alphabetical/category ordering */
const CATEGORY_ORDER: FoodCategory[] = [
  "produce","dairy","meat","poultry","seafood","grains",
  "beverages","condiments","frozen_meals","snacks","leftovers","other",
];

/**
 * Typical Norwegian grocery store aisle order (Rema 1000 / Kiwi / Meny style):
 *  1. Produce — fruit & veg at the entrance
 *  2. Bakery / Grains — bread section near produce
 *  3. Dairy — milk, cheese, yogurt along the cooler wall
 *  4. Meat & Poultry — adjacent fridges
 *  5. Seafood — next to meat
 *  6. Leftovers / Deli — chilled ready-meals
 *  7. Condiments — sauces & spices in center aisles
 *  8. Beverages — drinks aisle
 *  9. Snacks — chips, chocolate
 * 10. Frozen — freezer aisles at the back
 * 11. Other — misc
 */
const STORE_LAYOUT_ORDER: FoodCategory[] = [
  "produce","grains","dairy","meat","poultry","seafood",
  "leftovers","condiments","beverages","snacks","frozen_meals","other",
];

const STORE_AISLE_LABELS: Record<FoodCategory, string> = {
  produce: "Frukt & Gr\u00F8nt",
  grains: "Bakevarer & Br\u00F8d",
  dairy: "Meieri",
  meat: "Kj\u00F8tt",
  poultry: "Fjerkre",
  seafood: "Fisk & Skalldyr",
  leftovers: "Ferdigmat",
  condiments: "Krydder & Sauser",
  beverages: "Drikke",
  snacks: "Snacks & Godteri",
  frozen_meals: "Frysevarer",
  other: "Annet",
};

const CATEGORY_LABELS: Record<FoodCategory, string> = {
  produce: "Produce", dairy: "Dairy", meat: "Meat", poultry: "Poultry",
  seafood: "Seafood", grains: "Grains", beverages: "Beverages",
  condiments: "Condiments", frozen_meals: "Frozen", snacks: "Snacks",
  leftovers: "Leftovers", other: "Other",
};

// ── Quick-add form ───────────────────────────────────────────────────────

const categories: { value: FoodCategory; label: string }[] = CATEGORY_ORDER.map((c) => ({
  value: c, label: CATEGORY_LABELS[c],
}));

const units = ["item","lb","oz","kg","g","L","mL","cup","pack","bottle","can","bag","box","dozen"];

const baseInput =
  "w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 " +
  "transition-all duration-200 outline-none " +
  "focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 hover:bg-white/75";

// ── Main page ────────────────────────────────────────────────────────────

function ShoppingPage() {
  const {
    uncheckedItems, checkedItems, byCategory, estimatedTotal,
    isLoading, addItem, toggleItem, deleteItem, clearChecked,
    fetchPrices, fetchAllPrices, isFetchingPrices,
  } = useShoppingList();
  const { recentItems, expiringItems } = useRestockSuggestions();
  const { predictions } = useRestockPredictions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [quickAddText, setQuickAddText] = useState("");
  const [pricingItemId, setPricingItemId] = useState<string | null>(null);

  // Sort mode — persisted in localStorage
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("freshtrack-sort-mode") as SortMode) || "category";
    }
    return "category";
  });
  useEffect(() => {
    localStorage.setItem("freshtrack-sort-mode", sortMode);
  }, [sortMode]);

  // Modal form state
  const [name, setName]         = useState("");
  const [category, setCategory] = useState<FoodCategory>("other");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit]         = useState("item");
  const [notes, setNotes]       = useState("");

  // Seasonal & Holiday state
  const [seasonalOpen, setSeasonalOpen] = useState(true);
  const [expandedHoliday, setExpandedHoliday] = useState<string | null>(null);
  const [showAllHolidays, setShowAllHolidays] = useState(false);
  const [browseExpandedHoliday, setBrowseExpandedHoliday] = useState<string | null>(null);

  const seasonalItems = getInSeasonNow();
  const upcomingHolidays = getUpcomingHolidays();

  const resetForm = () => { setName(""); setCategory("other"); setQuantity(1); setUnit("item"); setNotes(""); };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const raw = quickAddText.trim();
    if (!raw) return;

    const parsed = parseQuickAddText(raw);
    const cat = detectCategory(parsed.name);

    try {
      await addItem({
        name: parsed.name,
        category: cat,
        quantity: parsed.quantity,
        unit: "item",
        notes: null,
      });
      setQuickAddText("");
      toast(`${parsed.name} added to list`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add item", "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addItem({ name: name.trim(), category, quantity, unit, notes: notes.trim() || null });
      resetForm();
      setShowAddModal(false);
      toast(`${name.trim()} added to list`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add item", "error");
    }
  };

  const handleToggle = async (item: ShoppingListItem) => {
    try {
      await toggleItem(item.id, !item.checked);
    } catch {
      toast("Failed to update item", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      toast("Item removed", "info");
    } catch {
      toast("Failed to remove item", "error");
    }
  };

  const handleClearChecked = async () => {
    try {
      await clearChecked();
      toast("Checked items cleared", "success");
    } catch {
      toast("Failed to clear items", "error");
    }
  };

  const handleFetchPrices = async () => {
    try {
      const result = await fetchAllPrices();
      toast(`Prices updated for ${result.updated} item${result.updated !== 1 ? "s" : ""}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to fetch prices", "error");
    }
  };

  const handleFetchItemPrices = async (item: ShoppingListItem) => {
    setPricingItemId(item.id);
    try {
      const result = await fetchPrices(item.id);
      if (result.prices.length > 0) {
        toast(`Cheapest price found for ${item.name}`, "success");
      } else {
        toast(`No prices found for ${item.name}`, "info");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to fetch prices", "error");
    } finally {
      setPricingItemId(null);
    }
  };

  const handleAddSuggestion = async (name: string, category: string) => {
    try {
      await addItem({
        name,
        category: category as FoodCategory,
        quantity: 1,
        unit: "item",
        notes: null,
      });
      // Refresh suggestions so the added item disappears from the list
      queryClient.invalidateQueries({ queryKey: ["restockSuggestions"] });
      toast(`${name} added to list`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add item", "error");
    }
  };

  const handleAddPrediction = async (name: string, category: string) => {
    try {
      await addItem({
        name,
        category: category as FoodCategory,
        quantity: 1,
        unit: "stk",
        notes: null,
      });
      queryClient.invalidateQueries({ queryKey: ["restock-predictions"] });
      toast(`${name} added to list`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add item", "error");
    }
  };

  if (isLoading) {
    return <PageSkeleton cards={4} />;
  }

  const totalItems = uncheckedItems.length + checkedItems.length;
  const activeOrder = sortMode === "store" ? STORE_LAYOUT_ORDER : CATEGORY_ORDER;
  const sortedCategories = activeOrder.filter((c) => byCategory[c]?.length);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Shopping List"
        subtitle={`${totalItems} item${totalItems !== 1 ? "s" : ""} \u00B7 ${uncheckedItems.length} remaining`}
        icon={<ShoppingCart className="w-5 h-5 text-frost-600" />}
        actions={
          <div className="flex items-center gap-2">
            {uncheckedItems.length > 0 && (
              <button
                onClick={handleFetchPrices}
                disabled={isFetchingPrices}
                className="inline-flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-sm font-semibold text-frost-700 hover:bg-frost-50/80 transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isFetchingPrices && "animate-spin")} />
                {isFetchingPrices ? "Checking\u2026" : "Cheapest overall"}
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        }
      />

      {/* Price summary banner */}
      {estimatedTotal > 0 && (
        <div className="glass-frost rounded-2xl p-4 mb-6 flex items-center justify-between animate-fade-in-up stagger-1">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-frost-600" />
            <span className="text-sm font-semibold text-slate-700">Estimated total (cheapest prices)</span>
          </div>
          <span className="text-lg font-bold text-frost-700">{estimatedTotal.toFixed(0)} kr</span>
        </div>
      )}

      {/* Quick-add bar */}
      {!showAddModal && (
        <div className="glass rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 animate-fade-in-up stagger-2">
          <input
            ref={quickAddRef}
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={handleQuickAdd}
            placeholder="Type item name and press Enter"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
          />
          {quickAddText && (
            <button
              onClick={() => setQuickAddText("")}
              className="w-6 h-6 rounded-full bg-slate-200/70 hover:bg-slate-300/70 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Clear"
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
          <button
            onClick={() => {
              if (quickAddText.trim()) {
                handleQuickAdd({ key: "Enter" } as React.KeyboardEvent<HTMLInputElement>);
              } else {
                quickAddRef.current?.focus();
              }
            }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-frost-500 to-frost-600 flex items-center justify-center text-white shadow-sm hover:shadow-glow-frost transition-all active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sort mode toggle */}
      {uncheckedItems.length > 1 && (
        <div className="flex items-center justify-between mb-4 animate-fade-in-up stagger-2">
          <div className="flex gap-1 glass rounded-xl p-1">
            <button
              onClick={() => setSortMode("category")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                sortMode === "category"
                  ? "glass-heavy text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/30",
              )}
            >
              <ArrowDownUp className="w-3 h-3" />
              Category
            </button>
            <button
              onClick={() => setSortMode("store")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                sortMode === "store"
                  ? "glass-heavy text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/30",
              )}
            >
              <Store className="w-3 h-3" />
              Store Layout
            </button>
          </div>
          {sortMode === "store" && (
            <span className="text-[10px] text-slate-400 font-medium animate-fade-in">
              Sorted by aisle order
            </span>
          )}
        </div>
      )}

      {/* Unchecked items grouped by category */}
      {sortedCategories.length > 0 ? (
        <div className="space-y-5 animate-fade-in-up stagger-2">
          {sortedCategories.map((cat, catIndex) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                {sortMode === "store" && (
                  <span className="w-5 h-5 rounded-full bg-frost-100 text-frost-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {catIndex + 1}
                  </span>
                )}
                <span className="text-lg">{getCategoryEmoji(cat)}</span>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {sortMode === "store" ? STORE_AISLE_LABELS[cat] : CATEGORY_LABELS[cat]}
                </h3>
                <span className="text-xs text-slate-400">({byCategory[cat].length})</span>
              </div>
              <div className="space-y-2">
                {byCategory[cat].map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onFetchPrices={handleFetchItemPrices}
                    isFetchingPrices={pricingItemId === item.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : uncheckedItems.length === 0 && checkedItems.length === 0 ? (
        <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
          <div className="text-6xl mb-5 animate-float inline-block">&#x1F6D2;</div>
          <h3 className="font-bold text-slate-800 text-lg mb-2">Your shopping list is empty</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Add items or let FreshTrack suggest restocks from your inventory.
          </p>
          <button
            onClick={() => quickAddRef.current?.focus()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Add First Item
          </button>
        </GlassCard>
      ) : null}

      {/* Checked items */}
      {checkedItems.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Checked ({checkedItems.length})
            </h3>
            <button
              onClick={handleClearChecked}
              className="text-xs font-semibold text-danger-500 hover:text-danger-700 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          </div>
          <div className="space-y-1.5 opacity-60">
            {checkedItems.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onFetchPrices={handleFetchItemPrices}
                isFetchingPrices={pricingItemId === item.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Smart Restock — purchase pattern predictions */}
      {predictions.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Smart Restock
            </h3>
          </div>
          <div className="space-y-2">
            {predictions.map((prediction) => (
              <div
                key={`prediction-${prediction.name}`}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3 border border-indigo-200/40 bg-indigo-50/20 hover:bg-indigo-50/40 transition-all"
              >
                <span className="text-lg">{getCategoryEmoji(prediction.category as FoodCategory)}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800 capitalize">{prediction.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-medium">
                      <Clock className="w-3 h-3" />
                      Every ~{prediction.averageIntervalDays}d
                    </span>
                    {prediction.daysUntilNeeded < 0 ? (
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50/80 px-1.5 py-0.5 rounded-full">
                        Due now
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50/80 px-1.5 py-0.5 rounded-full">
                        Due in {prediction.daysUntilNeeded}d
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAddPrediction(prediction.name, prediction.category)}
                  className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-sm hover:shadow-md transition-all active:scale-95 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring Soon — restock suggestions */}
      {expiringItems.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-warning-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Expiring Soon — restock?
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringItems.map((item) => (
              <button
                key={`expiring-${item.name}`}
                onClick={() => handleAddSuggestion(item.name, item.category)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-medium text-slate-700 border border-warning-200/60 bg-warning-50/40 hover:bg-warning-100/60 hover:border-warning-300/60 hover:shadow-sm transition-all active:scale-95"
              >
                <span>{getCategoryEmoji(item.category as FoodCategory)}</span>
                <span>{item.name}</span>
                <span className="text-[10px] text-warning-600 font-semibold">
                  {formatRelativeDate(item.expiryDate)}
                </span>
                <Plus className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Restocks — from waste log history */}
      {recentItems.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-4 h-4 text-frost-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Suggested Restocks
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentItems.map((item) => (
              <button
                key={`recent-${item.name}`}
                onClick={() => handleAddSuggestion(item.name, item.category)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-medium text-slate-600 border border-frost-200/50 hover:bg-frost-50/60 hover:border-frost-300/50 hover:text-slate-800 hover:shadow-sm transition-all active:scale-95"
              >
                <span>{getCategoryEmoji(item.category as FoodCategory)}</span>
                <span>{item.name}</span>
                <Plus className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Seasonal & Holidays section */}
      {(seasonalItems.length > 0 || upcomingHolidays.length > 0) && (
        <div className="mt-8 animate-fade-in-up">
          <button
            onClick={() => setSeasonalOpen((v) => !v)}
            className="flex items-center gap-2 mb-3 group"
          >
            <Calendar className="w-4 h-4 text-fresh-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Seasonal & Holidays
            </h3>
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", seasonalOpen && "rotate-180")} />
          </button>

          {seasonalOpen && (
            <div className="space-y-4">
              {/* In Season Now */}
              {seasonalItems.length > 0 && (
                <GlassCard className="p-4" hover={false}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🌿</span>
                    <h4 className="text-sm font-bold text-slate-800">In Season Now</h4>
                    <span className="text-xs text-slate-400">— typically cheaper & fresher</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {seasonalItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleAddSuggestion(item.name, item.category)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-medium text-slate-700 border border-fresh-200/50 hover:bg-fresh-50/60 hover:border-fresh-300/50 hover:shadow-sm transition-all active:scale-95"
                      >
                        <span>{item.emoji}</span>
                        <span>{item.name}</span>
                        <Plus className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                  {seasonalItems.some((i) => i.tip) && (
                    <p className="text-[10px] text-fresh-600 mt-2 italic">
                      {seasonalItems.find((i) => i.tip)?.tip}
                    </p>
                  )}
                </GlassCard>
              )}

              {/* Upcoming Holidays */}
              {upcomingHolidays.map((holiday) => (
                <GlassCard key={holiday.id} className="overflow-hidden" hover={false}>
                  <button
                    onClick={() => setExpandedHoliday(expandedHoliday === holiday.id ? null : holiday.id)}
                    className="w-full p-4 flex items-center gap-3 text-left"
                  >
                    <span className="text-2xl">{holiday.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800">{holiday.name}</h4>
                      <p className="text-xs text-slate-500">{holiday.description}</p>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform flex-shrink-0", expandedHoliday === holiday.id && "rotate-180")} />
                  </button>

                  {expandedHoliday === holiday.id && (
                    <div className="px-4 pb-4 animate-fade-in-down">
                      <div className="space-y-1.5 mb-3">
                        {holiday.items.map((hi) => (
                          <div key={hi.name} className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100/40 last:border-0">
                            <span className="font-medium">{hi.name}</span>
                            <span className="text-slate-400">{hi.quantity} {hi.unit}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          for (const hi of holiday.items) {
                            try {
                              await addItem({ name: hi.name, category: hi.category, quantity: hi.quantity, unit: hi.unit, notes: null });
                            } catch { /* skip duplicates */ }
                          }
                          toast(`${holiday.items.length} items added from ${holiday.name}!`, "success");
                        }}
                        className="w-full py-2 bg-gradient-to-r from-frost-500 to-frost-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-glow-frost transition-all active:scale-[0.97]"
                      >
                        Add all {holiday.items.length} items to list
                      </button>
                    </div>
                  )}
                </GlassCard>
              ))}

              {/* Browse All Holidays */}
              <button
                onClick={() => setShowAllHolidays(true)}
                className="flex items-center gap-1.5 px-3 py-2 glass rounded-xl text-xs font-semibold text-frost-600 hover:text-frost-800 hover:bg-white/70 transition-all group"
              >
                <Gift className="w-3.5 h-3.5" />
                Browse all holiday lists
                <ChevronDown className="w-3 h-3 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* All Holidays Modal */}
      <Modal isOpen={showAllHolidays} onClose={() => { setShowAllHolidays(false); setBrowseExpandedHoliday(null); }} title="Norwegian Holiday Lists" subtitle="Pre-built shopping lists for celebrations" size="lg">
        <div className="space-y-3">
          {NORWEGIAN_HOLIDAYS.map((holiday) => (
            <GlassCard key={holiday.id} className="overflow-hidden" hover={false}>
              <button
                onClick={() => setBrowseExpandedHoliday(browseExpandedHoliday === holiday.id ? null : holiday.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <span className="text-2xl">{holiday.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800">{holiday.name}</h4>
                  <p className="text-xs text-slate-500">{holiday.description} · {holiday.items.length} items</p>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform flex-shrink-0", browseExpandedHoliday === holiday.id && "rotate-180")} />
              </button>
              {browseExpandedHoliday === holiday.id && (
                <div className="px-4 pb-4 animate-fade-in-down">
                  <div className="space-y-1.5 mb-3">
                    {holiday.items.map((hi) => (
                      <div key={hi.name} className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100/40 last:border-0">
                        <span className="font-medium">{hi.name}</span>
                        <span className="text-slate-400">{hi.quantity} {hi.unit}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      for (const hi of holiday.items) {
                        try {
                          await addItem({ name: hi.name, category: hi.category, quantity: hi.quantity, unit: hi.unit, notes: null });
                        } catch { /* skip duplicates */ }
                      }
                      setShowAllHolidays(false);
                      setBrowseExpandedHoliday(null);
                      toast(`${holiday.items.length} items added from ${holiday.name}!`, "success");
                    }}
                    className="w-full py-2 bg-gradient-to-r from-frost-500 to-frost-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-glow-frost transition-all active:scale-[0.97]"
                  >
                    Add all {holiday.items.length} items to list
                  </button>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add to Shopping List" subtitle="What do you need to buy?" size="lg">
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Item Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Whole milk, Chicken breast…" className={baseInput} autoFocus required />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {categories.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={cn("flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-all",
                    category === cat.value ? "border-frost-400/60 bg-frost-50/80 text-frost-700 shadow-sm" : "border-white/30 glass text-slate-600 hover:border-frost-200/50 hover:text-slate-800")}>
                  <span className="text-base">{getCategoryEmoji(cat.value)}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                min={0.1} step={0.1} className={baseInput} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className={cn(baseInput, "bg-white/60 cursor-pointer")}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Notes <span className="text-slate-400 normal-case font-normal">(optional)</span>
            </label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Brand preference, size, etc." className={baseInput} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 glass rounded-xl text-sm font-semibold text-slate-600 hover:bg-white/80 transition-all">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-bold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97]">
              Add to List
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Individual item row ──────────────────────────────────────────────────

function ShoppingItemRow({
  item, onToggle, onDelete, onFetchPrices, isFetchingPrices,
}: {
  item: ShoppingListItem;
  onToggle: (item: ShoppingListItem) => void;
  onDelete: (id: string) => void;
  onFetchPrices: (item: ShoppingListItem) => void;
  isFetchingPrices: boolean;
}) {
  const [showPrices, setShowPrices] = useState(false);
  const prices: StorePriceEntry[] = item.comparison_prices ?? [];

  return (
    <div className={cn("glass rounded-xl px-4 py-3 flex items-center gap-3 group transition-all relative",
      item.checked && "opacity-60")}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item)}
        className={cn(
          "w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all",
          item.checked
            ? "bg-fresh-500 border-fresh-500 text-white"
            : "border-slate-300 hover:border-frost-400 bg-white/50",
        )}
      >
        {item.checked && <Check className="w-3.5 h-3.5" />}
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", item.checked && "line-through text-slate-400")}>
            {item.name}
          </span>
          <span className="text-xs text-slate-400">{item.quantity} {item.unit}</span>
        </div>
        {item.notes && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      {/* Price actions */}
      <button
        onClick={() => onFetchPrices(item)}
        disabled={isFetchingPrices}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-frost-50/80 text-frost-700 text-xs font-semibold hover:bg-frost-100/80 transition-all flex-shrink-0 disabled:opacity-50"
      >
        <RefreshCw className={cn("w-3 h-3", isFetchingPrices && "animate-spin")} />
        {isFetchingPrices ? "Checking" : "Cheapest"}
      </button>

      {/* Price chip */}
      {item.cheapest_price != null && (
        <button
          onClick={() => setShowPrices(!showPrices)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-fresh-50/80 text-fresh-700 text-xs font-semibold hover:bg-fresh-100/80 transition-all flex-shrink-0"
        >
          <Store className="w-3 h-3" />
          {item.cheapest_price.toFixed(0)} kr
          {prices.length > 1 && (
            <ChevronDown className={cn("w-3 h-3 transition-transform", showPrices && "rotate-180")} />
          )}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-danger-500 hover:bg-danger-50/80 transition-all flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Expanded price comparison */}
      {showPrices && prices.length > 1 && (
        <div className="absolute right-4 top-full mt-1 z-10 glass-heavy rounded-xl p-3 shadow-glass min-w-[200px] animate-fade-in-down">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Price Comparison</p>
          {prices.map((p, i) => (
            <div key={p.store} className="flex items-center justify-between py-1">
              <span className={cn("text-xs", i === 0 ? "font-bold text-fresh-700" : "text-slate-600")}>{p.store}</span>
              <span className={cn("text-xs font-semibold", i === 0 ? "text-fresh-700" : "text-slate-500")}>{p.price.toFixed(2)} kr</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
