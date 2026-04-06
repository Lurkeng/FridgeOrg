import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchProducts, getDealsForShoppingList, findNearbyStores, selectDealForItem, getPriceDrops } from "@/server/deals";
import type { StoreTotalEntry } from "@/server/deals";
import type { PriceDropProduct } from "@/lib/kassalapp";
import { useShoppingList } from "@/hooks/useShoppingList";
import { PageHeader } from "@/components/layout/PageHeader";
import GlassCard from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { KassalappProduct, KassalappPhysicalStore } from "@/types";
import {
  Tag, Search, ShoppingCart, MapPin, Store,
  Navigation, Plus, ChevronDown, Check, Crown,
  Filter, X, TrendingDown,
} from "lucide-react";

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
  "w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 " +
  "transition-all duration-200 outline-none " +
  "focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 hover:bg-white/75";

function DealsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("deals");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Deals & Prices"
        subtitle="Compare Norwegian grocery prices via Kassalapp"
        icon={<Tag className="w-5 h-5 text-fresh-600" />}
      />

      {/* Tab bar */}
      <div className="flex gap-1 glass rounded-2xl p-1.5 mb-6 animate-fade-in-up stagger-1 overflow-x-auto scrollbar-hide">
        {([
          { value: "deals"  as Tab, label: "Deals",   icon: ShoppingCart },
          { value: "drops"  as Tab, label: "Drops",   icon: TrendingDown },
          { value: "search" as Tab, label: "Search",  icon: Search },
          { value: "stores" as Tab, label: "Stores",  icon: MapPin },
        ]).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.value;
          return (
            <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap min-w-[4rem]",
                active ? "glass-heavy text-slate-800 shadow-glass" : "text-slate-500 hover:text-slate-700 hover:bg-white/30",
              )}>
              <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-fresh-500" : "text-slate-400")} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
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
  const [expanded, setExpanded] = useState(false);

  if (!storeTotals.length) return null;

  const best = storeTotals[0];
  const others = storeTotals.slice(1);

  return (
    <div className="mb-6 animate-fade-in-up">
      <GlassCard className="p-0 overflow-hidden" hover={false}>
        {/* Best store header */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/20 transition-all"
        >
          <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Best store for your list</p>
            <div className="flex items-center gap-2 mt-0.5">
              {best.logo && <img src={best.logo} alt="" className="w-5 h-5 rounded" />}
              <span className="text-sm font-bold text-slate-800">{best.store}</span>
              <span className="text-xs text-slate-400">
                {best.itemCount}/{best.totalItems} items
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-fresh-700">{best.total.toFixed(0)} kr</span>
          </div>
          {others.length > 0 && (
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform flex-shrink-0", expanded && "rotate-180")} />
          )}
        </button>

        {/* Expanded comparison */}
        {expanded && others.length > 0 && (
          <div className="border-t border-white/30 px-4 pb-3 pt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Other stores</p>
            <div className="space-y-1.5">
              {others.map((s, i) => (
                <div key={s.store} className="flex items-center gap-2 py-1">
                  <span className="text-xs text-slate-400 w-4">{i + 2}.</span>
                  {s.logo && <img src={s.logo} alt="" className="w-4 h-4 rounded" />}
                  <span className="text-xs font-medium text-slate-600 flex-1">{s.store}</span>
                  <span className="text-xs text-slate-400">{s.itemCount}/{s.totalItems}</span>
                  <span className="text-xs font-semibold text-slate-600 w-16 text-right">{s.total.toFixed(0)} kr</span>
                  {s.total > best.total && (
                    <span className="text-[10px] text-danger-500 font-medium">
                      +{(s.total - best.total).toFixed(0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ── Price Drops ─────────────────────────────────────────────────────────

function PriceDrops() {
  const { addItem } = useShoppingList();
  const { toast } = useToast();
  const storeFilter = useStoreFilter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["price-drops"],
    queryFn:  () => getPriceDrops({ data: {} }),
    staleTime: 5 * 60_000, // 5 min — this is expensive (multiple API calls)
  });

  if (isLoading) return <LoadingSpinner text="Scanning for price drops…" />;
  if (error) return <ErrorCard message={getErrorMessage(error)} showApiHint={false} />;
  if (data?.missingKey) return <ErrorCard message="Set KASSALAPP_API_KEY in .dev.vars to enable price drops." />;

  const drops = (data?.drops ?? []) as PriceDropProduct[];

  if (!drops.length) {
    return (
      <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
        <div className="text-5xl mb-4 animate-float inline-block">📉</div>
        <h3 className="font-bold text-slate-800 mb-1.5">No price drops found</h3>
        <p className="text-sm text-slate-500">No significant price reductions detected in the last 30 days across common grocery items.</p>
      </GlassCard>
    );
  }

  const filtered = storeFilter.filter(drops);

  const handleAddToList = async (drop: PriceDropProduct) => {
    try {
      await addItem({
        name:     drop.name,
        category: "other",
        quantity: 1,
        unit:     "item",
        barcode:  drop.ean ?? null,
      });
      toast(`${drop.name} added to shopping list`, "success");
    } catch {
      toast("Failed to add to list", "error");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in-up stagger-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500 font-medium">
          {drops.length} product{drops.length !== 1 ? "s" : ""} with recent price drops
        </p>
      </div>

      <StoreFilter
        products={drops as unknown as KassalappProduct[]}
        selectedStores={storeFilter.selectedStores}
        onToggle={storeFilter.toggle}
        onClear={storeFilter.clear}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((drop) => (
          <PriceDropCard key={`${drop.id}-${drop.store?.name}`} drop={drop} onAddToList={handleAddToList} />
        ))}
      </div>
    </div>
  );
}

function PriceDropCard({
  drop,
  onAddToList,
}: {
  drop: PriceDropProduct;
  onAddToList: (d: PriceDropProduct) => void;
}) {
  return (
    <div className="glass rounded-xl p-3.5 flex flex-col gap-2 transition-all ring-2 ring-amber-300/40">
      <div className="flex items-start gap-3">
        {drop.image ? (
          <img src={drop.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/50" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-100/60 flex items-center justify-center flex-shrink-0 text-lg">🏷️</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{drop.name}</p>
          {drop.brand && <p className="text-xs text-slate-400 mt-0.5">{drop.brand}</p>}
        </div>
        {/* Discount badge */}
        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
          <TrendingDown className="w-3 h-3" />
          -{drop.drop_percent}%
        </span>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {drop.store?.logo ? (
            <img src={drop.store.logo} alt="" className="w-5 h-5 rounded" />
          ) : (
            <Store className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs text-slate-500">{drop.store?.name ?? "Unknown"}</span>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 line-through">{drop.previous_price.toFixed(2)} kr</span>
            <span className="text-sm font-bold text-red-600">{drop.current_price.toFixed(2)} kr</span>
          </div>
          {drop.current_unit_price != null && (
            <p className="text-[10px] text-slate-400 leading-tight">
              {drop.current_unit_price.toFixed(2)} kr/kg
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAddToList(drop)}
        className="mt-1 w-full py-2 glass rounded-lg text-xs font-semibold text-frost-700 hover:bg-frost-50/80 transition-all flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3 h-3" /> Add to Shopping List
      </button>
    </div>
  );
}

// ── Store Filter Chips ──────────────────────────────────────────────────

function StoreFilter({
  products,
  selectedStores,
  onToggle,
  onClear,
}: {
  products: KassalappProduct[];
  selectedStores: Set<string>;
  onToggle: (store: string) => void;
  onClear: () => void;
}) {
  const stores = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of products) {
      if (p.store?.name && !map.has(p.store.name)) {
        map.set(p.store.name, p.store.logo);
      }
    }
    return Array.from(map.entries()).map(([name, logo]) => ({ name, logo }));
  }, [products]);

  if (stores.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      {stores.map((s) => {
        const active = selectedStores.has(s.name);
        return (
          <button
            key={s.name}
            type="button"
            onClick={() => onToggle(s.name)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
              active
                ? "bg-frost-100/80 text-frost-700 ring-1 ring-frost-300/50"
                : "glass text-slate-500 hover:text-slate-700 hover:bg-white/50",
            )}
          >
            {s.logo && <img src={s.logo} alt="" className="w-3.5 h-3.5 rounded" />}
            {s.name}
            {active && <Check className="w-3 h-3" />}
          </button>
        );
      })}
      {selectedStores.size > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 transition-all"
        >
          <X className="w-3 h-3" /> Clear
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
      toast("Price saved to shopping list", "success");
    },
    onError: () => toast("Failed to save price", "error"),
  });

  useEffect(() => {
    if (error && isRedirectResponse(error)) {
      navigate({ to: "/auth" });
    }
  }, [error, navigate]);

  if (isLoading) return <LoadingSpinner text="Finding deals for your list…" />;
  if (error) {
    const msg = getErrorMessage(error);
    if (isRedirectResponse(error)) {
      return <LoadingSpinner text="Session expired, redirecting to login…" />;
    }
    if (msg.toLowerCase().includes("kassalapp") || msg.toLowerCase().includes("api_key")) {
      return <ErrorCard message={`${msg}. Set KASSALAPP_API_KEY in .dev.vars (local) or wrangler secrets (production).`} />;
    }
    return <ErrorCard message={msg} showApiHint={false} />;
  }
  if (data?.missingKey)
    return (
      <ErrorCard message="Set KASSALAPP_API_KEY in .dev.vars (local) or wrangler secrets (production) to enable price comparison." />
    );

  const deals = data?.deals ?? [];
  const storeTotals = (data?.storeTotals ?? []) as StoreTotalEntry[];

  if (!deals.length) {
    return (
      <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
        <div className="text-5xl mb-4 animate-float inline-block">🏷️</div>
        <h3 className="font-bold text-slate-800 mb-1.5">No deals to show</h3>
        <p className="text-sm text-slate-500">Add items to your shopping list first, then come here to find the best prices.</p>
      </GlassCard>
    );
  }

  // Collect all products for the store filter
  const allProducts = deals.flatMap((d) => d.products);

  return (
    <div className="animate-fade-in-up stagger-2">
      {/* Best store summary */}
      <BestStoreBanner storeTotals={storeTotals} />

      {/* Store filter */}
      <StoreFilter
        products={allProducts}
        selectedStores={storeFilter.selectedStores}
        onToggle={storeFilter.toggle}
        onClear={storeFilter.clear}
      />

      {/* Per-item deal cards */}
      <div className="space-y-6">
        {deals.map((deal) => {
          const filtered = storeFilter.filter(deal.products);
          if (!filtered.length) return null;
          return (
            <div key={deal.shoppingItemId}>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-4 h-4 text-frost-500" />
                <h3 className="text-sm font-bold text-slate-700">{deal.shoppingItemName}</h3>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">{filtered.length} option{filtered.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
            </div>
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
      await addItem({
        name:     product.name,
        category: "other",
        quantity: 1,
        unit:     "item",
        barcode:  product.ean ?? null,
      });
      toast(`${product.name} added to shopping list`, "success");
    } catch {
      toast("Failed to add to list", "error");
    }
  };

  const products = data?.products ?? [];
  const filtered = storeFilter.filter(products);

  return (
    <div className="space-y-4 animate-fade-in-up stagger-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Norwegian grocery products…"
            className={cn(baseInput, "pl-11")}
          />
        </div>
        <button type="submit" disabled={!query.trim()}
          className="px-5 py-2.5 bg-gradient-to-r from-fresh-600 to-fresh-500 text-white rounded-xl text-sm font-semibold shadow-glow-fresh hover:shadow-[0_0_28px_rgba(34,197,94,0.35)] transition-all active:scale-[0.97] disabled:opacity-50">
          Search
        </button>
      </form>

      {isLoading && <LoadingSpinner text="Searching prices…" />}

      {products.length > 0 && (
        <>
          <StoreFilter
            products={products}
            selectedStores={storeFilter.selectedStores}
            onToggle={storeFilter.toggle}
            onClear={storeFilter.clear}
          />
          {filtered.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} rank={i} onAddToList={handleAddToList} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No products match the selected stores.</p>
          )}
        </>
      )}

      {products.length === 0 && !isLoading && searchTerm && (
        <GlassCard className="text-center py-12 px-8" hover={false}>
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-bold text-slate-800 mb-1">No products found</h3>
          <p className="text-sm text-slate-500">Try a different search term.</p>
        </GlassCard>
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

  // Pull store totals from the deals query if available
  const { data: dealsData } = useQuery({
    queryKey: ["deals-for-list"],
    queryFn:  () => getDealsForShoppingList(),
    staleTime: 60_000,
  });
  const storeTotals = (dealsData?.storeTotals ?? []) as StoreTotalEntry[];

  // Map store group/chain → total from deals
  const chainPriceMap = useMemo(() => {
    const map = new Map<string, StoreTotalEntry>();
    for (const st of storeTotals) {
      // Normalize: "KIWI" matches physical store group "KIWI"
      map.set(st.store.toUpperCase(), st);
    }
    return map;
  }, [storeTotals]);

  const storeMutation = useMutation({
    mutationFn: (coords: { lat: number; lng: number }) =>
      findNearbyStores({ data: { lat: coords.lat, lng: coords.lng, km: 5 } }),
    onSuccess: (data) => {
      setStores(data.stores as unknown as KassalappPhysicalStore[]);
      setLocated(true);
    },
    onError: () => toast("Failed to find stores", "error"),
  });

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported by your browser", "error");
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
        toast("Could not get your location", "error");
      },
    );
  };

  return (
    <div className="space-y-4 animate-fade-in-up stagger-2">
      {!located ? (
        <GlassCard className="text-center py-16 px-8" hover={false}>
          <div className="text-5xl mb-4 animate-float inline-block">📍</div>
          <h3 className="font-bold text-slate-800 mb-1.5">Find grocery stores near you</h3>
          <p className="text-sm text-slate-500 mb-6">We'll use your location to find the closest stores across all Norwegian chains.</p>
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating || storeMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-2xl text-sm font-bold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <Navigation className={cn("w-4 h-4", (locating || storeMutation.isPending) && "animate-pulse")} />
            {locating ? "Getting location…" : storeMutation.isPending ? "Finding stores…" : "Use My Location"}
          </button>
        </GlassCard>
      ) : stores.length === 0 ? (
        <GlassCard className="text-center py-12 px-8" hover={false}>
          <div className="text-4xl mb-3">🏪</div>
          <h3 className="font-bold text-slate-800 mb-1">No stores found nearby</h3>
          <p className="text-sm text-slate-500">Try expanding your search radius.</p>
        </GlassCard>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500 font-medium">{stores.length} stores within 5 km</p>
            <button type="button" onClick={handleLocate} className="text-xs font-semibold text-frost-600 hover:text-frost-800 transition-colors flex items-center gap-1">
              <Navigation className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {stores.map((store) => {
              // Match this physical store to chain price data
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
  const isCheapest = rank === 0;

  return (
    <div className={cn("glass rounded-xl p-3.5 flex flex-col gap-2 transition-all",
      isCheapest && "ring-2 ring-fresh-400/60 shadow-glow-fresh")}>
      <div className="flex items-start gap-3">
        {product.image ? (
          <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/50" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-100/60 flex items-center justify-center flex-shrink-0 text-lg">🛒</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{product.name}</p>
          {product.brand && <p className="text-xs text-slate-400 mt-0.5">{product.brand}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {product.store?.logo ? (
            <img src={product.store.logo} alt="" className="w-5 h-5 rounded" />
          ) : (
            <Store className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs text-slate-500">{product.store?.name ?? "Unknown"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            {product.current_price != null && (
              <span className={cn("text-sm font-bold", isCheapest ? "text-fresh-700" : "text-slate-700")}>
                {product.current_price.toFixed(2)} kr
              </span>
            )}
            {product.current_unit_price != null && (
              <p className="text-[10px] text-slate-400 leading-tight">
                {product.current_unit_price.toFixed(2)} kr/kg
              </p>
            )}
          </div>
          {isCheapest && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-fresh-100 text-fresh-700">Cheapest</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-1">
        {onSelectDeal && (
          <button type="button" onClick={onSelectDeal}
            className="flex-1 py-2 glass rounded-lg text-xs font-semibold text-fresh-700 hover:bg-fresh-50/80 transition-all flex items-center justify-center gap-1.5">
            <Check className="w-3 h-3" /> Use this price
          </button>
        )}
        {onAddToList && (
          <button type="button" onClick={() => onAddToList(product)}
            className="flex-1 py-2 glass rounded-lg text-xs font-semibold text-frost-700 hover:bg-frost-50/80 transition-all flex items-center justify-center gap-1.5">
            <Plus className="w-3 h-3" /> Add to List
          </button>
        )}
      </div>
    </div>
  );
}

function StoreCard({ store, priceInfo }: { store: KassalappPhysicalStore; priceInfo?: StoreTotalEntry }) {
  const mapUrl = store.position
    ? `https://www.google.com/maps/dir/?api=1&destination=${store.position.lat},${store.position.lng}`
    : null;

  return (
    <div className="glass rounded-xl p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5 hover:shadow-glass-hover">
      {store.logo ? (
        <img src={store.logo} alt="" className="w-10 h-10 rounded-xl object-contain bg-white flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-slate-100/60 flex items-center justify-center flex-shrink-0">
          <Store className="w-5 h-5 text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{store.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{store.group}</p>
        <p className="text-xs text-slate-500 mt-1 truncate">{store.address}</p>
        {priceInfo && (
          <div className="flex items-center gap-2 mt-1.5">
            <Tag className="w-3 h-3 text-fresh-500" />
            <span className="text-xs font-semibold text-fresh-700">
              ~{priceInfo.total.toFixed(0)} kr
            </span>
            <span className="text-[10px] text-slate-400">
              for {priceInfo.itemCount}/{priceInfo.totalItems} list items
            </span>
          </div>
        )}
      </div>
      {mapUrl && (
        <a href={mapUrl} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 p-2 rounded-lg glass text-frost-600 hover:text-frost-800 hover:bg-frost-50/80 transition-all">
          <Navigation className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="glass rounded-2xl px-8 py-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-fresh-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 font-medium">{text}</span>
      </div>
    </div>
  );
}

function ErrorCard({ message, showApiHint = true }: { message: string; showApiHint?: boolean }) {
  return (
    <GlassCard className="text-center py-12 px-8" hover={false} variant="warning">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="font-bold text-slate-800 mb-1.5">{showApiHint ? "Configuration needed" : "Something went wrong"}</h3>
      <p className="text-sm text-slate-600">{message}</p>
      {showApiHint && (
        <p className="text-xs text-slate-400 mt-3">
          Get a free API key at{" "}
          <a href="https://kassal.app/api" target="_blank" rel="noopener noreferrer" className="text-frost-600 hover:text-frost-800 font-semibold">
            kassal.app/api
          </a>
        </p>
      )}
    </GlassCard>
  );
}
