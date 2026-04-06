'use client';

import { useMemo } from 'react';
import { useFoodItems } from '@/hooks/useFoodItems';
import { FoodCategory } from '@/types';
import { getCategoryEmoji, getCategoryLabel } from '@/lib/utils';
import GlassCard from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCountUp } from '@/hooks/useCountUp';
import { BarChart3, DollarSign, Calendar, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function WasteStatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  delay,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  delay: number;
  trend?: { value: number };
}) {
  return (
    <GlassCard className="p-5" staggerIndex={delay}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        {trend && trend.value !== 0 && (
          <span className={cn('flex items-center gap-0.5 text-xs font-semibold', trend.value < 0 ? 'text-fresh-600' : 'text-danger-500')}>
            {trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {Math.abs(trend.value).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-0.5">{value}</p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </GlassCard>
  );
}

export default function WastePage() {
  const { wasteLogs, isLoaded } = useFoodItems();

  const stats = useMemo(() => {
    const totalCost = wasteLogs.reduce((s, l) => s + l.estimated_cost, 0);
    const totalItems = wasteLogs.length;

    const byCategory: Record<string, { count: number; cost: number }> = {};
    wasteLogs.forEach((log) => {
      if (!byCategory[log.category]) byCategory[log.category] = { count: 0, cost: 0 };
      byCategory[log.category].count += 1;
      byCategory[log.category].cost += log.estimated_cost;
    });

    const byReason: Record<string, number> = {};
    wasteLogs.forEach((log) => { byReason[log.reason] = (byReason[log.reason] || 0) + 1; });

    const weeklyTrend: { week: string; count: number; cost: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekLogs = wasteLogs.filter((log) => {
        const d = new Date(log.wasted_date);
        return d >= weekStart && d < weekEnd;
      });
      weeklyTrend.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: weekLogs.length,
        cost: weekLogs.reduce((s, l) => s + l.estimated_cost, 0),
      });
    }

    const itemCounts: Record<string, number> = {};
    wasteLogs.forEach((log) => { itemCounts[log.item_name] = (itemCounts[log.item_name] || 0) + 1; });
    const topWasted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthCost = wasteLogs.filter((l) => new Date(l.wasted_date) >= thisMonth).reduce((s, l) => s + l.estimated_cost, 0);
    const lastMonthCost = wasteLogs.filter((l) => new Date(l.wasted_date) >= lastMonth && new Date(l.wasted_date) < thisMonth).reduce((s, l) => s + l.estimated_cost, 0);

    return { totalCost, totalItems, byCategory, byReason, weeklyTrend, topWasted, thisMonthCost, lastMonthCost };
  }, [wasteLogs]);

  const countUpTotal = useCountUp(stats.totalItems, 900, 0);
  const monthChange = stats.lastMonthCost > 0 ? ((stats.thisMonthCost - stats.lastMonthCost) / stats.lastMonthCost) * 100 : 0;
  const maxWeekCount = Math.max(...stats.weeklyTrend.map((w) => w.count), 1);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass rounded-2xl px-8 py-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-frost-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Loading waste data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Waste Tracker"
        subtitle="Track food waste and see how much you could be saving"
        icon={<BarChart3 className="w-5 h-5 text-danger-500" />}
      />

      {wasteLogs.length === 0 ? (
        <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
          <div className="text-6xl mb-4 animate-float inline-block">🎉</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No waste recorded yet!</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            When you mark items as wasted from your food inventory, they&apos;ll show up here so you can track your waste reduction progress.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <WasteStatCard label="Total Wasted" value={String(countUpTotal)} sub="items total" icon={BarChart3} gradient="bg-gradient-to-br from-slate-500 to-slate-700" delay={0} />
            <WasteStatCard label="Est. Cost" value={`$${stats.totalCost.toFixed(2)}`} sub="total lost" icon={DollarSign} gradient="bg-gradient-to-br from-danger-400 to-danger-600" delay={1} />
            <WasteStatCard label="This Month" value={`$${stats.thisMonthCost.toFixed(2)}`} icon={Calendar} gradient="bg-gradient-to-br from-warning-400 to-warning-600" delay={2} trend={{ value: monthChange }} />
            <WasteStatCard
              label="Top Reason"
              value={Object.entries(stats.byReason).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}
              sub="most common cause"
              icon={AlertTriangle}
              gradient="bg-gradient-to-br from-frost-400 to-frost-600"
              delay={3}
            />
          </div>

          {/* Weekly Trend */}
          <GlassCard className="p-6 mb-6 animate-fade-in-up stagger-4" hover={false}>
            <h3 className="font-bold text-slate-800 mb-5">Weekly Waste Trend</h3>
            <div className="flex items-end gap-2 h-32">
              {stats.weeklyTrend.map((week, i) => {
                const height = (week.count / maxWeekCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-xs text-slate-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {week.count > 0 ? week.count : ''}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80"
                      style={{
                        height: `${Math.max(height, week.count > 0 ? 8 : 2)}%`,
                        background: week.count === 0
                          ? 'rgba(241,245,249,0.8)'
                          : `linear-gradient(to top, rgba(239,68,68,0.8), rgba(252,165,165,0.6))`,
                        minHeight: week.count > 0 ? '8px' : '2px',
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">{week.week}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* By Category */}
            <GlassCard className="p-6 animate-fade-in-up stagger-5" hover={false}>
              <h3 className="font-bold text-slate-800 mb-4">Waste by Category</h3>
              <div className="space-y-4">
                {Object.entries(stats.byCategory).sort((a, b) => b[1].cost - a[1].cost).map(([cat, data]) => {
                  const maxCost = Math.max(...Object.values(stats.byCategory).map((d) => d.cost));
                  const width = (data.cost / maxCost) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-slate-700 flex items-center gap-1.5 font-medium">
                          {getCategoryEmoji(cat as FoodCategory)}
                          {getCategoryLabel(cat as FoodCategory)}
                        </span>
                        <span className="text-sm font-bold text-danger-600">${data.cost.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-white/40 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${width}%`,
                            background: 'linear-gradient(to right, rgba(239,68,68,0.7), rgba(252,165,165,0.5))',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Top Wasted */}
            <GlassCard className="p-6 animate-fade-in-up stagger-6" hover={false}>
              <h3 className="font-bold text-slate-800 mb-4">Most Wasted Items</h3>
              {stats.topWasted.length > 0 ? (
                <div className="space-y-2">
                  {stats.topWasted.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/40 transition-all animate-fade-in-up"
                      style={{ animationDelay: `${(i + 5) * 60}ms`, animationFillMode: 'both' }}
                    >
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        i === 0 ? 'bg-danger-100 text-danger-600' : 'bg-slate-100 text-slate-500',
                      )}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm text-slate-700 font-medium truncate">{item.name}</span>
                      <span className="text-xs font-bold text-slate-500 bg-white/60 px-2 py-0.5 rounded-full">{item.count}×</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No data yet.</p>
              )}
            </GlassCard>
          </div>

          {/* Recent Log */}
          <GlassCard className="p-6 animate-fade-in-up stagger-7" hover={false}>
            <h3 className="font-bold text-slate-800 mb-4">Recent Waste Log</h3>
            <div className="space-y-1">
              {wasteLogs.slice().reverse().slice(0, 10).map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-3 border-b border-white/30 last:border-0 hover:bg-white/20 px-2 rounded-xl transition-all animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getCategoryEmoji(log.category)}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{log.item_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{log.quantity} {log.unit} · {log.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-danger-600">-${log.estimated_cost.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(log.wasted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
