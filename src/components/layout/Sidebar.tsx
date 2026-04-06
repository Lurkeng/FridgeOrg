'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ScanLine, BookOpen, BarChart3, Zap } from 'lucide-react';

const navItems = [
  { href: '/',        label: 'Dashboard',     icon: LayoutDashboard, color: 'text-frost-600' },
  { href: '/items',   label: 'My Food',       icon: Package,         color: 'text-fresh-600' },
  { href: '/scan',    label: 'Scan Barcode',  icon: ScanLine,        color: 'text-frost-500' },
  { href: '/recipes', label: 'Recipes',       icon: BookOpen,        color: 'text-warning-600' },
  { href: '/waste',   label: 'Waste Tracker', icon: BarChart3,       color: 'text-danger-500' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col h-full glass-sidebar flex-shrink-0 animate-slide-in-left">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-frost-400 to-frost-600 flex items-center justify-center shadow-glow-frost animate-pulse-soft">
            <span className="text-lg">🧊</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient-frost leading-none">FreshTrack</h1>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide">FRIDGE ORGANIZER</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 pt-4">
        {navItems.map((item, i) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-200 group',
                'animate-fade-in-up',
                isActive
                  ? 'glass text-slate-800 shadow-glass'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50',
              )}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
            >
              {/* Active glow pill */}
              {isActive && (
                <span className="absolute left-0 w-1 h-6 rounded-r-full bg-gradient-to-b from-frost-400 to-frost-600" />
              )}

              <span
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                  'transition-all duration-200',
                  isActive
                    ? `bg-gradient-to-br from-white/80 to-white/40 ${item.color} shadow-sm`
                    : `group-hover:bg-white/60 text-slate-400 group-hover:${item.color}`,
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
              </span>

              <span className={isActive ? 'text-slate-800 font-semibold' : ''}>{item.label}</span>

              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-frost-500 animate-pulse-soft" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent" />

      {/* Footer — Demo Mode Banner */}
      <div className="p-4">
        <div className="glass rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-fresh-400 to-fresh-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-fresh-700">Demo Mode</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Data is stored locally. Connect Supabase to sync across devices.
          </p>
        </div>
      </div>
    </aside>
  );
}
