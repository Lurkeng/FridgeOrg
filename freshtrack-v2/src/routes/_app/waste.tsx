import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWasteLogs } from "@/hooks/useWaste";
import { useCountUp } from "@/hooks/useCountUp";
import { PageHeader } from "@/components/layout/PageHeader";
import { WasteSkeleton } from "@/components/ui/Skeleton";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/utils";
import { BarChart3, Coins, Calendar, AlertTriangle, TrendingDown, TrendingUp, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppPreferences } from "@/lib/app-preferences";

export const Route = createFileRoute("/_app/waste")({
  component: WastePage,
});

function WasteStatCard({ label, value, sub, icon: Icon, accent, delay, trend, kicker }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  accent: 'danger' | 'warning' | 'ink' | 'pickle'; delay: number; trend?: { value: number };
  kicker: string;
}) {
  const accentBar: Record<string, string> = {
    danger:  'bg-[var(--ft-signal)]',
    warning: 'bg-[#d97706]',
    ink:     'bg-[var(--ft-ink)]',
    pickle:  'bg-[var(--ft-pickle)]',
  };
  const iconColor: Record<string, string> = {
    danger:  'text-[var(--ft-signal)]',
    warning: 'text-[#7c4a00]',
    ink:     'text-[var(--ft-ink)]',
    pickle:  'text-[var(--ft-pickle)]',
  };
  return (
    <article
      className="relative overflow-hidden border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-5 animate-fade-in-up transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-ink)]"
      style={{ animationDelay: `${delay * 60}ms`, animationFillMode: 'both' }}
    >
      <span aria-hidden className={cn('absolute left-0 right-0 top-0 h-[2px]', accentBar[accent])} />
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="h-px w-5 bg-[var(--ft-ink)]" />
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[rgba(21,19,15,0.62)]">{kicker}</p>
      </div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <Icon className={cn('h-5 w-5', iconColor[accent])} strokeWidth={1.75} />
        {trend && trend.value !== 0 && (
          <span className={cn(
            'inline-flex items-center gap-1 border px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.14em]',
            trend.value < 0
              ? 'border-[rgba(90,110,0,0.55)] bg-[rgba(183,193,103,0.16)] text-[#3a4808]'
              : 'border-[var(--ft-signal)] bg-[rgba(184,50,30,0.10)] text-[#8e2515]',
          )}>
            {trend.value < 0 ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
            {Math.abs(trend.value).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-[var(--ft-ink)] [text-wrap:balance]">{value}</p>
      <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ft-ink)]">{label}</p>
      {sub && <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.50)]">{sub}</p>}
    </article>
  );
}

function WastePage() {
  const { t } = useAppPreferences();
  const { data: wasteLogs = [], isLoading } = useWasteLogs();

  const stats = useMemo(() => {
    const totalCost  = wasteLogs.reduce((s, l) => s + l.estimatedCost, 0);
    const totalItems = wasteLogs.length;

    const byCategory: Record<string, { count: number; cost: number }> = {};
    wasteLogs.forEach((log) => {
      if (!byCategory[log.category]) byCategory[log.category] = { count: 0, cost: 0 };
      byCategory[log.category].count += 1;
      byCategory[log.category].cost  += log.estimatedCost;
    });

    const byReason: Record<string, number> = {};
    wasteLogs.forEach((log) => { byReason[log.reason] = (byReason[log.reason] || 0) + 1; });

    const now = new Date();
    const weeklyTrend: { week: string; count: number; cost: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
      const wk = wasteLogs.filter((l) => { const d = new Date(l.wastedDate); return d >= weekStart && d < weekEnd; });
      weeklyTrend.push({ week: weekStart.toLocaleDateString("nb-NO", { month: "short", day: "numeric" }), count: wk.length, cost: wk.reduce((s, l) => s + l.estimatedCost, 0) });
    }

    const itemCounts: Record<string, number> = {};
    wasteLogs.forEach((l) => { itemCounts[l.itemName] = (itemCounts[l.itemName] || 0) + 1; });
    const topWasted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthCost = wasteLogs.filter((l) => new Date(l.wastedDate) >= thisMonth).reduce((s, l) => s + l.estimatedCost, 0);
    const lastMonthCost = wasteLogs.filter((l) => new Date(l.wastedDate) >= lastMonth && new Date(l.wastedDate) < thisMonth).reduce((s, l) => s + l.estimatedCost, 0);

    return { totalCost, totalItems, byCategory, byReason, weeklyTrend, topWasted, thisMonthCost, lastMonthCost };
  }, [wasteLogs]);

  const countUpTotal  = useCountUp(stats.totalItems, 900, 0);
  const monthChange   = stats.lastMonthCost > 0 ? ((stats.thisMonthCost - stats.lastMonthCost) / stats.lastMonthCost) * 100 : 0;
  const maxWeekCount  = Math.max(...stats.weeklyTrend.map((w) => w.count), 1);
  const sortedCategories = Object.entries(stats.byCategory).sort((a, b) => b[1].count - a[1].count);
  const maxCatCount = sortedCategories[0]?.[1].count || 1;

  if (isLoading) {
    return <WasteSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader title={t("waste.title")} subtitle={t("waste.subtitle")} eyebrow={t("waste.eyebrow")} icon={<BarChart3 className="w-5 h-5 text-[var(--ft-signal)]" />} />

      {/* Stats row — editorial parchment cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <WasteStatCard kicker="Stat · 01" label={t("waste.statItemsLogged")}   value={countUpTotal.toString()} sub={`${stats.totalItems} ${t("waste.statEntries")}`} icon={AlertTriangle} accent="danger"  delay={0} />
        <WasteStatCard kicker="Stat · 02" label={t("waste.statEstimatedLoss")} value={`${stats.totalCost.toFixed(0)} kr`} sub={t("waste.statLifetime")}             icon={Coins}         accent="warning" delay={1} />
        <WasteStatCard kicker="Stat · 03" label={t("waste.statThisMonth")}     value={`${stats.thisMonthCost.toFixed(0)} kr`}                       icon={Calendar}      accent="ink"     delay={2} trend={{ value: monthChange }} />
        <WasteStatCard
          kicker="Stat · 04"
          label={t("waste.statMostWasted")}
          value={stats.topWasted[0]?.name ?? "—"}
          sub={stats.topWasted[0] ? `${stats.topWasted[0].count}${t("waste.statTimesWasted")}` : t("waste.statNoData")}
          icon={BarChart3}
          accent="pickle"
          delay={3}
        />
      </div>

      {/* Charts row */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Weekly trend */}
        <section className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-5 animate-fade-in-up" style={{ animationDelay: '240ms', animationFillMode: 'both' }}>
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden className="h-px w-5 bg-[var(--ft-ink)]" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--ft-signal)]">Plate · 01</p>
          </div>
          <h3 className="mb-4 font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-[var(--ft-ink)]">{t("waste.weeklyTrend")}</h3>
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-b border-dashed border-[rgba(21,19,15,0.16)]" />
              ))}
            </div>
            <div className="relative flex h-32 items-end gap-2">
              {stats.weeklyTrend.map((week, i) => {
                const height = (week.count / maxWeekCount) * 100;
                return (
                  <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full border border-[var(--ft-ink)] bg-[var(--ft-signal)] transition-all duration-500 hover:bg-[#a02a18]"
                      style={{ height: `${height}%`, minHeight: week.count > 0 ? '6px' : '2px' }}
                    />
                    {week.count > 0 && (
                      <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border border-[var(--ft-ink)] bg-[var(--ft-bone)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ft-ink)] opacity-0 shadow-[2px_2px_0_var(--ft-ink)] transition-opacity duration-200 group-hover:opacity-100">
                        {week.count}× · {week.cost.toFixed(0)} kr
                      </div>
                    )}
                    <span className="mt-0.5 w-full truncate text-center font-mono text-[9px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.50)]">{week.week.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
            {stats.totalItems === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--ft-paper)]/80">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-[rgba(21,19,15,0.45)]">{t("waste.startTracking")}</p>
              </div>
            )}
          </div>
        </section>

        {/* Category breakdown */}
        <section className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-5 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden className="h-px w-5 bg-[var(--ft-ink)]" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--ft-pickle)]">Plate · 02</p>
          </div>
          <h3 className="mb-4 flex items-center gap-2 font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-[var(--ft-ink)]">
            <Leaf className="h-4 w-4 text-[var(--ft-pickle)]" strokeWidth={2} />
            {t("waste.byCategory")}
          </h3>
          {sortedCategories.length > 0 ? (
            <div className="space-y-3">
              {sortedCategories.slice(0, 5).map(([cat, data]) => (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-[var(--ft-ink)]">
                      <span>{getCategoryEmoji(cat as Parameters<typeof getCategoryEmoji>[0])}</span>
                      {getCategoryLabel(cat as Parameters<typeof getCategoryLabel>[0])}
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(21,19,15,0.62)]">
                      {data.count}× · {data.cost.toFixed(0)} kr
                    </span>
                  </div>
                  <div className="h-2 border border-[var(--ft-ink)] bg-[var(--ft-bone)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--ft-signal)] transition-all duration-700"
                      style={{ width: `${(data.count / maxCatCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="mb-2 font-display text-3xl text-[var(--ft-pickle)]">✺</span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--ft-ink)]">{t("waste.cleanLedger")}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.50)]">{t("waste.nothingWasted")}</p>
            </div>
          )}
        </section>
      </div>

      {/* Top wasted items */}
      {stats.topWasted.length > 0 && (
        <section className="mb-4 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-5 animate-fade-in-up" style={{ animationDelay: '360ms', animationFillMode: 'both' }}>
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden className="h-px w-5 bg-[var(--ft-ink)]" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#7c4a00]">Plate · 03</p>
          </div>
          <h3 className="mb-4 flex items-center gap-2 font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-[var(--ft-ink)]">
            <AlertTriangle className="h-4 w-4 text-[#7c4a00]" strokeWidth={2} />
            {t("waste.repeatOffenders")}
          </h3>
          <ol className="divide-y divide-[rgba(21,19,15,0.18)] border border-[var(--ft-ink)]">
            {stats.topWasted.map((item, i) => (
              <li key={item.name} className="flex items-center gap-3 bg-[var(--ft-paper)] px-3 py-2.5 transition-colors hover:bg-[var(--ft-bone)]">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-signal)] font-mono text-[10px] font-bold text-[var(--ft-bone)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 truncate font-display text-[15px] font-semibold text-[var(--ft-ink)]">{item.name}</span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ft-signal)]">{item.count}×</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Recent waste log — newspaper-style data table */}
      {wasteLogs.length > 0 && (
        <section className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] animate-fade-in-up" style={{ animationDelay: '420ms', animationFillMode: 'both' }}>
          <div className="grid grid-cols-[1fr_auto] border-b border-[var(--ft-ink)] font-mono text-[10px] uppercase tracking-[0.20em]">
            <div className="flex items-center gap-2 p-3 text-[var(--ft-ink)]">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
              {t("waste.recentLog")}
            </div>
            <div className="border-l border-[var(--ft-ink)] p-3 text-[var(--ft-signal)]">
              {wasteLogs.length} {t("waste.total")}
            </div>
          </div>
          <ul className="font-mono text-[12px]">
            {wasteLogs.slice(0, 10).map((log, i) => (
              <li
                key={log.id}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[rgba(21,19,15,0.18)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--ft-bone)] animate-fade-in-up"
                style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
              >
                <span className="text-base leading-none">{getCategoryEmoji(log.category as Parameters<typeof getCategoryEmoji>[0])}</span>
                <div className="min-w-0">
                  <p className="truncate font-display text-[14px] font-semibold tracking-[-0.005em] text-[var(--ft-ink)]">{log.itemName}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.55)]">
                    <span className="capitalize">{log.reason}</span> · {log.wastedDate}
                  </p>
                </div>
                <span className="flex-shrink-0 border border-[var(--ft-signal)] bg-[rgba(184,50,30,0.08)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ft-signal)]">
                  {log.estimatedCost.toFixed(0)} kr
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Global empty state */}
      {wasteLogs.length === 0 && (
        <section className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-8 py-16 text-center shadow-[3px_3px_0_var(--ft-ink)]">
          <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-[var(--ft-ink)]" />
          <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[var(--ft-ink)]" />
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--ft-pickle)]">{t("waste.cleanLedger")}</p>
          <h3 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-[var(--ft-ink)] [text-wrap:balance]">
            {t("waste.emptyTitle")}
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[rgba(21,19,15,0.62)]">
            {t("waste.emptyBody")}
          </p>
        </section>
      )}
    </div>
  );
}
