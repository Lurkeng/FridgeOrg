import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchProducts, getDealsForShoppingList, findNearbyStores, selectDealForItem, getPriceDrops } from "@/server/deals";
import type { StoreTotalEntry } from "@/server/deals";
import type { PriceDropProduct } from "@/lib/kassalapp";
import { useShoppingList } from "@/hooks/useShoppingList";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import EditorialEmpty from "@/components/ui/EditorialEmpty";
import { cn } from "@/lib/utils";
import type { KassalappProduct, KassalappPhysicalStore } from "@/types";
import {
  Tag, Search, ShoppingCart, MapPin, Store,
  Navigation, Plus, ChevronDown, Check, Crown,
  Filter, X, TrendingDown,
} from "lucide-react";
import { useAppPreferences } from "@/lib/app-preferences";

/** Detect if an error is actually a TanStack Start redirect (Response object) */
function isRedirectResponse(err: unknown): boolean {
  return (
    err instanceof Response ||
    (typeof err === "object" && err !== null && "status" in err && "headers" in err)
  );
}

/** Extract a human-readable message from any error shape */
function getErrorMessage(err: unknown): string {
  if (isRedirectResponse(err)) return "Your session has expired. Redirecting to login…";
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return "An unknown error occurred"; }
}

export const Route = createFileRoute("/_app/deals")({
  component: DealsPage,
});

type Tab = "deals" | "drops" | "search" | "stores";

const baseInput =
  "w-full border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-4 py-2.5 text-sm text-[var(--ft-ink)] placeholder:text-[rgba(21,19,15,0.4)] " +
  "transition-all duration-150 outline-none font-sans " +
  "focus:shadow-[3px_3px_0_var(--ft-pickle)] focus:-translate-y-px";

const kicker = "font-mono text-[10px] uppercase tracking-[0.28em] text-[rgba(21,19,15,0.55)]";

function DealsPage() {
  const { t } = useAppPreferences();
  const [activeTab, setActiveTab] = useState<Tab>("deals");

  const tabs: { value: Tab; label: string; icon: typeof ShoppingCart; ord: string }[] = [
    { value: "deals",  label: t("deals.tabDeals"),  icon: ShoppingCart, ord: "01" },
    { value: "drops",  label: t("deals.tabDrops"),  icon: TrendingDown, ord: "02" },
    { value: "search", label: t("deals.tabSearch"), icon: Search,       ord: "03" },
    { value: "stores", label: t("deals.tabStores"), icon: MapPin,       ord: "04" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        eyebrow={t("deals.eyebrow")}
        title={t("deals.title")}
        subtitle={t("deals.subtitle")}
        icon={<Tag className="w-5 h-5 text-[var(--ft-pickle)]" />}
      />

      {/* Editorial segmented tab strip */}
      <div className="relative mb-8 animate-fade-in-up stagger-1 border border-[var(--ft-ink)] bg-[var(--ft-paper)]">
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
        <div className="grid grid-cols-4 divide-x divide-[var(--ft-ink)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 px-3 py-3 transition-colors",
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
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em]">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "deals"  && <DealsForMyList />}
      {activeTab === "drops"  && <PriceDrops />}
      {activeTab === "search" && <PriceSearch />}
      {activeTab === "stores" && <NearbyStores />}
    </div>
  );
}

// ── Best Store Summary Banner ───────────────────────────────────────────

