import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Package, ScanLine, BookOpen, BarChart3, ShoppingCart, Tag, Settings, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

/** Full class strings so Tailwind can scan them (no dynamic `group-hover:${var}`). */
const navItems = [
  { to: '/',         label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/items',    label: 'My Food',       icon: Package },
  { to: '/scan',     label: 'Scan Barcode',  icon: ScanLine },
  { to: '/shopping', label: 'Shopping List', icon: ShoppingCart },
  { to: '/deals',    label: 'Deals & Prices', icon: Tag },
  { to: '/recipes',  label: 'Recipes',       icon: BookOpen },
  { to: '/waste',    label: 'Waste Tracker', icon: BarChart3 },
  { to: '/settings', label: 'Settings',      icon: Settings },
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-[var(--ft-ink)] bg-[var(--ft-bone)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-center font-mono text-sm font-bold leading-8">FT</span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ft-ink)]">FreshTrack</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] transition-colors hover:bg-[var(--ft-pickle)]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-[rgba(21,19,15,0.28)]"
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
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-start gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)] font-mono text-sm font-black">
            FT
          </div>
          <div>
            <h1 className="font-mono text-[12px] font-black uppercase leading-none tracking-[0.22em] text-[var(--ft-ink)]">FreshTrack</h1>
            <p className="mt-1 max-w-32 text-[10px] font-medium leading-snug text-[rgba(21,19,15,0.58)]">Fridge audit, shopping memory, household ledger.</p>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-[var(--ft-ink)]" />

      <nav className="flex-1 p-3 space-y-1 pt-4">
        {navItems.map((item, i) => {
          const isActive = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium no-underline',
                'border border-transparent transition-all duration-200 group animate-fade-in-up',
                isActive
                  ? 'bg-[var(--ft-ink)] text-[var(--ft-bone)]'
                  : 'text-[rgba(21,19,15,0.66)] hover:border-[var(--ft-ink)] hover:bg-[var(--ft-paper)] hover:text-[var(--ft-ink)]',
              )}
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
            >
              {isActive && (
                <span className="absolute left-0 h-6 w-1 bg-[var(--ft-signal)]" />
              )}
              <span
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center border transition-all duration-200',
                  isActive
                    ? 'border-[var(--ft-bone)] bg-[var(--ft-bone)] text-[var(--ft-ink)]'
                    : 'border-[rgba(21,19,15,0.2)] text-[rgba(21,19,15,0.48)] group-hover:border-[var(--ft-ink)] group-hover:text-[var(--ft-signal)]',
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
              </span>
              <span className={isActive ? 'font-semibold text-[var(--ft-bone)]' : ''}>{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 bg-[var(--ft-pickle)] animate-pulse-soft" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 h-px bg-[var(--ft-ink)]" />

      <div className="p-4">
        <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 bg-[var(--ft-pickle)]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ft-signal)]">Household ledger</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[rgba(21,19,15,0.62)]">
            Shared food lists, expiry dates, prices, and the little things people forget.
          </p>
        </div>
      </div>
    </aside>
    </>
  );
}
