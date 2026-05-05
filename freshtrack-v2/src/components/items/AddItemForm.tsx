import { useState, useEffect, useRef, useCallback } from 'react';
import { FoodCategory, StorageLocation, NutritionInfo, FoodItem } from '@/types';
import { calculateExpiryDate } from '@/data/expiry-defaults';
import { getDefaultCategory, getDefaultShelfLife, getDefaultLocation } from '@/lib/shelf-life';
import { getCategoryEmoji, cn } from '@/lib/utils';
import Refrigerator from 'lucide-react/dist/esm/icons/refrigerator';
import Snowflake from 'lucide-react/dist/esm/icons/snowflake';
import Archive from 'lucide-react/dist/esm/icons/archive';
import Check from 'lucide-react/dist/esm/icons/check';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Beef from 'lucide-react/dist/esm/icons/beef';
import Wheat from 'lucide-react/dist/esm/icons/wheat';
import Droplets from 'lucide-react/dist/esm/icons/droplets';
import X from 'lucide-react/dist/esm/icons/x';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

interface AddItemFormProps {
  onSubmit: (item: {
    name: string; category: FoodCategory; location: StorageLocation;
    quantity: number; unit: string; addedDate: string; expiryDate: string;
    opened: boolean; notes: string | null; barcode: string | null; shelf: string | null;
    nutrition: NutritionInfo | null;
  }) => void;
  onCancel: () => void;
  initialBarcode?: string;
  initialName?: string;
  initialNutrition?: NutritionInfo;
  existingItems?: FoodItem[];
}

const locationLabels: Record<StorageLocation, string> = { fridge: 'fridge', freezer: 'freezer', pantry: 'pantry' };

function findDuplicates(query: string, items: FoodItem[]): FoodItem[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return items.filter((item) => {
    const n = item.name.toLowerCase();
    // exact or substring match in either direction
    return n.includes(q) || q.includes(n);
  });
}

