import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useFoodItems } from "@/hooks/useFoodItems";
import { useWasteStats } from "@/hooks/useWaste";
import { useAchievements, useCheckAchievements } from "@/hooks/useAchievements";
import { useCountUp } from "@/hooks/useCountUp";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePurchaseHistorySummary } from "@/hooks/usePurchaseHistorySummary";
import { useAppPreferences } from "@/lib/app-preferences";
import GlassCard from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { DashboardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn, getCategoryEmoji, getExpiryStatus, formatRelativeDate } from "@/lib/utils";
import { Package, Refrigerator, Snowflake, AlertTriangle, Apple, ScanLine, ArrowRight, AlertCircle, Sparkles, TrendingDown, TrendingUp, PartyPopper, Coins, Lock, Flame, Leaf, Bell } from "lucide-react";
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
  const accent: "danger" | "warning" | "fresh" = status === "expired" || status === "expiring" ? "danger" : status === "use_soon" ? "warning" : "fresh";
  return (
    <GlassCard className="p-4 flex-shrink-0 w-44" staggerIndex={index} hover accentBar={accent}>
      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[rgba(21,19,15,0.5)] mb-2">Item · {String(index + 1).padStart(2, "0")}</p>
      <div className="text-2xl mb-2">{getCategoryEmoji(item.category as FoodCategory)}</div>
      <p className="font-display text-base text-[var(--ft-ink)] leading-tight truncate mb-2">{item.name}</p>
      <Badge variant={statusColor} dot glow size="sm">{formatRelativeDate(item.expiry_date)}</Badge>
    </GlassCard>
  );
}

