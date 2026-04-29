import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useFoodItems } from "@/hooks/useFoodItems";
import { useWasteStats } from "@/hooks/useWaste";
import { useAchievements, useCheckAchievements } from "@/hooks/useAchievements";
import { useCountUp } from "@/hooks/useCountUp";
import GlassCard from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { DashboardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn, getCategoryEmoji, getExpiryStatus, formatRelativeDate } from "@/lib/utils";
import { Package, Refrigerator, Snowflake, AlertTriangle, Apple, ScanLine, ArrowRight, AlertCircle, Sparkles, TrendingDown, TrendingUp, PartyPopper, Coins, Lock, Flame, Leaf } from "lucide-react";
import { getInSeasonNow } from "@/lib/norwegian-seasons";
import type { FoodItem, FoodCategory, StorageLocation, WasteStats, AchievementKey } from "@/types";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

function StatCard({ label, value, icon: Icon, gradient, glowClass, delay, alert, variant }: {
  label: string; value: number; icon: React.ElementType;
  gradient: string; glowClass: string; delay: number; alert?: boolean;
  variant?: 'default' | 'warning';
}) {
  const animatedValue = useCountUp(value, 900, delay * 120);
  return (
    <GlassCard
      className={cn(
        'dashboard-stat p-5',
        alert && value > 0 && 'ring-2 ring-warning-300/60',
        variant === 'warning' && value > 0 && 'bg-warning-50/40',
      )}
      staggerIndex={delay}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center border border-[var(--ft-ink)] ${gradient}`}>
          <Icon className="w-5 h-5 text-[var(--ft-bone)]" strokeWidth={1.8} />
        </div>
        {alert && value > 0 && <span className="h-2.5 w-2.5 bg-[var(--ft-signal)]" />}
      </div>
      <p className={`dashboard-display mb-1 text-5xl font-black leading-none ${glowClass}`}>{animatedValue}</p>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(21,19,15,0.58)]">{label}</p>
    </GlassCard>
  );
}

function ExpiringMiniCard({ item, index }: { item: FoodItem; index: number }) {
  const status = getExpiryStatus(item.expiry_date);
  const statusColor = status === "expired" || status === "expiring" ? "danger" : status === "use_soon" ? "warning" : "success";
  return (
    <GlassCard className="p-4 flex-shrink-0 w-44" staggerIndex={index} hover>
      <div className="text-2xl mb-2">{getCategoryEmoji(item.category as FoodCategory)}</div>
      <p className="text-sm font-semibold text-slate-800 truncate mb-1.5">{item.name}</p>
      <Badge variant={statusColor} dot glow size="sm">{formatRelativeDate(item.expiry_date)}</Badge>
    </GlassCard>
  );
}

function ActionCard({ to, emoji, title, desc, gradient, delay }: {
  to: string; emoji: string; title: string; desc: string; gradient: string; delay: number;
}) {
  return (
    <Link to={to} className="block group">
      <GlassCard className="relative cursor-pointer overflow-hidden p-6" staggerIndex={delay} hover>
        <div className={`absolute inset-x-0 top-0 h-1 ${gradient} opacity-90`} />
        <div className="mb-3 inline-block text-3xl transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">{emoji}</div>
        <h3 className="mb-1.5 font-mono text-[12px] font-black uppercase tracking-[0.14em] text-[var(--ft-ink)] transition-colors group-hover:text-[var(--ft-signal)]">{title}</h3>
        <p className="text-sm leading-relaxed text-[rgba(21,19,15,0.62)]">{desc}</p>
        <div className="mt-4 flex translate-x-2 items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ft-signal)] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          Open <ArrowRight className="w-3 h-3" />
        </div>
      </GlassCard>
    </Link>
  );
}

// ── Waste Summary Banner ────────────────────────────────────────────────

function WasteSummaryBanner({ stats }: { stats: WasteStats }) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  let thisMonthCost = 0;
  let lastMonthCost = 0;

  for (const week of stats.weeklyTrend) {
    const weekDate = new Date(week.week);
    if (weekDate >= currentMonthStart) {
      thisMonthCost += week.cost;
    } else if (weekDate >= lastMonthStart && weekDate <= lastMonthEnd) {
      lastMonthCost += week.cost;
    }
  }

  const hasWasteThisMonth = thisMonthCost > 0;
  const trendPercent = lastMonthCost > 0
    ? Math.round(((thisMonthCost - lastMonthCost) / lastMonthCost) * 100)
    : null;
  const trendIsDown = trendPercent !== null && trendPercent < 0;
  const trendIsUp = trendPercent !== null && trendPercent > 0;

  if (!hasWasteThisMonth && stats.totalWasted === 0) {
    return null;
  }

  return (
      <div className="glass-frost p-4 mb-6 animate-fade-in-up stagger-4">
      {!hasWasteThisMonth ? (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-fresh-500/15 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-5 h-5 text-fresh-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-fresh-800">Zero waste this month!</p>
            <p className="text-xs text-fresh-600">Keep it up. Every item used is money saved.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-danger-500/15 flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5 text-danger-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-bold text-slate-800">
                This month's waste: <span className="text-danger-600">{thisMonthCost.toFixed(0)} kr</span>
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {stats.totalCost > 0
                ? `${stats.totalCost.toFixed(0)} kr wasted in last 90 days`
                : "Track and reduce waste to save money"}
            </p>
          </div>
          {trendPercent !== null && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0",
              trendIsDown
                ? "bg-fresh-100/80 text-fresh-700"
                : trendIsUp
                  ? "bg-danger-100/80 text-danger-700"
                  : "bg-slate-100/80 text-slate-600",
            )}>
              {trendIsDown ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : trendIsUp ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : null}
              {trendIsDown ? "" : "+"}{trendPercent}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Achievement definitions ────────────────────────────────────────────

const ACHIEVEMENT_DEFS: Record<AchievementKey, { emoji: string; title: string; description: string }> = {
  first_item:          { emoji: "\u{1F95A}", title: "First Item",       description: "Added your first item" },
  first_scan:          { emoji: "\u{1F4F7}", title: "Scanner",          description: "Scanned your first barcode" },
  week_without_waste:  { emoji: "\u{1F31F}", title: "Week Warrior",     description: "7 days waste-free" },
  month_without_waste: { emoji: "\u{1F3C6}", title: "Zero Waste Hero",  description: "30 days waste-free" },
  inventory_master:    { emoji: "\u{1F4E6}", title: "Inventory Master", description: "Tracked 20+ items" },
  price_hunter:        { emoji: "\u{1F4B0}", title: "Price Hunter",     description: "Found the cheapest deal" },
  chef_mode:           { emoji: "\u{1F468}\u{200D}\u{1F373}", title: "Chef Mode",        description: "Cooked 5 recipes" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "bg-fresh-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.35)]",
  B: "bg-frost-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.35)]",
  C: "bg-warning-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  D: "bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.3)]",
  F: "bg-danger-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]",
};

function AchievementsPanel() {
  const { data: stats, isLoading } = useAchievements();
  const checkAchievements = useCheckAchievements();
  const { toast } = useToast();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    checkAchievements.mutate(undefined, {
      onSuccess: (result) => {
        if (result.unlocked.length > 0) {
          for (const key of result.unlocked) {
            const def = ACHIEVEMENT_DEFS[key as AchievementKey];
            if (def) {
              toast(`${def.emoji} Achievement unlocked: ${def.title}!`, "success");
            }
          }
        }
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-20" count={2} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <Skeleton className="h-20" count={7} />
        </div>
      </div>
    );
  }
  if (!stats) return null;

  const unlockedKeys = new Set(
    stats.achievements
      .filter((a) => !a.achievementKey.startsWith("recipe_cooked_"))
      .map((a) => a.achievementKey),
  );

  const allKeys = Object.keys(ACHIEVEMENT_DEFS) as AchievementKey[];

  return (
    <div className="mb-8 animate-fade-in-up stagger-4">
      {/* Streak + Grade row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Waste-free streak */}
        <GlassCard className="p-4 flex items-center gap-3" staggerIndex={4} hover={false}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-800">
              {stats.wasteStreak > 0 ? (
                <>{stats.wasteStreak} day{stats.wasteStreak !== 1 ? "s" : ""} without waste!</>
              ) : (
                <>Start your streak!</>
              )}
            </p>
            <p className="text-xs text-slate-500">
              {stats.wasteStreak > 0
                ? "Keep it going. Every day counts."
                : "Avoid food waste to build your streak"}
            </p>
          </div>
          {stats.wasteStreak >= 7 && (
            <span className="text-2xl animate-float" role="img" aria-label="fire">&#x1F525;</span>
          )}
        </GlassCard>

        {/* Monthly grade */}
        <GlassCard className="p-4 flex items-center gap-3" staggerIndex={5} hover={false}>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black",
            GRADE_COLORS[stats.monthlyWasteScore] ?? GRADE_COLORS.C,
          )}>
            {stats.monthlyWasteScore}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">Monthly Waste Score</p>
            <p className="text-xs text-slate-500">
              {stats.monthlyWasteScore === "A" && "Excellent. 50%+ less waste than last month"}
              {stats.monthlyWasteScore === "B" && "Great. 20-50% less waste than last month"}
              {stats.monthlyWasteScore === "C" && "Good. Slightly less waste than last month"}
              {stats.monthlyWasteScore === "D" && "Waste increased a little this month"}
              {stats.monthlyWasteScore === "F" && "Waste increased significantly. You can do better."}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Achievement badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {allKeys.map((key) => {
          const def = ACHIEVEMENT_DEFS[key];
          const unlocked = unlockedKeys.has(key);
          return (
            <div key={key} className="relative group">
              <GlassCard
                className={cn(
                  "p-3 text-center transition-all duration-200",
                  !unlocked && "opacity-40 grayscale",
                  unlocked && "hover:shadow-glass-hover hover:-translate-y-0.5",
                )}
                hover={false}
                staggerIndex={6}
              >
                <div className="text-2xl mb-1">
                  {unlocked ? def.emoji : (
                    <Lock className="w-5 h-5 text-slate-400 mx-auto" />
                  )}
                </div>
                <p className={cn(
                  "text-xs font-semibold truncate",
                  unlocked ? "text-slate-800" : "text-slate-400",
                )}>
                  {def.title}
                </p>
              </GlassCard>
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 glass-heavy rounded-lg text-xs font-medium text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10 shadow-glass">
                {def.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Starter Pack definitions ────────────────────────────────────────────

interface StarterItem {
  name: string;
  category: FoodCategory;
  location: StorageLocation;
  quantity: number;
  unit: string;
  daysUntilExpiry: number;
}

interface StarterPack {
  label: string;
  emoji: string;
  gradient: string;
  items: StarterItem[];
}

const STARTER_PACKS: StarterPack[] = [
  {
    label: "Basics",
    emoji: "\u{1F9C8}",
    gradient: "from-frost-400 to-frost-600",
    items: [
      { name: "Melk",  category: "dairy",  location: "fridge", quantity: 1, unit: "L",    daysUntilExpiry: 10 },
      { name: "Egg",   category: "dairy",  location: "fridge", quantity: 12, unit: "stk", daysUntilExpiry: 21 },
      { name: "Sm\u00F8r",  category: "dairy",  location: "fridge", quantity: 1, unit: "pk", daysUntilExpiry: 30 },
      { name: "Br\u00F8d",  category: "grains", location: "pantry", quantity: 1, unit: "pk", daysUntilExpiry: 5 },
    ],
  },
  {
    label: "Produce",
    emoji: "\u{1F96C}",
    gradient: "from-fresh-400 to-fresh-600",
    items: [
      { name: "Epler",   category: "produce", location: "fridge", quantity: 4, unit: "stk", daysUntilExpiry: 14 },
      { name: "Bananer", category: "produce", location: "pantry", quantity: 4, unit: "stk", daysUntilExpiry: 5 },
      { name: "Agurk",   category: "produce", location: "fridge", quantity: 1, unit: "stk", daysUntilExpiry: 7 },
      { name: "Tomat",   category: "produce", location: "fridge", quantity: 4, unit: "stk", daysUntilExpiry: 7 },
    ],
  },
  {
    label: "Protein",
    emoji: "\u{1F969}",
    gradient: "from-warning-400 to-warning-600",
    items: [
      { name: "Kyllingfilet", category: "poultry", location: "fridge",  quantity: 1, unit: "pk", daysUntilExpiry: 4 },
      { name: "Kj\u00F8ttdeig",    category: "meat",    location: "fridge",  quantity: 1, unit: "pk", daysUntilExpiry: 3 },
      { name: "Laks",         category: "seafood", location: "freezer", quantity: 1, unit: "pk", daysUntilExpiry: 60 },
    ],
  },
];

function DashboardPage() {
  const { items, expiringItems, expiredItems, fridgeItems, freezerItems, isLoading, addItem } = useFoodItems();
  const { data: wasteStats } = useWasteStats();
  const { toast } = useToast();
  const [addingPack, setAddingPack] = useState<string | null>(null);

  const handleStarterPack = async (pack: StarterPack) => {
    setAddingPack(pack.label);
    const today = new Date().toISOString().split("T")[0];
    try {
      for (const item of pack.items) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + item.daysUntilExpiry);
        await addItem({
          name:       item.name,
          category:   item.category,
          location:   item.location,
          quantity:   item.quantity,
          unit:       item.unit,
          addedDate:  today,
          expiryDate: expiryDate.toISOString().split("T")[0],
        });
      }
      toast(`${pack.items.length} items added! You're all set.`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add items", "error");
    } finally {
      setAddingPack(null);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8 grid gap-5 border-b border-[var(--ft-ink)] pb-6 animate-fade-in-up md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-signal)]">Dashboard</p>
          <h1 className="dashboard-display mt-2 max-w-3xl text-[clamp(3.3rem,8vw,8rem)] font-black leading-[0.82] tracking-[-0.07em] text-[var(--ft-ink)]">
            Today’s fridge report.
          </h1>
        </div>
        <p className="max-w-64 self-end border-l border-[var(--ft-ink)] pl-4 text-sm leading-snug text-[rgba(21,19,15,0.66)]">
          The useful version of opening the fridge three times and hoping it tells you what to cook.
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Items"   value={items.length}          icon={Package}       gradient="bg-gradient-to-br from-slate-500 to-slate-700"    glowClass="text-slate-800"      delay={0} />
        <StatCard label="In Fridge"     value={fridgeItems.length}    icon={Refrigerator}  gradient="bg-gradient-to-br from-frost-400 to-frost-600"     glowClass="text-gradient-frost" delay={1} />
        <StatCard label="In Freezer"    value={freezerItems.length}   icon={Snowflake}     gradient="bg-gradient-to-br from-frost-500 to-frost-700"     glowClass="text-gradient-frost" delay={2} />
        <StatCard label="Expiring Soon" value={expiringItems.length}  icon={AlertTriangle} gradient="bg-gradient-to-br from-warning-400 to-warning-600" glowClass="text-warning-700"    delay={3} alert variant="warning" />
      </div>

      {/* ── Expired items alert ────────────────────────────── */}
      {expiredItems.length > 0 && (
        <GlassCard variant="danger" className="p-4 mb-6 flex items-start gap-3" animate staggerIndex={4}>
          <div className="w-9 h-9 rounded-xl bg-danger-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-danger-600 animate-pulse-soft" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-danger-800 mb-0.5">{expiredItems.length} expired item{expiredItems.length > 1 ? "s" : ""}</h3>
            <p className="text-sm text-danger-700">
              <span className="font-medium">{expiredItems.map((i) => i.name).join(", ")}</span>. Please remove or mark as wasted.
            </p>
          </div>
          <Link to="/items" className="flex-shrink-0 text-xs font-semibold text-danger-600 hover:text-danger-800 transition-colors whitespace-nowrap mt-1">
            View all <ArrowRight className="w-3 h-3 inline ml-0.5" />
          </Link>
        </GlassCard>
      )}

      {/* ── Expiring soon carousel ─────────────────────────── */}
      {expiringItems.length > 0 && (
        <div className="mb-8 animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span role="img" aria-label="clock">&#x23F0;</span> Use These Soon
            </h2>
            {expiringItems.length > 6 && (
              <Link to="/items" className="text-sm font-semibold text-frost-600 hover:text-frost-700 flex items-center gap-1 transition-colors">
                View all {expiringItems.length} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
            {expiringItems.slice(0, 8).map((item, i) => <ExpiringMiniCard key={item.id} item={item} index={i} />)}
          </div>
        </div>
      )}

      {/* ── Waste summary ──────────────────────────────────── */}
      {wasteStats && <WasteSummaryBanner stats={wasteStats as WasteStats} />}

      {/* ── Achievements ───────────────────────────────────── */}
      <AchievementsPanel />

      {/* ── In Season card ─────────────────────────────────── */}
      {(() => {
        const seasonal = getInSeasonNow();
        if (seasonal.length === 0) return null;
        return (
          <GlassCard className="p-4 mb-6 animate-fade-in-up stagger-5" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-fresh-500" />
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ft-ink)]">In Season</h3>
              </div>
              <Link to="/shopping" className="text-xs font-semibold text-frost-600 hover:text-frost-800 flex items-center gap-1 transition-colors">
                See all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {seasonal.slice(0, 6).map((item) => (
                <span
                  key={item.name}
                  className="inline-flex cursor-default items-center gap-1.5 border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-3 py-1.5 text-xs font-medium text-[var(--ft-ink)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--ft-pickle)]"
                  title={item.tip}
                >
                  <span>{item.emoji}</span> {item.name}
                </span>
              ))}
              {seasonal.length > 6 && (
                <span className="px-2.5 py-1.5 rounded-full text-xs text-slate-400 font-medium">+{seasonal.length - 6} more</span>
              )}
            </div>
          </GlassCard>
        );
      })()}

      {/* ── Quick Actions ──────────────────────────────────── */}
      <div className="mb-6 animate-fade-in-up stagger-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-frost-500" />
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ft-ink)]">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard to="/items"   emoji="&#x1F34E;" title="Manage Food"   desc="Add, edit, or remove items from your inventory"           gradient="bg-gradient-to-r from-fresh-400 to-fresh-500"   delay={5} />
          <ActionCard to="/scan"    emoji="&#x1F4F7;" title="Scan Barcode"  desc="Quick-add items by scanning product barcodes"             gradient="bg-gradient-to-r from-frost-400 to-frost-500"   delay={6} />
          <ActionCard to="/recipes" emoji="&#x1F468;&#x200D;&#x1F373;" title="Find Recipes" desc="Discover what you can cook with what you have"            gradient="bg-gradient-to-r from-warning-400 to-warning-500" delay={7} />
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {items.length === 0 && (
        <GlassCard className="py-12 px-8 animate-scale-in" hover={false}>
          <div className="text-center mb-8">
            <div className="text-7xl mb-5 animate-float inline-block" role="img" aria-label="ice cube">&#x1F9CA;</div>
            <h3 className="dashboard-display mb-2 text-4xl font-black text-[var(--ft-ink)]">Your fridge is empty.</h3>
            <p className="mx-auto max-w-sm leading-relaxed text-[rgba(21,19,15,0.64)]">
              Start with what’s in your fridge right now. Even three items helps.
            </p>
          </div>

          {/* Starter packs */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-frost-500" />
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ft-ink)]">Starter Packs</h4>
            <span className="text-xs text-[rgba(21,19,15,0.52)]">Add common items in one tap</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {STARTER_PACKS.map((pack) => (
              <button
                key={pack.label}
                onClick={() => handleStarterPack(pack)}
                disabled={addingPack !== null}
                className={cn(
                  "group relative glass p-5 text-left transition-all duration-300 overflow-hidden",
                  "hover:-translate-y-1 hover:shadow-glass-hover active:scale-[0.98]",
                  addingPack === pack.label && "ring-2 ring-frost-400/60",
                  addingPack !== null && addingPack !== pack.label && "opacity-50",
                )}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${pack.gradient} rounded-t-2xl`} />

                <div className="flex items-center gap-3 mb-2.5">
                  <span className="text-2xl">{pack.emoji}</span>
                  <div>
                    <span className="text-sm font-bold text-slate-800">{pack.label}</span>
                    <span className="ml-2 text-xs text-slate-400">{pack.items.length} items</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {pack.items.map((i) => i.name).join(", ")}
                </p>

                {addingPack === pack.label && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,248,232,0.82)]">
                    <div className="w-5 h-5 border-2 border-frost-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/items" className="inline-flex items-center gap-2 border border-[var(--ft-ink)] bg-[var(--ft-signal)] px-6 py-2.5 text-sm font-semibold text-[var(--ft-bone)] transition-all active:scale-[0.97]">
              <Apple className="w-4 h-4" /> Add Items
            </Link>
            <Link to="/scan" className="inline-flex items-center gap-2 border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-6 py-2.5 text-sm font-semibold text-[var(--ft-ink)] transition-all hover:bg-[var(--ft-pickle)] active:scale-[0.97]">
              <ScanLine className="w-4 h-4" /> Scan Barcode
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
