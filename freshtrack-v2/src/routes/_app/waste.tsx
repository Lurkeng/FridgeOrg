import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWasteLogs } from "@/hooks/useWaste";
import { useCountUp } from "@/hooks/useCountUp";
import GlassCard from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { WasteSkeleton } from "@/components/ui/Skeleton";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/utils";
import { BarChart3, Coins, Calendar, AlertTriangle, TrendingDown, TrendingUp, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/waste")({
  component: WastePage,
});

function WasteStatCard({ label, value, sub, icon: Icon, gradient, delay, trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  gradient: string; delay: number; trend?: { value: number };
}) {
  return (
    <GlassCard className="p-5" staggerIndex={delay}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        {trend && trend.value !== 0 && (
          <span className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full", trend.value < 0 ? "text-fresh-700 bg-fresh-100/80" : "text-danger-600 bg-danger-100/80")}>
            {trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {Math.abs(trend.value).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-0.5 tracking-tight">{value}</p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </GlassCard>
  );
}

function WastePage() {
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
      <PageHeader title="Waste Tracker" subtitle="Understand and reduce your food waste" icon={<BarChart3 className="w-5 h-5 text-danger-500" />} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <WasteStatCard label="Total Wasted"  value={countUpTotal.toString()} sub="items logged" icon={AlertTriangle} gradient="bg-gradient-to-br from-danger-400 to-danger-600"   delay={0} />
        <WasteStatCard label="Total Cost"    value={`${stats.totalCost.toFixed(0)} kr`}  sub="estimated loss" icon={Coins}   gradient="bg-gradient-to-br from-warning-400 to-warning-600" delay={1} />
        <WasteStatCard label="This Month"    value={`${stats.thisMonthCost.toFixed(0)} kr`} icon={Calendar} gradient="bg-gradient-to-br from-slate-500 to-slate-700" delay={2} trend={{ value: monthChange }} />
        <WasteStatCard
          label="Most Wasted"
          value={stats.topWasted[0]?.name ?? "No data yet"}
          sub={stats.topWasted[0] ? `${stats.topWasted[0].count}\u00D7 wasted` : "Start tracking to see patterns"}
          icon={BarChart3}
          gradient="bg-gradient-to-br from-frost-500 to-frost-700"
          delay={3}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Weekly trend */}
        <GlassCard className="p-5" staggerIndex={4}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-danger-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Weekly Trend</h3>
          </div>
          <div className="relative">
            {/* Y-axis grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border-b border-slate-200/40" />
              ))}
            </div>
            <div className="flex items-end gap-2 h-32 relative">
              {stats.weeklyTrend.map((week, i) => {
                const height = (week.count / maxWeekCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-danger-400/70 to-danger-300/40 transition-all duration-500 hover:from-danger-500/80 hover:to-danger-400/50 cursor-default"
                      style={{ height: `${height}%`, minHeight: week.count > 0 ? "6px" : "2px" }}
                    />
                    {/* Hover tooltip */}
                    {week.count > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 glass-heavy rounded-lg text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
                        {week.count} item{week.count > 1 ? "s" : ""} &middot; {week.cost.toFixed(0)} kr
                      </div>
                    )}
                    <span className="text-[9px] text-slate-400 truncate w-full text-center mt-0.5">{week.week.split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
            {/* Empty state overlay */}
            {stats.totalItems === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/30 rounded-xl">
                <p className="text-xs text-slate-400 font-medium">Start tracking to see trends</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Category breakdown */}
        <GlassCard className="p-5" staggerIndex={5}>
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-4 h-4 text-fresh-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">By Category</h3>
          </div>
          {sortedCategories.length > 0 ? (
            <div className="space-y-3">
              {sortedCategories.slice(0, 5).map(([cat, data]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 flex items-center gap-1.5">
                      <span>{getCategoryEmoji(cat as Parameters<typeof getCategoryEmoji>[0])}</span>
                      {getCategoryLabel(cat as Parameters<typeof getCategoryLabel>[0])}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{data.count}\u00D7 &middot; {data.cost.toFixed(0)} kr</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100/80 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-danger-400 to-danger-500 transition-all duration-700"
                      style={{ width: `${(data.count / maxCatCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="text-3xl mb-2" role="img" aria-label="celebration">&#x1F389;</span>
              <p className="text-sm text-slate-500 font-medium">No waste logged yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Keep up the great work!</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Top wasted items */}
      {stats.topWasted.length > 0 && (
        <GlassCard className="p-5 mb-4" staggerIndex={6}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Most Wasted Items</h3>
          </div>
          <div className="space-y-2">
            {stats.topWasted.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 p-3 glass rounded-xl hover:-translate-y-0.5 hover:shadow-glass-hover transition-all duration-200" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-danger-400 to-danger-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                <span className="flex-1 font-medium text-slate-800">{item.name}</span>
                <span className="text-sm text-danger-600 font-semibold">{item.count}\u00D7</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Recent waste log */}
      {wasteLogs.length > 0 && (
        <GlassCard className="p-5" staggerIndex={7}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Recent Waste Log</h3>
          </div>
          <div className="space-y-1">
            {wasteLogs.slice(0, 10).map((log, i) => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/40 transition-colors animate-fade-in-up" style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}>
                <span className="text-xl flex-shrink-0">{getCategoryEmoji(log.category as Parameters<typeof getCategoryEmoji>[0])}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{log.itemName}</p>
                  <p className="text-xs text-slate-500 capitalize">{log.reason} &middot; {log.wastedDate}</p>
                </div>
                <span className="text-sm font-semibold text-danger-600 flex-shrink-0">{log.estimatedCost.toFixed(0)} kr</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Global empty state */}
      {wasteLogs.length === 0 && (
        <GlassCard className="text-center py-16 px-8" hover={false}>
          <div className="text-6xl mb-4 animate-float inline-block" role="img" aria-label="celebration">&#x1F389;</div>
          <h3 className="font-bold text-slate-800 text-lg mb-1.5">No waste logged yet!</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Great job keeping food waste down. When items expire or spoil, mark them as wasted to track your impact and find patterns.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
