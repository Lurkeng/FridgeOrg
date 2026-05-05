import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRestockSuggestions } from "@/hooks/useRestockSuggestions";
import { useRestockPredictions } from "@/hooks/useRestockPredictions";
import { usePurchaseHistorySummary } from "@/hooks/usePurchaseHistorySummary";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { PageSection } from "@/components/ui/PageSection";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn, getCategoryEmoji, formatRelativeDate } from "@/lib/utils";
import { getDefaultLocation, getDefaultShelfLife } from "@/lib/shelf-life";
import { parseShoppingListText, type ParsedShoppingListItem } from "@/features/shopping";
import { useAppPreferences } from "@/lib/app-preferences";
import type { FoodCategory, PutAwayItemOverride, ShoppingListItem, StorePriceEntry, StorageLocation } from "@/types";
import {
  ShoppingCart, Plus, Trash2, Check, ChevronDown,
  Tag, RefreshCw, X, Store, RotateCcw, AlertTriangle,
  Calendar, Gift, TrendingUp, Clock, ArrowDownUp, Refrigerator, Snowflake, Archive,
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
  "w-full border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-3.5 py-2.5 text-sm text-[var(--ft-ink)] placeholder:text-[rgba(21,19,15,0.4)] " +
  "outline-none transition-all duration-150 font-sans " +
  "focus:shadow-[3px_3px_0_var(--ft-pickle)] focus:-translate-y-px";

// ── Editorial form field helper ─────────────────────────────────────────────
function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-ink)]">{label}</span>
        {hint && <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

function ShoppingPage() {
  const {
    lists, activeListId, setActiveList, createList, renameList, deleteList, setDefaultList,
    uncheckedItems, checkedItems, byCategory, estimatedTotal,
    isLoading, addItem, toggleItem, deleteItem, clearChecked, putAwayItems, undoPutAway,
    fetchPrices, fetchAllPrices, isFetchingPrices,
  } = useShoppingList();
  const { recentItems, expiringItems } = useRestockSuggestions(activeListId);
  const { predictions } = useRestockPredictions(activeListId);
  const { summary } = usePurchaseHistorySummary();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useAppPreferences();
  const checkedItemsSignature = useMemo(
    () => checkedItems.map((item) => `${item.id}:${item.name}:${item.category}:${item.notes ?? ""}`).join("|"),
    [checkedItems],
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPutAwayModal, setShowPutAwayModal] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showPasteListModal, setShowPasteListModal] = useState(false);
  const [storeMode, setStoreMode] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("freshtrack-store-mode") === "true";
    return false;
  });
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [quickAddText, setQuickAddText] = useState("");
  const [pricingItemId, setPricingItemId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [defaultPutAwayLocation, setDefaultPutAwayLocation] = useState<StorageLocation>("fridge");
  const [putAwayOverrides, setPutAwayOverrides] = useState<Record<string, PutAwayItemOverride>>({});
  const [lastPutAwayBatchId, setLastPutAwayBatchId] = useState<string | null>(null);
  const [pasteListText, setPasteListText] = useState("");
  const [parsedPasteItems, setParsedPasteItems] = useState<ParsedShoppingListItem[]>([]);

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
  useEffect(() => {
    localStorage.setItem("freshtrack-store-mode", String(storeMode));
    if (storeMode) setSortMode("store");
  }, [storeMode]);

  useEffect(() => {
    if (!showPutAwayModal) return;
    setPutAwayOverrides((current) => {
      const next: Record<string, PutAwayItemOverride> = {};
      for (const item of checkedItems) {
        const location = current[item.id]?.location ?? getDefaultLocation(item.category);
        const days = getDefaultShelfLife(item.name, item.category, location);
        next[item.id] = {
          id: item.id,
          location,
          expiryDate: current[item.id]?.expiryDate ?? new Date(Date.now() + days * 86_400_000).toISOString().split("T")[0],
          shelf: current[item.id]?.shelf ?? null,
          notes: current[item.id]?.notes ?? item.notes ?? null,
        };
      }
      return next;
    });
  }, [checkedItemsSignature, showPutAwayModal]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handlePreviewPasteList = () => {
    setParsedPasteItems(parseShoppingListText(pasteListText));
  };

  const handleImportPasteList = async () => {
    if (!parsedPasteItems.length) return;
    try {
      for (const item of parsedPasteItems) {
        await addItem({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          notes: null,
        });
      }
      toast(`${parsedPasteItems.length} item${parsedPasteItems.length !== 1 ? "s" : ""} imported`, "success");
      setShowPasteListModal(false);
      setPasteListText("");
      setParsedPasteItems([]);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to import list", "error");
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

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      const list = await createList(newListName.trim());
      setActiveList(list.id);
      setShowNewListModal(false);
      setNewListName("");
      toast(`Created list: ${list.name}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create list", "error");
    }
  };

  const handleRenameActiveList = async () => {
    if (!activeListId) return;
    const list = lists.find((l) => l.id === activeListId);
    if (!list) return;
    const nextName = window.prompt("Rename list", list.name);
    if (!nextName || !nextName.trim() || nextName.trim() === list.name) return;
    try {
      await renameList(activeListId, nextName.trim());
      toast("List renamed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to rename list", "error");
    }
  };

  const handleDeleteActiveList = async () => {
    if (!activeListId) return;
    const list = lists.find((l) => l.id === activeListId);
    if (!list || list.is_default) return;
    if (!window.confirm(`Delete list "${list.name}"? Items will move to the default list.`)) return;
    try {
      await deleteList(activeListId);
      toast("List deleted", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete list", "error");
    }
  };

  const handleSetDefaultList = async () => {
    if (!activeListId) return;
    try {
      await setDefaultList(activeListId);
      toast("Set as default list", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to set default list", "error");
    }
  };

  const handlePutAwayChecked = async () => {
    if (!checkedItems.length) return;
    try {
      const result = await putAwayItems({
        itemIds: checkedItems.map((item) => item.id),
        defaultLocation: defaultPutAwayLocation,
        itemOverrides: checkedItems.map((item) => putAwayOverrides[item.id]).filter(Boolean),
      });
      setShowPutAwayModal(false);
      setLastPutAwayBatchId(result.batchId ?? null);
      toast(`${result.imported} item${result.imported !== 1 ? "s" : ""} moved to inventory and saved to history`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to put away items", "error");
    }
  };

  const handleApplyDestinationToAll = (location: StorageLocation) => {
    setDefaultPutAwayLocation(location);
    setPutAwayOverrides((current) => {
      const next = { ...current };
      for (const item of checkedItems) {
        const days = getDefaultShelfLife(item.name, item.category, location);
        next[item.id] = {
          ...(next[item.id] ?? { id: item.id }),
          location,
          expiryDate: new Date(Date.now() + days * 86_400_000).toISOString().split("T")[0],
        };
      }
      return next;
    });
  };

  const handleUndoPutAway = async () => {
    if (!lastPutAwayBatchId) return;
    try {
      const result = await undoPutAway(lastPutAwayBatchId);
      setLastPutAwayBatchId(null);
      toast(`Restored ${result.restored} item${result.restored !== 1 ? "s" : ""} to the shopping list`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to undo put-away", "error");
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
      queryClient.invalidateQueries({ queryKey: ["restockSuggestions", activeListId] });
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
      queryClient.invalidateQueries({ queryKey: ["restock-predictions", activeListId] });
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
        eyebrow="Section \u00B7 Shopping Desk"
        title={t("shopping.title")}
        subtitle={`${totalItems} ${t("shopping.items")} \u00B7 ${uncheckedItems.length} ${t("shopping.remaining")}`}
        icon={<ShoppingCart className="w-5 h-5 text-[var(--ft-pickle)]" />}
        actions={
          <div className="flex items-center gap-2">
            {uncheckedItems.length > 0 && (
              <button
                onClick={handleFetchPrices}
                disabled={isFetchingPrices}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] transition-all duration-150 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isFetchingPrices && "animate-spin")} />
                {isFetchingPrices ? t("shopping.checking") : t("shopping.cheapestOverall")}
              </button>
            )}
            <Button
              onClick={() => setShowPasteListModal(true)}
              variant="secondary"
              icon={<Plus className="w-4 h-4" />}
              className={cn(storeMode && "hidden")}
            >
              {t("shopping.pasteList")}
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
            >
              {t("shopping.addItem")}
            </Button>
          </div>
        }
      />

      {/* List selector toolbar */}
      <div className={cn("relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3 mb-4 animate-fade-in-up stagger-1", storeMode && "hidden")}>
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)] mr-2">List ·</span>
          <select
            value={activeListId ?? ""}
            onChange={(e) => setActiveList(e.target.value)}
            className="border border-[var(--ft-ink)] bg-[var(--ft-bone)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ft-ink)] outline-none focus:shadow-[2px_2px_0_var(--ft-pickle)]"
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}{list.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => setShowNewListModal(true)}>{t("shopping.newList")}</Button>
          <Button size="sm" variant="ghost" onClick={handleRenameActiveList}>{t("shopping.rename")}</Button>
          <Button size="sm" variant="ghost" onClick={handleSetDefaultList}>{t("shopping.setDefault")}</Button>
          <Button size="sm" variant="ghost" onClick={handleDeleteActiveList}>{t("shopping.delete")}</Button>
        </div>
      </div>

      {/* Grocery recap — editorial 4-up ledger */}
      <div className={cn("relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-4 mb-6 animate-fade-in-up stagger-1", storeMode && "hidden")}>
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-ink)]" />
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)]">Recap · {t("shopping.groceryRecap")}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)]">Last 30 days</p>
        </div>
        <div className="grid sm:grid-cols-4 border border-[var(--ft-ink)] bg-[var(--ft-bone)] divide-x divide-[var(--ft-ink)]">
          {[
            { label: t("shopping.boughtThisMonth"),    big: true,  primary: String(summary.monthItemsBought) },
            { label: t("shopping.mostBoughtCategory"), big: false, primary: summary.mostBoughtCategory ?? "—" },
            { label: t("shopping.estimatedSpend"),     big: true,  primary: summary.estimatedSpend.toFixed(0), suffix: "kr" },
            { label: t("shopping.topRepeatedItem"),    big: false, primary: summary.topRepeatedItem ?? "—" },
          ].map((stat, i) => (
            <div key={i} className="px-3 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[rgba(21,19,15,0.55)] mb-1.5">{stat.label}</p>
              {stat.big ? (
                <p className="font-display text-2xl text-[var(--ft-ink)] leading-none">
                  {stat.primary}
                  {stat.suffix && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-pickle)] ml-1">{stat.suffix}</span>}
                </p>
              ) : (
                <p className="font-display text-base text-[var(--ft-ink)] leading-tight">{stat.primary}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Price summary banner — pickle-accent ledger */}
      {estimatedTotal > 0 && (
        <div className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-4 mb-6 flex items-center justify-between animate-fade-in-up stagger-1 shadow-[3px_3px_0_var(--ft-pickle)]">
          <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 border border-[var(--ft-ink)] bg-[rgba(183,193,103,0.18)] flex items-center justify-center">
              <Tag className="w-4 h-4 text-[var(--ft-pickle)]" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(21,19,15,0.55)]">Ledger · cheapest combo</p>
              <p className="font-display text-lg text-[var(--ft-ink)] leading-none">Estimated basket total</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl text-[var(--ft-ink)] leading-none">{estimatedTotal.toFixed(0)}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)]">kr</span>
          </div>
        </div>
      )}

      {/* Put-away undo banner */}
      {lastPutAwayBatchId && (
        <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3 border border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.12)] p-4 animate-fade-in-up">
          <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ft-pickle)]">Put-away · filed</p>
            <p className="font-display text-lg text-[var(--ft-ink)] leading-tight">Items moved to inventory.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={handleUndoPutAway}>
            Reverse it
          </Button>
        </div>
      )}

      {/* Quick-add bar — sharp ink-bordered with pickle add button */}
      {!showAddModal && (
        <div className="sticky top-3 z-20 mb-6 flex items-center gap-3 border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-4 py-3 shadow-[3px_3px_0_var(--ft-ink)] animate-fade-in-up stagger-2 md:static md:shadow-none">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)] shrink-0">Add ·</span>
          <input
            ref={quickAddRef}
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={handleQuickAdd}
            placeholder={t("shopping.quickAddPlaceholder")}
            className="flex-1 bg-transparent text-sm text-[var(--ft-ink)] placeholder:text-[rgba(21,19,15,0.4)] outline-none min-w-0 font-sans"
          />
          {quickAddText && (
            <button
              onClick={() => setQuickAddText("")}
              className="h-6 w-6 border border-[var(--ft-ink)] bg-[var(--ft-bone)] hover:bg-[var(--ft-ink)] hover:text-[var(--ft-bone)] flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Clear"
            >
              <X className="w-3 h-3" />
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
            className="h-9 w-9 border border-[var(--ft-ink)] bg-[var(--ft-ink)] flex items-center justify-center text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150 flex-shrink-0"
            aria-label="Add"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Store mode toggle */}
      <div className="relative mb-4 flex items-center justify-between gap-3 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3 animate-fade-in-up stagger-2">
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-ink)]" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ft-pickle)]">Mode · in-store</p>
          <p className="font-display text-base text-[var(--ft-ink)] leading-tight">{t("shopping.storeMode")}</p>
          <p className="font-sans text-xs text-[rgba(21,19,15,0.6)] mt-0.5">{t("shopping.storeModeDesc")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={storeMode ? "primary" : "secondary"}
          icon={<Store className="w-3.5 h-3.5" />}
          onClick={() => setStoreMode((value) => !value)}
          className="min-h-11"
        >
          {storeMode ? t("shopping.on") : t("shopping.off")}
        </Button>
      </div>

      {/* Sort mode toggle — segmented editorial */}
      {uncheckedItems.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 animate-fade-in-up stagger-2">
          <div className="flex border border-[var(--ft-ink)] bg-[var(--ft-paper)] divide-x divide-[var(--ft-ink)]">
            {([
              { mode: "category" as const, icon: ArrowDownUp, label: t("shopping.category") },
              { mode: "store"    as const, icon: Store,       label: t("shopping.storeLayout") },
            ]).map(({ mode, icon: Icon, label }) => {
              const active = sortMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-150",
                    active
                      ? "bg-[var(--ft-ink)] text-[var(--ft-bone)]"
                      : "text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)]",
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>
          {sortMode === "store" && (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ft-pickle)] animate-fade-in">
              ↳ {t("shopping.sortedByAisle")}
            </span>
          )}
        </div>
      )}

      {/* Unchecked items grouped by category */}
      {sortedCategories.length > 0 ? (
        <div className="space-y-5 animate-fade-in-up stagger-2">
          {sortedCategories.map((cat, catIndex) => (
            <div key={cat}>
              <div className="flex items-baseline gap-2 mb-3 border-b border-[var(--ft-ink)] pb-1.5">
                {sortMode === "store" && (
                  <span className="h-5 w-5 border border-[var(--ft-ink)] bg-[var(--ft-pickle)] font-mono text-[10px] text-[var(--ft-ink)] flex items-center justify-center flex-shrink-0 tracking-[0.04em]">
                    {String(catIndex + 1).padStart(2, "0")}
                  </span>
                )}
                <span className="text-lg self-center">{getCategoryEmoji(cat)}</span>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-ink)]">
                  {sortMode === "store" ? STORE_AISLE_LABELS[cat] : CATEGORY_LABELS[cat]}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ft-pickle)] ml-auto">{byCategory[cat].length} item{byCategory[cat].length !== 1 ? "s" : ""}</span>
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
        <article className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-center py-14 px-8 animate-scale-in">
          <span aria-hidden className="absolute top-3 left-3 h-3 w-3 border-l border-t border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute top-3 right-3 h-3 w-3 border-r border-t border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute bottom-3 left-3 h-3 w-3 border-l border-b border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute bottom-3 right-3 h-3 w-3 border-r border-b border-[var(--ft-ink)]" />
          <div className="text-5xl mb-4 inline-block">&#x1F6D2;</div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)] mb-2">List · empty</p>
          <h3 className="font-display text-2xl text-[var(--ft-ink)] mb-2 leading-tight">{t("shopping.emptyTitle")}</h3>
          <p className="font-sans text-sm text-[rgba(21,19,15,0.65)] max-w-sm mx-auto mb-6">
            {t("shopping.emptyDescription")}
          </p>
          <Button
            onClick={() => quickAddRef.current?.focus()}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
          >
            {t("shopping.addFirstItem")}
          </Button>
        </article>
      ) : null}

      {/* Checked items */}
      {checkedItems.length > 0 && !storeMode && (
        <PageSection>
          <div className="flex items-baseline justify-between mb-3 border-b border-[var(--ft-ink)] pb-2">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">Plate · cleared</span>
              <h3 className="font-display text-lg text-[var(--ft-ink)] leading-none">
                {t("shopping.checked")} <span className="font-mono text-[10px] tracking-[0.18em] text-[rgba(21,19,15,0.5)]">· {checkedItems.length}</span>
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="primary" onClick={() => setShowPutAwayModal(true)}>
                {t("shopping.putAwayBought")}
              </Button>
              <button
                onClick={handleClearChecked}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-signal)] underline underline-offset-4 decoration-[var(--ft-signal)] hover:no-underline transition-all flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> {t("shopping.clearAll")}
              </button>
            </div>
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
        </PageSection>
      )}

      {/* Smart Restock — purchase pattern predictions */}
      {predictions.length > 0 && !storeMode && (
        <PageSection>
          <div className="flex items-baseline gap-3 mb-3 border-b border-[var(--ft-ink)] pb-2">
            <TrendingUp className="w-4 h-4 text-[var(--ft-pickle)] self-center" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">Forecast</span>
            <h3 className="font-display text-lg text-[var(--ft-ink)] leading-none">{t("shopping.smartRestock")}</h3>
          </div>
          <div className="space-y-2">
            {predictions.map((prediction) => {
              const overdue = prediction.daysUntilNeeded < 0;
              return (
                <article
                  key={`prediction-${prediction.name}`}
                  className={cn(
                    "relative border bg-[var(--ft-paper)] px-4 py-3 flex items-center gap-3 transition-all",
                    overdue ? "border-[var(--ft-signal)]" : "border-[var(--ft-ink)]",
                  )}
                >
                  <span aria-hidden className={cn("pointer-events-none absolute left-0 right-0 top-0 h-[2px]", overdue ? "bg-[var(--ft-signal)]" : "bg-[var(--ft-pickle)]")} />
                  <span className="text-xl">{getCategoryEmoji(prediction.category as FoodCategory)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-display text-base text-[var(--ft-ink)] capitalize leading-tight block">{prediction.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.55)]">
                        <Clock className="w-3 h-3" />
                        Every ~{prediction.averageIntervalDays}d
                      </span>
                      <span className={cn(
                        "font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 border",
                        overdue
                          ? "border-[var(--ft-signal)] bg-[rgba(184,50,30,0.08)] text-[var(--ft-signal)]"
                          : "border-[#b46c00] bg-[rgba(245,158,11,0.1)] text-[#b46c00]",
                      )}>
                        {overdue ? "Due now" : `Due in ${prediction.daysUntilNeeded}d`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddPrediction(prediction.name, prediction.category)}
                    className="h-8 w-8 border border-[var(--ft-ink)] bg-[var(--ft-ink)] flex items-center justify-center text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150 flex-shrink-0"
                    aria-label="Add"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </article>
              );
            })}
          </div>
        </PageSection>
      )}

      {/* Expiring Soon — restock suggestions */}
      {expiringItems.length > 0 && (
        <div className="mt-8 animate-fade-in-up">
          <div className="flex items-baseline gap-3 mb-3 border-b border-[var(--ft-ink)] pb-2">
            <AlertTriangle className="w-4 h-4 text-[#b46c00] self-center" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b46c00]">Use soon · restock</span>
            <h3 className="font-display text-lg text-[var(--ft-ink)] leading-none">{t("shopping.expiringRestock")}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringItems.map((item) => (
              <button
                key={`expiring-${item.name}`}
                onClick={() => handleAddSuggestion(item.name, item.category)}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#b46c00] bg-[rgba(245,158,11,0.1)] font-sans text-xs text-[var(--ft-ink)] hover:bg-[rgba(245,158,11,0.18)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] transition-all duration-150"
              >
                <span>{getCategoryEmoji(item.category as FoodCategory)}</span>
                <span className="font-medium">{item.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#b46c00]">
                  {formatRelativeDate(item.expiryDate)}
                </span>
                <Plus className="w-3 h-3 text-[var(--ft-ink)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Restocks — from waste log history */}
      {recentItems.length > 0 && !storeMode && (
        <div className="mt-8 animate-fade-in-up">
          <div className="flex items-baseline gap-3 mb-3 border-b border-[var(--ft-ink)] pb-2">
            <RotateCcw className="w-4 h-4 text-[var(--ft-pickle)] self-center" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">Recall · history</span>
            <h3 className="font-display text-lg text-[var(--ft-ink)] leading-none">{t("shopping.suggestedRestocks")}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentItems.map((item) => (
              <button
                key={`recent-${item.name}`}
                onClick={() => handleAddSuggestion(item.name, item.category)}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-sans text-xs text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] transition-all duration-150"
              >
                <span>{getCategoryEmoji(item.category as FoodCategory)}</span>
                <span className="font-medium">{item.name}</span>
                <Plus className="w-3 h-3 text-[var(--ft-pickle)]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Seasonal & Holidays section */}
      {(seasonalItems.length > 0 || upcomingHolidays.length > 0) && !storeMode && (
        <div className="mt-8 animate-fade-in-up">
          <button
            onClick={() => setSeasonalOpen((v) => !v)}
            className="flex items-baseline gap-3 mb-3 group border-b border-[var(--ft-ink)] pb-2 w-full"
          >
            <Calendar className="w-4 h-4 text-[var(--ft-pickle)] self-center" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">Calendar</span>
            <h3 className="font-display text-lg text-[var(--ft-ink)] leading-none">{t("shopping.seasonalHolidays")}</h3>
            <ChevronDown className={cn("w-4 h-4 text-[var(--ft-ink)] ml-auto self-center transition-transform", seasonalOpen && "rotate-180")} />
          </button>

          {seasonalOpen && (
            <div className="space-y-4">
              {/* In Season Now */}
              {seasonalItems.length > 0 && (
                <GlassCard className="p-4" hover={false} accentBar="fresh">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg self-center">🌿</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)]">Sub · in season</span>
                    <h4 className="font-display text-base text-[var(--ft-ink)] leading-none">{t("shopping.inSeasonNow")}</h4>
                    <span className="font-sans text-xs text-[rgba(21,19,15,0.55)] ml-2 italic">{t("shopping.inSeasonHint")}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {seasonalItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleAddSuggestion(item.name, item.category)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.12)] font-sans text-xs text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.24)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] transition-all duration-150"
                      >
                        <span>{item.emoji}</span>
                        <span className="font-medium">{item.name}</span>
                        <Plus className="w-3 h-3 text-[var(--ft-pickle)]" />
                      </button>
                    ))}
                  </div>
                  {seasonalItems.some((i) => i.tip) && (
                    <p className="font-sans text-xs text-[rgba(21,19,15,0.65)] mt-3 pt-3 border-t border-dashed border-[rgba(21,19,15,0.25)] italic">
                      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--ft-pickle)] not-italic mr-2">Tip</span>
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
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-[rgba(183,193,103,0.08)] transition-colors"
                  >
                    <div className="h-12 w-12 border border-[var(--ft-ink)] bg-[var(--ft-bone)] flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0_var(--ft-ink)]">{holiday.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ft-pickle)]">Holiday · upcoming</p>
                      <h4 className="font-display text-lg text-[var(--ft-ink)] leading-tight">{holiday.name}</h4>
                      <p className="font-sans text-xs text-[rgba(21,19,15,0.6)] mt-0.5">{holiday.description}</p>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-[var(--ft-ink)] transition-transform flex-shrink-0", expandedHoliday === holiday.id && "rotate-180")} />
                  </button>

                  {expandedHoliday === holiday.id && (
                    <div className="px-4 pb-4 animate-fade-in-down border-t border-dashed border-[rgba(21,19,15,0.25)]">
                      <div className="border border-[var(--ft-ink)] bg-[var(--ft-bone)] my-3">
                        {holiday.items.map((hi, i) => (
                          <div key={hi.name} className={cn(
                            "flex items-center justify-between font-sans text-xs text-[var(--ft-ink)] px-3 py-2",
                            i < holiday.items.length - 1 && "border-b border-dashed border-[rgba(21,19,15,0.22)]",
                          )}>
                            <span className="font-medium">{hi.name}</span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(21,19,15,0.55)]">{hi.quantity} {hi.unit}</span>
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
                        className="w-full py-2.5 border border-[var(--ft-ink)] bg-[var(--ft-ink)] font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150"
                      >
                        File all {holiday.items.length} items
                      </button>
                    </div>
                  )}
                </GlassCard>
              ))}

              {/* Browse All Holidays */}
              <button
                onClick={() => setShowAllHolidays(true)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ft-ink)] hover:bg-[var(--ft-pickle)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ft-ink)] transition-all duration-150 group"
              >
                <Gift className="w-3.5 h-3.5" />
                {t("shopping.browseHolidayLists")}
                <ChevronDown className="w-3 h-3 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* All Holidays Modal */}
      <Modal isOpen={showAllHolidays} onClose={() => { setShowAllHolidays(false); setBrowseExpandedHoliday(null); }} title={t("shopping.browseHolidayLists")} subtitle="Pre-built shopping lists for celebrations" size="lg">
        <div className="space-y-3">
          {NORWEGIAN_HOLIDAYS.map((holiday) => (
            <GlassCard key={holiday.id} className="overflow-hidden" hover={false}>
              <button
                onClick={() => setBrowseExpandedHoliday(browseExpandedHoliday === holiday.id ? null : holiday.id)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-[rgba(183,193,103,0.08)] transition-colors"
              >
                <div className="h-12 w-12 border border-[var(--ft-ink)] bg-[var(--ft-bone)] flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0_var(--ft-ink)]">{holiday.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-lg text-[var(--ft-ink)] leading-tight">{holiday.name}</h4>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.55)] mt-0.5">
                    <span className="font-sans normal-case tracking-normal text-xs">{holiday.description}</span>
                    <span className="mx-2 text-[var(--ft-pickle)]">·</span>
                    {holiday.items.length} items
                  </p>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-[var(--ft-ink)] transition-transform flex-shrink-0", browseExpandedHoliday === holiday.id && "rotate-180")} />
              </button>
              {browseExpandedHoliday === holiday.id && (
                <div className="px-4 pb-4 animate-fade-in-down border-t border-dashed border-[rgba(21,19,15,0.25)]">
                  <div className="border border-[var(--ft-ink)] bg-[var(--ft-bone)] my-3">
                    {holiday.items.map((hi, i) => (
                      <div key={hi.name} className={cn(
                        "flex items-center justify-between font-sans text-xs text-[var(--ft-ink)] px-3 py-2",
                        i < holiday.items.length - 1 && "border-b border-dashed border-[rgba(21,19,15,0.22)]",
                      )}>
                        <span className="font-medium">{hi.name}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(21,19,15,0.55)]">{hi.quantity} {hi.unit}</span>
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
                    className="w-full py-2.5 border border-[var(--ft-ink)] bg-[var(--ft-ink)] font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150"
                  >
                    File all {holiday.items.length} items
                  </button>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showNewListModal}
        onClose={() => setShowNewListModal(false)}
        title={t("shopping.createList")}
        subtitle={t("shopping.createListSubtitle")}
        size="md"
      >
        <form onSubmit={handleCreateList} className="space-y-4">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g. Weekly Basics"
            className={baseInput}
            autoFocus
            required
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={() => setShowNewListModal(false)}>
              {t("shopping.cancel")}
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              {t("shopping.create")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPasteListModal}
        onClose={() => setShowPasteListModal(false)}
        title={t("shopping.pasteTitle")}
        subtitle={t("shopping.pasteSubtitle")}
        size="lg"
      >
        <div className="space-y-4">
          <textarea
            value={pasteListText}
            onChange={(event) => {
              setPasteListText(event.target.value);
              setParsedPasteItems([]);
            }}
            placeholder={"2 milk\nbread, eggs, apples\n1 kg potatoes"}
            className={cn(baseInput, "min-h-36 resize-y")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowPasteListModal(false)}>
              {t("shopping.cancel")}
            </Button>
            <Button type="button" variant="glass" onClick={handlePreviewPasteList} disabled={!pasteListText.trim()}>
              {t("shopping.previewItems")}
            </Button>
            <Button type="button" variant="primary" onClick={handleImportPasteList} disabled={parsedPasteItems.length === 0}>
              {t("shopping.import")} {parsedPasteItems.length || ""} {t("shopping.items")}
            </Button>
          </div>
          {parsedPasteItems.length > 0 && (
            <div className="max-h-72 space-y-2 overflow-auto">
              {parsedPasteItems.map((item, index) => (
                <div key={item.id} className="grid gap-2 border border-[var(--ft-ink)] bg-[var(--ft-bone)] p-3 sm:grid-cols-[1fr_90px_120px]">
                  <input
                    value={item.name}
                    onChange={(event) => setParsedPasteItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))}
                    className={baseInput}
                    aria-label="Imported item name"
                  />
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={item.quantity}
                    onChange={(event) => setParsedPasteItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) } : row))}
                    className={baseInput}
                    aria-label="Imported item quantity"
                  />
                  <select
                    value={item.category}
                    onChange={(event) => setParsedPasteItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, category: event.target.value as FoodCategory } : row))}
                    className={baseInput}
                    aria-label="Imported item category"
                  >
                    {categories.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showPutAwayModal}
        onClose={() => setShowPutAwayModal(false)}
        title={t("shopping.putAwayBought")}
        subtitle={t("shopping.putAwaySubtitle")}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "fridge", label: "Fridge", icon: Refrigerator },
              { value: "freezer", label: "Freezer", icon: Snowflake },
              { value: "pantry", label: "Pantry", icon: Archive },
            ].map((location) => {
              const Icon = location.icon;
              const selected = defaultPutAwayLocation === location.value;
              return (
                <button
                  key={location.value}
                  type="button"
                  onClick={() => handleApplyDestinationToAll(location.value as StorageLocation)}
                  className={cn(
                    "px-3 py-3 border font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-150",
                    selected
                      ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)]"
                      : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)]",
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Icon className="w-4 h-4" />
                    {location.label}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.55)]">
            ↳ Tap a destination above to apply to all, or adjust items one by one.
          </p>
          <div className="max-h-[420px] overflow-auto space-y-2">
            {checkedItems.map((item) => {
              const override = putAwayOverrides[item.id];
              const location = override?.location ?? defaultPutAwayLocation;
              return (
              <div key={item.id} className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3">
                <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-dashed border-[rgba(21,19,15,0.22)] pb-2">
                  <span className="font-display text-base text-[var(--ft-ink)] leading-none">{item.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ft-pickle)]">{item.quantity} {item.unit}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ft-ink)]">{t("shopping.destination")}</span>
                    <select
                      value={location}
                      onChange={(event) => {
                        const nextLocation = event.target.value as StorageLocation;
                        const days = getDefaultShelfLife(item.name, item.category, nextLocation);
                        setPutAwayOverrides((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] ?? { id: item.id }),
                            location: nextLocation,
                            expiryDate: new Date(Date.now() + days * 86_400_000).toISOString().split("T")[0],
                          },
                        }));
                      }}
                      className={baseInput}
                    >
                      <option value="fridge">Fridge</option>
                      <option value="freezer">Freezer</option>
                      <option value="pantry">Pantry</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ft-ink)]">{t("shopping.expiryEstimate")}</span>
                    <input
                      type="date"
                      value={override?.expiryDate ?? ""}
                      onChange={(event) => setPutAwayOverrides((current) => ({
                        ...current,
                        [item.id]: { ...(current[item.id] ?? { id: item.id }), expiryDate: event.target.value },
                      }))}
                      className={baseInput}
                    />
                  </label>
                </div>
              </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={() => setShowPutAwayModal(false)}>
              {t("shopping.cancel")}
            </Button>
            <Button type="button" variant="primary" fullWidth onClick={handlePutAwayChecked}>
              {t("shopping.confirmPutAway")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add to Shopping List" subtitle="What do you need to buy?" size="lg">
        <form onSubmit={handleAdd} className="space-y-5">
          <FormField label="01 · Item name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Whole milk, Chicken breast…" className={baseInput} autoFocus required />
          </FormField>

          <FormField label="02 · Category">
            <div className="grid grid-cols-4 gap-1.5 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-1.5">
              {categories.map((cat) => {
                const active = category === cat.value;
                return (
                  <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-2 border font-mono text-[10px] uppercase tracking-[0.14em] transition-all duration-150",
                      active
                        ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)]"
                        : "border-[var(--ft-ink)] bg-[var(--ft-bone)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.16)]",
                    )}>
                    <span className="text-base">{getCategoryEmoji(cat.value)}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="03 · Quantity">
              <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                min={0.1} step={0.1} className={baseInput} />
            </FormField>
            <FormField label="04 · Unit">
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className={cn(baseInput, "cursor-pointer")}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="05 · Notes" hint="optional">
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Brand preference, size, etc." className={baseInput} />
          </FormField>

          <div className="flex items-center gap-3 pt-3 border-t border-dashed border-[rgba(21,19,15,0.3)]">
            <button type="button" onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ft-ink)] hover:bg-[rgba(21,19,15,0.06)] transition-colors duration-150">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 border border-[var(--ft-ink)] bg-[var(--ft-ink)] font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-150">
              File on the list
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
    <div className={cn(
      "relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-4 py-3 flex items-center gap-3 group transition-all duration-150 hover:-translate-y-px hover:shadow-[2px_2px_0_var(--ft-ink)]",
      item.checked && "opacity-60",
    )}>
      {/* Checkbox — brutalist tick */}
      <button
        onClick={() => onToggle(item)}
        className={cn(
          "min-h-11 min-w-11 border flex items-center justify-center flex-shrink-0 transition-all duration-150",
          item.checked
            ? "border-[var(--ft-ink)] bg-[var(--ft-pickle)] text-[var(--ft-ink)] shadow-[2px_2px_0_var(--ft-ink)]"
            : "border-[var(--ft-ink)] bg-[var(--ft-bone)] hover:bg-[rgba(183,193,103,0.18)]",
        )}
        aria-label={item.checked ? "Mark unchecked" : "Mark checked"}
      >
        {item.checked && <Check className="w-5 h-5" strokeWidth={2.5} />}
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-display text-base text-[var(--ft-ink)] leading-tight",
            item.checked && "line-through text-[rgba(21,19,15,0.45)]",
          )}>
            {item.name}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ft-pickle)]">
            {item.quantity} {item.unit}
          </span>
        </div>
        {item.notes && (
          <p className="font-sans text-xs text-[rgba(21,19,15,0.55)] mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      {/* Price actions */}
      <button
        onClick={() => onFetchPrices(item)}
        disabled={isFetchingPrices}
        className="hidden min-h-10 items-center gap-1.5 px-3 py-2 border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)] disabled:opacity-50 transition-colors duration-150 sm:inline-flex"
      >
        <RefreshCw className={cn("w-3 h-3", isFetchingPrices && "animate-spin")} />
        {isFetchingPrices ? "Checking" : "Cheapest"}
      </button>

      {/* Price chip */}
      {item.cheapest_price != null && (
        <button
          onClick={() => setShowPrices(!showPrices)}
          className="inline-flex min-h-10 items-center gap-1.5 px-3 py-2 border border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.18)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.32)] transition-colors duration-150 flex-shrink-0"
        >
          <Store className="w-3 h-3" />
          <span className="font-display text-sm leading-none">{item.cheapest_price.toFixed(0)}</span>
          <span>kr</span>
          {prices.length > 1 && (
            <ChevronDown className={cn("w-3 h-3 transition-transform", showPrices && "rotate-180")} />
          )}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="min-h-11 min-w-11 p-2 border border-transparent text-[rgba(21,19,15,0.4)] hover:border-[var(--ft-signal)] hover:bg-[var(--ft-signal)] hover:text-[var(--ft-bone)] transition-all duration-150 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0"
        aria-label="Delete item"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Expanded price comparison — brutalist tooltip */}
      {showPrices && prices.length > 1 && (
        <div className="absolute right-4 top-full mt-2 z-10 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3 shadow-[3px_3px_0_var(--ft-ink)] min-w-[220px] animate-fade-in-down">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--ft-pickle)] mb-2 pb-1.5 border-b border-dashed border-[rgba(21,19,15,0.25)]">Price comparison</p>
          {prices.map((p, i) => (
            <div key={p.store} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-2 py-1">
              <span className="font-mono text-[9px] tracking-[0.16em] text-[rgba(21,19,15,0.5)]">{String(i + 1).padStart(2, "0")}</span>
              <span className={cn(
                "font-sans text-xs",
                i === 0 ? "font-bold text-[var(--ft-ink)]" : "text-[rgba(21,19,15,0.65)]",
              )}>{p.store}</span>
              <span className={cn(
                "font-display text-sm leading-none",
                i === 0 ? "text-[var(--ft-pickle)]" : "text-[rgba(21,19,15,0.55)]",
              )}>{p.price.toFixed(2)} <span className="font-mono text-[9px] tracking-[0.18em]">kr</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
