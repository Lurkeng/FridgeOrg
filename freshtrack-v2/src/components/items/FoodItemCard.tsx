import { useState } from 'react';
import { FoodItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { cn, getExpiryStatus, getExpiryLabel, formatRelativeDate, getCategoryEmoji } from '@/lib/utils';
import { MoreVertical, Package, PackageOpen, CheckCircle2, Trash2, ChevronDown, Zap, ShoppingCart, Minus } from 'lucide-react';

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
    <div
      className={cn(
        'group glass rounded-2xl overflow-hidden',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass-hover animate-fade-in-up',
        config.accentClass,
        config.glow && 'shadow-glow-danger',
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-xl glass flex items-center justify-center text-xl flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110">
          {getCategoryEmoji(item.category)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800 truncate">{item.name}</h3>
            {item.opened && <Badge variant="info" size="sm">Opened</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">{item.quantity} {item.unit}</span>
            {item.shelf && <><span className="text-slate-300">·</span><span className="text-xs text-slate-400">{item.shelf}</span></>}
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400 capitalize">{item.location}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={config.badgeVariant} glow={config.glow} dot>
              {getExpiryLabel(status)} · {formatRelativeDate(item.expiry_date)}
            </Badge>
          </div>
          {item.notes && <p className="text-xs text-slate-400 mt-1.5 truncate italic">{item.notes}</p>}

          {/* Nutrition toggle chip */}
          {hasNutrition && (
            <button
              type="button"
              onClick={() => setShowNutrition(!showNutrition)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-frost-600 hover:text-frost-800 transition-colors"
            >
              <Zap className="w-3 h-3" />
              {item.nutrition!.calories} kcal / 100 g
              <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', showNutrition && 'rotate-180')} />
            </button>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowActions(!showActions)}
            className={cn('p-1.5 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600 hover:bg-white/60', showActions && 'bg-white/60 text-slate-600')}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 top-9 z-20 w-52 glass-heavy rounded-2xl shadow-glass-hover py-1.5 animate-scale-in">
                <button onClick={() => { onToggleOpened(item.id); setShowActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-white/50 flex items-center gap-2.5 transition-colors">
                  {item.opened ? <Package className="w-4 h-4 text-slate-400" /> : <PackageOpen className="w-4 h-4 text-frost-500" />}
                  {item.opened ? 'Mark Sealed' : 'Mark Opened'}
                </button>
                {onUpdateQuantity && (
                  <button onClick={() => { setShowUseSome(true); setShowActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-frost-600 hover:bg-frost-50/60 flex items-center gap-2.5 transition-colors">
                    <Minus className="w-4 h-4" /> Used Some
                  </button>
                )}
                <button onClick={() => { onMarkConsumed(item.id); setShowActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-white/50 flex items-center gap-2.5 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-fresh-500" /> Used It Up
                </button>
                <div className="my-1 mx-3 h-px bg-slate-200/60" />
                <button onClick={() => { onMarkWasted(item.id, 'expired'); setShowActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50/60 flex items-center gap-2.5 transition-colors">
                  <span className="text-sm">🗑️</span> Wasted (Expired)
                </button>
                <button onClick={() => { onMarkWasted(item.id, 'spoiled'); setShowActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50/60 flex items-center gap-2.5 transition-colors">
                  <span className="text-sm">🗑️</span> Wasted (Spoiled)
                </button>
                {onAddToShoppingList && (
                  <>
                    <div className="my-1 mx-3 h-px bg-slate-200/60" />
                    <button onClick={() => { onAddToShoppingList(item); setShowActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-frost-600 hover:bg-frost-50/60 flex items-center gap-2.5 transition-colors">
                      <ShoppingCart className="w-4 h-4" /> Add to Shopping List
                    </button>
                  </>
                )}
                <div className="my-1 mx-3 h-px bg-slate-200/60" />
                <button onClick={() => { onDelete(item.id); setShowActions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-100/50 flex items-center gap-2.5 transition-colors">
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inline "Used Some" quantity adjuster */}
      {showUseSome && (
        <div className="px-4 pb-4 border-t border-white/20 pt-3 animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">How much did you use?</span>
            <span className="text-sm font-bold text-slate-700">
              {item.quantity} {item.unit}
            </span>
          </div>
          <div className="flex gap-1.5 mb-3">
            {fractionOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setUseFraction(opt.value)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                  useFraction === opt.value
                    ? opt.value >= 1
                      ? 'bg-fresh-100/80 text-fresh-700 ring-2 ring-fresh-400/50'
                      : 'bg-frost-100/80 text-frost-700 ring-2 ring-frost-400/50'
                    : 'glass text-slate-600 hover:bg-white/60',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {useFraction != null && (
            <div className="text-xs text-slate-500 mb-3 text-center">
              Using <strong className="text-slate-700">{Math.round(selectedAmount * 100) / 100} {item.unit}</strong>
              {useFraction < 1 && (
                <> — <strong className="text-frost-600">{remainingQuantity} {item.unit}</strong> remaining</>
              )}
              {useFraction >= 1 && (
                <> — item will be marked as consumed</>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUseSomeCancel}
              className="flex-1 py-2 rounded-xl text-sm font-medium glass text-slate-600 hover:bg-white/60 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUseSomeSave}
              disabled={useFraction == null}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                useFraction != null
                  ? 'bg-gradient-to-r from-frost-600 to-frost-500 text-white shadow-glow-frost hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]'
                  : 'glass text-slate-400 cursor-not-allowed',
              )}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Expandable nutrition panel */}
      {hasNutrition && showNutrition && (
        <div className="px-4 pb-4 border-t border-white/20 pt-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Calories', value: `${item.nutrition!.calories}`, unit: 'kcal', bg: 'bg-warning-50/60 text-warning-700' },
              { label: 'Protein',  value: `${item.nutrition!.protein}`,  unit: 'g',    bg: 'bg-fresh-50/60 text-fresh-700' },
              { label: 'Carbs',    value: `${item.nutrition!.carbs}`,    unit: 'g',    bg: 'bg-frost-50/60 text-frost-700' },
              { label: 'Fat',      value: `${item.nutrition!.fat}`,      unit: 'g',    bg: 'bg-slate-100/60 text-slate-600' },
            ].map((m) => (
              <div key={m.label} className={cn('flex flex-col items-center rounded-xl py-2 px-1', m.bg)}>
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{m.label}</span>
                <span className="text-sm font-bold leading-tight">{m.value}</span>
                <span className="text-[10px] opacity-50">{m.unit}</span>
              </div>
            ))}
          </div>
          {(item.nutrition!.fiber != null || item.nutrition!.sugar != null || item.nutrition!.sodium != null) && (
            <div className="flex gap-4 text-xs text-slate-500 mt-2">
              {item.nutrition!.fiber  != null && <span>Fiber <strong className="text-slate-700">{item.nutrition!.fiber}g</strong></span>}
              {item.nutrition!.sugar  != null && <span>Sugar <strong className="text-slate-700">{item.nutrition!.sugar}g</strong></span>}
              {item.nutrition!.sodium != null && <span>Sodium <strong className="text-slate-700">{item.nutrition!.sodium}mg</strong></span>}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">Values per 100 g · sourced from OpenFoodFacts</p>
        </div>
      )}
    </div>
  );
}
