'use client';

import { useFoodItems } from '@/hooks/useFoodItems';
import { useCountUp } from '@/hooks/useCountUp';
import Link from 'next/link';
import { Package, Refrigerator, Snowflake, AlertTriangle, Apple, ScanLine, ChefHat, ArrowRight, AlertCircle } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { getCategoryEmoji, getExpiryStatus, formatRelativeDate } from '@/lib/utils';

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  glowClass,
  delay,
  alert,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  glowClass: string;
  delay: number;
  alert?: boolean;
}) {
  const animatedValue = useCountUp(value, 900, delay * 120);

  return (
    <GlassCard
      className={`p-5 ${alert && value > 0 ? 'ring-2 ring-warning-300/60' : ''}`}
      staggerIndex={delay}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        {alert && value > 0 && (
          <span className="w-2 h-2 rounded-full bg-warning-400 animate-pulse-soft" />
        )}
      </div>
      <p className={`text-3xl font-bold ${glowClass} mb-1`}>{animatedValue}</p>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
    </GlassCard>
  );
}

// ─── Expiring Mini Card ────────────────────────────────────────────────────
function ExpiringMiniCard({
  item,
  index,
}: {
  item: { id: string; name: string; category: string; expiry_date: string; location: string };
  index: number;
}) {
  const status = getExpiryStatus(item.expiry_date);
  const statusColor =
    status === 'expired' ? 'danger' :
    status === 'expiring' ? 'danger' :
    status === 'use_soon' ? 'warning' : 'success';

  return (
    <GlassCard
      className="p-4 flex-shrink-0 w-44"
      staggerIndex={index}
      hover
    >
      <div className="text-2xl mb-2">{getCategoryEmoji(item.category as never)}</div>
      <p className="text-sm font-semibold text-slate-800 truncate mb-1">{item.name}</p>
      <Badge variant={statusColor} dot glow size="sm">
        {formatRelativeDate(item.expiry_date)}
      </Badge>
    </GlassCard>
  );
}

// ─── Quick Action Card ────────────────────────────────────────────────────
function ActionCard({
  href,
  emoji,
  title,
  desc,
  gradient,
  delay,
}: {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  gradient: string;
  delay: number;
}) {
  return (
    <Link href={href} className="block">
      <GlassCard
        className="p-6 group cursor-pointer overflow-hidden relative"
        staggerIndex={delay}
        hover
      >
        {/* Gradient accent bar at top */}
        <div className={`absolute inset-x-0 top-0 h-1 ${gradient} rounded-t-2xl`} />
        <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 inline-block">
          {emoji}
        </div>
        <h3 className="font-bold text-slate-800 group-hover:text-frost-700 transition-colors mb-1.5">
          {title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-frost-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Open <ArrowRight className="w-3 h-3" />
        </div>
      </GlassCard>
    </Link>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const {
    items,
    stats,
    expiringItems,
    expiredItems,
    isLoaded,
    markAsWasted,
    markAsConsumed,
    toggleOpened,
    deleteItem,
  } = useFoodItems();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass rounded-2xl px-8 py-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-frost-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Loading your fridge…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">👋</span>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back!</h1>
        </div>
        <p className="text-slate-500 ml-9">Your food at a glance — stay fresh, waste less.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Items"   value={stats.totalItems}   icon={Package}      gradient="bg-gradient-to-br from-slate-500 to-slate-700"  glowClass="text-slate-800"   delay={0} />
        <StatCard label="In Fridge"     value={stats.fridgeCount}  icon={Refrigerator} gradient="bg-gradient-to-br from-frost-400 to-frost-600"   glowClass="text-gradient-frost" delay={1} />
        <StatCard label="In Freezer"    value={stats.freezerCount} icon={Snowflake}    gradient="bg-gradient-to-br from-frost-500 to-frost-700"   glowClass="text-gradient-frost" delay={2} />
        <StatCard label="Expiring Soon" value={stats.expiringCount} icon={AlertTriangle} gradient="bg-gradient-to-br from-warning-400 to-warning-600" glowClass="text-warning-700" delay={3} alert />
      </div>

      {/* Expired Alert */}
      {expiredItems.length > 0 && (
        <GlassCard
          variant="danger"
          className="p-4 mb-6 flex items-start gap-3"
          animate
          staggerIndex={4}
        >
          <div className="w-9 h-9 rounded-xl bg-danger-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-danger-600 animate-pulse-soft" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-danger-800 mb-0.5">
              {expiredItems.length} expired item{expiredItems.length > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-danger-700">
              <span className="font-medium">{expiredItems.map((i) => i.name).join(', ')}</span>
              {' '}— please remove or mark as wasted.
            </p>
          </div>
          <Link
            href="/items"
            className="flex-shrink-0 text-xs font-semibold text-danger-600 hover:text-danger-800 transition-colors whitespace-nowrap"
          >
            View all →
          </Link>
        </GlassCard>
      )}

      {/* Use These Soon */}
      {expiringItems.length > 0 && (
        <div className="mb-8 animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>⏰</span> Use These Soon
            </h2>
            {expiringItems.length > 6 && (
              <Link href="/items" className="text-sm font-semibold text-frost-600 hover:text-frost-700 flex items-center gap-1 transition-colors">
                View all {expiringItems.length} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Horizontal scroll row */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {expiringItems.slice(0, 8).map((item, i) => (
              <ExpiringMiniCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6 animate-fade-in-up stagger-5">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href="/items"
            emoji="🍎"
            title="Manage Food"
            desc="Add, edit, or remove items from your inventory"
            gradient="bg-gradient-to-r from-fresh-400 to-fresh-500"
            delay={5}
          />
          <ActionCard
            href="/scan"
            emoji="📷"
            title="Scan Barcode"
            desc="Quick-add items by scanning product barcodes"
            gradient="bg-gradient-to-r from-frost-400 to-frost-500"
            delay={6}
          />
          <ActionCard
            href="/recipes"
            emoji="👨‍🍳"
            title="Find Recipes"
            desc="Discover what you can cook with what you have"
            gradient="bg-gradient-to-r from-warning-400 to-warning-500"
            delay={7}
          />
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <GlassCard className="text-center py-16 px-8 animate-scale-in" hover={false}>
          <div className="text-6xl mb-4 animate-float inline-block">🧊</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Your fridge is empty!</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">
            Start by adding some items. You can type them in manually or scan a barcode.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/items"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-xl text-sm font-semibold shadow-glow-frost hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] transition-all"
            >
              <Apple className="w-4 h-4" /> Add Items
            </Link>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 px-6 py-2.5 glass text-slate-700 rounded-xl text-sm font-semibold hover:bg-white/80 transition-all"
            >
              <ScanLine className="w-4 h-4" /> Scan Barcode
            </Link>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
