import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ScanLine, BookOpen, BarChart3, Zap, ShoppingCart, Tag, Settings, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

/** Full class strings so Tailwind can scan them (no dynamic `group-hover:${var}`). */
const navItems = [
  { to: '/',         label: 'Dashboard',     icon: LayoutDashboard, activeTint: 'text-frost-600',   hoverTint: 'group-hover:text-frost-600' },
  { to: '/items',    label: 'My Food',       icon: Package,         activeTint: 'text-fresh-600',   hoverTint: 'group-hover:text-fresh-600' },
  { to: '/scan',     label: 'Scan Barcode',  icon: ScanLine,        activeTint: 'text-frost-500',   hoverTint: 'group-hover:text-frost-500' },
  { to: '/shopping', label: 'Shopping List',  icon: ShoppingCart,    activeTint: 'text-frost-600',   hoverTint: 'group-hover:text-frost-600' },
  { to: '/deals',    label: 'Deals & Prices', icon: Tag,            activeTint: 'text-fresh-600',   hoverTint: 'group-hover:text-fresh-600' },
  { to: '/recipes',  label: 'Recipes',       icon: BookOpen,        activeTint: 'text-warning-600', hoverTint: 'group-hover:text-warning-600' },
  { to: '/waste',    label: 'Waste Tracker', icon: BarChart3,       activeTint: 'text-danger-500',  hoverTint: 'group-hover:text-danger-500' },
  { to: '/settings', label: 'Settings',      icon: Settings,        activeTint: 'text-slate-600',   hoverTint: 'group-hover:text-slate-600' },
] as const;

/** Mobile top bar — only visible on small screens */
export function MobileHeader() {
  return null; // Rendered via Sidebar's internal mobile toggle
}

export function Sidebar() {
  const { location } = useRouterState();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass-heavy px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-frost-400 to-frost-600 flex items-center justify-center shadow-glow-frost">
            <span className="text-sm">🧊</span>
          </div>
          <span className="text-sm font-bold text-gradient-frost">FreshTrack</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 flex flex-col h-full glass-sidebar flex-shrink-0",
        // Desktop: always visible
        "hidden md:flex md:animate-slide-in-left",
        // Mobile: overlay from left
        mobileOpen && "!flex fixed inset-y-0 left-0 z-50 animate-slide-in-left",
      )}>
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

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent" />

      <nav className="flex-1 p-3 space-y-1 pt-4">
        {navItems.map((item, i) => {
          const isActive = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium no-underline',
                'transition-all duration-200 group animate-fade-in-up',
                isActive
                  ? 'glass text-slate-800 shadow-glass'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50',
              )}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
            >
              {isActive && (
                <span className="absolute left-0 w-1 h-6 rounded-r-full bg-gradient-to-b from-frost-400 to-frost-600" />
              )}
              <span
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  isActive
                    ? `bg-gradient-to-br from-white/80 to-white/40 ${item.activeTint} shadow-sm`
                    : `group-hover:bg-white/60 text-slate-400 ${item.hoverTint}`,
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

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent" />

      <div className="p-4">
        <div className="glass rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-fresh-400 to-fresh-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-fresh-700">Live Sync</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Data syncs in real-time via Cloudflare D1. Share with your household.
          </p>
        </div>
      </div>
    </aside>
    </>
  );
}