function BestStoreBanner({ storeTotals }: { storeTotals: StoreTotalEntry[] }) {
  const { t } = useAppPreferences();
  const [expanded, setExpanded] = useState(false);

  if (!storeTotals.length) return null;

  const best = storeTotals[0];
  const others = storeTotals.slice(1);

  return (
    <div className="mb-8 animate-fade-in-up">
      <article className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] shadow-[5px_5px_0_var(--ft-pickle)]">
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 p-5 text-left hover:bg-[rgba(183,193,103,0.08)] transition-colors"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-ink)]">
            <Crown className="w-5 h-5 text-[var(--ft-pickle)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={kicker}>{t("deals.bestBasket")}</p>
            <div className="flex items-baseline gap-3 mt-1">
              {best.logo && <img src={best.logo} alt="" className="h-6 w-6 border border-[var(--ft-ink)] bg-white" />}
              <span className="font-display text-2xl text-[var(--ft-ink)] leading-none">{best.store}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.55)]">
                {best.itemCount} {t("deals.itemsOf")} {best.totalItems} {t("deals.items")}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-display text-3xl text-[var(--ft-ink)] leading-none">{best.total.toFixed(0)}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)] mt-1">{t("deals.kroner")}</p>
          </div>
          {others.length > 0 && (
            <ChevronDown className={cn("w-4 h-4 text-[var(--ft-ink)] transition-transform flex-shrink-0", expanded && "rotate-180")} />
          )}
        </button>

        {expanded && others.length > 0 && (
          <div className="border-t border-[var(--ft-ink)] px-5 py-4 bg-[var(--ft-bone)]">
            <p className={cn(kicker, "mb-3")}>{t("deals.runnersUp")}</p>
            <div className="space-y-2">
              {others.map((s, i) => (
                <div key={s.store} className="grid grid-cols-[2rem_1.25rem_1fr_auto_5rem_3rem] items-center gap-2 py-1 border-b border-dashed border-[rgba(21,19,15,0.18)] last:border-b-0">
                  <span className="font-mono text-[10px] tracking-[0.18em] text-[rgba(21,19,15,0.5)]">{String(i + 2).padStart(2, "0")}</span>
                  {s.logo ? <img src={s.logo} alt="" className="h-4 w-4 border border-[var(--ft-ink)] bg-white" /> : <span />}
                  <span className="text-sm font-sans text-[var(--ft-ink)]">{s.store}</span>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-[rgba(21,19,15,0.5)]">{s.itemCount}/{s.totalItems}</span>
                  <span className="font-display text-base text-[var(--ft-ink)] text-right">{s.total.toFixed(0)} kr</span>
                  {s.total > best.total && (
                    <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--ft-signal)] text-right">+{(s.total - best.total).toFixed(0)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

// ── Price Drops ─────────────────────────────────────────────────────────

function PriceDrops() {
  const { t } = useAppPreferences();
  const { addItem } = useShoppingList();
  const { toast } = useToast();
  const storeFilter = useStoreFilter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["price-drops"],
    queryFn:  () => getPriceDrops({ data: {} }),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <LoadingSpinner text={t("deals.loadingDrops")} />;
  if (error) return <ErrorCard message={getErrorMessage(error)} showApiHint={false} />;
  if (data?.missingKey) return <ErrorCard message="Set KASSALAPP_API_KEY in .dev.vars to enable price drops." />;

  const drops = (data?.drops ?? []) as PriceDropProduct[];

  if (!drops.length) return <EditorialEmpty icon="📉" kicker={t("deals.notice")} title={t("deals.noDrops")} body={t("deals.noDropsBody")} />;

  const filtered = storeFilter.filter(drops);

  const handleAddToList = async (drop: PriceDropProduct) => {
    try {
      await addItem({ name: drop.name, category: "other", quantity: 1, unit: "item", barcode: drop.ean ?? null });
      toast(`${drop.name} ${t("deals.toastAddedSuffix")}`, "success");
    } catch {
      toast(t("deals.toastFailedAdd"), "error");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in-up stagger-2">
      <div className="flex items-baseline justify-between border-b border-[var(--ft-ink)] pb-2">
        <p className={kicker}>{t("deals.plateDropsKicker")}</p>
        <p className="font-display text-xl text-[var(--ft-ink)] leading-none">{drops.length}</p>
      </div>

      <StoreFilter
        products={drops as unknown as KassalappProduct[]}
        selectedStores={storeFilter.selectedStores}
        onToggle={storeFilter.toggle}
        onClear={storeFilter.clear}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((drop) => (
          <PriceDropCard key={`${drop.id}-${drop.store?.name}`} drop={drop} onAddToList={handleAddToList} />
        ))}
      </div>
    </div>
  );
}

function PriceDropCard({ drop, onAddToList }: { drop: PriceDropProduct; onAddToList: (d: PriceDropProduct) => void }) {
  const { t } = useAppPreferences();
  return (
    <article className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-signal)]">
      <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-signal)]" />
      <div className="flex items-start gap-3 p-3.5 pt-4">
        {drop.image ? (
          <img src={drop.image} alt="" className="h-14 w-14 border border-[var(--ft-ink)] object-cover bg-white shrink-0" />
        ) : (
          <div className="h-14 w-14 border border-[var(--ft-ink)] bg-[var(--ft-bone)] flex items-center justify-center shrink-0 text-lg">🏷️</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-sans font-medium text-[var(--ft-ink)] leading-tight line-clamp-2">{drop.name}</p>
          {drop.brand && <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] mt-1">{drop.brand}</p>}
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 border border-[var(--ft-signal)] bg-[var(--ft-signal)] text-[var(--ft-bone)] font-mono text-[10px] tracking-[0.14em]">
          <TrendingDown className="w-3 h-3" />−{drop.drop_percent}%
        </span>
      </div>

      <div className="px-3.5 pb-3 mt-auto flex items-end justify-between border-t border-dashed border-[rgba(21,19,15,0.2)] pt-3">
        <div className="flex items-center gap-2">
          {drop.store?.logo ? (
            <img src={drop.store.logo} alt="" className="h-5 w-5 border border-[var(--ft-ink)] bg-white" />
          ) : (
            <Store className="w-4 h-4 text-[rgba(21,19,15,0.5)]" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.6)]">{drop.store?.name ?? "—"}</span>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-2 justify-end">
            <span className="font-mono text-[10px] line-through text-[rgba(21,19,15,0.4)]">{drop.previous_price.toFixed(2)}</span>
            <span className="font-display text-xl text-[var(--ft-signal)] leading-none">{drop.current_price.toFixed(2)}</span>
            <span className="font-mono text-[9px] tracking-[0.18em] text-[rgba(21,19,15,0.5)]">kr</span>
          </div>
          {drop.current_unit_price != null && (
            <p className="font-mono text-[9px] tracking-[0.14em] text-[rgba(21,19,15,0.45)] mt-0.5">{drop.current_unit_price.toFixed(2)} kr/kg</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAddToList(drop)}
        className="border-t border-[var(--ft-ink)] py-2.5 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-ink)] hover:bg-[var(--ft-ink)] hover:text-[var(--ft-bone)] transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-3 h-3" /> {t("deals.addToList")}
      </button>
    </article>
  );
}

// ── Store Filter Chips ──────────────────────────────────────────────────

function StoreFilter({
  products, selectedStores, onToggle, onClear,
}: {
  products: KassalappProduct[];
  selectedStores: Set<string>;
  onToggle: (store: string) => void;
  onClear: () => void;
}) {
  const { t } = useAppPreferences();
  const stores = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of products) {
      if (p.store?.name && !map.has(p.store.name)) map.set(p.store.name, p.store.logo);
    }
    return Array.from(map.entries()).map(([name, logo]) => ({ name, logo }));
  }, [products]);

  if (stores.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(21,19,15,0.55)]">
        <Filter className="w-3 h-3" /> {t("deals.filterChains")}
      </span>
      {stores.map((s) => {
        const active = selectedStores.has(s.name);
        return (
          <button
            key={s.name}
            type="button"
            onClick={() => onToggle(s.name)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 border transition-all font-mono text-[10px] uppercase tracking-[0.16em]",
              active
                ? "border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)]"
                : "border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] hover:bg-[rgba(183,193,103,0.12)]",
            )}
          >
            {s.logo && <img src={s.logo} alt="" className="h-3.5 w-3.5 bg-white" />}
            {s.name}
            {active && <Check className="w-3 h-3" />}
          </button>
        );
      })}
      {selectedStores.size > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] hover:text-[var(--ft-signal)] transition-colors"
        >
          <X className="w-3 h-3" /> {t("deals.clear")}
        </button>
      )}
    </div>
  );
}