function formatExpiryDistance(expiryDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
  if (diffDays === 0) return 'expires today';
  if (diffDays === 1) return 'expires tomorrow';
  return `expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

const categories: { value: FoodCategory; label: string }[] = [
  { value: 'produce', label: 'Produce' }, { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat' }, { value: 'poultry', label: 'Poultry' },
  { value: 'seafood', label: 'Seafood' }, { value: 'grains', label: 'Grains' },
  { value: 'beverages', label: 'Beverages' }, { value: 'condiments', label: 'Condiments' },
  { value: 'leftovers', label: 'Leftovers' }, { value: 'frozen_meals', label: 'Frozen' },
  { value: 'snacks', label: 'Snacks' }, { value: 'other', label: 'Other' },
];

const locationConfig = [
  { value: 'fridge'  as StorageLocation, label: 'Fridge',  icon: Refrigerator },
  { value: 'freezer' as StorageLocation, label: 'Freezer', icon: Snowflake },
  { value: 'pantry'  as StorageLocation, label: 'Pantry',  icon: Archive },
];

const units = ['item','lb','oz','kg','g','L','mL','cup','pack','bottle','can','bag','box','dozen'];

const baseInput =
  'w-full bg-[var(--ft-paper)] border border-[var(--ft-ink)] px-4 py-2.5 text-sm text-[var(--ft-ink)] ' +
  'placeholder:text-[rgba(21,19,15,0.42)] ' +
  'transition-all duration-150 outline-none ' +
  'focus:bg-[var(--ft-bone)] focus:shadow-[2px_2px_0_var(--ft-ink)] focus:-translate-y-px ' +
  'hover:bg-[var(--ft-bone)]';

const fieldLabel =
  'flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)]';

function MacroChip({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-2">
      <div className="flex items-center gap-1 text-[rgba(21,19,15,0.62)]">
        {icon}
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <span className="font-display text-base font-bold leading-none text-[var(--ft-ink)]">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgba(21,19,15,0.50)]">{unit}</span>
    </div>
  );
}

function AutoFilledPill() {
  return (
    <span className="inline-flex items-center border border-[var(--ft-ink)] bg-[var(--ft-pickle)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ft-ink)] animate-fade-in-up">
      Auto-filled
    </span>
  );
}

export function AddItemForm({ onSubmit, onCancel, initialBarcode, initialName, initialNutrition, existingItems }: AddItemFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName]         = useState(initialName || '');
  const [category, setCategory] = useState<FoodCategory>('other');
  const [location, setLocation] = useState<StorageLocation>('fridge');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit]         = useState('item');
  const [expiryDate, setExpiryDate] = useState(calculateExpiryDate('other', 'fridge').toISOString().split('T')[0]);
  const [notes, setNotes]   = useState('');
  const [shelf, setShelf]   = useState('');

  // ── Track whether fields were manually changed by the user ──────────
  const [categoryManual, setCategoryManual] = useState(false);
  const [locationManual, setLocationManual] = useState(false);
  const [expiryManual, setExpiryManual]     = useState(false);

  // ── "Auto-filled" indicator pill ────────────────────────────────────
  const [autoFillFields, setAutoFillFields] = useState<Set<'category' | 'location' | 'expiry'>>(new Set());
  const autoFillTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showAutoFillPill = useCallback((fields: ('category' | 'location' | 'expiry')[]) => {
    setAutoFillFields(new Set(fields));
    if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current);
    autoFillTimerRef.current = setTimeout(() => setAutoFillFields(new Set()), 2000);
  }, []);

  useEffect(() => {
    return () => { if (autoFillTimerRef.current) clearTimeout(autoFillTimerRef.current); };
  }, []);

  // Helper: compute expiry date string from shelf-life days
  const computeExpiryStr = useCallback((itemName: string, cat: FoodCategory, loc: StorageLocation): string => {
    const days = getDefaultShelfLife(itemName, cat, loc);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }, []);

  // ── Duplicate detection (debounced) ──────────────────────────────────
  const [duplicates, setDuplicates] = useState<FoodItem[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Shelf-life auto-detect on name change (debounced 300ms) ─────────
  const shelfLifeDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setDismissedDuplicates(false);

    // Duplicate detection (existing behavior)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (existingItems && name.trim().length >= 2) {
        setDuplicates(findDuplicates(name, existingItems));
      } else {
        setDuplicates([]);
      }
    }, 300);

    // Shelf-life auto-detect
    if (shelfLifeDebounceRef.current) clearTimeout(shelfLifeDebounceRef.current);
    shelfLifeDebounceRef.current = setTimeout(() => {
      const trimmed = name.trim();
      if (trimmed.length < 2) return;

      const detectedCategory = getDefaultCategory(trimmed);
      if (!detectedCategory) return;

      const filledFields: ('category' | 'location' | 'expiry')[] = [];

      let effectiveCategory = category;
      let effectiveLocation = location;

      // Auto-fill category if user hasn't manually changed it
      if (!categoryManual) {
        effectiveCategory = detectedCategory;
        setCategory(detectedCategory);
        filledFields.push('category');
      }

      // Auto-fill location if user hasn't manually changed it
      if (!locationManual) {
        const detectedLocation = getDefaultLocation(effectiveCategory);
        effectiveLocation = detectedLocation;
        setLocation(detectedLocation);
        filledFields.push('location');
      }

      // Auto-fill expiry if user hasn't manually changed it
      if (!expiryManual) {
        setExpiryDate(computeExpiryStr(trimmed, effectiveCategory, effectiveLocation));
        filledFields.push('expiry');
      }

      if (filledFields.length > 0) {
        showAutoFillPill(filledFields);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (shelfLifeDebounceRef.current) clearTimeout(shelfLifeDebounceRef.current);
    };
  }, [name, existingItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user manually changes category, re-calculate expiry (shelf life varies by category)
  const handleCategoryChange = (c: FoodCategory) => {
    setCategoryManual(true);
    setCategory(c);
    // Re-calculate expiry unless user manually set it
    if (!expiryManual) {
      setExpiryDate(computeExpiryStr(name, c, location));
      showAutoFillPill(['expiry']);
    }
  };

  // When user manually changes location, re-calculate expiry (shelf life varies by location)
  const handleLocationChange = (l: StorageLocation) => {
    setLocationManual(true);
    setLocation(l);
    // Re-calculate expiry unless user manually set it
    if (!expiryManual) {
      setExpiryDate(computeExpiryStr(name, category, l));
      showAutoFillPill(['expiry']);
    }
  };

  // When user manually changes expiry date
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryManual(true);
    setExpiryDate(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(), category, location, quantity, unit,
      addedDate: today, expiryDate, opened: false,
      notes: notes.trim() || null,
      barcode: initialBarcode || null,
      shelf: shelf.trim() || null,
      nutrition: initialNutrition || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className={fieldLabel}>Item Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Whole milk, Chicken breast…" className={baseInput} autoFocus required />
        {duplicates.length > 0 && !dismissedDuplicates && (
          <div className="mt-2 flex items-start gap-2 border border-[#b46c00] bg-[rgba(245,158,11,0.10)] px-3 py-2 shadow-[2px_2px_0_var(--ft-ink)]">
            <span aria-hidden className="absolute" />
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7c4a00]" strokeWidth={2} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#7c4a00]">Heads up · already on the shelf</p>
              {duplicates.slice(0, 3).map((dup) => (
                <p key={dup.id} className="text-[12px] leading-snug text-[var(--ft-ink)]">
                  <strong className="font-display font-semibold">{dup.name}</strong> in your {locationLabels[dup.location]} — {formatExpiryDistance(dup.expiry_date)}.
                </p>
              ))}
              {duplicates.length > 3 && (
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(21,19,15,0.55)]">+ {duplicates.length - 3} more</p>
              )}
            </div>
            <button type="button" onClick={() => setDismissedDuplicates(true)} aria-label="Dismiss duplicates"
              className="shrink-0 border border-[var(--ft-ink)] bg-[var(--ft-bone)] p-0.5 text-[var(--ft-ink)] transition-all hover:rotate-90 hover:bg-[var(--ft-signal)] hover:text-[var(--ft-bone)]">
              <X className="h-3 w-3" strokeWidth={2.25} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className={fieldLabel}>
          Storage
          {autoFillFields.has('location') && <AutoFilledPill />}
        </label>
        <div className="grid grid-cols-3 gap-0 border border-[var(--ft-ink)]" role="group">
          {locationConfig.map((loc, i) => {
            const Icon = loc.icon; const active = location === loc.value;
            const isLast = i === locationConfig.length - 1;
            return (
              <button key={loc.value} type="button" onClick={() => handleLocationChange(loc.value)}
                aria-pressed={active}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 px-2 py-3 transition-all duration-150',
                  !isLast && 'border-r border-[var(--ft-ink)]',
                  active
                    ? 'bg-[var(--ft-ink)] text-[var(--ft-bone)]'
                    : 'bg-[var(--ft-paper)] text-[rgba(21,19,15,0.62)] hover:bg-[var(--ft-bone)] hover:text-[var(--ft-ink)]',
                )}>
                {active && (
                  <span aria-hidden className="absolute -top-px left-1/2 h-1 w-8 -translate-x-1/2 bg-[var(--ft-pickle)]" />
                )}
                <Icon className={cn('h-4 w-4', active ? 'text-[var(--ft-pickle)]' : '')} strokeWidth={active ? 2 : 1.75} />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">{loc.label}</span>
                {active && <Check className="h-3 w-3 text-[var(--ft-pickle)]" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className={fieldLabel}>
          Category
          {autoFillFields.has('category') && <AutoFilledPill />}
        </label>
        <div className="grid grid-cols-4 gap-0 border border-[var(--ft-ink)]">
          {categories.map((cat, i) => {
            const active = category === cat.value;
            const col = i % 4;
            const row = Math.floor(i / 4);
            const lastRow = Math.floor((categories.length - 1) / 4);
            return (
              <button key={cat.value} type="button" onClick={() => handleCategoryChange(cat.value)}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-2 text-left transition-all duration-150',
                  col < 3 && 'border-r border-[var(--ft-ink)]',
                  row < lastRow && 'border-b border-[var(--ft-ink)]',
                  active
                    ? 'bg-[var(--ft-pickle)] text-[var(--ft-ink)]'
                    : 'bg-[var(--ft-paper)] text-[rgba(21,19,15,0.66)] hover:bg-[var(--ft-bone)] hover:text-[var(--ft-ink)]',
                )}>
                <span className="text-base leading-none">{getCategoryEmoji(cat.value)}</span>
                <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em]">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={fieldLabel}>Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={0.1} step={0.1} className={baseInput} />
        </div>
        <div className="space-y-2">
          <label className={fieldLabel}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={cn(baseInput, 'cursor-pointer appearance-none')}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className={fieldLabel}>
          <span>Expiry · <span className="text-[rgba(21,19,15,0.45)]">auto-estimated</span></span>
          {autoFillFields.has('expiry') && <AutoFilledPill />}
        </label>
        <input type="date" value={expiryDate} onChange={handleExpiryChange} className={baseInput} />
      </div>

      <div className="space-y-2">
        <label className={fieldLabel}>Shelf · drawer <span className="text-[rgba(21,19,15,0.45)]">opt.</span></label>
        <input type="text" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="Top shelf, door, crisper…" className={baseInput} />
      </div>

      <div className="space-y-2">
        <label className={fieldLabel}>Notes <span className="text-[rgba(21,19,15,0.45)]">opt.</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra details…" rows={2} className={cn(baseInput, 'resize-none')} />
      </div>

      {initialNutrition && (
        <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-4 shadow-[3px_3px_0_var(--ft-ink)]">
          <div className="mb-3 flex items-center gap-2 border-b border-[rgba(21,19,15,0.20)] pb-2">
            <Zap className="h-3.5 w-3.5 text-[var(--ft-pickle)]" strokeWidth={2} />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)]">Nutrition · per 100 g</p>
            {initialNutrition.servingSize && (
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.50)]">Serving · {initialNutrition.servingSize}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <MacroChip icon={<Zap className="h-3 w-3" />}      label="kcal"    value={`${initialNutrition.calories}`} unit="kcal" />
            <MacroChip icon={<Beef className="h-3 w-3" />}     label="Protein" value={`${initialNutrition.protein}`}  unit="g" />
            <MacroChip icon={<Wheat className="h-3 w-3" />}    label="Carbs"   value={`${initialNutrition.carbs}`}    unit="g" />
            <MacroChip icon={<Droplets className="h-3 w-3" />} label="Fat"     value={`${initialNutrition.fat}`}      unit="g" />
          </div>
          {(initialNutrition.fiber != null || initialNutrition.sugar != null || initialNutrition.sodium != null) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-[rgba(21,19,15,0.25)] pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgba(21,19,15,0.62)]">
              {initialNutrition.fiber  != null && <span>Fiber · <strong className="text-[var(--ft-ink)]">{initialNutrition.fiber}g</strong></span>}
              {initialNutrition.sugar  != null && <span>Sugar · <strong className="text-[var(--ft-ink)]">{initialNutrition.sugar}g</strong></span>}
              {initialNutrition.sodium != null && <span>Sodium · <strong className="text-[var(--ft-ink)]">{initialNutrition.sodium}mg</strong></span>}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 border border-[var(--ft-ink)] bg-[var(--ft-ink)] py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-bone)] shadow-[3px_3px_0_var(--ft-pickle)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ft-pickle)] active:translate-y-0 active:shadow-[2px_2px_0_var(--ft-pickle)]"
        >
          File on the shelf
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)] transition-all hover:bg-[var(--ft-bone)] hover:shadow-[2px_2px_0_var(--ft-ink)] hover:-translate-y-px"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