function ActionCard({ to, emoji, title, desc, gradient, delay }: {
  to: string; emoji: string; title: string; desc: string; gradient: string; delay: number;
}) {
  const { t } = useAppPreferences();
  return (
    <Link to={to} className="block group">
      <GlassCard className="relative cursor-pointer overflow-hidden p-6" staggerIndex={delay} hover>
        <div className={`absolute inset-x-0 top-0 h-1 ${gradient} opacity-90`} />
        <div className="mb-3 inline-block text-3xl transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">{emoji}</div>
        <h3 className="mb-1.5 font-mono text-[12px] font-black uppercase tracking-[0.14em] text-[var(--ft-ink)] transition-colors group-hover:text-[var(--ft-signal)]">{title}</h3>
        <p className="text-sm leading-relaxed text-[rgba(21,19,15,0.62)]">{desc}</p>
        <div className="mt-4 flex translate-x-2 items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ft-signal)] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          {t("dashboard.open")} <ArrowRight className="w-3 h-3" />
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
    <article className="relative mb-6 animate-fade-in-up stagger-4 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-4">
      <span aria-hidden className={cn("pointer-events-none absolute left-0 right-0 top-0 h-[2px]", hasWasteThisMonth ? "bg-[var(--ft-signal)]" : "bg-[var(--ft-pickle)]")} />
      {!hasWasteThisMonth ? (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border border-[var(--ft-ink)] bg-[rgba(183,193,103,0.18)] flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-5 h-5 text-[var(--ft-pickle)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-pickle)]">Front page</p>
            <p className="font-display text-xl text-[var(--ft-ink)] leading-tight">Zero waste this month.</p>
            <p className="font-sans text-xs text-[rgba(21,19,15,0.62)] mt-0.5">Every item used is money saved.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border border-[var(--ft-signal)] bg-[rgba(184,50,30,0.08)] flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5 text-[var(--ft-signal)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(21,19,15,0.55)]">Ledger · this month</p>
            <p className="font-display text-xl text-[var(--ft-ink)] leading-tight">
              <span className="text-[var(--ft-signal)]">{thisMonthCost.toFixed(0)} kr</span> wasted
            </p>
            <p className="font-sans text-xs text-[rgba(21,19,15,0.62)] mt-0.5">
              {stats.totalCost > 0
                ? `${stats.totalCost.toFixed(0)} kr wasted in last 90 days`
                : "Track and reduce waste to save money"}
            </p>
          </div>
          {trendPercent !== null && (
            <div className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 border font-mono text-[10px] uppercase tracking-[0.18em] flex-shrink-0",
              trendIsDown
                ? "border-[var(--ft-pickle)] bg-[rgba(183,193,103,0.18)] text-[var(--ft-ink)]"
                : trendIsUp
                  ? "border-[var(--ft-signal)] bg-[rgba(184,50,30,0.08)] text-[var(--ft-signal)]"
                  : "border-[var(--ft-ink)] bg-[var(--ft-bone)] text-[var(--ft-ink)]",
            )}>
              {trendIsDown ? <TrendingDown className="w-3 h-3" /> : trendIsUp ? <TrendingUp className="w-3 h-3" /> : null}
              {trendIsDown ? "" : "+"}{trendPercent}%
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ReminderPreviewCard() {
  const { preview } = useNotificationPreferences();
  const { t } = useAppPreferences();
  if (!preview?.preferences?.enabled) return null;

  return (
    <GlassCard className="mb-6 p-4 animate-fade-in-up stagger-4" hover={false}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-warning-600" />
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ft-ink)]">{t("dashboard.nextReminder")}</h3>
        </div>
        <Link to="/settings" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] underline underline-offset-4 decoration-[var(--ft-pickle)] hover:text-[var(--ft-signal)] transition-colors">
          {t("dashboard.tuneSettings")}
        </Link>
      </div>
      {preview.items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-[rgba(21,19,15,0.66)]">
            {preview.items.length} item{preview.items.length === 1 ? "" : "s"} will show in your {preview.preferences.digestCadence} reminder.
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {preview.items.slice(0, 4).map((item) => (
              <span key={item.id} className="inline-flex shrink-0 items-center gap-1.5 border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-3 py-1.5 text-xs font-medium text-[var(--ft-ink)]">
                {getCategoryEmoji(item.category as FoodCategory)} {item.name} · {formatRelativeDate(item.expiryDate)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[rgba(21,19,15,0.66)]">
          Nothing is expiring inside your {preview.preferences.daysBefore}-day reminder window.
        </p>
      )}
    </GlassCard>
  );
}

function GroceryInsightsPanel() {
  const { summary } = usePurchaseHistorySummary();
  const { t } = useAppPreferences();
  const hasHistory = summary.monthItemsBought > 0 || summary.repeatedItems.length > 0;
  if (!hasHistory) return null;

  return (
    <div className="mb-8 animate-fade-in-up stagger-5">
      <div className="mb-4 flex items-center gap-2">
        <Coins className="h-4 w-4 text-[var(--ft-signal)]" />
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ft-ink)]">{t("dashboard.groceryInsights")}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <GlassCard className="p-4" hover={false}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(21,19,15,0.52)]">This month</p>
          <p className="mt-2 text-3xl font-black text-[var(--ft-ink)]">{summary.monthItemsBought}</p>
          <p className="text-xs text-[rgba(21,19,15,0.62)]">items bought</p>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(21,19,15,0.52)]">Spend logged</p>
          <p className="mt-2 text-3xl font-black text-[var(--ft-ink)]">{summary.estimatedSpend.toFixed(0)} kr</p>
          <p className="text-xs text-[rgba(21,19,15,0.62)]">from priced items</p>
        </GlassCard>
        <GlassCard className="p-4 md:col-span-2" hover={false}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(21,19,15,0.52)]">Most repeated</p>
          <div className="mt-3 space-y-2">
            {summary.repeatedItems.slice(0, 3).map((item) => (
              <div key={item.name} className="flex items-center justify-between border-b border-[rgba(21,19,15,0.12)] pb-2 text-sm">
                <span>{getCategoryEmoji(item.category as FoodCategory)} {item.name}</span>
                <span className="font-semibold">{item.count}×</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
      {(summary.categoryTrend.length > 0 || summary.storeTrend.length > 0 || summary.wasteAvoidedOpportunities.length > 0) && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <GlassCard className="p-4" hover={false}>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(21,19,15,0.52)]">Category trend</p>
            {summary.categoryTrend.slice(0, 3).map((row) => (
              <p key={row.category} className="text-sm text-[rgba(21,19,15,0.72)]">{getCategoryEmoji(row.category as FoodCategory)} {row.category}: {row.count}</p>
            ))}
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(21,19,15,0.52)]">Store trend</p>
            {summary.storeTrend.length ? summary.storeTrend.map((row) => (
              <p key={row.store} className="text-sm text-[rgba(21,19,15,0.72)]">{row.store}: {row.count} items</p>
            )) : <p className="text-sm text-[rgba(21,19,15,0.58)]">Fetch prices to build store insights.</p>}
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(21,19,15,0.52)]">Waste avoided</p>
            {summary.wasteAvoidedOpportunities.length ? summary.wasteAvoidedOpportunities.map((row) => (
              <p key={row.name} className="text-sm text-[rgba(21,19,15,0.72)]">{row.name}: bought {row.count}× without waste</p>
            )) : <p className="text-sm text-[rgba(21,19,15,0.58)]">Put away groceries to reveal wins.</p>}
          </GlassCard>
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
  A: "bg-[var(--ft-pickle)] text-[var(--ft-ink)] border border-[var(--ft-ink)] shadow-[2px_2px_0_var(--ft-ink)]",
  B: "bg-[var(--ft-bone)] text-[var(--ft-ink)] border border-[var(--ft-ink)] shadow-[2px_2px_0_var(--ft-pickle)]",
  C: "bg-[#f5e0a3] text-[var(--ft-ink)] border border-[var(--ft-ink)] shadow-[2px_2px_0_var(--ft-ink)]",
  D: "bg-[#e6a96b] text-[var(--ft-ink)] border border-[var(--ft-ink)] shadow-[2px_2px_0_var(--ft-ink)]",
  F: "bg-[var(--ft-signal)] text-[var(--ft-bone)] border border-[var(--ft-ink)] shadow-[2px_2px_0_var(--ft-ink)]",
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
        <GlassCard className="p-4 flex items-center gap-3" staggerIndex={4} hover={false} accentBar="warning">
          <div className="h-12 w-12 border border-[var(--ft-ink)] bg-[var(--ft-signal)] flex items-center justify-center shadow-[2px_2px_0_var(--ft-ink)]">
            <Flame className="w-6 h-6 text-[var(--ft-bone)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(21,19,15,0.55)]">Streak</p>
            <p className="font-display text-2xl text-[var(--ft-ink)] leading-none mt-0.5">
              {stats.wasteStreak > 0 ? (
                <>{stats.wasteStreak} <span className="font-sans text-base">day{stats.wasteStreak !== 1 ? "s" : ""} clean</span></>
              ) : (
                <>Start your streak.</>
              )}
            </p>
            <p className="font-sans text-xs text-[rgba(21,19,15,0.6)] mt-1">
              {stats.wasteStreak > 0 ? "Keep it going. Every day counts." : "Avoid food waste to build your streak."}
            </p>
          </div>
          {stats.wasteStreak >= 7 && (
            <span className="text-2xl animate-float" role="img" aria-label="fire">&#x1F525;</span>
          )}
        </GlassCard>

        {/* Monthly grade */}
        <GlassCard className="p-4 flex items-center gap-3" staggerIndex={5} hover={false} accentBar="default">
          <div className={cn(
            "h-12 w-12 flex items-center justify-center font-display text-2xl",
            GRADE_COLORS[stats.monthlyWasteScore] ?? GRADE_COLORS.C,
          )}>
            {stats.monthlyWasteScore}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(21,19,15,0.55)]">Grade · this month</p>
            <p className="font-display text-lg text-[var(--ft-ink)] leading-tight">Monthly waste score</p>
            <p className="font-sans text-xs text-[rgba(21,19,15,0.6)] mt-0.5">
              {stats.monthlyWasteScore === "A" && "Excellent. 50%+ less waste than last month."}
              {stats.monthlyWasteScore === "B" && "Great. 20–50% less waste than last month."}
              {stats.monthlyWasteScore === "C" && "Good. Slightly less waste than last month."}
              {stats.monthlyWasteScore === "D" && "Waste increased a little this month."}
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
                  "p-3 text-center transition-all duration-150",
                  !unlocked && "opacity-50 grayscale",
                  unlocked && "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-ink)]",
                )}
                hover={false}
                staggerIndex={6}
                accentBar={unlocked ? "fresh" : undefined}
              >
                <div className="text-2xl mb-1.5 mt-1">
                  {unlocked ? def.emoji : (
                    <Lock className="w-5 h-5 text-[rgba(21,19,15,0.4)] mx-auto" />
                  )}
                </div>
                <p className={cn(
                  "font-mono text-[9px] uppercase tracking-[0.18em] truncate",
                  unlocked ? "text-[var(--ft-ink)]" : "text-[rgba(21,19,15,0.4)]",
                )}>
                  {def.title}
                </p>
              </GlassCard>
              {/* Tooltip */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 border border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-10 shadow-[3px_3px_0_var(--ft-pickle)]">
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
    gradient: "bg-[var(--ft-ink)]",
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
    gradient: "bg-[var(--ft-pickle)]",
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
  const { t } = useAppPreferences();
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
      {/* ── Editorial header ────────────────────────────────── */}
      <header className="mb-10 animate-fade-in-up">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--ft-ink)]" aria-hidden />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--ft-signal)]">{t("dashboard.kicker")}</p>
          </div>
          <p className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(21,19,15,0.48)]">
            Vol. I · No. {String(new Date().getDate()).padStart(2, "0")} · {new Date().toLocaleDateString("nb-NO", { month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="grid gap-6 border-b border-[var(--ft-ink)] pb-8 md:grid-cols-[minmax(0,1fr)_240px] md:gap-10">
          <h1 className="dashboard-display text-[clamp(2.4rem,5.4vw,5.25rem)] font-black leading-[0.92] tracking-[-0.045em] text-[var(--ft-ink)] [text-wrap:balance]">
            {t("dashboard.title")}
          </h1>
          <p className="self-end border-l-2 border-[var(--ft-pickle)] pl-5 text-[13px] leading-relaxed text-[rgba(21,19,15,0.66)] md:max-w-[220px]">
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)] mb-2">Editor's note</span>
            {t("dashboard.subtitle")}
          </p>
        </div>
      </header>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("dashboard.totalItems")}   value={items.length}          icon={Package}       gradient="bg-[var(--ft-ink)]"        glowClass="text-[var(--ft-ink)]"     delay={0} />
        <StatCard label={t("dashboard.inFridge")}     value={fridgeItems.length}    icon={Refrigerator}  gradient="bg-[var(--ft-pickle)]"     glowClass="text-[var(--ft-ink)]"     delay={1} />
        <StatCard label={t("dashboard.inFreezer")}    value={freezerItems.length}   icon={Snowflake}     gradient="bg-[var(--ft-ink)]"        glowClass="text-[var(--ft-ink)]"     delay={2} />
        <StatCard label={t("dashboard.expiringSoon")} value={expiringItems.length}  icon={AlertTriangle} gradient="bg-gradient-to-br from-warning-400 to-warning-600" glowClass="text-warning-700"    delay={3} alert variant="warning" />
      </div>

      {/* ── Expired items alert ────────────────────────────── */}
      {expiredItems.length > 0 && (
        <GlassCard variant="danger" className="p-4 mb-6 flex items-start gap-3" animate staggerIndex={4} accentBar="danger">
          <div className="h-10 w-10 border border-[var(--ft-signal)] bg-[rgba(184,50,30,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-[var(--ft-signal)] animate-pulse-soft" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ft-signal)]">Stop press</p>
            <h3 className="font-display text-xl text-[var(--ft-ink)] mt-0.5 leading-tight">
              {expiredItems.length} expired item{expiredItems.length > 1 ? "s" : ""}
            </h3>
            <p className="font-sans text-sm text-[rgba(21,19,15,0.7)] mt-1">
              <span className="font-medium">{expiredItems.map((i) => i.name).join(", ")}</span>. Please remove or mark as wasted.
            </p>
          </div>
          <Link to="/items" className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] underline underline-offset-4 decoration-[var(--ft-signal)] hover:text-[var(--ft-signal)] transition-colors whitespace-nowrap mt-1">
            View all <ArrowRight className="w-3 h-3 inline ml-0.5" />
          </Link>
        </GlassCard>
      )}

      {/* ── Expiring soon carousel ─────────────────────────── */}
      {expiringItems.length > 0 && (
        <div className="mb-8 animate-fade-in-up stagger-4">
          <div className="flex items-baseline justify-between mb-4 border-b border-[var(--ft-ink)] pb-2">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-signal)]">Today's column</span>
              <h2 className="font-display text-xl text-[var(--ft-ink)] leading-none">{t("dashboard.useSoon")}</h2>
            </div>
            {expiringItems.length > 6 && (
              <Link to="/items" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] underline underline-offset-4 decoration-[var(--ft-pickle)] hover:text-[var(--ft-signal)] transition-colors flex items-center gap-1">
                {t("dashboard.viewAll")} {expiringItems.length} <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
            {expiringItems.slice(0, 8).map((item, i) => <ExpiringMiniCard key={item.id} item={item} index={i} />)}
          </div>
        </div>
      )}

      <ReminderPreviewCard />

      {/* ── Waste summary ──────────────────────────────────── */}
      {wasteStats && <WasteSummaryBanner stats={wasteStats as WasteStats} />}

      <GroceryInsightsPanel />

      {/* ── Achievements ───────────────────────────────────── */}
      <AchievementsPanel />

      {/* ── In Season card ─────────────────────────────────── */}
      {(() => {
        const seasonal = getInSeasonNow();
        if (seasonal.length === 0) return null;
        return (
          <GlassCard className="p-4 mb-6 animate-fade-in-up stagger-5" hover={false} accentBar="fresh">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-[var(--ft-pickle)]" />
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ft-ink)]">In season · Norway</h3>
              </div>
              <Link to="/shopping" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ft-ink)] underline underline-offset-4 decoration-[var(--ft-pickle)] hover:text-[var(--ft-signal)] transition-colors flex items-center gap-1">
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
                <span className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)]">+{seasonal.length - 6} more</span>
              )}
            </div>
          </GlassCard>
        );
      })()}

      {/* ── Quick Actions ──────────────────────────────────── */}
      <div className="mb-6 animate-fade-in-up stagger-5">
        <div className="flex items-baseline gap-3 mb-4 border-b border-[var(--ft-ink)] pb-2">
          <Sparkles className="w-4 h-4 text-[var(--ft-pickle)] self-center" />
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-signal)]">Plate · 03</span>
          <h2 className="font-display text-xl text-[var(--ft-ink)] leading-none">{t("dashboard.quickActions")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard to="/items"   emoji="&#x1F34E;" title={t("dashboard.manageFood")}   desc={t("dashboard.manageFoodDesc")}  gradient="bg-[var(--ft-pickle)]" delay={5} />
          <ActionCard to="/scan"    emoji="&#x1F4F7;" title={t("dashboard.scanBarcode")}  desc={t("dashboard.scanBarcodeDesc")} gradient="bg-[var(--ft-ink)]"    delay={6} />
          <ActionCard to="/recipes" emoji="&#x1F468;&#x200D;&#x1F373;" title={t("dashboard.findRecipes")} desc={t("dashboard.findRecipesDesc")} gradient="bg-[var(--ft-signal)]" delay={7} />
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
          <div className="flex items-baseline gap-3 mb-4 border-b border-[var(--ft-ink)] pb-2">
            <Sparkles className="w-4 h-4 text-[var(--ft-pickle)] self-center" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-signal)]">Sub · 02</span>
            <h4 className="font-display text-lg text-[var(--ft-ink)] leading-none">Starter packs</h4>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] ml-auto">Add common items in one tap</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {STARTER_PACKS.map((pack, i) => (
              <button
                key={pack.label}
                onClick={() => handleStarterPack(pack)}
                disabled={addingPack !== null}
                className={cn(
                  "group relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-5 text-left transition-all duration-150 overflow-hidden",
                  "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-ink)] active:translate-y-0 active:shadow-none",
                  addingPack === pack.label && "shadow-[3px_3px_0_var(--ft-pickle)]",
                  addingPack !== null && addingPack !== pack.label && "opacity-50",
                )}
              >
                <span aria-hidden className={cn("pointer-events-none absolute left-0 right-0 top-0 h-[2px]",
                  i === 0 ? "bg-[var(--ft-pickle)]" : i === 1 ? "bg-[var(--ft-ink)]" : "bg-[var(--ft-signal)]"
                )} />

                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-2xl">{pack.emoji}</span>
                  <span className="font-display text-lg text-[var(--ft-ink)] leading-none">{pack.label}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.5)] ml-auto">{pack.items.length} items</span>
                </div>
                <p className="font-sans text-xs text-[rgba(21,19,15,0.65)] leading-relaxed">
                  {pack.items.map((it) => it.name).join(", ")}
                </p>

                {addingPack === pack.label && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,248,232,0.85)]">
                    <div className="h-5 w-5 border-2 border-[var(--ft-ink)] border-t-transparent rounded-full animate-spin" />
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