function useStoreFilter() {
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());

  const toggle = (store: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(store)) next.delete(store);
      else next.add(store);
      return next;
    });
  };

  const clear = () => setSelectedStores(new Set());

  const filter = <T extends { store?: { name: string } | null }>(items: T[]): T[] => {
    if (selectedStores.size === 0) return items;
    return items.filter((p) => p.store?.name && selectedStores.has(p.store.name));
  };

  return { selectedStores, toggle, clear, filter };
}

// ── Deals matched to shopping list ───────────────────────────────────────

function DealsForMyList() {
  const { t } = useAppPreferences();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeFilter = useStoreFilter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["deals-for-list"],
    queryFn:  () => getDealsForShoppingList(),
    staleTime: 60_000,
    retry: (failureCount, err) => {
      if (isRedirectResponse(err)) return false;
      return failureCount < 2;
    },
  });

  const selectMutation = useMutation({
    mutationFn: (params: { shoppingItemId: string; productId: number; storeName: string; price: number }) =>
      selectDealForItem({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingList"] });
      toast(t("deals.toastPriceFiled"), "success");
    },
    onError: () => toast(t("deals.toastFailedSave"), "error"),
  });

  useEffect(() => {
    if (error && isRedirectResponse(error)) navigate({ to: "/auth" });
  }, [error, navigate]);

  if (isLoading) return <LoadingSpinner text={t("deals.loadingDeals")} />;
  if (error) {
    const msg = getErrorMessage(error);
    if (isRedirectResponse(error)) return <LoadingSpinner text={t("deals.sessionExpired")} />;
    if (msg.toLowerCase().includes("kassalapp") || msg.toLowerCase().includes("api_key")) {
      return <ErrorCard message={`${msg}. Set KASSALAPP_API_KEY in .dev.vars (local) or wrangler secrets (production).`} />;
    }
    return <ErrorCard message={msg} showApiHint={false} />;
  }
  if (data?.missingKey) return <ErrorCard message="Set KASSALAPP_API_KEY in .dev.vars (local) or wrangler secrets (production) to enable price comparison." />;

  const deals = data?.deals ?? [];
  const storeTotals = (data?.storeTotals ?? []) as StoreTotalEntry[];

  if (!deals.length) return <EditorialEmpty icon="🏷️" kicker={t("deals.notice")} title={t("deals.noDeals")} body={t("deals.noDealsBody")} />;

  const allProducts = deals.flatMap((d) => d.products);

  return (
    <div className="animate-fade-in-up stagger-2">
      <BestStoreBanner storeTotals={storeTotals} />

      <div className="mb-4">
        <StoreFilter
          products={allProducts}
          selectedStores={storeFilter.selectedStores}
          onToggle={storeFilter.toggle}
          onClear={storeFilter.clear}
        />
      </div>

      <div className="space-y-8">
        {deals.map((deal, idx) => {
          const filtered = storeFilter.filter(deal.products);
          if (!filtered.length) return null;
          return (
            <section key={deal.shoppingItemId}>
              <header className="mb-3 flex items-baseline gap-3 border-b border-[var(--ft-ink)] pb-2">
                <span className="font-mono text-[10px] tracking-[0.28em] text-[var(--ft-pickle)]">
                  {t("deals.itemPrefix")} {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl text-[var(--ft-ink)] leading-none">{deal.shoppingItemName}</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] ml-auto">
                  {filtered.length} {filtered.length !== 1 ? t("deals.optionsPlural") : t("deals.options")}
                </span>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    rank={i}
                    onSelectDeal={() => {
                      if (product.current_price != null && product.store?.name) {
                        selectMutation.mutate({
                          shoppingItemId: deal.shoppingItemId,
                          productId: product.id,
                          storeName: product.store.name,
                          price: product.current_price,
                        });
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ── Free-text price search ───────────────────────────────────────────────

function PriceSearch() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { addItem } = useShoppingList();
  const { toast } = useToast();
  const { t } = useAppPreferences();
  const storeFilter = useStoreFilter();

  const { data, isLoading } = useQuery({
    queryKey: ["kassalapp-search", searchTerm],
    queryFn:  () => searchProducts({ data: { query: searchTerm } }),
    enabled:  searchTerm.length > 0,
    staleTime: 60_000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      storeFilter.clear();
      setSearchTerm(query.trim());
    }
  };

  const handleAddToList = async (product: KassalappProduct) => {
    try {
      await addItem({ name: product.name, category: "other", quantity: 1, unit: "item", barcode: product.ean ?? null });
      toast(`${product.name} ${t("deals.toastAddedSuffix")}`, "success");
    } catch {
      toast(t("deals.toastFailedAdd"), "error");
    }
  };

  const products = data?.products ?? [];
  const filtered = storeFilter.filter(products);

  return (
    <div className="space-y-5 animate-fade-in-up stagger-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(21,19,15,0.5)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("deals.searchPlaceholder")}
            className={cn(baseInput, "pl-11")}
          />
        </div>
        <Button type="submit" disabled={!query.trim()} variant="primary">
          {t("deals.fileSearch")}
        </Button>
      </form>

      {isLoading && <LoadingSpinner text={t("deals.loadingSearch")} />}

      {products.length > 0 && (
        <>
          <StoreFilter
            products={products}
            selectedStores={storeFilter.selectedStores}
            onToggle={storeFilter.toggle}
            onClear={storeFilter.clear}
          />
          {filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} rank={i} onAddToList={handleAddToList} />
              ))}
            </div>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] text-center py-6">
              {t("deals.noStoreMatch")}
            </p>
          )}
        </>
      )}

      {products.length === 0 && !isLoading && searchTerm && (
        <EditorialEmpty icon="🔍" kicker={t("deals.notice")} title={t("deals.noProducts")} body={t("deals.noProductsBody")} />
      )}
    </div>
  );
}

// ── Nearby stores ────────────────────────────────────────────────────────

function NearbyStores() {
  const [stores, setStores] = useState<KassalappPhysicalStore[]>([]);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const { toast } = useToast();
  const { t } = useAppPreferences();

  const { data: dealsData } = useQuery({
    queryKey: ["deals-for-list"],
    queryFn:  () => getDealsForShoppingList(),
    staleTime: 60_000,
  });
  const storeTotals = (dealsData?.storeTotals ?? []) as StoreTotalEntry[];

  const chainPriceMap = useMemo(() => {
    const map = new Map<string, StoreTotalEntry>();
    for (const st of storeTotals) map.set(st.store.toUpperCase(), st);
    return map;
  }, [storeTotals]);

  const storeMutation = useMutation({
    mutationFn: (coords: { lat: number; lng: number }) =>
      findNearbyStores({ data: { lat: coords.lat, lng: coords.lng, km: 5 } }),
    onSuccess: (data) => {
      setStores(data.stores as unknown as KassalappPhysicalStore[]);
      setLocated(true);
    },
    onError: () => toast(t("deals.toastFailedFindStores"), "error"),
  });

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast(t("deals.toastGeoNotSupported"), "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        storeMutation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        toast(t("deals.toastLocationFailed"), "error");
      },
    );
  };

  return (
    <div className="space-y-5 animate-fade-in-up stagger-2">
      {!located ? (
        <article className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] py-16 px-8 text-center shadow-[5px_5px_0_var(--ft-ink)]">
          <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
          {/* Corner registration ticks */}
          <span aria-hidden className="absolute top-3 left-3 h-3 w-3 border-l border-t border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute top-3 right-3 h-3 w-3 border-r border-t border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute bottom-3 left-3 h-3 w-3 border-l border-b border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute bottom-3 right-3 h-3 w-3 border-r border-b border-[var(--ft-ink)]" />

          <p className={cn(kicker, "mb-4")}>{t("deals.storesNearbyKicker")}</p>
          <h3 className="font-display text-3xl text-[var(--ft-ink)] mb-3 leading-tight">{t("deals.storesNearbyTitle")}</h3>
          <p className="font-sans text-sm text-[rgba(21,19,15,0.65)] mb-6 max-w-sm mx-auto">
            {t("deals.storesNearbyBody")}
          </p>
          <Button
            onClick={handleLocate}
            disabled={locating || storeMutation.isPending}
            variant="primary"
            size="lg"
            icon={<Navigation className={cn("w-4 h-4", (locating || storeMutation.isPending) && "animate-pulse")} />}
          >
            {locating ? t("deals.gettingLocation") : storeMutation.isPending ? t("deals.findingStores") : t("deals.useMyLocation")}
          </Button>
        </article>
      ) : stores.length === 0 ? (
        <EditorialEmpty icon="🏪" kicker={t("deals.notice")} title={t("deals.noStores")} body={t("deals.noStoresBody")} />
      ) : (
        <>
          <div className="flex items-baseline justify-between border-b border-[var(--ft-ink)] pb-2">
            <p className={kicker}>{t("deals.plateStoresKicker")}</p>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-xl text-[var(--ft-ink)] leading-none">{stores.length}</span>
              <button
                type="button"
                onClick={handleLocate}
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-ink)] hover:text-[var(--ft-pickle)] inline-flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" /> {t("deals.refresh")}
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {stores.map((store) => {
              const chainMatch = chainPriceMap.get(store.group?.toUpperCase() ?? "")
                              ?? chainPriceMap.get(store.name?.toUpperCase() ?? "");
              return <StoreCard key={store.id} store={store} priceInfo={chainMatch} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared components ────────────────────────────────────────────────────

function ProductCard({
  product, rank, onAddToList, onSelectDeal,
}: {
  product: KassalappProduct;
  rank: number;
  onAddToList?: (p: KassalappProduct) => void;
  onSelectDeal?: () => void;
}) {
  const { t } = useAppPreferences();
  const isCheapest = rank === 0;

  return (
    <article
      className={cn(
        "relative border bg-[var(--ft-paper)] flex flex-col transition-all",
        isCheapest
          ? "border-[var(--ft-ink)] shadow-[3px_3px_0_var(--ft-pickle)]"
          : "border-[var(--ft-ink)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-ink)]",
      )}
    >
      {isCheapest && (
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
      )}
      <div className="flex items-start gap-3 p-3.5">
        {product.image ? (
          <img src={product.image} alt="" className="h-14 w-14 border border-[var(--ft-ink)] object-cover bg-white shrink-0" />
        ) : (
          <div className="h-14 w-14 border border-[var(--ft-ink)] bg-[var(--ft-bone)] flex items-center justify-center shrink-0 text-lg">🛒</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-sans font-medium text-[var(--ft-ink)] leading-tight line-clamp-2">{product.name}</p>
          {product.brand && <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] mt-1">{product.brand}</p>}
        </div>
        {isCheapest && (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 border border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.18)] text-[var(--ft-ink)]">
            {t("deals.best")}
          </span>
        )}
      </div>
      <div className="px-3.5 pb-3 flex items-end justify-between border-t border-dashed border-[rgba(21,19,15,0.18)] pt-3">
        <div className="flex items-center gap-2">
          {product.store?.logo ? (
            <img src={product.store.logo} alt="" className="h-5 w-5 border border-[var(--ft-ink)] bg-white" />
          ) : (
            <Store className="w-4 h-4 text-[rgba(21,19,15,0.5)]" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.6)]">{product.store?.name ?? "—"}</span>
        </div>
        <div className="text-right">
          {product.current_price != null && (
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className={cn("font-display text-xl leading-none", isCheapest ? "text-[var(--ft-pickle)]" : "text-[var(--ft-ink)]")}>
                {product.current_price.toFixed(2)}
              </span>
              <span className="font-mono text-[9px] tracking-[0.18em] text-[rgba(21,19,15,0.5)]">kr</span>
            </div>
          )}
          {product.current_unit_price != null && (
            <p className="font-mono text-[9px] tracking-[0.14em] text-[rgba(21,19,15,0.45)] mt-0.5">{product.current_unit_price.toFixed(2)} kr/kg</p>
          )}
        </div>
      </div>

      {(onSelectDeal || onAddToList) && (
        <div className="grid grid-cols-2 border-t border-[var(--ft-ink)] divide-x divide-[var(--ft-ink)]">
          {onSelectDeal && (
            <button
              type="button"
              onClick={onSelectDeal}
              className="py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] hover:bg-[var(--ft-pickle)] transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-3 h-3" /> {t("deals.usePrice")}
            </button>
          )}
          {onAddToList && (
            <button
              type="button"
              onClick={() => onAddToList(product)}
              className={cn(
                "py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] hover:bg-[var(--ft-ink)] hover:text-[var(--ft-bone)] transition-colors flex items-center justify-center gap-1.5",
                !onSelectDeal && "col-span-2",
              )}
            >
              <Plus className="w-3 h-3" /> {t("deals.addToList")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function StoreCard({ store, priceInfo }: { store: KassalappPhysicalStore; priceInfo?: StoreTotalEntry }) {
  const { t } = useAppPreferences();
  const mapUrl = store.position
    ? `https://www.google.com/maps/dir/?api=1&destination=${store.position.lat},${store.position.lng}`
    : null;

  return (
    <article className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-ink)]">
      {priceInfo && (
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-pickle)]" />
      )}
      {store.logo ? (
        <img src={store.logo} alt="" className="h-12 w-12 border border-[var(--ft-ink)] object-contain bg-white shrink-0" />
      ) : (
        <div className="h-12 w-12 border border-[var(--ft-ink)] bg-[var(--ft-bone)] flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-[var(--ft-ink)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display text-lg text-[var(--ft-ink)] leading-tight">{store.name}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] mt-1">{store.group}</p>
        <p className="font-sans text-xs text-[rgba(21,19,15,0.7)] mt-1.5 truncate">{store.address}</p>
        {priceInfo && (
          <div className="mt-2 inline-flex items-center gap-2 border border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.12)] px-2 py-1">
            <Tag className="w-3 h-3 text-[var(--ft-pickle)]" />
            <span className="font-display text-sm text-[var(--ft-ink)] leading-none">~{priceInfo.total.toFixed(0)} kr</span>
            <span className="font-mono text-[9px] tracking-[0.14em] text-[rgba(21,19,15,0.55)]">{priceInfo.itemCount}/{priceInfo.totalItems}</span>
          </div>
        )}
      </div>
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center h-9 w-9 border border-[var(--ft-ink)] bg-[var(--ft-bone)] text-[var(--ft-ink)] hover:bg-[var(--ft-ink)] hover:text-[var(--ft-bone)] transition-colors shadow-[2px_2px_0_var(--ft-ink)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
          aria-label={t("deals.directions")}
        >
          <Navigation className="w-4 h-4" />
        </a>
      )}
    </article>
  );
}

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-6 py-4 flex items-center gap-3 shadow-[3px_3px_0_var(--ft-ink)]">
        <div className="h-4 w-4 border-2 border-[var(--ft-ink)] border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ft-ink)]">{text}</span>
      </div>
    </div>
  );
}

function ErrorCard({ message, showApiHint = true }: { message: string; showApiHint?: boolean }) {
  const { t } = useAppPreferences();
  return (
    <article className="relative border border-[var(--ft-signal)] bg-[rgba(184,50,30,0.06)] text-center py-12 px-8">
      <span aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] bg-[var(--ft-signal)]" />
      <div className="text-4xl mb-3">⚠️</div>
      <p className={cn(kicker, "mb-2 text-[var(--ft-signal)]")}>{t("deals.stopPress")}</p>
      <h3 className="font-display text-2xl text-[var(--ft-ink)] mb-2 leading-tight">
        {showApiHint ? t("deals.configNeeded") : t("deals.somethingWrong")}
      </h3>
      <p className="font-sans text-sm text-[rgba(21,19,15,0.75)] max-w-md mx-auto">{message}</p>
      {showApiHint && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.55)] mt-4">
          {t("deals.getFreeKey")}{" "}
          <a href="https://kassal.app/api" target="_blank" rel="noopener noreferrer" className="text-[var(--ft-ink)] underline underline-offset-2 hover:text-[var(--ft-signal)]">
            kassal.app/api
          </a>
        </p>
      )}
    </article>
  );
}
