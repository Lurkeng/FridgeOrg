import { useState } from 'react';
import { FoodItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { cn, getExpiryStatus, getExpiryLabel, formatRelativeDate, getCategoryEmoji } from '@/lib/utils';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Package from 'lucide-react/dist/esm/icons/package';
import PackageOpen from 'lucide-react/dist/esm/icons/package-open';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import Minus from 'lucide-react/dist/esm/icons/minus';

interface FoodItemCardProps {
  item: FoodItem;
  onToggleOpened: (id: string) => void;
  onMarkConsumed: (id: string) => void;
  onMarkWasted: (id: string, reason: 'expired' | 'spoiled' | 'leftover' | 'other') => void;
  onDelete: (id: string) => void;
  onUpdateQuantity?: (id: string, newQuantity: number) => void;
  onAddToShoppingList?: (item: FoodItem) => void;
  index?: number;
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info' | 'ghost';

const statusConfig: Record<string, { badgeVariant: BadgeVariant; accentClass: string; glow: boolean }> = {
  fresh:    { badgeVariant: 'success', accentClass: 'accent-bar-fresh',   glow: false },
  use_soon: { badgeVariant: 'warning', accentClass: 'accent-bar-warning', glow: false },
  expiring: { badgeVariant: 'danger',  accentClass: 'accent-bar-danger',  glow: true  },
  expired:  { badgeVariant: 'danger',  accentClass: 'accent-bar-danger',  glow: true  },
};

export function FoodItemCard({ item, onToggleOpened, onMarkConsumed, onMarkWasted, onDelete, onUpdateQuantity, onAddToShoppingList, index = 0 }: FoodItemCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showUseSome, setShowUseSome] = useState(false);
  const [useFraction, setUseFraction] = useState<number | null>(null);
  const status = getExpiryStatus(item.expiry_date);
  const config = statusConfig[status] ?? statusConfig.fresh;
  const hasNutrition = !!item.nutrition;

  const fractionOptions = [
    { label: '\u00BC', value: 0.25 },
    { label: '\u00BD', value: 0.5 },
    { label: '\u00BE', value: 0.75 },
    { label: 'All', value: 1 },
  ] as const;

  const selectedAmount = useFraction != null ? item.quantity * useFraction : 0;
  const remainingQuantity = Math.round((item.quantity - selectedAmount) * 100) / 100;

  const handleUseSomeSave = () => {
    if (useFraction == null) return;
    if (useFraction >= 1) {
      onMarkConsumed(item.id);
    } else if (onUpdateQuantity) {
      onUpdateQuantity(item.id, remainingQuantity);
    }
    setShowUseSome(false);
    setUseFraction(null);
  };

  const handleUseSomeCancel = () => {
    setShowUseSome(false);
    setUseFraction(null);
  };

  return (
    <article
      className={cn(
        'group relative overflow-hidden',
        'border border-[var(--ft-ink)] bg-[var(--ft-paper)]/85 backdrop-blur-[6px]',
        'transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--ft-paper)] hover:shadow-[3px_3px_0_var(--ft-ink)] animate-fade-in-up',
        config.glow && 'shadow-[0_0_22px_rgba(184,50,30,0.18)]',
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      {/* Status accent strip — left edge */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          status === 'fresh' && 'bg-[var(--ft-pickle)]',
          status === 'use_soon' && 'bg-[#d97706]',
          (status === 'expiring' || status === 'expired') && 'bg-[var(--ft-signal)]',
        )}
      />

      <div className="flex items-start gap-3 p-4 pl-5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-bone)] text-xl transition-transform duration-200 group-hover:rotate-[-3deg] group-hover:scale-105">
          {getCategoryEmoji(item.category)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-[17px] font-semibold tracking-[-0.015em] text-[var(--ft-ink)] truncate">{item.name}</h3>
            {item.opened && <Badge variant="info" size="sm">Opened</Badge>}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.54)]">
            <span className="font-semibold text-[var(--ft-ink)]">{item.quantity} {item.unit}</span>
            {item.shelf && <><span aria-hidden>·</span><span>{item.shelf}</span></>}
            <span aria-hidden>·</span>
            <span>{item.location}</span>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <Badge variant={config.badgeVariant} glow={config.glow} dot>
              {getExpiryLabel(status)} · {formatRelativeDate(item.expiry_date)}
            </Badge>
          </div>
          {item.notes && <p className="mt-2 truncate font-display text-[12px] italic text-[rgba(21,19,15,0.54)]">"{item.notes}"</p>}

          {/* Nutrition toggle chip */}
          {hasNutrition && (
            <button
              type="button"
              onClick={() => setShowNutrition(!showNutrition)}
              className="mt-2.5 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ft-pickle)] transition-colors hover:text-[#5a6e00]"
            >
              <Zap className="w-3 h-3" />
              {item.nutrition!.calories} kcal · 100g
              <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', showNutrition && 'rotate-180')} />
            </button>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowActions(!showActions)}
            aria-label={`Open actions for ${item.name}`}
            aria-expanded={showActions}
            aria-haspopup="menu"
            className={cn(
              'flex min-h-11 min-w-11 items-center justify-center border border-transparent text-[rgba(21,19,15,0.42)] transition-all duration-150',
              'hover:border-[var(--ft-ink)] hover:bg-[var(--ft-bone)] hover:text-[var(--ft-ink)]',
              showActions && 'border-[var(--ft-ink)] bg-[var(--ft-bone)] text-[var(--ft-ink)]',
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 top-10 z-20 w-56 border border-[var(--ft-ink)] bg-[var(--ft-paper)] shadow-[4px_4px_0_var(--ft-ink)] animate-scale-in">
                <div className="border-b border-[var(--ft-ink)] bg-[var(--ft-bone)] px-3 py-1.5">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--ft-ink)]">Actions</p>
                </div>
                <button onClick={() => { onToggleOpened(item.id); setShowActions(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--ft-ink)] transition-colors hover:bg-[var(--ft-bone)]">
                  {item.opened ? <Package className="h-4 w-4 text-[rgba(21,19,15,0.46)]" /> : <PackageOpen className="h-4 w-4 text-[var(--ft-pickle)]" />}
                  {item.opened ? 'Mark Sealed' : 'Mark Opened'}
                </button>
                {onUpdateQuantity && (
                  <button onClick={() => { setShowUseSome(true); setShowActions(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--ft-ink)] transition-colors hover:bg-[var(--ft-bone)]">
                    <Minus className="h-4 w-4 text-[var(--ft-pickle)]" /> Used Some
                  </button>
                )}
                <button onClick={() => { onMarkConsumed(item.id); setShowActions(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--ft-ink)] transition-colors hover:bg-[var(--ft-bone)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--ft-pickle)]" /> Used It Up
                </button>
                <div className="mx-3 my-1 h-px bg-[rgba(21,19,15,0.18)]" />
                <button onClick={() => { onMarkWasted(item.id, 'expired'); setShowActions(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--ft-signal)] transition-colors hover:bg-[rgba(184,50,30,0.08)]">
                  <Trash2 className="h-4 w-4" /> Wasted (Expired)
                </button>
                <button onClick={() => { onMarkWasted(item.id, 'spoiled'); setShowActions(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--ft-signal)] transition-colors hover:bg-[rgba(184,50,30,0.08)]">
                  <Trash2 className="h-4 w-4" /> Wasted (Spoiled)
                </button>
                {onAddToShoppingList && (
                  <>
                    <div className="mx-3 my-1 h-px bg-[rgba(21,19,15,0.18)]" />
                    <button onClick={() => { onAddToShoppingList(item); setShowActions(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--ft-ink)] transition-colors hover:bg-[var(--ft-bone)]">
                      <ShoppingCart className="h-4 w-4 text-[var(--ft-pickle)]" /> Add to Shopping List
                    </button>
                  </>
                )}
                <div className="mx-3 my-1 h-px bg-[rgba(21,19,15,0.18)]" />
                <button onClick={() => { onDelete(item.id); setShowActions(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[rgba(21,19,15,0.58)] transition-colors hover:bg-[var(--ft-bone)]">
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inline "Used Some" quantity adjuster */}
      {showUseSome && (
        <div className="border-t border-[var(--ft-ink)] bg-[var(--ft-bone)] px-4 pt-3 pb-4 animate-fade-in-up">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-[rgba(21,19,15,0.62)]">
              How much did you use?
            </span>
            <span className="font-display text-sm font-bold text-[var(--ft-ink)]">
              {item.quantity} {item.unit}
            </span>
          </div>
          <div className="mb-3 grid grid-cols-4 gap-0 border border-[var(--ft-ink)]">
            {fractionOptions.map((opt, i) => {
              const active = useFraction === opt.value;
              const isLast = i === fractionOptions.length - 1;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setUseFraction(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    'relative py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-150',
                    !isLast && 'border-r border-[var(--ft-ink)]',
                    active
                      ? opt.value >= 1
                        ? 'bg-[var(--ft-signal)] text-[var(--ft-bone)]'
                        : 'bg-[var(--ft-pickle)] text-[var(--ft-ink)]'
                      : 'bg-[var(--ft-paper)] text-[rgba(21,19,15,0.60)] hover:bg-[var(--ft-bone)] hover:text-[var(--ft-ink)]',
                  )}
                >
                  {active && (
                    <span aria-hidden className="absolute -top-px left-1/2 h-1 w-6 -translate-x-1/2 bg-[var(--ft-ink)]" />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
          {useFraction != null && (
            <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.62)]">
              Using <strong className="text-[var(--ft-ink)]">{Math.round(selectedAmount * 100) / 100} {item.unit}</strong>
              {useFraction < 1 && (
                <> · <strong className="text-[var(--ft-pickle)]">{remainingQuantity} {item.unit}</strong> remaining</>
              )}
              {useFraction >= 1 && (
                <> · marked consumed</>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUseSomeCancel}
              className="flex-1 border border-[var(--ft-ink)] bg-[var(--ft-paper)] py-2 font-mono text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--ft-ink)] transition-all hover:bg-[var(--ft-bone)] hover:-translate-y-px hover:shadow-[2px_2px_0_var(--ft-ink)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUseSomeSave}
              disabled={useFraction == null}
              className={cn(
                'flex-1 border py-2 font-mono text-[11px] font-bold uppercase tracking-[0.20em] transition-all',
                useFraction != null
                  ? 'border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] shadow-[2px_2px_0_var(--ft-pickle)] hover:-translate-y-px hover:shadow-[3px_3px_0_var(--ft-pickle)]'
                  : 'cursor-not-allowed border-[rgba(21,19,15,0.20)] bg-[var(--ft-paper)] text-[rgba(21,19,15,0.35)]',
              )}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Expandable nutrition panel — editorial macro readout */}
      {hasNutrition && showNutrition && (
        <div className="border-t border-[var(--ft-ink)] bg-[var(--ft-bone)] px-4 pt-3 pb-4">
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden className="h-px w-6 bg-[var(--ft-ink)]" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--ft-signal)]">
              Macronutrients · per 100 g
            </p>
          </div>
          <div className="grid grid-cols-4 gap-0 border border-[var(--ft-ink)]">
            {[
              { label: 'kcal',    value: `${item.nutrition!.calories}`, unit: 'kcal' },
              { label: 'Protein', value: `${item.nutrition!.protein}`,  unit: 'g' },
              { label: 'Carbs',   value: `${item.nutrition!.carbs}`,    unit: 'g' },
              { label: 'Fat',     value: `${item.nutrition!.fat}`,      unit: 'g' },
            ].map((m, i) => (
              <div
                key={m.label}
                className={cn(
                  'flex flex-col items-center bg-[var(--ft-paper)] px-1 py-2',
                  i < 3 && 'border-r border-[var(--ft-ink)]',
                )}
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[rgba(21,19,15,0.58)]">{m.label}</span>
                <span className="mt-0.5 font-display text-base font-bold leading-none text-[var(--ft-ink)]">{m.value}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgba(21,19,15,0.45)]">{m.unit}</span>
              </div>
            ))}
          </div>
          {(item.nutrition!.fiber != null || item.nutrition!.sugar != null || item.nutrition!.sodium != null) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-[rgba(21,19,15,0.25)] pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.62)]">
              {item.nutrition!.fiber  != null && <span>Fiber · <strong className="text-[var(--ft-ink)]">{item.nutrition!.fiber}g</strong></span>}
              {item.nutrition!.sugar  != null && <span>Sugar · <strong className="text-[var(--ft-ink)]">{item.nutrition!.sugar}g</strong></span>}
              {item.nutrition!.sodium != null && <span>Sodium · <strong className="text-[var(--ft-ink)]">{item.nutrition!.sodium}mg</strong></span>}
            </div>
          )}
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgba(21,19,15,0.42)]">
            Source · OpenFoodFacts
          </p>
        </div>
      )}
    </article>
  );
}
