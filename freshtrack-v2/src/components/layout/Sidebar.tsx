import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useAppPreferences } from '@/lib/app-preferences';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Package from 'lucide-react/dist/esm/icons/package';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import Leaf from 'lucide-react/dist/esm/icons/leaf';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/',         labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/items',    labelKey: 'nav.food',      icon: Package },
  { to: '/scan',     labelKey: 'nav.scan',      icon: ScanLine },
  { to: '/shopping', labelKey: 'nav.shopping',  icon: ShoppingCart },
  { to: '/deals',    labelKey: 'nav.deals',     icon: Tag },
  { to: '/recipes',  labelKey: 'nav.recipes',   icon: BookOpen },
  { to: '/waste',    labelKey: 'nav.waste',     icon: BarChart3 },
  { to: '/settings', labelKey: 'nav.settings',  icon: Settings },
] as const;

export function MobileHeader() {
  return null;
}

export function Sidebar() {
  const { location } = useRouterState();
  const { t } = useAppPreferences();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-[var(--ft-ink)] bg-[var(--ft-bone)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)]">
            <Leaf className="w-4 h-4 text-[var(--ft-pickle)]" strokeWidth={1.75} />
          </span>
          <span className="font-['DM_Mono',_ui-monospace,_monospace] text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)]">FreshTrack</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex min-h-11 min-w-11 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] transition-colors hover:bg-[var(--ft-pickle)] hover:text-[var(--ft-ink)]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-[rgba(21,19,15,0.32)]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 flex flex-col h-full glass-sidebar flex-shrink-0",
        "hidden md:flex md:animate-slide-in-left",
        mobileOpen && "!flex fixed inset-y-0 left-0 z-50 animate-slide-in-left",
      )}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)]">
              <Leaf className="w-5 h-5 text-[var(--ft-pickle)]" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="font-['DM_Mono',_ui-monospace,_monospace] text-[12px] font-black uppercase leading-none tracking-[0.22em] text-[var(--ft-ink)]">
                FreshTrack
              </h1>
              <p className="mt-1.5 text-[10px] font-medium leading-snug text-[rgba(21,19,15,0.52)] font-sans">
                Fridge audit, shopping memory, household ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px bg-[var(--ft-ink)] opacity-80" />

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 pt-3">
          {navItems.map((item, i) => {
            const isActive = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-sm font-medium no-underline',
                  'border transition-all duration-150 group animate-fade-in-up',
                  isActive
                    ? 'bg-[var(--ft-ink)] text-[var(--ft-bone)] border-[var(--ft-ink)]'
                    : 'border-transparent text-[rgba(21,19,15,0.60)] hover:border-[rgba(21,19,15,0.20)] hover:bg-[rgba(255,248,232,0.72)] hover:text-[var(--ft-ink)]',
                )}
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
              >
                {/* Active left bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-[var(--ft-pickle)]" />
                )}

                {/* Icon */}
                <span className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center border transition-all duration-150',
                  isActive
                    ? 'border-[rgba(242,234,220,0.35)] bg-[rgba(242,234,220,0.12)] text-[var(--ft-bone)]'
                    : 'border-[rgba(21,19,15,0.14)] text-[rgba(21,19,15,0.40)] group-hover:border-[rgba(21,19,15,0.24)] group-hover:text-[var(--ft-signal)]',
                )}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2 : 1.75} />
                </span>

                <span className={cn('text-[13px]', isActive ? 'font-semibold' : 'font-normal')}>
                  {t(item.labelKey)}
                </span>

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--ft-pickle)] animate-pulse-soft" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 h-px bg-[var(--ft-ink)] opacity-80" />

        {/* Household ledger footer */}
        <div className="p-4">
          <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1.5 w-1.5 bg-[var(--ft-pickle)]" />
              <span className="font-['DM_Mono',_ui-monospace,_monospace] text-[9px] font-bold uppercase tracking-[0.20em] text-[var(--ft-signal)]">
                Household ledger
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[rgba(21,19,15,0.58)] font-sans">
              Shared food lists, expiry dates, prices, and the little things people forget.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
